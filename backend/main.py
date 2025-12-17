"""
IntelliGuard ML Backend - FastAPI Application
Cyber Attack Detection using ML models trained on CICIDS2017 dataset
"""

import os
import json
import asyncio
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
import uvicorn

# ============= Configuration =============

MODEL_PATH = os.getenv("MODEL_PATH", "./models")
API_KEY = os.getenv("API_KEY", "dev-key-change-in-production")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# ============= Pydantic Models =============

class TrafficLog(BaseModel):
    source_ip: str
    destination_ip: str
    source_port: int
    destination_port: int
    protocol: str
    packet_length: int
    flow_duration: float
    fwd_packets: int = 0
    bwd_packets: int = 0
    flow_bytes_per_sec: float = 0.0
    flow_packets_per_sec: float = 0.0
    fwd_iat_mean: float = 0.0
    bwd_iat_mean: float = 0.0
    psh_flag_count: int = 0
    syn_flag_count: int = 0
    rst_flag_count: int = 0
    ack_flag_count: int = 0

class PredictionResult(BaseModel):
    id: str
    timestamp: str
    attack_type: str
    confidence: float
    severity: str
    source_ip: str
    destination_ip: str
    port: int
    protocol: str
    anomaly_score: float
    is_zero_day: bool
    details: str
    recommended_actions: List[str] = []

class BatchPredictionRequest(BaseModel):
    logs: List[TrafficLog]

class HealthResponse(BaseModel):
    status: str
    uptime: float
    last_scan: str
    threats_blocked: int
    packets_analyzed: int
    model_version: str
    models_loaded: dict

# ============= ML Models Manager =============

class ModelManager:
    def __init__(self):
        self.rf_classifier = None
        self.xgb_classifier = None
        self.isolation_forest = None
        self.scaler = None
        self.label_encoder = None
        self.feature_names = None
        self.models_loaded = False
        self.start_time = datetime.now()
        self.packets_analyzed = 0
        self.threats_blocked = 0
        
    def load_models(self):
        """Load pre-trained models from disk"""
        try:
            self.rf_classifier = joblib.load(f"{MODEL_PATH}/random_forest.pkl")
            self.xgb_classifier = joblib.load(f"{MODEL_PATH}/xgboost.pkl")
            self.isolation_forest = joblib.load(f"{MODEL_PATH}/isolation_forest.pkl")
            self.scaler = joblib.load(f"{MODEL_PATH}/scaler.pkl")
            self.label_encoder = joblib.load(f"{MODEL_PATH}/label_encoder.pkl")
            self.feature_names = joblib.load(f"{MODEL_PATH}/feature_names.pkl")
            self.models_loaded = True
            print("✓ All models loaded successfully")
        except FileNotFoundError as e:
            print(f"⚠ Model files not found: {e}")
            print("Run 'python train_models.py' to train models first")
            self.models_loaded = False
            
    def preprocess(self, log: TrafficLog) -> np.ndarray:
        """Convert traffic log to feature vector"""
        features = np.array([[
            log.packet_length,
            log.flow_duration,
            log.fwd_packets,
            log.bwd_packets,
            log.flow_bytes_per_sec,
            log.flow_packets_per_sec,
            log.fwd_iat_mean,
            log.bwd_iat_mean,
            log.source_port,
            log.destination_port,
            log.psh_flag_count,
            log.syn_flag_count,
            log.rst_flag_count,
            log.ack_flag_count,
        ]])
        
        if self.scaler:
            features = self.scaler.transform(features)
        return features
    
    def predict(self, log: TrafficLog) -> PredictionResult:
        """Make prediction using ensemble of models"""
        self.packets_analyzed += 1
        features = self.preprocess(log)
        
        # Random Forest prediction
        rf_proba = self.rf_classifier.predict_proba(features)[0] if self.rf_classifier else np.zeros(10)
        rf_pred = np.argmax(rf_proba)
        
        # XGBoost prediction
        xgb_proba = self.xgb_classifier.predict_proba(features)[0] if self.xgb_classifier else np.zeros(10)
        xgb_pred = np.argmax(xgb_proba)
        
        # Ensemble: average probabilities
        ensemble_proba = (rf_proba + xgb_proba) / 2
        final_pred = np.argmax(ensemble_proba)
        confidence = float(ensemble_proba[final_pred])
        
        # Isolation Forest anomaly detection
        anomaly_score = 0.0
        is_zero_day = False
        if self.isolation_forest:
            anomaly_pred = self.isolation_forest.decision_function(features)[0]
            # Convert to 0-1 scale (lower = more anomalous)
            anomaly_score = 1 - (anomaly_pred + 0.5).clip(0, 1)
            is_zero_day = anomaly_score > 0.85 and final_pred == 0  # High anomaly but classified normal
        
        # Decode attack type
        attack_type = "Normal"
        if self.label_encoder:
            attack_type = self.label_encoder.inverse_transform([final_pred])[0]
        
        # Determine severity
        severity = self._get_severity(attack_type, confidence, anomaly_score)
        
        # Track threats
        if attack_type != "Normal" or is_zero_day:
            self.threats_blocked += 1
        
        return PredictionResult(
            id=f"pred-{datetime.now().timestamp():.0f}-{self.packets_analyzed}",
            timestamp=datetime.now().isoformat(),
            attack_type="Zero-Day" if is_zero_day else attack_type,
            confidence=confidence,
            severity=severity,
            source_ip=log.source_ip,
            destination_ip=log.destination_ip,
            port=log.destination_port,
            protocol=log.protocol,
            anomaly_score=anomaly_score,
            is_zero_day=is_zero_day,
            details=self._get_details(attack_type, is_zero_day, confidence),
            recommended_actions=self._get_mitigations(attack_type, is_zero_day)
        )
    
    def _get_severity(self, attack_type: str, confidence: float, anomaly_score: float) -> str:
        """Determine threat severity"""
        severity_map = {
            "DDoS": "critical",
            "DoS Hulk": "critical",
            "DoS GoldenEye": "critical",
            "DoS slowloris": "high",
            "DoS Slowhttptest": "high",
            "Heartbleed": "critical",
            "PortScan": "low",
            "FTP-Patator": "medium",
            "SSH-Patator": "medium",
            "Bot": "high",
            "Infiltration": "critical",
            "Web Attack - Brute Force": "high",
            "Web Attack - XSS": "high",
            "Web Attack - Sql Injection": "critical",
        }
        
        if attack_type == "Normal":
            return "info" if anomaly_score < 0.5 else "low"
        
        base_severity = severity_map.get(attack_type, "medium")
        
        # Escalate if high confidence
        if confidence > 0.9 and base_severity in ["medium", "high"]:
            return {"medium": "high", "high": "critical"}.get(base_severity, base_severity)
        
        return base_severity
    
    def _get_details(self, attack_type: str, is_zero_day: bool, confidence: float) -> str:
        """Generate detailed description"""
        if is_zero_day:
            return "Unusual traffic pattern detected that does not match known attack signatures. Potential zero-day exploit or novel attack vector."
        
        details_map = {
            "Normal": "Traffic patterns within normal parameters",
            "DDoS": "Distributed Denial of Service attack detected. Multiple source IPs flooding target with requests.",
            "DoS Hulk": "HTTP Unbearable Load King attack. High-volume HTTP GET/POST requests designed to overwhelm web servers.",
            "DoS GoldenEye": "GoldenEye HTTP DoS attack. Keeps connections open using randomized headers.",
            "DoS slowloris": "Slowloris attack detected. Partial HTTP requests holding connections open.",
            "PortScan": "Port scanning activity detected. Systematic probing of ports to identify services.",
            "FTP-Patator": "FTP brute force attack. Multiple authentication attempts against FTP service.",
            "SSH-Patator": "SSH brute force attack. Multiple authentication attempts against SSH service.",
            "Bot": "Botnet activity detected. Automated malicious traffic from compromised host.",
            "Infiltration": "Network infiltration attempt. Unauthorized access and data exfiltration.",
            "Web Attack - Brute Force": "Web application brute force. Multiple login attempts detected.",
            "Web Attack - XSS": "Cross-Site Scripting attack. Malicious scripts injected into web content.",
            "Web Attack - Sql Injection": "SQL Injection attack. Malicious SQL code in input parameters.",
            "Heartbleed": "Heartbleed vulnerability exploitation. Attempts to read server memory.",
        }
        
        return details_map.get(attack_type, f"Suspicious activity detected: {attack_type} pattern identified")
    
    def _get_mitigations(self, attack_type: str, is_zero_day: bool) -> List[str]:
        """Get recommended mitigation actions"""
        if is_zero_day:
            return [
                "Isolate affected systems immediately",
                "Capture full packet data for analysis",
                "Enable enhanced logging on all systems",
                "Notify security team for manual investigation",
                "Consider blocking source IP temporarily",
                "Check for indicators of compromise (IOCs)"
            ]
        
        mitigations = {
            "Normal": ["Continue monitoring", "No action required"],
            "DDoS": [
                "Enable DDoS protection/mitigation",
                "Rate limit incoming connections",
                "Configure firewall to block source IPs",
                "Contact ISP for upstream filtering",
                "Enable CDN/WAF protection"
            ],
            "DoS Hulk": [
                "Block source IP at firewall",
                "Enable request rate limiting",
                "Configure connection timeouts",
                "Deploy WAF rules for HTTP floods"
            ],
            "DoS GoldenEye": [
                "Reduce HTTP connection timeouts",
                "Limit connections per IP",
                "Enable HTTP/2 or QUIC",
                "Deploy reverse proxy protection"
            ],
            "DoS slowloris": [
                "Configure minimum data rate thresholds",
                "Set aggressive connection timeouts",
                "Use mod_reqtimeout or similar",
                "Deploy reverse proxy (nginx)"
            ],
            "PortScan": [
                "Block source IP at perimeter",
                "Enable port scan detection alerts",
                "Verify exposed services are necessary",
                "Audit firewall rules"
            ],
            "FTP-Patator": [
                "Implement account lockout policy",
                "Enable fail2ban or similar",
                "Require strong passwords/keys",
                "Consider disabling FTP for SFTP"
            ],
            "SSH-Patator": [
                "Enable fail2ban for SSH",
                "Use key-based authentication only",
                "Change default SSH port",
                "Implement IP whitelisting"
            ],
            "Bot": [
                "Isolate compromised system",
                "Perform malware scan",
                "Reset all credentials",
                "Analyze command and control traffic"
            ],
            "Infiltration": [
                "Disconnect affected systems",
                "Preserve forensic evidence",
                "Reset all credentials",
                "Conduct full security audit",
                "Notify incident response team"
            ],
            "Web Attack - Brute Force": [
                "Enable CAPTCHA",
                "Implement progressive delays",
                "Lock accounts after failed attempts",
                "Enable 2FA/MFA"
            ],
            "Web Attack - XSS": [
                "Sanitize all user inputs",
                "Implement Content Security Policy",
                "Use HTTP-only cookies",
                "Deploy WAF with XSS rules"
            ],
            "Web Attack - Sql Injection": [
                "Use parameterized queries",
                "Implement input validation",
                "Apply principle of least privilege",
                "Deploy WAF with SQL injection rules",
                "Audit database access logs"
            ],
            "Heartbleed": [
                "Patch OpenSSL immediately",
                "Revoke and reissue SSL certificates",
                "Reset all passwords",
                "Review logs for prior exploitation"
            ],
        }
        
        return mitigations.get(attack_type, ["Block source IP", "Enable enhanced logging", "Investigate further"])
    
    def get_health(self) -> HealthResponse:
        """Get system health status"""
        uptime = (datetime.now() - self.start_time).total_seconds()
        return HealthResponse(
            status="healthy" if self.models_loaded else "degraded",
            uptime=uptime,
            last_scan=datetime.now().isoformat(),
            threats_blocked=self.threats_blocked,
            packets_analyzed=self.packets_analyzed,
            model_version="v2.4.1-cicids2017",
            models_loaded={
                "random_forest": self.rf_classifier is not None,
                "xgboost": self.xgb_classifier is not None,
                "isolation_forest": self.isolation_forest is not None,
            }
        )

# ============= Application Setup =============

model_manager = ModelManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    model_manager.load_models()
    yield
    # Shutdown
    pass

app = FastAPI(
    title="IntelliGuard ML Backend",
    description="Cyber Attack Detection API using ML models trained on CICIDS2017",
    version="2.4.1",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key Security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Depends(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key

# ============= API Endpoints =============

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Get system health status"""
    return model_manager.get_health()

@app.post("/predict", response_model=PredictionResult)
async def predict_single(log: TrafficLog, api_key: str = Depends(verify_api_key)):
    """Predict attack type for a single traffic log"""
    if not model_manager.models_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")
    return model_manager.predict(log)

@app.post("/predict/batch", response_model=List[PredictionResult])
async def predict_batch(request: BatchPredictionRequest, api_key: str = Depends(verify_api_key)):
    """Predict attack types for multiple traffic logs"""
    if not model_manager.models_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")
    return [model_manager.predict(log) for log in request.logs]

@app.post("/predict/csv")
async def predict_csv(file: UploadFile = File(...), api_key: str = Depends(verify_api_key)):
    """Analyze CSV file containing traffic logs"""
    if not model_manager.models_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        contents = await file.read()
        df = pd.read_csv(pd.io.common.BytesIO(contents))
        
        results = []
        for _, row in df.iterrows():
            log = TrafficLog(
                source_ip=str(row.get('Source IP', '0.0.0.0')),
                destination_ip=str(row.get('Destination IP', '0.0.0.0')),
                source_port=int(row.get('Source Port', 0)),
                destination_port=int(row.get('Destination Port', 0)),
                protocol=str(row.get('Protocol', 'TCP')),
                packet_length=int(row.get('Total Length of Fwd Packets', 0)),
                flow_duration=float(row.get('Flow Duration', 0)),
                fwd_packets=int(row.get('Total Fwd Packets', 0)),
                bwd_packets=int(row.get('Total Backward Packets', 0)),
                flow_bytes_per_sec=float(row.get('Flow Bytes/s', 0)),
                flow_packets_per_sec=float(row.get('Flow Packets/s', 0)),
            )
            results.append(model_manager.predict(log))
        
        return {
            "total_records": len(results),
            "threats": len([r for r in results if r.attack_type != "Normal"]),
            "predictions": results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")

# ============= WebSocket for Real-time Streaming =============

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

ws_manager = ConnectionManager()

@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time threat notifications"""
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if "log" in data:
                log = TrafficLog(**data["log"])
                result = model_manager.predict(log)
                await websocket.send_json(result.model_dump())
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

# ============= Run Server =============

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
