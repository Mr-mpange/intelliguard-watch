import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Plus, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DomainMonitoringPanel from '@/components/monitoring/DomainMonitoringPanel';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DBMonitoredDomain {
  id: string;
  domain: string;
  is_active: boolean;
  last_scanned_at: string | null;
  last_status: string | null;
  scan_frequency: string;
  created_at: string;
}

const Monitoring = () => {
  const { user } = useAuth();
  const [domains, setDomains] = useState<DBMonitoredDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDomains = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('monitored_domains')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching domains:', error);
      } else {
        setDomains(data || []);
      }
      setLoading(false);
    };
    fetchDomains();
  }, [user]);

  const handleAddDomain = async () => {
    if (!user || !newDomain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(newDomain)) {
      toast.error('Please enter a valid domain');
      return;
    }

    const { data, error } = await supabase
      .from('monitored_domains')
      .insert({ user_id: user.id, domain: newDomain })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add domain');
      return;
    }

    setDomains(prev => [data, ...prev]);
    setNewDomain('');
    setIsAdding(false);
    toast.success(`Added ${newDomain} to monitoring`);
  };

  const handleRemoveDomain = async (id: string) => {
    const domain = domains.find(d => d.id === id);
    const { error } = await supabase.from('monitored_domains').delete().eq('id', id);
    if (error) {
      toast.error('Failed to remove domain');
      return;
    }
    setDomains(prev => prev.filter(d => d.id !== id));
    toast.success(`Removed ${domain?.domain} from monitoring`);
  };

  const onlineCount = domains.filter(d => d.last_status === 'clean' || d.is_active).length;
  const offlineCount = domains.filter(d => d.last_status === 'malicious').length;

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
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyber-purple to-cyber-blue">
              <Globe className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Domain Monitoring</h1>
              <p className="text-muted-foreground">
                {domains.length} domains · {onlineCount} active · {offlineCount} flagged
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="cyber-btn flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Domain</span>
            </button>
          </div>
        </motion.div>

        {/* Add Domain Form */}
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Add New Domain</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com"
                className="flex-1 px-4 py-3 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
              <div className="flex gap-2">
                <button onClick={handleAddDomain} className="cyber-btn px-6">
                  Add Domain
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Status Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-cyber-green">{domains.filter(d => d.is_active).length}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-cyber-green animate-pulse" />
          </div>
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Scanned</p>
              <p className="text-2xl font-bold text-cyber-blue">
                {domains.filter(d => d.last_scanned_at).length}
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-cyber-blue" />
          </div>
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Flagged</p>
              <p className="text-2xl font-bold text-cyber-red">{offlineCount}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-cyber-red" />
          </div>
        </motion.div>

        {/* Domains List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="glass-card p-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading domains...</p>
            </div>
          ) : domains.length > 0 ? (
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm text-muted-foreground font-medium">Domain</th>
                    <th className="text-left p-4 text-sm text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-4 text-sm text-muted-foreground font-medium">Frequency</th>
                    <th className="text-left p-4 text-sm text-muted-foreground font-medium">Last Scanned</th>
                    <th className="text-center p-4 text-sm text-muted-foreground font-medium w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((domain) => (
                    <tr key={domain.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono text-sm">{domain.domain}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          domain.last_status === 'malicious' 
                            ? 'bg-cyber-red/10 text-cyber-red' 
                            : domain.last_status === 'clean'
                            ? 'bg-cyber-green/10 text-cyber-green'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            domain.last_status === 'malicious' ? 'bg-cyber-red' : 
                            domain.last_status === 'clean' ? 'bg-cyber-green' : 'bg-muted-foreground'
                          }`} />
                          {domain.last_status || 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground capitalize">{domain.scan_frequency}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {domain.last_scanned_at 
                          ? new Date(domain.last_scanned_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleRemoveDomain(domain.id)}
                          className="p-2 rounded-lg bg-cyber-red/10 text-cyber-red hover:bg-cyber-red/20 transition-colors"
                          title="Remove domain"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Domains Monitored</h3>
              <p className="text-muted-foreground mb-4">
                Add your first domain to start monitoring
              </p>
              <button
                onClick={() => setIsAdding(true)}
                className="cyber-btn inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Domain
              </button>
            </div>
          )}
        </motion.div>

        {/* Scheduled Domain Monitoring */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <DomainMonitoringPanel />
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Monitoring;
