import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, LogIn, Key, User, Shield, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  severity: string;
  created_at: string;
  details: any;
  ip_address: string | null;
}

const getActionIcon = (action: string) => {
  switch (action.toLowerCase()) {
    case 'login':
    case 'sign_in':
      return <LogIn className="w-4 h-4" />;
    case 'password_change':
    case 'password_update':
      return <Key className="w-4 h-4" />;
    case 'profile_update':
      return <User className="w-4 h-4" />;
    case 'mfa_enable':
    case 'mfa_disable':
      return <Shield className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
};

const getActionLabel = (action: string) => {
  switch (action.toLowerCase()) {
    case 'login':
    case 'sign_in':
      return 'Signed in';
    case 'password_change':
    case 'password_update':
      return 'Password changed';
    case 'profile_update':
      return 'Profile updated';
    case 'mfa_enable':
      return '2FA enabled';
    case 'mfa_disable':
      return '2FA disabled';
    case 'sign_out':
      return 'Signed out';
    default:
      return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'text-cyber-red bg-cyber-red/10';
    case 'medium':
    case 'warning':
      return 'text-cyber-yellow bg-cyber-yellow/10';
    case 'low':
    case 'info':
    default:
      return 'text-primary bg-primary/10';
  }
};

const ActivityLog = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async (showRefresh = false) => {
    if (!user) return;
    
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    // Less than 24 hours
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    // Less than 7 days
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Recent Activity</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No activity recorded yet</p>
          <p className="text-sm">Your account actions will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className={cn("p-2 rounded-lg", getSeverityColor(log.severity))}>
                {getActionIcon(log.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{getActionLabel(log.action)}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {log.resource_type}
                  {log.ip_address && ` • ${log.ip_address}`}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(log.created_at)}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityLog;