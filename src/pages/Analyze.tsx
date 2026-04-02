import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileUp, Play, Loader2, CheckCircle2, Info, Globe, Upload, AlertTriangle, ShieldCheck, ExternalLink } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FileUpload from '@/components/dashboard/FileUpload';
import { analyzeTraffic } from '@/services/mockData';
import { AnalysisResult } from '@/types/intelliguard';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { auditLog } from '@/services/auditLog';
import { useAuth } from '@/hooks/useAuth';
import { sendDomainScanAlert } from '@/services/emailNotifications';

const Analyze = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'file' | 'domain'>('file');
  const [domainUrl, setDomainUrl] = useState('');
  const [domainScanResult, setDomainScanResult] = useState<{
    isMalicious: boolean;
    positives: number;
    total: number;
    categories: Record<string, string>;
    reputation: number;
    lastAnalysisDate: string | null;
    engines: Array<{ name: string; result: string; category: string }>;
    sslCertificate?: { issuer: string; validFrom: string; validTo: string };
    message?: string;
  } | null>(null);
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (analysisMode === 'file' && !selectedFile) return;
    if (analysisMode === 'domain' && !domainUrl.trim()) {
      toast.error('Please enter a domain or URL');
      return;
    }

    setIsAnalyzing(true);
    setDomainScanResult(null);
    
    try {
      if (analysisMode === 'domain') {
        // Call the VirusTotal edge function
        const { data, error } = await supabase.functions.invoke('scan-domain', {
          body: { domain: domainUrl },
        });

        if (error) throw error;

        setDomainScanResult(data);
        await auditLog.domainScan(domainUrl, data.isMalicious);

        // Save scan to database
        if (user) {
          const maliciousCount = data.engines?.filter((e: { category: string }) => e.category === 'malicious').length || 0;
          const suspiciousCount = data.engines?.filter((e: { category: string }) => e.category === 'suspicious').length || 0;
          
          await supabase.from('domain_scans').insert({
            user_id: user.id,
            domain: domainUrl.replace(/^https?:\/\//, '').split('/')[0],
            is_malicious: data.isMalicious,
            positives: data.positives,
            total: data.total,
            reputation: data.reputation,
            categories: data.categories || {},
            engines: data.engines || [],
            ssl_issuer: data.sslCertificate?.issuer,
            ssl_valid_from: data.sslCertificate?.validFrom,
            ssl_valid_to: data.sslCertificate?.validTo,
          });

          // Send email alert for malicious domains
          if (data.isMalicious && user.email) {
            sendDomainScanAlert(
              user.email,
              profile?.full_name || undefined,
              domainUrl,
              maliciousCount,
              suspiciousCount
            );
          }
        }
        
        // Create analysis result for navigation
        const domainResult: AnalysisResult = {
          summary: {
            totalRecords: 1,
            threats: data.isMalicious ? 1 : 0,
            zeroDay: 0,
            normal: data.isMalicious ? 0 : 1,
            avgConfidence: data.positives > 0 ? data.positives / data.total : 0,
          },
          predictions: data.isMalicious ? [{
            id: '1',
            attackType: 'Malware',
            severity: data.positives > 5 ? 'critical' : data.positives > 2 ? 'high' : 'medium',
            confidence: data.positives / (data.total || 1),
            sourceIP: domainUrl,
            destinationIP: 'N/A',
            timestamp: new Date().toISOString(),
            port: 443,
            protocol: 'HTTPS',
            anomalyScore: data.positives / (data.total || 1),
            isZeroDay: false,
            details: `Domain flagged by ${data.positives} security vendors`,
          }] : [],
          attackDistribution: data.isMalicious ? [{ name: 'Malware', value: 1 }] : [],
          severityDistribution: data.isMalicious 
            ? [{ severity: data.positives > 5 ? 'critical' as const : 'high' as const, count: 1 }] 
            : [],
          timelineData: [{ time: new Date().toISOString(), threats: data.isMalicious ? 1 : 0, normal: data.isMalicious ? 0 : 1 }],
        };
        setResult(domainResult);
        
        toast.success('Domain scan complete!', {
          description: data.isMalicious 
            ? `${data.positives} security vendors flagged this domain` 
            : 'No threats detected',
        });
      } else {
        // Read file content and send to AI analysis edge function
        const fileContent = await selectedFile!.text();
        
        const { data, error } = await supabase.functions.invoke('analyze-traffic', {
          body: { trafficData: fileContent, fileName: selectedFile!.name },
        });

        if (error) throw error;
        
        const analysisResult: AnalysisResult = {
          summary: data.summary || { totalRecords: 0, threats: 0, zeroDay: 0, normal: 0, avgConfidence: 0 },
          predictions: (data.predictions || []).map((p: Record<string, unknown>) => ({
            ...p,
            confidence: Number(p.confidence) || 0,
            anomalyScore: Number(p.anomalyScore) || 0,
            port: Number(p.port) || 0,
          })),
          attackDistribution: data.attackDistribution || [],
          severityDistribution: data.severityDistribution || [],
          timelineData: data.timelineData || [],
        };
        
        setResult(analysisResult);
        await auditLog.fileAnalysis(selectedFile!.name, analysisResult.summary.threats);
        toast.success('AI Analysis complete!', {
          description: `Found ${analysisResult.summary.threats} threats in ${analysisResult.summary.totalRecords} records`,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Please try again or check your input';
      toast.error('Analysis failed', {
        description: message,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const viewResults = () => {
    navigate('/results', { state: { result } });
  };

  const isReadyToAnalyze = analysisMode === 'file' ? !!selectedFile : !!domainUrl.trim();

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-cyber-blue/20 mb-6">
            <Search className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Analyze Traffic</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Upload your network traffic logs or scan a domain for ML-powered threat detection
          </p>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-cyber-blue/10">
              <Info className="w-5 h-5 text-cyber-blue" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">How It Works</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">1</span>
                  Upload traffic logs or enter a domain/URL to scan
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">2</span>
                  Our ML models analyze patterns for known attacks
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">3</span>
                  Anomaly detection identifies potential zero-day threats
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">4</span>
                  Review detailed results with severity scores and recommendations
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Analysis Mode Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8"
        >
          <Tabs value={analysisMode} onValueChange={(v) => { setAnalysisMode(v as 'file' | 'domain'); setResult(null); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="domain" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Domain Scan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file">
              <div className="flex items-center gap-2 mb-6">
                <FileUp className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Upload Traffic Logs</h2>
              </div>

              <FileUpload
                onFileSelect={handleFileSelect}
                isLoading={isAnalyzing}
                accept=".csv,.json,.log"
                maxSize={10 * 1024 * 1024}
              />
            </TabsContent>

            <TabsContent value="domain">
              <div className="flex items-center gap-2 mb-6">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Scan Domain or URL</h2>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={domainUrl}
                    onChange={(e) => setDomainUrl(e.target.value)}
                    placeholder="Enter domain or URL (e.g., example.com or https://example.com)"
                    className="pl-12 h-14 text-lg"
                    disabled={isAnalyzing}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  We'll scan the domain for malware, phishing indicators, SSL issues, and reputation data
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Analyze Button */}
          <AnimatePresence>
            {isReadyToAnalyze && !isAnalyzing && !result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 text-center"
              >
                <button
                  onClick={handleAnalyze}
                  className="cyber-btn inline-flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  {analysisMode === 'file' ? 'Start Analysis' : 'Scan Domain'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading State */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 text-center"
              >
                <div className="inline-flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {analysisMode === 'file' ? 'Analyzing Traffic Patterns' : 'Scanning Domain'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {analysisMode === 'file' ? 'Running ML models...' : 'Checking reputation & threats...'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Domain Scan Results - Detailed */}
        <AnimatePresence>
          {domainScanResult && analysisMode === 'domain' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-8 ${domainScanResult.isMalicious ? 'border-cyber-red/30' : 'border-cyber-green/30'}`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg ${domainScanResult.isMalicious ? 'bg-cyber-red/10' : 'bg-cyber-green/10'}`}>
                  {domainScanResult.isMalicious ? (
                    <AlertTriangle className="w-6 h-6 text-cyber-red" />
                  ) : (
                    <ShieldCheck className="w-6 h-6 text-cyber-green" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {domainScanResult.isMalicious ? 'Threats Detected' : 'Domain is Clean'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Scanned: {domainUrl}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-3xl font-bold font-mono">{domainScanResult.total}</p>
                  <p className="text-sm text-muted-foreground">Engines Scanned</p>
                </div>
                <div className={`text-center p-4 rounded-lg ${domainScanResult.positives > 0 ? 'bg-cyber-red/10 border border-cyber-red/20' : 'bg-cyber-green/10 border border-cyber-green/20'}`}>
                  <p className={`text-3xl font-bold font-mono ${domainScanResult.positives > 0 ? 'text-cyber-red' : 'text-cyber-green'}`}>
                    {domainScanResult.positives}
                  </p>
                  <p className="text-sm text-muted-foreground">Detections</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-3xl font-bold font-mono">{domainScanResult.reputation}</p>
                  <p className="text-sm text-muted-foreground">Reputation Score</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-sm font-medium">
                    {domainScanResult.lastAnalysisDate 
                      ? new Date(domainScanResult.lastAnalysisDate).toLocaleDateString() 
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">Last Scanned</p>
                </div>
              </div>

              {/* Categories */}
              {Object.keys(domainScanResult.categories).length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(domainScanResult.categories).map(([engine, category]) => (
                      <span key={engine} className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Flagged Engines */}
              {domainScanResult.engines.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-2 text-cyber-red">Flagged by Security Vendors</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {domainScanResult.engines.map((engine, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-cyber-red/5 border border-cyber-red/10">
                        <span className="font-medium">{engine.name}</span>
                        <span className="text-sm text-cyber-red">{engine.result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SSL Certificate */}
              {domainScanResult.sslCertificate && (
                <div className="mb-6">
                  <h4 className="font-medium mb-2">SSL Certificate</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Issuer</p>
                      <p className="font-medium">{domainScanResult.sslCertificate.issuer}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valid From</p>
                      <p className="font-medium">{domainScanResult.sslCertificate.validFrom}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valid To</p>
                      <p className="font-medium">{domainScanResult.sslCertificate.validTo}</p>
                    </div>
                  </div>
                </div>
              )}

              {domainScanResult.message && (
                <p className="text-sm text-muted-foreground italic mb-4">{domainScanResult.message}</p>
              )}

              <div className="flex items-center justify-center gap-4">
                <a
                  href={`https://www.virustotal.com/gui/domain/${domainUrl.replace(/^https?:\/\//, '').split('/')[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on VirusTotal
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File Analysis Results Summary */}
        <AnimatePresence>
          {result && analysisMode === 'file' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 border-cyber-green/30"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-cyber-green/10">
                  <CheckCircle2 className="w-6 h-6 text-cyber-green" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Analysis Complete</h3>
                  <p className="text-sm text-muted-foreground">
                    Processed {result.summary.totalRecords} records
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-3xl font-bold font-mono">{result.summary.totalRecords}</p>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-cyber-red/10 border border-cyber-red/20">
                  <p className="text-3xl font-bold font-mono text-cyber-red">{result.summary.threats}</p>
                  <p className="text-sm text-muted-foreground">Threats</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-cyber-yellow/10 border border-cyber-yellow/20">
                  <p className="text-3xl font-bold font-mono text-cyber-yellow">{result.summary.zeroDay}</p>
                  <p className="text-sm text-muted-foreground">Zero-Day</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-cyber-green/10 border border-cyber-green/20">
                  <p className="text-3xl font-bold font-mono text-cyber-green">{result.summary.normal}</p>
                  <p className="text-sm text-muted-foreground">Normal</p>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={viewResults}
                  className="cyber-btn inline-flex items-center gap-2"
                >
                  View Detailed Results
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Supported Formats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-muted-foreground"
        >
          <p>Supported formats: CSV, JSON, LOG</p>
          <p className="mt-1">Compatible with CICIDS2017, UNSW-NB15, and standard network logs</p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Analyze;
