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
import { mockAlerts, mockSystemHealth, mockPredictions, getRealtimeStats } from '@/services/mockData';
import { useState, useEffect } from 'react';

const Overview = () => {
  const [realtimeStats, setRealtimeStats] = useState(getRealtimeStats());
  const [health, setHealth] = useState(mockSystemHealth);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeStats(getRealtimeStats());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const threats = mockPredictions.filter(p => p.attackType !== 'Normal');
  const zeroDay = mockPredictions.filter(p => p.isZeroDay);

  // Chart data
  const timelineData = Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    threats: Math.floor(Math.random() * 15),
    normal: Math.floor(Math.random() * 80) + 40,
  }));

  const attackDistribution = [
    { name: 'DDoS', value: 35, color: 'hsl(var(--cyber-red))' },
    { name: 'SQL Injection', value: 25, color: 'hsl(var(--cyber-orange))' },
    { name: 'XSS', value: 20, color: 'hsl(var(--cyber-yellow))' },
    { name: 'Brute Force', value: 15, color: 'hsl(var(--cyber-purple))' },
    { name: 'Other', value: 5, color: 'hsl(var(--cyber-blue))' },
  ];

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
          
          {/* Real-time ticker */}
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
            value={threats.length}
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
            title="Packets Analyzed"
            value={`${(health.packetsAnalyzed / 1000000).toFixed(1)}M`}
            icon={Activity}
            delay={0.3}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Traffic Analysis (24h)
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
                    dataKey="normal"
                    stroke="hsl(var(--cyber-green))"
                    fillOpacity={1}
                    fill="url(#colorNormal)"
                    strokeWidth={2}
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
                <div className="w-3 h-3 rounded-full bg-cyber-green" />
                <span className="text-muted-foreground">Normal Traffic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyber-red" />
                <span className="text-muted-foreground">Threats</span>
              </div>
            </div>
          </motion.div>

          {/* Attack Distribution */}
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
                  <span className="font-mono">{item.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Real-time Alerts Panel */}
        <RealtimeAlertPanel />

        {/* Status and Alerts */}
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
              {mockAlerts.slice(0, 4).map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-sm text-muted-foreground p-4 border border-border/50 rounded-lg bg-muted/20"
        >
          <p>
            <strong>Disclaimer:</strong> IntelliGuard is an educational prototype for cyber threat detection. 
            It does not perform penetration testing or real-time intrusion prevention.
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Overview;
