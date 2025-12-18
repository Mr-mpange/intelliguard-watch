// API Service - Connects to FastAPI Backend
import { ThreatPrediction, SystemHealth, AnalysisResult } from '@/types/intelliguard';

// Backend API URL - Configure this for your deployment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Health check
export const checkBackendHealth = async (): Promise<ApiResponse<SystemHealth>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error('Backend not available');
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('Health check failed:', error);
    return { data: null, error: 'Failed to connect to backend' };
  }
};

// Analyze traffic from CSV file
export const analyzeTrafficFile = async (file: File): Promise<ApiResponse<AnalysisResult>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Analysis failed');
    }

    const data = await response.json();
    return { data: transformBackendResponse(data), error: null };
  } catch (error) {
    console.error('Traffic analysis failed:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Analysis failed' };
  }
};

// Analyze traffic from JSON payload
export const analyzeTrafficData = async (
  trafficLogs: Record<string, unknown>[]
): Promise<ApiResponse<ThreatPrediction[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/predict/json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs: trafficLogs }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Analysis failed');
    }

    const data = await response.json();
    return { data: data.predictions, error: null };
  } catch (error) {
    console.error('Traffic analysis failed:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Analysis failed' };
  }
};

// Get model info
export const getModelInfo = async (): Promise<ApiResponse<{
  version: string;
  models: string[];
  features: string[];
}>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/model/info`);
    if (!response.ok) throw new Error('Failed to get model info');
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('Failed to get model info:', error);
    return { data: null, error: 'Failed to get model info' };
  }
};

// Transform backend response to frontend format
const transformBackendResponse = (backendData: any): AnalysisResult => {
  const predictions: ThreatPrediction[] = backendData.predictions.map((p: any, index: number) => ({
    id: `pred-${Date.now()}-${index}`,
    timestamp: p.timestamp || new Date().toISOString(),
    attackType: mapAttackType(p.attack_type),
    confidence: p.confidence,
    severity: mapSeverity(p.severity || p.attack_type, p.confidence),
    sourceIP: p.source_ip || generateIP(),
    destinationIP: p.destination_ip || '192.168.1.100',
    port: p.port || 80,
    protocol: p.protocol || 'TCP',
    anomalyScore: p.anomaly_score || 0,
    isZeroDay: p.is_zero_day || p.attack_type === 'Zero-Day',
    details: p.details || `${p.attack_type} detected with ${(p.confidence * 100).toFixed(1)}% confidence`,
  }));

  const threats = predictions.filter(p => p.attackType !== 'Normal');
  const normal = predictions.filter(p => p.attackType === 'Normal');
  const zeroDay = predictions.filter(p => p.isZeroDay);

  // Calculate attack distribution
  const attackCounts: Record<string, number> = {};
  threats.forEach(t => {
    attackCounts[t.attackType] = (attackCounts[t.attackType] || 0) + 1;
  });

  // Calculate severity distribution
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  predictions.forEach(p => {
    severityCounts[p.severity]++;
  });

  return {
    predictions,
    summary: {
      totalRecords: predictions.length,
      threats: threats.length,
      normal: normal.length,
      zeroDay: zeroDay.length,
      avgConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
    },
    attackDistribution: Object.entries(attackCounts).map(([name, value]) => ({ name, value })),
    severityDistribution: Object.entries(severityCounts).map(([severity, count]) => ({
      severity: severity as ThreatPrediction['severity'],
      count,
    })),
    timelineData: generateTimelineData(predictions),
  };
};

const mapAttackType = (backendType: string): ThreatPrediction['attackType'] => {
  const mapping: Record<string, ThreatPrediction['attackType']> = {
    'BENIGN': 'Normal',
    'DDoS': 'DDoS',
    'DoS Hulk': 'DDoS',
    'DoS GoldenEye': 'DDoS',
    'DoS slowloris': 'DDoS',
    'DoS Slowhttptest': 'DDoS',
    'PortScan': 'Port Scan',
    'FTP-Patator': 'Brute Force',
    'SSH-Patator': 'Brute Force',
    'Bot': 'Malware',
    'Web Attack - Brute Force': 'Brute Force',
    'Web Attack - XSS': 'XSS',
    'Web Attack - Sql Injection': 'SQL Injection',
    'Infiltration': 'Malware',
    'Heartbleed': 'Zero-Day',
  };
  return mapping[backendType] || 'Normal';
};

const mapSeverity = (attackType: string, confidence: number): ThreatPrediction['severity'] => {
  if (attackType === 'BENIGN' || attackType === 'Normal') return 'info';
  if (confidence >= 0.9) return 'critical';
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
};

const generateIP = () => 
  `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

const generateTimelineData = (predictions: ThreatPrediction[]) => {
  const hourCounts: Record<string, { threats: number; normal: number }> = {};
  
  for (let i = 0; i < 24; i++) {
    const hour = String(i).padStart(2, '0');
    hourCounts[`${hour}:00`] = { threats: 0, normal: 0 };
  }

  predictions.forEach(p => {
    const hour = new Date(p.timestamp).getHours();
    const key = `${String(hour).padStart(2, '0')}:00`;
    if (hourCounts[key]) {
      if (p.attackType === 'Normal') {
        hourCounts[key].normal++;
      } else {
        hourCounts[key].threats++;
      }
    }
  });

  return Object.entries(hourCounts).map(([time, counts]) => ({
    time,
    ...counts,
  }));
};
