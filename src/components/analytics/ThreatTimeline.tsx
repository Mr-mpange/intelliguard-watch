import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Calendar, TrendingUp, AlertTriangle, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { ThreatSeverity, AttackType } from '@/types/intelliguard';

type TimeRange = '7d' | '30d' | '90d';

interface ThreatDataPoint {
  date: string;
  timestamp: Date;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
  attackTypes: Record<AttackType, number>;
}

const generateMockTimelineData = (days: number): ThreatDataPoint[] => {
  const endDate = new Date();
  const startDate = subDays(endDate, days - 1);
  
  return eachDayOfInterval({ start: startDate, end: endDate }).map((date) => {
    const dayOfWeek = date.getDay();
    const baseMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1;
    
    const critical = Math.floor(Math.random() * 5 * baseMultiplier);
    const high = Math.floor(Math.random() * 15 * baseMultiplier);
    const medium = Math.floor(Math.random() * 30 * baseMultiplier);
    const low = Math.floor(Math.random() * 20 * baseMultiplier);
    
    const attackTypes: Record<AttackType, number> = {
      'DDoS': Math.floor(Math.random() * 10 * baseMultiplier),
      'SQL Injection': Math.floor(Math.random() * 8 * baseMultiplier),
      'XSS': Math.floor(Math.random() * 12 * baseMultiplier),
      'Brute Force': Math.floor(Math.random() * 15 * baseMultiplier),
      'Port Scan': Math.floor(Math.random() * 20 * baseMultiplier),
      'Malware': Math.floor(Math.random() * 6 * baseMultiplier),
      'Phishing': Math.floor(Math.random() * 10 * baseMultiplier),
      'Zero-Day': Math.floor(Math.random() * 2),
      'Man-in-the-Middle': Math.floor(Math.random() * 3 * baseMultiplier),
      'Normal': 0,
    };
    
    return {
      date: format(date, 'MMM dd'),
      timestamp: startOfDay(date),
      critical,
      high,
      medium,
      low,
      total: critical + high + medium + low,
      attackTypes,
    };
  });
};

const chartConfig: ChartConfig = {
  critical: {
    label: 'Critical',
    color: 'hsl(0 84% 60%)',
  },
  high: {
    label: 'High',
    color: 'hsl(25 95% 53%)',
  },
  medium: {
    label: 'Medium',
    color: 'hsl(48 96% 53%)',
  },
  low: {
    label: 'Low',
    color: 'hsl(142 76% 36%)',
  },
};

const attackTypeColors: Record<string, string> = {
  'DDoS': 'hsl(0 84% 60%)',
  'SQL Injection': 'hsl(25 95% 53%)',
  'XSS': 'hsl(48 96% 53%)',
  'Brute Force': 'hsl(142 76% 36%)',
  'Port Scan': 'hsl(199 89% 48%)',
  'Malware': 'hsl(271 91% 65%)',
  'Phishing': 'hsl(339 90% 51%)',
  'Zero-Day': 'hsl(262 83% 58%)',
  'Man-in-the-Middle': 'hsl(173 80% 40%)',
};

export const ThreatTimeline = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  
  const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
  
  const data = useMemo(() => generateMockTimelineData(daysMap[timeRange]), [timeRange]);
  
  const stats = useMemo(() => {
    const totalThreats = data.reduce((sum, d) => sum + d.total, 0);
    const criticalThreats = data.reduce((sum, d) => sum + d.critical, 0);
    const highThreats = data.reduce((sum, d) => sum + d.high, 0);
    const avgDaily = totalThreats / data.length;
    
    // Calculate trend (compare last half to first half)
    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint).reduce((sum, d) => sum + d.total, 0);
    const secondHalf = data.slice(midpoint).reduce((sum, d) => sum + d.total, 0);
    const trendPercent = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    
    return { totalThreats, criticalThreats, highThreats, avgDaily, trendPercent };
  }, [data]);
  
  const attackTypeData = useMemo(() => {
    const aggregated: Record<string, number> = {};
    data.forEach((day) => {
      Object.entries(day.attackTypes).forEach(([type, count]) => {
        if (type !== 'Normal') {
          aggregated[type] = (aggregated[type] || 0) + count;
        }
      });
    });
    return Object.entries(aggregated)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [data]);
  
  const handleDayClick = (dayData: ThreatDataPoint) => {
    setExpandedDay(expandedDay === dayData.date ? null : dayData.date);
  };
  
  const expandedDayData = expandedDay ? data.find((d) => d.date === expandedDay) : null;
  
  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Threat Timeline
          </h2>
          <p className="text-muted-foreground">Attack patterns and severity trends over time</p>
        </div>
        
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              <Calendar className="w-4 h-4 mr-1" />
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.totalThreats.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Threats</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">{stats.criticalThreats}</div>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-500">{stats.highThreats}</div>
            <p className="text-sm text-muted-foreground">High Severity</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold flex items-center gap-1 ${stats.trendPercent > 0 ? 'text-destructive' : 'text-green-500'}`}>
              {stats.trendPercent > 0 ? '+' : ''}{stats.trendPercent.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">Trend</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main timeline chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Threat Severity Over Time</CardTitle>
          <CardDescription>Click on a data point to drill down into attack details</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                onClick={(e) => e?.activePayload && handleDayClick(e.activePayload[0].payload)}
                className="cursor-pointer"
              >
                <defs>
                  <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(25 95% 53%)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(25 95% 53%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="mediumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(48 96% 53%)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(48 96% 53%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="lowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="critical" stackId="1" stroke="hsl(0 84% 60%)" fill="url(#criticalGradient)" />
                <Area type="monotone" dataKey="high" stackId="1" stroke="hsl(25 95% 53%)" fill="url(#highGradient)" />
                <Area type="monotone" dataKey="medium" stackId="1" stroke="hsl(48 96% 53%)" fill="url(#mediumGradient)" />
                <Area type="monotone" dataKey="low" stackId="1" stroke="hsl(142 76% 36%)" fill="url(#lowGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      
      {/* Drill-down panel */}
      <AnimatePresence>
        {expandedDayData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass-card border-primary/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ChevronDown className="w-5 h-5 text-primary" />
                    {expandedDayData.date} - Detailed Breakdown
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setExpandedDay(null)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Severity breakdown */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Severity Distribution
                    </h4>
                    <div className="space-y-2">
                      {[
                        { label: 'Critical', value: expandedDayData.critical, color: 'bg-red-500' },
                        { label: 'High', value: expandedDayData.high, color: 'bg-orange-500' },
                        { label: 'Medium', value: expandedDayData.medium, color: 'bg-yellow-500' },
                        { label: 'Low', value: expandedDayData.low, color: 'bg-green-500' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${color}`} />
                          <span className="flex-1 text-sm">{label}</span>
                          <span className="font-mono font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Attack types breakdown */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Attack Types
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(expandedDayData.attackTypes)
                        .filter(([type, count]) => type !== 'Normal' && count > 0)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: attackTypeColors[type] || 'hsl(var(--muted))' }}
                            />
                            <span className="flex-1 text-sm">{type}</span>
                            <span className="font-mono font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Attack type distribution chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Top Attack Types</CardTitle>
          <CardDescription>Most common attack patterns in the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attackTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThreatTimeline;
