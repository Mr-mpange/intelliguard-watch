import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  GitCompare, 
  Plus, 
  X, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Lock,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DomainScan {
  id: string;
  domain: string;
  is_malicious: boolean;
  positives: number;
  total: number;
  reputation: number | null;
  ssl_issuer: string | null;
  ssl_valid_from: string | null;
  ssl_valid_to: string | null;
  created_at: string;
}

interface ComparisonDomain {
  domain: string;
  latestScan: DomainScan | null;
  loading: boolean;
}

const MAX_DOMAINS = 4;

export const DomainComparison = () => {
  const { user } = useAuth();
  const [domains, setDomains] = useState<ComparisonDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  
  // Fetch user's scanned domains on mount
  useEffect(() => {
    const fetchScannedDomains = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('domain_scans')
        .select('domain')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const uniqueDomains = [...new Set(data.map((d) => d.domain))];
        setAvailableDomains(uniqueDomains);
      }
    };
    
    fetchScannedDomains();
  }, [user]);
  
  const fetchDomainData = async (domain: string): Promise<DomainScan | null> => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('domain_scans')
      .select('*')
      .eq('user_id', user.id)
      .eq('domain', domain)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) return null;
    return data;
  };
  
  const addDomain = async (domain: string) => {
    if (!domain.trim()) return;
    if (domains.length >= MAX_DOMAINS) {
      toast.error(`Maximum ${MAX_DOMAINS} domains can be compared`);
      return;
    }
    if (domains.some((d) => d.domain === domain)) {
      toast.error('Domain already added');
      return;
    }
    
    setDomains((prev) => [...prev, { domain, latestScan: null, loading: true }]);
    
    const scanData = await fetchDomainData(domain);
    
    setDomains((prev) =>
      prev.map((d) =>
        d.domain === domain ? { ...d, latestScan: scanData, loading: false } : d
      )
    );
    
    if (!scanData) {
      toast.warning(`No scan data found for ${domain}. Scan it first in the Analyze page.`);
    }
    
    setNewDomain('');
  };
  
  const removeDomain = (domain: string) => {
    setDomains((prev) => prev.filter((d) => d.domain !== domain));
  };
  
  const getReputationColor = (reputation: number | null) => {
    if (reputation === null) return 'text-muted-foreground';
    if (reputation >= 70) return 'text-green-500';
    if (reputation >= 40) return 'text-yellow-500';
    return 'text-destructive';
  };
  
  const getReputationIcon = (reputation: number | null) => {
    if (reputation === null) return <Minus className="w-4 h-4" />;
    if (reputation >= 70) return <TrendingUp className="w-4 h-4" />;
    if (reputation >= 40) return <Minus className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };
  
  const getSSLStatus = (validTo: string | null) => {
    if (!validTo) return { status: 'unknown', color: 'text-muted-foreground', label: 'Unknown' };
    
    const expiryDate = new Date(validTo);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', color: 'text-destructive', label: 'Expired' };
    if (daysUntilExpiry < 30) return { status: 'expiring', color: 'text-yellow-500', label: `${daysUntilExpiry}d left` };
    return { status: 'valid', color: 'text-green-500', label: 'Valid' };
  };
  
  const domainsWithData = domains.filter((d) => d.latestScan);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-primary" />
            Domain Comparison
          </h2>
          <p className="text-muted-foreground">Compare security metrics across multiple domains</p>
        </div>
      </div>
      
      {/* Domain selector */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Select Domains to Compare</CardTitle>
          <CardDescription>Choose up to {MAX_DOMAINS} domains from your scan history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Selected domains */}
            <AnimatePresence>
              {domains.map((d) => (
                <motion.div
                  key={d.domain}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Badge 
                    variant="secondary" 
                    className="px-3 py-1.5 flex items-center gap-2 text-sm"
                  >
                    <Globe className="w-3 h-3" />
                    {d.domain}
                    {d.loading && (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    )}
                    <button
                      onClick={() => removeDomain(d.domain)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Add domain */}
            {domains.length < MAX_DOMAINS && (
              <div className="flex gap-2 items-center">
                <Select value={newDomain} onValueChange={(value) => addDomain(value)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select domain..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDomains
                      .filter((d) => !domains.some((existing) => existing.domain === d))
                      .map((domain) => (
                        <SelectItem key={domain} value={domain}>
                          {domain}
                        </SelectItem>
                      ))}
                    {availableDomains.filter((d) => !domains.some((existing) => existing.domain === d)).length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No more domains available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                
                <span className="text-muted-foreground">or</span>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter domain..."
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addDomain(newDomain)}
                    className="w-[180px]"
                  />
                  <Button size="icon" variant="outline" onClick={() => addDomain(newDomain)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Comparison table */}
      {domainsWithData.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Security Comparison</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Metric</TableHead>
                  {domainsWithData.map((d) => (
                    <TableHead key={d.domain} className="text-center min-w-[150px]">
                      {d.domain}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Status */}
                <TableRow>
                  <TableCell className="font-medium">Status</TableCell>
                  {domainsWithData.map((d) => (
                    <TableCell key={d.domain} className="text-center">
                      {d.latestScan?.is_malicious ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Malicious
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1 bg-green-500/10 text-green-500 border-green-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Clean
                        </Badge>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                
                {/* Detections */}
                <TableRow>
                  <TableCell className="font-medium">Detections</TableCell>
                  {domainsWithData.map((d) => (
                    <TableCell key={d.domain} className="text-center">
                      <span className={d.latestScan!.positives > 0 ? 'text-destructive font-medium' : ''}>
                        {d.latestScan!.positives} / {d.latestScan!.total}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
                
                {/* Reputation */}
                <TableRow>
                  <TableCell className="font-medium">Reputation Score</TableCell>
                  {domainsWithData.map((d) => (
                    <TableCell key={d.domain} className="text-center">
                      <div className={`flex items-center justify-center gap-1 ${getReputationColor(d.latestScan!.reputation)}`}>
                        {getReputationIcon(d.latestScan!.reputation)}
                        <span className="font-medium">
                          {d.latestScan!.reputation ?? 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
                
                {/* SSL Status */}
                <TableRow>
                  <TableCell className="font-medium">SSL Certificate</TableCell>
                  {domainsWithData.map((d) => {
                    const ssl = getSSLStatus(d.latestScan!.ssl_valid_to);
                    return (
                      <TableCell key={d.domain} className="text-center">
                        <div className={`flex items-center justify-center gap-1 ${ssl.color}`}>
                          <Lock className="w-3 h-3" />
                          <span>{ssl.label}</span>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
                
                {/* SSL Issuer */}
                <TableRow>
                  <TableCell className="font-medium">SSL Issuer</TableCell>
                  {domainsWithData.map((d) => (
                    <TableCell key={d.domain} className="text-center text-sm text-muted-foreground">
                      {d.latestScan!.ssl_issuer || 'N/A'}
                    </TableCell>
                  ))}
                </TableRow>
                
                {/* Last Scanned */}
                <TableRow>
                  <TableCell className="font-medium">Last Scanned</TableCell>
                  {domainsWithData.map((d) => (
                    <TableCell key={d.domain} className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(d.latestScan!.created_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {/* Empty state */}
      {domains.length === 0 && (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <GitCompare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No domains selected</h3>
            <p className="text-muted-foreground mb-4">
              Select domains from your scan history to compare their security metrics side-by-side
            </p>
            <p className="text-sm text-muted-foreground">
              Don't have any scanned domains? Head to the <a href="/analyze" className="text-primary hover:underline">Analyze page</a> to scan some first.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Summary insights */}
      {domainsWithData.length >= 2 && (
        <Card className="glass-card border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Comparison Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {/* Safest domain */}
              {(() => {
                const safest = domainsWithData
                  .filter((d) => !d.latestScan?.is_malicious)
                  .sort((a, b) => (b.latestScan?.reputation || 0) - (a.latestScan?.reputation || 0))[0];
                
                return safest ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>
                      <strong>{safest.domain}</strong> has the highest security rating
                    </span>
                  </div>
                ) : null;
              })()}
              
              {/* Malicious domains */}
              {(() => {
                const malicious = domainsWithData.filter((d) => d.latestScan?.is_malicious);
                return malicious.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span>
                      <strong>{malicious.map((d) => d.domain).join(', ')}</strong> flagged as malicious
                    </span>
                  </div>
                ) : null;
              })()}
              
              {/* SSL warnings */}
              {(() => {
                const sslIssues = domainsWithData.filter((d) => {
                  const ssl = getSSLStatus(d.latestScan?.ssl_valid_to || null);
                  return ssl.status === 'expired' || ssl.status === 'expiring';
                });
                
                return sslIssues.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-yellow-500" />
                    <span>
                      <strong>{sslIssues.map((d) => d.domain).join(', ')}</strong> have SSL certificate issues
                    </span>
                  </div>
                ) : null;
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DomainComparison;
