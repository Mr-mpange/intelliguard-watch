import { useEffect, useCallback } from 'react';
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

export const useRealtimeThreats = (onNewThreat?: (scan: DomainScanPayload) => void) => {
  const { user } = useAuth();

  const handleNewScan = useCallback((payload: { new: DomainScanPayload }) => {
    const scan = payload.new;
    
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

  useEffect(() => {
    if (!user) return;

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, handleNewScan]);
};
