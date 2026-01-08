import { supabase } from '@/integrations/supabase/client';

export interface ThreatIndicator {
  source: string;
  type: string;
  severity: string;
  description: string;
  tags: string[];
  first_seen?: string;
  last_seen?: string;
}

export interface EnrichedThreatData {
  indicator: string;
  type: 'domain' | 'ip';
  threatScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  indicators: ThreatIndicator[];
  sources: string[];
  tags: string[];
  enrichedAt: string;
}

export const enrichThreatIntelligence = async (
  domain?: string,
  ip?: string,
  scanId?: string
): Promise<EnrichedThreatData | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('enrich-threat-intel', {
      body: { domain, ip, scanId },
    });

    if (error) {
      console.error('Failed to enrich threat intel:', error);
      return null;
    }

    return data as EnrichedThreatData;
  } catch (e) {
    console.error('Error enriching threat intelligence:', e);
    return null;
  }
};

// Helper to get threat level color
export const getThreatLevelColor = (level: string): string => {
  switch (level) {
    case 'critical':
      return 'text-destructive';
    case 'high':
      return 'text-cyber-orange';
    case 'medium':
      return 'text-cyber-yellow';
    case 'low':
      return 'text-cyber-green';
    default:
      return 'text-muted-foreground';
  }
};

// Helper to get threat level badge variant
export const getThreatLevelBadge = (level: string): string => {
  switch (level) {
    case 'critical':
      return 'bg-destructive text-destructive-foreground';
    case 'high':
      return 'bg-cyber-orange text-white';
    case 'medium':
      return 'bg-cyber-yellow text-black';
    case 'low':
      return 'bg-cyber-green text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
};
