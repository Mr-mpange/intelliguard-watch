import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Shield, AlertTriangle, Zap, Clock, Server, 
  Globe, Activity, Terminal, FileWarning, CheckCircle2,
  Copy, ExternalLink, ChevronDown, ChevronUp, Download
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ThreatIntelPanel from '@/components/dashboard/ThreatIntelPanel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ThreatData {
  id: string;
  title: string;
  description: string;
  severity: string;
  threat_type: string;
  source_ip: string | null;
  source_domain: string | null;
  confidence: number | null;
  created_at: string;
  is_read: boolean;
}

const ThreatInvestigation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [threat, setThreat] = useState<ThreatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    timeline: true,
    mitigations: true,
    threatIntel: true,
  });

  useEffect(() => {
    if (!id || !user) return;
    const fetchThreat = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('threat_alerts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        setThreat(null);
      } else {
        setThreat(data);
        // Mark as read
        if (!data.is_read) {
          await supabase.from('threat_alerts').update({ is_read: true }).eq('id', id);
        }
      }
      setLoading(false);
    };
    fetchThreat();
  }, [id, user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!threat) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <AlertTriangle className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Threat Not Found</h2>
          <Button onClick={() => navigate('/results')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Results
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const severityConfig: Record<string, { color: string; textColor: string; bgLight: string }> = {
    critical: { color: 'bg-red-500', textColor: 'text-red-500', bgLight: 'bg-red-500/10' },
    high: { color: 'bg-orange-500', textColor: 'text-orange-500', bgLight: 'bg-orange-500/10' },
    medium: { color: 'bg-yellow-500', textColor: 'text-yellow-500', bgLight: 'bg-yellow-500/10' },
    low: { color: 'bg-blue-500', textColor: 'text-blue-500', bgLight: 'bg-blue-500/10' },
    info: { color: 'bg-cyber-green', textColor: 'text-cyber-green', bgLight: 'bg-cyber-green/10' },
  };

  const config = severityConfig[threat.severity] || severityConfig.info;
  const confidence = threat.confidence || 0;

  const getMitigations = () => {
    const mitigationsMap: Record<string, { action: string; priority: 'high' | 'medium' | 'low' }[]> = {
      'DDoS': [
        { action: 'Enable DDoS protection/rate limiting at firewall level', priority: 'high' },
        { action: 'Block source IP range at network perimeter', priority: 'high' },
        { action: 'Enable CDN/WAF protection', priority: 'medium' },
      ],
      'SQL Injection': [
        { action: 'Sanitize all user inputs immediately', priority: 'high' },
        { action: 'Use parameterized queries/prepared statements', priority: 'high' },
        { action: 'Deploy Web Application Firewall rules', priority: 'high' },
      ],
      'Brute Force': [
        { action: 'Implement progressive login delays', priority: 'high' },
        { action: 'Enable CAPTCHA after failed attempts', priority: 'high' },
        { action: 'Enable multi-factor authentication', priority: 'medium' },
      ],
      'Port Scan': [
        { action: 'Block source IP at firewall', priority: 'medium' },
        { action: 'Audit firewall rules and exposed services', priority: 'low' },
      ],
      'Data Exfiltration': [
        { action: 'Isolate affected systems immediately', priority: 'high' },
        { action: 'Block outbound connections to suspicious IPs', priority: 'high' },
        { action: 'Audit database access logs', priority: 'medium' },
      ],
      'Malware': [
        { action: 'Isolate infected endpoint from network', priority: 'high' },
        { action: 'Block C2 communication channels', priority: 'high' },
        { action: 'Run full system malware scan', priority: 'medium' },
      ],
    };
    return mitigationsMap[threat.threat_type] || [
      { action: 'Block source IP at firewall', priority: 'high' as const },
      { action: 'Enable enhanced logging', priority: 'medium' as const },
      { action: 'Investigate traffic patterns', priority: 'medium' as const },
    ];
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/results')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Results
          </Button>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={cn('p-4 rounded-xl', config.bgLight)}>
                <AlertTriangle className={cn('w-8 h-8', config.textColor)} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{threat.title}</h1>
                <p className="text-muted-foreground">{threat.threat_type} · ID: {threat.id.slice(0, 8)}</p>
              </div>
            </div>
            <Badge className={cn('text-sm px-4 py-2', config.color, 'text-white')}>
              {threat.severity.toUpperCase()}
            </Badge>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-xl font-bold">{confidence}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-cyber-blue" />
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="text-xl font-bold">{threat.threat_type}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-cyber-red" />
                <div>
                  <p className="text-sm text-muted-foreground">Source IP</p>
                  <p className="text-lg font-bold font-mono">{threat.source_ip || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Detected</p>
                  <p className="text-lg font-bold">{formatDistanceToNow(new Date(threat.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Description */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileWarning className="w-5 h-5" /> Threat Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{threat.description}</p>
              {threat.source_ip && (
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-sm text-muted-foreground">Source IP:</span>
                  <code className="font-mono bg-muted px-2 py-1 rounded">{threat.source_ip}</code>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(threat.source_ip!)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {threat.source_domain && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">Domain:</span>
                  <code className="font-mono bg-muted px-2 py-1 rounded">{threat.source_domain}</code>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Mitigations */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <Card className="glass-card">
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('mitigations')}>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Shield className="w-5 h-5" /> Recommended Mitigations</div>
                {expandedSections.mitigations ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.mitigations && (
              <CardContent>
                <div className="space-y-3">
                  {getMitigations().map((m, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <Badge variant={m.priority === 'high' ? 'destructive' : m.priority === 'medium' ? 'default' : 'secondary'} className="mt-0.5 shrink-0">
                        {m.priority.toUpperCase()}
                      </Badge>
                      <p className="text-sm">{m.action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Threat Intel */}
        {(threat.source_domain || threat.source_ip) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="glass-card">
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('threatIntel')}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Globe className="w-5 h-5" /> Threat Intelligence</div>
                  {expandedSections.threatIntel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </CardTitle>
              </CardHeader>
              {expandedSections.threatIntel && (
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {threat.source_domain && <ThreatIntelPanel domain={threat.source_domain} />}
                    {threat.source_ip && <ThreatIntelPanel ip={threat.source_ip} />}
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ThreatInvestigation;
