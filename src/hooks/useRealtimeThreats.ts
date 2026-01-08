import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DomainScanPayload {
  id: string;
  user_id: string;
  domain: string;
  is_malicious: boolean;
  positives: number;
  total: number;
  reputation: number | null;
  created_at: string;
}

interface ThreatAlert {
  id: string;
  user_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  threat_type: string;
  source_domain: string | null;
  source_ip: string | null;
  confidence: number | null;
  is_read: boolean;
  created_at: string;
}

export const useRealtimeThreats = (onNewThreat?: (scan: DomainScanPayload) => void) => {
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [recentScans, setRecentScans] = useState<DomainScanPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Fetch initial alerts
  useEffect(() => {
    if (!user) return;

    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('threat_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setAlerts(data as ThreatAlert[]);
        setUnreadCount(data.filter((a) => !a.is_read).length);
      }
    };

    fetchAlerts();
  }, [user]);

  const handleNewScan = useCallback((payload: { new: DomainScanPayload }) => {
    const scan = payload.new;
    setRecentScans((prev) => [scan, ...prev].slice(0, 20));
    
    // Only show notifications for threats
    if (scan.is_malicious || scan.positives > 0) {
      toast.error('Threat Detected!', {
        description: `Domain ${scan.domain} flagged by ${scan.positives} security vendors`,
        duration: 10000,
        action: {
          label: 'View',
          onClick: () => window.location.href = '/threat-intelligence',
        },
      });
    } else {
      toast.success('Domain Scan Complete', {
        description: `${scan.domain} is clean`,
        duration: 5000,
      });
    }

    onNewThreat?.(scan);
  }, [onNewThreat]);

  const handleNewAlert = useCallback((payload: { new: ThreatAlert }) => {
    const newAlert = payload.new;
    setAlerts((prev) => [newAlert, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);

    // Show toast notification for critical/high alerts
    if (newAlert.severity === 'critical' || newAlert.severity === 'high') {
      toast.error(`🚨 ${newAlert.severity.toUpperCase()} Alert`, {
        description: newAlert.title,
        duration: 15000,
      });
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Subscribe to domain scans
    const scansChannel = supabase
      .channel('realtime-threats')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'domain_scans',
          filter: `user_id=eq.${user.id}`,
        },
        handleNewScan as (payload: unknown) => void
      )
      .subscribe();

    // Subscribe to threat alerts
    const alertsChannel = supabase
      .channel('threat-alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'threat_alerts',
          filter: `user_id=eq.${user.id}`,
        },
        handleNewAlert as (payload: unknown) => void
      )
      .subscribe();

    return () => {
      supabase.removeChannel(scansChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [user, handleNewScan, handleNewAlert]);

  const markAsRead = async (alertId: string) => {
    const { error } = await supabase
      .from('threat_alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    if (!error) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('threat_alerts')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
      setUnreadCount(0);
    }
  };

  const deleteAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('threat_alerts')
      .delete()
      .eq('id', alertId);

    if (!error) {
      const alertToDelete = alerts.find((a) => a.id === alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      if (alertToDelete && !alertToDelete.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  return {
    alerts,
    recentScans,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteAlert,
  };
};
