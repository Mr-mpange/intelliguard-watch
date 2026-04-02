import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Plus, Trash2, RefreshCw, Clock, Shield, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MonitoredDomain {
  id: string;
  domain: string;
  is_active: boolean;
  scan_frequency: string;
  last_scanned_at: string | null;
  last_status: string | null;
  created_at: string;
}

const DomainMonitoringPanel = () => {
  const { user } = useAuth();
  const [domains, setDomains] = useState<MonitoredDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [newFrequency, setNewFrequency] = useState('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const fetchDomains = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('monitored_domains')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [user]);

  const addDomain = async () => {
    if (!user || !newDomain.trim()) return;
    
    setIsAdding(true);
    try {
      const cleanDomain = newDomain.replace(/^https?:\/\//, '').split('/')[0];
      
      const { error } = await supabase.from('monitored_domains').insert({
        user_id: user.id,
        domain: cleanDomain,
        scan_frequency: newFrequency,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Domain already being monitored');
        } else {
          throw error;
        }
      } else {
        toast.success('Domain added to monitoring');
        setNewDomain('');
        fetchDomains();
      }
    } catch (error) {
      toast.error('Failed to add domain');
    } finally {
      setIsAdding(false);
    }
  };

  const removeDomain = async (id: string) => {
    try {
      const { error } = await supabase
        .from('monitored_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Domain removed');
      setDomains(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      toast.error('Failed to remove domain');
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('monitored_domains')
        .update({ is_active: !currentActive })
        .eq('id', id);

      if (error) throw error;
      
      setDomains(prev => prev.map(d => 
        d.id === id ? { ...d, is_active: !currentActive } : d
      ));
    } catch (error) {
      toast.error('Failed to update domain');
    }
  };

  const triggerManualScan = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-scan');
      
      if (error) throw error;
      
      toast.success(`Scanned ${data?.scanned || 0} domains`);
      fetchDomains();
    } catch (error) {
      toast.error('Failed to run scan');
    } finally {
      setIsScanning(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'clean':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Check className="w-3 h-3 mr-1" /> Clean</Badge>;
      case 'suspicious':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Suspicious</Badge>;
      case 'malicious':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><Shield className="w-3 h-3 mr-1" /> Malicious</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Scheduled Domain Monitoring
            </CardTitle>
            <CardDescription>
              Configure domains for automatic recurring security scans
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={triggerManualScan}
            disabled={isScanning}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isScanning && "animate-spin")} />
            Run Now
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Domain Form */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="Enter domain (e.g., example.com)"
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
            />
          </div>
          <Select value={newFrequency} onValueChange={setNewFrequency}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addDomain} disabled={isAdding || !newDomain.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {/* Domains Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : domains.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No domains being monitored</p>
            <p className="text-sm">Add a domain above to start automatic scanning</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Domain</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Last Status</TableHead>
                  <TableHead>Last Scanned</TableHead>
                  <TableHead className="text-center w-20">Active</TableHead>
                  <TableHead className="text-center w-16">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {domains.map((domain) => (
                    <motion.tr
                      key={domain.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-border/50"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[200px]">{domain.domain}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground capitalize">
                          <Clock className="w-3 h-3 shrink-0" />
                          {domain.scan_frequency}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(domain.last_status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {domain.last_scanned_at 
                          ? new Date(domain.last_scanned_at).toLocaleString()
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <button
                            onClick={() => toggleActive(domain.id, domain.is_active)}
                            className={cn(
                              'relative w-10 h-5 rounded-full transition-colors shrink-0',
                              domain.is_active ? 'bg-primary' : 'bg-muted'
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                                domain.is_active && 'translate-x-5'
                              )}
                            />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDomain(domain.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DomainMonitoringPanel;
