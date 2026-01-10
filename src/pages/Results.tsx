import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { 
  BarChart3, Filter, Download, RefreshCw, 
  AlertTriangle, Shield, Zap, Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ThreatCard from '@/components/dashboard/ThreatCard';
import MetricCard from '@/components/dashboard/MetricCard';
import ThreatIntelPanel from '@/components/dashboard/ThreatIntelPanel';
import { mockPredictions } from '@/services/mockData';
import { ThreatPrediction, ThreatSeverity, AttackType } from '@/types/intelliguard';
import { cn } from '@/lib/utils';

const Results = () => {
  const location = useLocation();
  const initialResult = location.state?.result;
  
  const predictions = initialResult?.predictions || mockPredictions;
  
  const [severityFilter, setSeverityFilter] = useState<ThreatSeverity | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AttackType | 'all'>('all');

  const filteredPredictions = useMemo(() => {
    return predictions.filter((p: ThreatPrediction) => {
      if (severityFilter !== 'all' && p.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && p.attackType !== typeFilter) return false;
      return true;
    });
  }, [predictions, severityFilter, typeFilter]);

  const stats = useMemo(() => {
    const threats = predictions.filter((p: ThreatPrediction) => p.attackType !== 'Normal');
    const zeroDay = predictions.filter((p: ThreatPrediction) => p.isZeroDay);
    const critical = predictions.filter((p: ThreatPrediction) => p.severity === 'critical');
    const avgConfidence = predictions.reduce((sum: number, p: ThreatPrediction) => sum + p.confidence, 0) / predictions.length;
    
    return { threats: threats.length, zeroDay: zeroDay.length, critical: critical.length, avgConfidence };
  }, [predictions]);

  // Chart data
  const severityData = useMemo(() => {
    const counts: Record<ThreatSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    predictions.forEach((p: ThreatPrediction) => counts[p.severity]++);
    return Object.entries(counts).map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
      color: severity === 'critical' ? 'hsl(var(--cyber-red))' :
             severity === 'high' ? 'hsl(var(--cyber-orange))' :
             severity === 'medium' ? 'hsl(var(--cyber-yellow))' :
             severity === 'low' ? 'hsl(var(--cyber-blue))' : 'hsl(var(--muted-foreground))'
    }));
  }, [predictions]);

  const attackTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    predictions.forEach((p: ThreatPrediction) => {
      if (p.attackType !== 'Normal') {
        counts[p.attackType] = (counts[p.attackType] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [predictions]);

  const confidenceData = useMemo(() => {
    return predictions.slice(0, 20).map((p: ThreatPrediction, i: number) => ({
      index: i + 1,
      confidence: p.confidence * 100,
      anomaly: p.anomalyScore * 100,
    }));
  }, [predictions]);

  const severityOptions: (ThreatSeverity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low', 'info'];
  const uniqueTypes = Array.from(new Set(predictions.map((p: ThreatPrediction) => p.attackType)));

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-cyber-blue">
              <BarChart3 className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Analysis Results</h1>
              <p className="text-muted-foreground">
                {predictions.length} records analyzed · {stats.threats} threats detected
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Threats Detected"
            value={stats.threats}
            icon={AlertTriangle}
            variant="danger"
            delay={0}
          />
          <MetricCard
            title="Zero-Day Anomalies"
            value={stats.zeroDay}
            icon={Zap}
            variant="warning"
            delay={0.1}
          />
          <MetricCard
            title="Critical Severity"
            value={stats.critical}
            icon={Shield}
            variant="danger"
            delay={0.2}
          />
          <MetricCard
            title="Avg Confidence"
            value={`${(stats.avgConfidence * 100).toFixed(1)}%`}
            icon={Activity}
            delay={0.3}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Severity Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Severity Distribution</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
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
            <div className="grid grid-cols-3 gap-2 mt-2">
              {severityData.map((item) => (
                <div key={item.name} className="flex items-center gap-1 text-xs">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Attack Types */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Attack Types</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attackTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    width={90}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Confidence Scores */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Confidence & Anomaly Scores</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={confidenceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="index" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="confidence" 
                    stroke="hsl(var(--cyber-green))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--cyber-green))', strokeWidth: 0, r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="anomaly" 
                    stroke="hsl(var(--cyber-purple))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--cyber-purple))', strokeWidth: 0, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 rounded-full bg-cyber-green" />
                <span className="text-muted-foreground">Confidence</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 rounded-full bg-cyber-purple" />
                <span className="text-muted-foreground">Anomaly</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Threat Intelligence Enrichment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ThreatIntelPanel domain="example.com" />
          <ThreatIntelPanel ip="8.8.8.8" />
        </div>

        {/* Filters & Results Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Detection Results ({filteredPredictions.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as ThreatSeverity | 'all')}
                className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {severityOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'all' ? 'All Severities' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as AttackType | 'all')}
                className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map((type: AttackType) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto scrollbar-cyber pr-2">
            {filteredPredictions.slice(0, 30).map((prediction: ThreatPrediction, index: number) => (
              <ThreatCard key={prediction.id} prediction={prediction} index={index} />
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Results;
