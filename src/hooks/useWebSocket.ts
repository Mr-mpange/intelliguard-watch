// WebSocket Hook for Real-time Threat Streaming
import { useState, useEffect, useCallback, useRef } from 'react';
import { ThreatPrediction, Alert } from '@/types/intelliguard';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/threats';

interface WebSocketMessage {
  type: 'threat' | 'alert' | 'stats' | 'health';
  data: ThreatPrediction | Alert | RealtimeStats | HealthUpdate;
  timestamp: string;
}

interface RealtimeStats {
  packetsPerSecond: number;
  activeConnections: number;
  bandwidthMbps: number;
  threatLevel: 'normal' | 'elevated' | 'critical';
}

interface HealthUpdate {
  status: 'healthy' | 'warning' | 'critical';
  cpuUsage: number;
  memoryUsage: number;
}

interface UseWebSocketOptions {
  onThreat?: (threat: ThreatPrediction) => void;
  onAlert?: (alert: Alert) => void;
  onStats?: (stats: RealtimeStats) => void;
  onHealth?: (health: HealthUpdate) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    onThreat,
    onAlert,
    onStats,
    onHealth,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [threats, setThreats] = useState<ThreatPrediction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<RealtimeStats | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      console.log('Connecting to WebSocket:', WS_URL);
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        
        // Clear reconnect timeout if exists
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          switch (message.type) {
            case 'threat':
              const threat = message.data as ThreatPrediction;
              setThreats(prev => [threat, ...prev].slice(0, 100)); // Keep last 100
              onThreat?.(threat);
              break;
            case 'alert':
              const alert = message.data as Alert;
              setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50
              onAlert?.(alert);
              break;
            case 'stats':
              const statsData = message.data as RealtimeStats;
              setStats(statsData);
              onStats?.(statsData);
              break;
            case 'health':
              onHealth?.(message.data as HealthUpdate);
              break;
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Auto reconnect
        if (autoReconnect && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, reconnectInterval);
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to connect to WebSocket');
    }
  }, [onThreat, onAlert, onStats, onHealth, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  // Clear threats/alerts
  const clearThreats = useCallback(() => setThreats([]), []);
  const clearAlerts = useCallback(() => setAlerts([]), []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    lastMessage,
    threats,
    alerts,
    stats,
    connect,
    disconnect,
    sendMessage,
    clearThreats,
    clearAlerts,
  };
};

// Simulated WebSocket for development (when backend is not available)
export const useSimulatedWebSocket = (options: UseWebSocketOptions = {}) => {
  const { onThreat, onAlert, onStats } = options;
  const [threats, setThreats] = useState<ThreatPrediction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<RealtimeStats>({
    packetsPerSecond: 2500,
    activeConnections: 150,
    bandwidthMbps: 75,
    threatLevel: 'normal',
  });

  useEffect(() => {
    // Simulate stats updates
    const statsInterval = setInterval(() => {
      const newStats: RealtimeStats = {
        packetsPerSecond: Math.floor(Math.random() * 5000) + 1000,
        activeConnections: Math.floor(Math.random() * 500) + 100,
        bandwidthMbps: Math.floor(Math.random() * 100) + 50,
        threatLevel: Math.random() > 0.85 ? 'elevated' : 'normal',
      };
      setStats(newStats);
      onStats?.(newStats);
    }, 3000);

    // Simulate occasional threats
    const threatInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        const attackTypes = ['DDoS', 'SQL Injection', 'XSS', 'Brute Force', 'Port Scan'] as const;
        const threat: ThreatPrediction = {
          id: `threat-${Date.now()}`,
          timestamp: new Date().toISOString(),
          attackType: attackTypes[Math.floor(Math.random() * attackTypes.length)],
          confidence: 0.7 + Math.random() * 0.3,
          severity: ['critical', 'high', 'medium'][Math.floor(Math.random() * 3)] as 'critical' | 'high' | 'medium',
          sourceIP: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          destinationIP: '192.168.1.100',
          port: [80, 443, 22, 3306][Math.floor(Math.random() * 4)],
          protocol: ['TCP', 'UDP', 'HTTP'][Math.floor(Math.random() * 3)],
          anomalyScore: Math.random() * 0.5,
          isZeroDay: false,
          details: 'Suspicious activity detected',
        };
        setThreats(prev => [threat, ...prev].slice(0, 100));
        onThreat?.(threat);
      }
    }, 5000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(threatInterval);
    };
  }, [onThreat, onAlert, onStats]);

  return {
    isConnected: true,
    error: null,
    lastMessage: null,
    threats,
    alerts,
    stats,
    connect: () => {},
    disconnect: () => {},
    sendMessage: () => {},
    clearThreats: () => setThreats([]),
    clearAlerts: () => setAlerts([]),
  };
};
