import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Plus, RefreshCw, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DomainCard from '@/components/dashboard/DomainCard';
import DomainMonitoringPanel from '@/components/monitoring/DomainMonitoringPanel';
import { mockDomains } from '@/services/mockData';
import { MonitoredDomain } from '@/types/intelliguard';
import { toast } from 'sonner';

const Monitoring = () => {
  const [domains, setDomains] = useState<MonitoredDomain[]>(mockDomains);
  const [newDomain, setNewDomain] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(newDomain)) {
      toast.error('Please enter a valid domain');
      return;
    }

    const newDomainEntry: MonitoredDomain = {
      id: `domain-${Date.now()}`,
      domain: newDomain,
      status: 'online',
      lastCheck: new Date().toISOString(),
      responseTime: Math.floor(Math.random() * 200) + 50,
      sslExpiry: '2025-12-31',
      threatsDetected: 0,
      uptimePercent: 100,
      notifications: true,
    };

    setDomains(prev => [newDomainEntry, ...prev]);
    setNewDomain('');
    setIsAdding(false);
    toast.success(`Added ${newDomain} to monitoring`);
  };

  const handleRemoveDomain = (id: string) => {
    const domain = domains.find(d => d.id === id);
    setDomains(prev => prev.filter(d => d.id !== id));
    toast.success(`Removed ${domain?.domain} from monitoring`);
  };

  const handleRefresh = () => {
    // Simulate refresh
    setDomains(prev => prev.map(d => ({
      ...d,
      lastCheck: new Date().toISOString(),
      responseTime: Math.floor(Math.random() * 300) + 50,
    })));
    toast.success('Domain statuses refreshed');
  };

  const onlineCount = domains.filter(d => d.status === 'online').length;
  const offlineCount = domains.filter(d => d.status === 'offline').length;

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
                {domains.length} domains · {onlineCount} online · {offlineCount} offline
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh All</span>
            </button>
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
                <button
                  onClick={handleAddDomain}
                  className="cyber-btn px-6"
                >
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
              <p className="text-sm text-muted-foreground">Online</p>
              <p className="text-2xl font-bold text-cyber-green">{onlineCount}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-cyber-green animate-pulse" />
          </div>
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Degraded</p>
              <p className="text-2xl font-bold text-cyber-yellow">
                {domains.filter(d => d.status === 'degraded').length}
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-cyber-yellow" />
          </div>
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Offline</p>
              <p className="text-2xl font-bold text-cyber-red">{offlineCount}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-cyber-red" />
          </div>
        </motion.div>

        {/* Domains Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {domains.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {domains.map((domain, index) => (
                <div key={domain.id} className="relative group">
                  <DomainCard domain={domain} index={index} />
                  <button
                    onClick={() => handleRemoveDomain(domain.id)}
                    className="absolute top-4 right-14 p-2 rounded-lg bg-cyber-red/10 text-cyber-red opacity-0 group-hover:opacity-100 transition-opacity hover:bg-cyber-red/20"
                    title="Remove domain"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
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
