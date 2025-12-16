import { 
  ThreatPrediction, 
  SystemHealth, 
  Alert, 
  MonitoredDomain, 
  AnalysisResult,
  AttackType,
  ThreatSeverity
} from '@/types/intelliguard';

// Simulate ML model predictions with realistic data
const attackTypes: AttackType[] = [
  'DDoS', 'SQL Injection', 'XSS', 'Brute Force', 'Port Scan', 
  'Malware', 'Phishing', 'Zero-Day', 'Man-in-the-Middle', 'Normal'
];

const severities: ThreatSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];

const generateIP = () => {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
};

const generatePrediction = (index: number): ThreatPrediction => {
  const isNormal = Math.random() > 0.3;
  const isZeroDay = !isNormal && Math.random() > 0.85;
  const attackType = isNormal ? 'Normal' : (isZeroDay ? 'Zero-Day' : attackTypes[Math.floor(Math.random() * (attackTypes.length - 2))]);
  
  const severityMap: Record<AttackType, ThreatSeverity> = {
    'DDoS': 'critical',
    'SQL Injection': 'critical',
    'XSS': 'high',
    'Brute Force': 'medium',
    'Port Scan': 'low',
    'Malware': 'critical',
    'Phishing': 'high',
    'Zero-Day': 'critical',
    'Man-in-the-Middle': 'high',
    'Normal': 'info',
  };

  return {
    id: `pred-${Date.now()}-${index}`,
    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    attackType,
    confidence: isNormal ? 0.95 + Math.random() * 0.05 : 0.7 + Math.random() * 0.25,
    severity: severityMap[attackType],
    sourceIP: generateIP(),
    destinationIP: '192.168.1.100',
    port: [80, 443, 22, 3306, 8080][Math.floor(Math.random() * 5)],
    protocol: ['TCP', 'UDP', 'HTTP', 'HTTPS'][Math.floor(Math.random() * 4)],
    anomalyScore: isZeroDay ? 0.85 + Math.random() * 0.15 : Math.random() * 0.5,
    isZeroDay,
    details: isNormal 
      ? 'Traffic patterns within normal parameters'
      : `Suspicious activity detected: ${attackType} pattern identified with high confidence`,
  };
};

export const mockPredictions: ThreatPrediction[] = Array.from({ length: 50 }, (_, i) => generatePrediction(i));

export const mockSystemHealth: SystemHealth = {
  status: 'healthy',
  uptime: 99.97,
  lastScan: new Date().toISOString(),
  threatsBlocked: 1247,
  packetsAnalyzed: 2847593,
  modelVersion: 'v2.4.1',
  cpuUsage: 23,
  memoryUsage: 45,
};

export const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    type: 'threat',
    severity: 'critical',
    title: 'DDoS Attack Detected',
    message: 'High volume traffic spike detected from multiple source IPs targeting port 443',
    isRead: false,
    sourceIP: '185.220.101.45',
    attackType: 'DDoS',
  },
  {
    id: 'alert-2',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    type: 'anomaly',
    severity: 'high',
    title: 'Zero-Day Anomaly',
    message: 'Unusual traffic pattern detected that does not match known attack signatures',
    isRead: false,
    sourceIP: '45.33.32.156',
  },
  {
    id: 'alert-3',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    type: 'threat',
    severity: 'medium',
    title: 'SQL Injection Attempt',
    message: 'Malicious SQL payload detected in HTTP request parameters',
    isRead: true,
    sourceIP: '192.168.1.105',
    attackType: 'SQL Injection',
  },
  {
    id: 'alert-4',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: 'system',
    severity: 'info',
    title: 'Model Updated',
    message: 'ML model successfully updated to version 2.4.1 with improved detection accuracy',
    isRead: true,
  },
  {
    id: 'alert-5',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    type: 'threat',
    severity: 'high',
    title: 'Brute Force Attack',
    message: 'Multiple failed authentication attempts detected from single source',
    isRead: true,
    sourceIP: '103.235.46.39',
    attackType: 'Brute Force',
  },
];

export const mockDomains: MonitoredDomain[] = [
  {
    id: 'domain-1',
    domain: 'api.example.com',
    status: 'online',
    lastCheck: new Date().toISOString(),
    responseTime: 145,
    sslExpiry: '2025-06-15',
    threatsDetected: 3,
    uptimePercent: 99.98,
    notifications: true,
  },
  {
    id: 'domain-2',
    domain: 'dashboard.example.com',
    status: 'online',
    lastCheck: new Date().toISOString(),
    responseTime: 89,
    sslExpiry: '2025-08-22',
    threatsDetected: 0,
    uptimePercent: 100,
    notifications: true,
  },
  {
    id: 'domain-3',
    domain: 'legacy.example.com',
    status: 'degraded',
    lastCheck: new Date().toISOString(),
    responseTime: 2340,
    sslExpiry: '2025-01-30',
    threatsDetected: 12,
    uptimePercent: 94.5,
    notifications: true,
  },
  {
    id: 'domain-4',
    domain: 'staging.example.com',
    status: 'offline',
    lastCheck: new Date().toISOString(),
    responseTime: 0,
    sslExpiry: '2025-03-10',
    threatsDetected: 0,
    uptimePercent: 87.2,
    notifications: false,
  },
];

export const analyzeTraffic = async (file: File): Promise<AnalysisResult> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const predictions = Array.from({ length: 100 }, (_, i) => generatePrediction(i));
  
  const threats = predictions.filter(p => p.attackType !== 'Normal');
  const normal = predictions.filter(p => p.attackType === 'Normal');
  const zeroDay = predictions.filter(p => p.isZeroDay);

  // Calculate attack distribution
  const attackCounts: Record<string, number> = {};
  threats.forEach(t => {
    attackCounts[t.attackType] = (attackCounts[t.attackType] || 0) + 1;
  });
  const attackDistribution = Object.entries(attackCounts).map(([name, value]) => ({ name, value }));

  // Calculate severity distribution
  const severityCounts: Record<ThreatSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  predictions.forEach(p => {
    severityCounts[p.severity]++;
  });
  const severityDistribution = Object.entries(severityCounts).map(([severity, count]) => ({
    severity: severity as ThreatSeverity,
    count,
  }));

  // Generate timeline data
  const timelineData = Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    threats: Math.floor(Math.random() * 10),
    normal: Math.floor(Math.random() * 50) + 20,
  }));

  return {
    predictions,
    summary: {
      totalRecords: predictions.length,
      threats: threats.length,
      normal: normal.length,
      zeroDay: zeroDay.length,
      avgConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
    },
    attackDistribution,
    severityDistribution,
    timelineData,
  };
};

export const checkHealth = async (): Promise<SystemHealth> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    ...mockSystemHealth,
    lastScan: new Date().toISOString(),
    cpuUsage: 15 + Math.random() * 30,
    memoryUsage: 35 + Math.random() * 25,
  };
};

export const getRealtimeStats = () => ({
  packetsPerSecond: Math.floor(Math.random() * 5000) + 1000,
  activeConnections: Math.floor(Math.random() * 500) + 100,
  bandwidthMbps: Math.floor(Math.random() * 100) + 50,
  threatLevel: Math.random() > 0.8 ? 'elevated' : 'normal',
});
