import { motion } from 'framer-motion';
import { Shield, Activity, AlertTriangle, Eye, Zap, Lock, TrendingUp, Clock } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MetricCard from '@/components/dashboard/MetricCard';
import AlertItem from '@/components/dashboard/AlertItem';
import StatusPanel from '@/components/dashboard/StatusPanel';
import RealtimeAlertPanel from '@/components/dashboard/RealtimeAlertPanel';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SystemHealth, Alert } from '@/types/intelliguard';

const Overview = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [threatCount, setThreatCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [realtimeStats, setRealtimeStats] = useState({
    packetsPerSecond: 0,
    bandwidthMbps: 0,
    activeConnections: 0,
    threatLevel: 'normal' as string,
  });

  const health: SystemHealth = useMemo(() => ({
    status: threatCount > 5 ? 'warning' : 'healthy',
    uptime: 99.97,
    lastScan: new Date().toISOString(),
    threatsBlocked: threatCount,
    packetsAnalyzed: scanCount,
    modelVersion: 'v2.4.1-AI',
    cpuUsage: 23,
    memoryUsage: 45,
  }), [threatCount, scanCount]);

  // Fetch real alerts from DB
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [alertsRes, scansRes] = await Promise.all([
        supabase
          .from('threat_alerts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('domain_scans')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      if (alertsRes.data) {
        setThreatCount(alertsRes.data.length);
        // Map DB alerts to Alert type for AlertItem component
        const mapped: Alert[] = alertsRes.data.map(a => ({
          id: a.id,
          timestamp: a.created_at,
          type: 'threat' as const,
          severity: a.severity as Alert['severity'],
          title: a.title,
          message: a.description,
          isRead: a.is_read,
          sourceIP: a.source_ip || undefined,
          attackType: a.threat_type as Alert['attackType'],
        }));
        setAlerts(mapped);
      }
      if (scansRes.count !== null) {
        setScanCount(scansRes.count);
      }
    };
    fetchData();
  }, [user]);

  // Simulated live stats ticker (cosmetic)
  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeStats({
        packetsPerSecond: Math.floor(Math.random() * 5000) + 1000,
        bandwidthMbps: Math.floor(Math.random() * 100) + 50,
        activeConnections: Math.floor(Math.random() * 500) + 100,
        threatLevel: threatCount > 5 ? 'elevated' : 'normal',
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [threatCount]);

  // Build attack distribution from real alerts
  const attackDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach(a => {
      if (a.attackType && a.attackType !== 'Normal') {
        counts[a.attackType] = (counts[a.attackType] || 0) + 1;
      }
    });
    const colors = [
      'hsl(var(--cyber-red))', 'hsl(var(--cyber-orange))', 'hsl(var(--cyber-yellow))',
      'hsl(var(--cyber-purple))', 'hsl(var(--cyber-blue))',
    ];
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (entries.length === 0) {
      return [{ name: 'No threats', value: 1, color: 'hsl(var(--cyber-green))' }];
    }
    return entries.map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
  }, [alerts]);

  // Build timeline from real alerts (group by hour)
  const timelineData = useMemo(() => {
    const hours: Record<string, { threats: number; normal: number }> = {};
    for (let i = 0; i < 24; i++) {
      const key = `${String(i).padStart(2, '0')}:00`;
      hours[key] = { threats: 0, normal: 0 };
    }
    alerts.forEach(a => {
      const hour = new Date(a.timestamp).getHours();
      const key = `${String(hour).padStart(2, '0')}:00`;
      if (hours[key]) {
        hours[key].threats++;
      }
    });
    return Object.entries(hours).map(([time, data]) => ({ time, ...data }));
  }, [alerts]);

  const zeroDay = alerts.filter(a => a.attackType === 'Zero-Day');

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-cyber-blue shadow-glow-sm">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Security Overview</h1>
              <p className="text-muted-foreground">
                Real-time threat intelligence and system monitoring
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm font-mono overflow-x-auto pb-2">
            <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
              <Activity className="w-4 h-4 text-primary" />
              <span>{realtimeStats.packetsPerSecond.toLocaleString()} pkt/s</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
              <TrendingUp className="w-4 h-4 text-cyber-green" />
              <span>{realtimeStats.bandwidthMbps} Mbps</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
              <Eye className="w-4 h-4 text-cyber-blue" />
              <span>{realtimeStats.activeConnections} active</span>
            </div>
            <div className={`flex items-center gap-2 whitespace-nowrap ${
              realtimeStats.threatLevel === 'elevated' ? 'text-cyber-yellow' : 'text-cyber-green'
            }`}>
              <Lock className="w-4 h-4" />
              <span>Threat Level: {realtimeStats.threatLevel.toUpperCase()}</span>
            </div>
          </div>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Threats Detected"
            value={threatCount}
            icon={AlertTriangle}
            variant="danger"
            trend={{ value: 12, isPositive: false }}
            delay={0}
          />
          <MetricCard
            title="Zero-Day Anomalies"
            value={zeroDay.length}
            icon={Zap}
            variant="warning"
            delay={0.1}
          />
          <MetricCard
            title="Threats Blocked"
            value={health.threatsBlocked.toLocaleString()}
            icon={Shield}
            variant="success"
            trend={{ value: 8, isPositive: true }}
            delay={0.2}
          />
          <MetricCard
            title="Domains Scanned"
            value={scanCount}
            icon={Activity}
            delay={0.3}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Threat Activity (24h)
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--cyber-green))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--cyber-green))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--cyber-red))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--cyber-red))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-card)',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="threats"
                    stroke="hsl(var(--cyber-red))"
                    fillOpacity={1}
                    fill="url(#colorThreats)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyber-red" />
                <span className="text-muted-foreground">Threats</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Attack Distribution</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attackDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {attackDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {attackDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Real-time Alerts Panel */}
        <RealtimeAlertPanel />

        {/* Status and Recent Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatusPanel health={health} />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-cyber-yellow" />
              Recent Alerts
            </h3>
            <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-cyber">
              {alerts.length > 0 ? (
                alerts.slice(0, 4).map((alert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No alerts yet — run a scan to get started</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Overview;
