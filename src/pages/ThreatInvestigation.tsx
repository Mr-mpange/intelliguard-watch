import { useState, useMemo } from 'react';
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
import { mockPredictions } from '@/services/mockData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ThreatInvestigation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState({
    packet: true,
    timeline: true,
    mitigations: true,
    threatIntel: true,
  });

  // Find the threat prediction
  const threat = useMemo(() => {
    return mockPredictions.find(p => p.id === id);
  }, [id]);

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

  const isNormal = threat.attackType === 'Normal';
  
  const severityConfig = {
    critical: { color: 'bg-red-500', textColor: 'text-red-500', bgLight: 'bg-red-500/10' },
    high: { color: 'bg-orange-500', textColor: 'text-orange-500', bgLight: 'bg-orange-500/10' },
    medium: { color: 'bg-yellow-500', textColor: 'text-yellow-500', bgLight: 'bg-yellow-500/10' },
    low: { color: 'bg-blue-500', textColor: 'text-blue-500', bgLight: 'bg-blue-500/10' },
    info: { color: 'bg-cyber-green', textColor: 'text-cyber-green', bgLight: 'bg-cyber-green/10' },
  };

  const config = severityConfig[threat.severity];

  // Generate mock packet data
  const packetDetails = {
    srcMac: '00:1A:2B:3C:4D:5E',
    dstMac: 'AA:BB:CC:DD:EE:FF',
    ttl: 64,
    ipVersion: 4,
    headerLength: 20,
    totalLength: 1500,
    flags: {
      SYN: threat.attackType === 'Port Scan' || Math.random() > 0.5,
      ACK: Math.random() > 0.3,
      PSH: Math.random() > 0.6,
      RST: threat.attackType === 'DDoS' && Math.random() > 0.7,
      FIN: false,
      URG: false,
    },
    windowSize: 65535,
    checksum: '0x' + Math.random().toString(16).slice(2, 6).toUpperCase(),
    payloadSize: Math.floor(Math.random() * 1400) + 100,
  };

  // Generate timeline events
  const timelineEvents = [
    {
      time: new Date(new Date(threat.timestamp).getTime() - 5000).toISOString(),
      event: 'Initial connection established',
      type: 'info',
    },
    {
      time: new Date(new Date(threat.timestamp).getTime() - 3000).toISOString(),
      event: 'Suspicious pattern detected by ML model',
      type: 'warning',
    },
    {
      time: threat.timestamp,
      event: `${threat.attackType} attack classified`,
      type: 'critical',
    },
    {
      time: new Date(new Date(threat.timestamp).getTime() + 1000).toISOString(),
      event: 'Alert generated and logged',
      type: 'info',
    },
    {
      time: new Date(new Date(threat.timestamp).getTime() + 2000).toISOString(),
      event: 'Automated response initiated',
      type: 'success',
    },
  ];

  // Get mitigations based on attack type
  const getMitigations = () => {
    const mitigationsMap: Record<string, { action: string; priority: 'high' | 'medium' | 'low'; implemented?: boolean }[]> = {
      'DDoS': [
        { action: 'Enable DDoS protection/rate limiting at firewall level', priority: 'high' },
        { action: 'Block source IP range at network perimeter', priority: 'high' },
        { action: 'Contact upstream ISP for traffic scrubbing', priority: 'medium' },
        { action: 'Enable CDN/WAF protection', priority: 'medium' },
        { action: 'Scale up server resources temporarily', priority: 'low' },
      ],
      'SQL Injection': [
        { action: 'Immediately sanitize all user inputs', priority: 'high' },
        { action: 'Use parameterized queries/prepared statements', priority: 'high' },
        { action: 'Deploy Web Application Firewall rules', priority: 'high' },
        { action: 'Audit database access permissions', priority: 'medium' },
        { action: 'Review and rotate database credentials', priority: 'medium' },
      ],
      'XSS': [
        { action: 'Implement Content Security Policy (CSP)', priority: 'high' },
        { action: 'Sanitize all rendered user content', priority: 'high' },
        { action: 'Enable HTTP-only and Secure cookie flags', priority: 'medium' },
        { action: 'Deploy XSS detection WAF rules', priority: 'medium' },
      ],
      'Brute Force': [
        { action: 'Implement progressive login delays', priority: 'high' },
        { action: 'Enable CAPTCHA after failed attempts', priority: 'high' },
        { action: 'Block source IP temporarily', priority: 'medium' },
        { action: 'Enable multi-factor authentication', priority: 'medium' },
        { action: 'Send alert to account owner', priority: 'low' },
      ],
      'Port Scan': [
        { action: 'Block source IP at firewall', priority: 'medium' },
        { action: 'Enable port scan detection alerts', priority: 'low' },
        { action: 'Verify exposed services are intentional', priority: 'low' },
        { action: 'Audit firewall rules', priority: 'low' },
      ],
      'Zero-Day': [
        { action: 'Isolate affected systems immediately', priority: 'high' },
        { action: 'Capture full packet data for forensic analysis', priority: 'high' },
        { action: 'Enable enhanced logging across all systems', priority: 'high' },
        { action: 'Notify security incident response team', priority: 'high' },
        { action: 'Block source IP and related ranges', priority: 'medium' },
        { action: 'Check for indicators of compromise (IOCs)', priority: 'medium' },
      ],
      'Malware': [
        { action: 'Isolate infected endpoint from network', priority: 'high' },
        { action: 'Initiate malware scan across network', priority: 'high' },
        { action: 'Block C2 communication channels', priority: 'high' },
        { action: 'Preserve forensic evidence', priority: 'medium' },
        { action: 'Reset all credentials on affected systems', priority: 'medium' },
      ],
      'Phishing': [
        { action: 'Block phishing domain at DNS/firewall', priority: 'high' },
        { action: 'Alert affected users to change credentials', priority: 'high' },
        { action: 'Report phishing domain to registrar', priority: 'medium' },
        { action: 'Enable additional email filtering', priority: 'medium' },
      ],
      'Man-in-the-Middle': [
        { action: 'Terminate compromised connections', priority: 'high' },
        { action: 'Enforce certificate pinning', priority: 'high' },
        { action: 'Audit SSL/TLS configurations', priority: 'medium' },
        { action: 'Review and rotate encryption keys', priority: 'medium' },
      ],
      'Normal': [
        { action: 'Continue standard monitoring', priority: 'low', implemented: true },
        { action: 'No immediate action required', priority: 'low', implemented: true },
      ],
    };

    return mitigationsMap[threat.attackType] || [
      { action: 'Block source IP at firewall', priority: 'high' },
      { action: 'Enable enhanced logging', priority: 'medium' },
      { action: 'Investigate traffic patterns', priority: 'medium' },
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button 
            variant="ghost" 
            onClick={() => navigate('/results')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Results
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={cn('p-4 rounded-xl', config.bgLight)}>
                {isNormal ? (
                  <Shield className={cn('w-8 h-8', config.textColor)} />
                ) : threat.isZeroDay ? (
                  <Zap className="w-8 h-8 text-cyber-red" />
                ) : (
                  <AlertTriangle className={cn('w-8 h-8', config.textColor)} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold">{threat.attackType}</h1>
                  {threat.isZeroDay && (
                    <Badge variant="destructive" className="animate-pulse">
                      Zero-Day
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  Threat ID: {threat.id}
                </p>
              </div>
            </div>
            <Badge className={cn('text-sm px-4 py-2', config.color, 'text-white')}>
              {threat.severity.toUpperCase()}
            </Badge>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-xl font-bold">{(threat.confidence * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-cyber-purple" />
                <div>
                  <p className="text-sm text-muted-foreground">Anomaly Score</p>
                  <p className="text-xl font-bold">{(threat.anomalyScore * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-cyber-blue" />
                <div>
                  <p className="text-sm text-muted-foreground">Protocol</p>
                  <p className="text-xl font-bold">{threat.protocol}</p>
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
                  <p className="text-xl font-bold">{formatDistanceToNow(new Date(threat.timestamp), { addSuffix: true })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Source & Destination */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="w-5 h-5 text-cyber-red" />
                Source
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">IP Address</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono bg-muted px-2 py-1 rounded">{threat.sourceIP}</code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(threat.sourceIP)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Port</span>
                <code className="font-mono bg-muted px-2 py-1 rounded">
                  {Math.floor(Math.random() * 60000) + 1024}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">MAC Address</span>
                <code className="font-mono bg-muted px-2 py-1 rounded">{packetDetails.srcMac}</code>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                Lookup IP Reputation
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="w-5 h-5 text-cyber-green" />
                Destination
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">IP Address</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono bg-muted px-2 py-1 rounded">{threat.destinationIP}</code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(threat.destinationIP)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Port</span>
                <code className="font-mono bg-muted px-2 py-1 rounded">{threat.port}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">MAC Address</span>
                <code className="font-mono bg-muted px-2 py-1 rounded">{packetDetails.dstMac}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Service</span>
                <Badge variant="outline">
                  {threat.port === 80 ? 'HTTP' : threat.port === 443 ? 'HTTPS' : threat.port === 22 ? 'SSH' : threat.port === 3306 ? 'MySQL' : 'Custom'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Packet Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className="glass-card">
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection('packet')}
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Packet Details
                </div>
                {expandedSections.packet ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.packet && (
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">IP Header</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Version</span>
                        <span className="font-mono text-sm">IPv{packetDetails.ipVersion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">TTL</span>
                        <span className="font-mono text-sm">{packetDetails.ttl}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Header Length</span>
                        <span className="font-mono text-sm">{packetDetails.headerLength} bytes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Length</span>
                        <span className="font-mono text-sm">{packetDetails.totalLength} bytes</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">TCP Flags</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(packetDetails.flags).map(([flag, active]) => (
                        <Badge 
                          key={flag} 
                          variant={active ? 'default' : 'outline'}
                          className={cn(!active && 'opacity-50')}
                        >
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">Additional Info</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Window Size</span>
                        <span className="font-mono text-sm">{packetDetails.windowSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Checksum</span>
                        <span className="font-mono text-sm">{packetDetails.checksum}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Payload Size</span>
                        <span className="font-mono text-sm">{packetDetails.payloadSize} bytes</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">Detection Details</h4>
                  <p className="text-sm">{threat.details}</p>
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card className="glass-card">
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection('timeline')}
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Event Timeline
                </div>
                {expandedSections.timeline ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.timeline && (
              <CardContent>
                <div className="relative">
                  {timelineEvents.map((event, index) => (
                    <div key={index} className="flex gap-4 mb-6 last:mb-0">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-3 h-3 rounded-full',
                          event.type === 'critical' ? 'bg-cyber-red' :
                          event.type === 'warning' ? 'bg-yellow-500' :
                          event.type === 'success' ? 'bg-cyber-green' :
                          'bg-muted-foreground'
                        )} />
                        {index < timelineEvents.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium">{event.event}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.time), 'HH:mm:ss.SSS')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Threat Intelligence Enrichment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-8"
        >
          <Card className="glass-card">
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection('threatIntel')}
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Threat Intelligence Enrichment
                </div>
                {expandedSections.threatIntel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.threatIntel && (
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <ThreatIntelPanel ip={threat.sourceIP} />
                  <ThreatIntelPanel ip={threat.destinationIP} />
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Recommended Mitigations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-card">
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection('mitigations')}
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileWarning className="w-5 h-5" />
                  Recommended Mitigations
                </div>
                {expandedSections.mitigations ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.mitigations && (
              <CardContent>
                <div className="space-y-4">
                  {getMitigations().map((mitigation, index) => (
                    <div 
                      key={index}
                      className={cn(
                        'flex items-start gap-4 p-4 rounded-lg border',
                        mitigation.implemented ? 'border-cyber-green/30 bg-cyber-green/5' : 'border-border'
                      )}
                    >
                      <div className={cn(
                        'p-2 rounded-lg',
                        mitigation.priority === 'high' ? 'bg-red-500/10' :
                        mitigation.priority === 'medium' ? 'bg-yellow-500/10' :
                        'bg-blue-500/10'
                      )}>
                        {mitigation.implemented ? (
                          <CheckCircle2 className="w-5 h-5 text-cyber-green" />
                        ) : (
                          <AlertTriangle className={cn(
                            'w-5 h-5',
                            mitigation.priority === 'high' ? 'text-red-500' :
                            mitigation.priority === 'medium' ? 'text-yellow-500' :
                            'text-blue-500'
                          )} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn(
                            mitigation.priority === 'high' ? 'border-red-500 text-red-500' :
                            mitigation.priority === 'medium' ? 'border-yellow-500 text-yellow-500' :
                            'border-blue-500 text-blue-500'
                          )}>
                            {mitigation.priority.toUpperCase()}
                          </Badge>
                          {mitigation.implemented && (
                            <Badge className="bg-cyber-green text-white">Implemented</Badge>
                          )}
                        </div>
                        <p className="text-sm">{mitigation.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default ThreatInvestigation;
