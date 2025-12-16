// IntelliGuard Types

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AttackType = 
  | 'DDoS'
  | 'SQL Injection'
  | 'XSS'
  | 'Brute Force'
  | 'Port Scan'
  | 'Malware'
  | 'Phishing'
  | 'Zero-Day'
  | 'Man-in-the-Middle'
  | 'Normal';

export interface ThreatPrediction {
  id: string;
  timestamp: string;
  attackType: AttackType;
  confidence: number;
  severity: ThreatSeverity;
  sourceIP: string;
  destinationIP: string;
  port: number;
  protocol: string;
  anomalyScore: number;
  isZeroDay: boolean;
  details: string;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  lastScan: string;
  threatsBlocked: number;
  packetsAnalyzed: number;
  modelVersion: string;
  cpuUsage: number;
  memoryUsage: number;
}

export interface Alert {
  id: string;
  timestamp: string;
  type: 'threat' | 'anomaly' | 'system' | 'info';
  severity: ThreatSeverity;
  title: string;
  message: string;
  isRead: boolean;
  sourceIP?: string;
  attackType?: AttackType;
}

export interface MonitoredDomain {
  id: string;
  domain: string;
  status: 'online' | 'offline' | 'degraded';
  lastCheck: string;
  responseTime: number;
  sslExpiry: string;
  threatsDetected: number;
  uptimePercent: number;
  notifications: boolean;
}

export interface TrafficLog {
  timestamp: string;
  sourceIP: string;
  destinationIP: string;
  port: number;
  protocol: string;
  packetSize: number;
  duration: number;
  flags: string;
}

export interface AnalysisResult {
  predictions: ThreatPrediction[];
  summary: {
    totalRecords: number;
    threats: number;
    normal: number;
    zeroDay: number;
    avgConfidence: number;
  };
  attackDistribution: { name: string; value: number }[];
  severityDistribution: { severity: ThreatSeverity; count: number }[];
  timelineData: { time: string; threats: number; normal: number }[];
}

export interface Settings {
  alertThreshold: number;
  sensitivityLevel: 'low' | 'medium' | 'high';
  emailNotifications: boolean;
  telegramNotifications: boolean;
  webhookUrl: string;
  autoBlock: boolean;
  retentionDays: number;
}
