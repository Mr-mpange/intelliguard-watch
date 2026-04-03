import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Filter, Trash2, CheckCheck, Volume2, VolumeX } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AlertItem from '@/components/dashboard/AlertItem';
import { Alert, ThreatSeverity } from '@/types/intelliguard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const Alerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | ThreatSeverity>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch real alerts from DB
  useEffect(() => {
    if (!user) return;
    const fetchAlerts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('threat_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alerts:', error);
        toast.error('Failed to load alerts');
      } else if (data) {
        const mapped: Alert[] = data.map(a => ({
          id: a.id,
          timestamp: a.created_at,
          type: 'threat' as const,
          severity: a.severity as Alert['severity'],
          title: a.title,
          message: a.description,
          isRead: a.is_read,
          sourceIP: a.source_ip || undefined,
          attackType: a.threat_type as Alert['attackType'],
        }));
        setAlerts(mapped);
      }
      setLoading(false);
    };
    fetchAlerts();
  }, [user]);

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !alert.isRead;
    return alert.severity === filter;
  });

  const dismissAlert = async (id: string) => {
    const { error } = await supabase.from('threat_alerts').delete().eq('id', id);
    if (error) {
      toast.error('Failed to dismiss alert');
      return;
    }
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast.success('Alert dismissed');
  };

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('threat_alerts')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) {
      toast.error('Failed to mark alerts as read');
      return;
    }
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    toast.success('All alerts marked as read');
  };

  const clearAll = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('threat_alerts')
      .delete()
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to clear alerts');
      return;
    }
    setAlerts([]);
    toast.success('All alerts cleared');
  };

  const filterOptions: { value: 'all' | 'unread' | ThreatSeverity; label: string; color?: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: `Unread (${unreadCount})` },
    { value: 'critical', label: 'Critical', color: 'text-cyber-red' },
    { value: 'high', label: 'High', color: 'text-cyber-orange' },
    { value: 'medium', label: 'Medium', color: 'text-cyber-yellow' },
    { value: 'low', label: 'Low', color: 'text-cyber-blue' },
    { value: 'info', label: 'Info', color: 'text-muted-foreground' },
  ];

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
            <div className="relative">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyber-yellow to-cyber-orange">
                <Bell className="w-8 h-8 text-primary-foreground" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-cyber-red text-primary-foreground text-xs font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">Security Alerts</h1>
              <p className="text-muted-foreground">
                {alerts.length} alerts · {unreadCount} unread
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                soundEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Mark All Read</span>
            </button>
            <button
              onClick={clearAll}
              disabled={alerts.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyber-red/10 text-cyber-red hover:bg-cyber-red/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-2"
        >
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-cyber">
            <Filter className="w-4 h-4 text-muted-foreground mx-2 shrink-0" />
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  filter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted',
                  option.color && filter !== option.value && option.color
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Alerts List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {loading ? (
            <div className="glass-card p-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading alerts...</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <AlertItem 
                    key={alert.id} 
                    alert={alert} 
                    onDismiss={dismissAlert}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-12 text-center"
                >
                  <div className="inline-flex p-4 rounded-full bg-cyber-green/10 mb-4">
                    <Bell className="w-8 h-8 text-cyber-green" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Alerts</h3>
                  <p className="text-muted-foreground">
                    {filter === 'all' 
                      ? 'No alerts yet — run a scan to generate threat alerts'
                      : `No ${filter} alerts at this time`}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
          <span>Real-time monitoring active</span>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Alerts;
