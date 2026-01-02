import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Shield, 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  BarChart3,
  Activity,
  Target,
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ScanHistoryItem {
  id: string;
  domain: string;
  scannedAt: string;
  status: 'clean' | 'suspicious' | 'malicious';
  maliciousCount: number;
  suspiciousCount: number;
  reputation: number;
}

interface DbDomainScan {
  id: string;
  domain: string;
  created_at: string;
  is_malicious: boolean;
  positives: number;
  total: number;
  reputation: number | null;
  engines: { name: string; category: string }[] | null;
}

interface TrendingThreat {
  id: string;
  name: string;
  category: string;
  occurrences: number;
  trend: 'up' | 'down' | 'stable';
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface DomainReputation {
  domain: string;
  scores: { date: string; score: number }[];
  currentScore: number;
  change: number;
}

// Convert database scan to ScanHistoryItem
const convertDbScan = (scan: DbDomainScan): ScanHistoryItem => {
  const engines = scan.engines || [];
  const maliciousCount = engines.filter(e => e.category === 'malicious').length;
  const suspiciousCount = engines.filter(e => e.category === 'suspicious').length;
  
  let status: 'clean' | 'suspicious' | 'malicious' = 'clean';
  if (scan.is_malicious || maliciousCount > 0) status = 'malicious';
  else if (suspiciousCount > 0) status = 'suspicious';
  
  return {
    id: scan.id,
    domain: scan.domain,
    scannedAt: scan.created_at,
    status,
    maliciousCount,
    suspiciousCount,
    reputation: scan.reputation || 0,
  };
};

// Generate trending threats
const generateTrendingThreats = (): TrendingThreat[] => [
  { id: '1', name: 'Phishing Campaign', category: 'Social Engineering', occurrences: 234, trend: 'up', severity: 'critical' },
  { id: '2', name: 'SQL Injection', category: 'Web Attack', occurrences: 156, trend: 'down', severity: 'high' },
  { id: '3', name: 'DDoS Attack', category: 'Network', occurrences: 89, trend: 'up', severity: 'high' },
  { id: '4', name: 'Malware Distribution', category: 'Malware', occurrences: 67, trend: 'stable', severity: 'critical' },
  { id: '5', name: 'XSS Vulnerability', category: 'Web Attack', occurrences: 45, trend: 'down', severity: 'medium' },
  { id: '6', name: 'Brute Force', category: 'Authentication', occurrences: 123, trend: 'up', severity: 'medium' },
];

// Generate threat timeline data
const generateTimelineData = () => {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      threats: Math.floor(Math.random() * 50) + 10,
      blocked: Math.floor(Math.random() * 40) + 5,
      scans: Math.floor(Math.random() * 100) + 50,
    });
  }
  return data;
};

// Generate threat category data
const generateCategoryData = () => [
  { name: 'Phishing', value: 35, color: '#ef4444' },
  { name: 'Malware', value: 25, color: '#f97316' },
  { name: 'DDoS', value: 15, color: '#eab308' },
  { name: 'SQL Injection', value: 12, color: '#22c55e' },
  { name: 'XSS', value: 8, color: '#3b82f6' },
  { name: 'Other', value: 5, color: '#8b5cf6' },
];

const ThreatDashboard = () => {
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [trendingThreats, setTrendingThreats] = useState<TrendingThreat[]>([]);
  const [timelineData, setTimelineData] = useState<{ date: string; threats: number; blocked: number; scans: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchScanHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: scans, error } = await supabase
        .from('domain_scans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      if (scans && scans.length > 0) {
        const history = scans.map(scan => convertDbScan(scan as unknown as DbDomainScan));
        setScanHistory(history);
        
        // Generate timeline from real data
        const timelineMap = new Map<string, { threats: number; scans: number }>();
        scans.forEach(scan => {
          const date = new Date(scan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const existing = timelineMap.get(date) || { threats: 0, scans: 0 };
          timelineMap.set(date, {
            threats: existing.threats + (scan.is_malicious ? 1 : 0),
            scans: existing.scans + 1,
          });
        });
        
        const timeline = Array.from(timelineMap.entries()).map(([date, data]) => ({
          date,
          threats: data.threats,
          blocked: Math.floor(data.threats * 0.8),
          scans: data.scans,
        })).reverse();
        
        if (timeline.length > 0) setTimelineData(timeline);
        else setTimelineData(generateTimelineData());
      } else {
        setTimelineData(generateTimelineData());
      }
    } catch (error) {
      console.error('Error fetching scan history:', error);
      setTimelineData(generateTimelineData());
    } finally {
      setTrendingThreats(generateTrendingThreats());
      setCategoryData(generateCategoryData());
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScanHistory();
  }, [user]);

  const refreshData = () => {
    fetchScanHistory();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'clean':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Clean</Badge>;
      case 'suspicious':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Suspicious</Badge>;
      case 'malicious':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Malicious</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const stats = {
    totalScans: scanHistory.length,
    cleanDomains: scanHistory.filter(s => s.status === 'clean').length,
    suspiciousDomains: scanHistory.filter(s => s.status === 'suspicious').length,
    maliciousDomains: scanHistory.filter(s => s.status === 'malicious').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              Threat Intelligence
            </h1>
            <p className="text-muted-foreground mt-1">
              Aggregated scan history, trending threats, and domain reputation analysis
            </p>
          </div>
          <Button onClick={refreshData} variant="outline" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Scans</p>
                    <p className="text-3xl font-bold mt-1">{stats.totalScans}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Clean Domains</p>
                    <p className="text-3xl font-bold mt-1 text-green-400">{stats.cleanDomains}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Suspicious</p>
                    <p className="text-3xl font-bold mt-1 text-yellow-400">{stats.suspiciousDomains}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="glass-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Malicious</p>
                    <p className="text-3xl font-bold mt-1 text-red-400">{stats.maliciousDomains}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline Chart */}
          <Card className="glass-card border-border/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Threat Activity (30 Days)
              </CardTitle>
              <CardDescription>Threats detected and blocked over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                    />
                    <Area type="monotone" dataKey="threats" stroke="#ef4444" fill="url(#colorThreats)" name="Threats" />
                    <Area type="monotone" dataKey="blocked" stroke="#22c55e" fill="url(#colorBlocked)" name="Blocked" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Pie Chart */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Threat Categories
              </CardTitle>
              <CardDescription>Distribution by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="history" className="gap-2">
              <Clock className="w-4 h-4" />
              Scan History
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending Threats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Recent Domain Scans</CardTitle>
                <CardDescription>History of all domain security scans</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Domain</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Malicious</TableHead>
                      <TableHead className="hidden sm:table-cell">Suspicious</TableHead>
                      <TableHead>Reputation</TableHead>
                      <TableHead className="hidden md:table-cell">Scanned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scanHistory.map((scan) => (
                      <TableRow key={scan.id} className="border-border/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            {scan.domain}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(scan.status)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className={scan.maliciousCount > 0 ? 'text-red-400' : 'text-muted-foreground'}>
                            {scan.maliciousCount}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className={scan.suspiciousCount > 0 ? 'text-yellow-400' : 'text-muted-foreground'}>
                            {scan.suspiciousCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  scan.reputation >= 80 ? 'bg-green-500' : 
                                  scan.reputation >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${scan.reputation}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">{scan.reputation}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {new Date(scan.scannedAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trending">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Trending Threats</CardTitle>
                <CardDescription>Most active threat patterns detected</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Threat</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead className="hidden sm:table-cell">Occurrences</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trendingThreats.map((threat) => (
                      <TableRow key={threat.id} className="border-border/50">
                        <TableCell className="font-medium">{threat.name}</TableCell>
                        <TableCell className="text-muted-foreground">{threat.category}</TableCell>
                        <TableCell>{getSeverityBadge(threat.severity)}</TableCell>
                        <TableCell className="hidden sm:table-cell">{threat.occurrences}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {threat.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-400" />}
                            {threat.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-400" />}
                            {threat.trend === 'stable' && <Activity className="w-4 h-4 text-yellow-400" />}
                            <span className={`text-sm ${
                              threat.trend === 'up' ? 'text-red-400' : 
                              threat.trend === 'down' ? 'text-green-400' : 'text-yellow-400'
                            }`}>
                              {threat.trend === 'up' ? 'Rising' : threat.trend === 'down' ? 'Falling' : 'Stable'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <Card className="glass-card border-border/50 bg-muted/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Disclaimer:</strong> This threat intelligence dashboard displays aggregated data from scans. 
              Data is simulated for demonstration purposes. In production, this would connect to real-time threat databases.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ThreatDashboard;
