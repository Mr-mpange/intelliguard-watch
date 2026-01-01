import { supabase } from '@/integrations/supabase/client';

export interface ThreatAlertData {
  recipientEmail: string;
  recipientName?: string;
  alertType: 'critical' | 'high' | 'medium' | 'low';
  threatDetails: {
    domain?: string;
    attackType?: string;
    severity: string;
    description: string;
    detectedAt: string;
    sourceIP?: string;
    confidence?: number;
  };
}

export const sendThreatAlert = async (data: ThreatAlertData): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: response, error } = await supabase.functions.invoke('send-threat-alert', {
      body: data,
    });

    if (error) {
      console.error('Failed to send threat alert:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    console.error('Error sending threat alert:', errorMessage);
    return { success: false, error: errorMessage };
  }
};

// Helper to send critical domain scan alerts
export const sendDomainScanAlert = async (
  recipientEmail: string,
  recipientName: string | undefined,
  domain: string,
  maliciousCount: number,
  suspiciousCount: number
): Promise<{ success: boolean; error?: string }> => {
  const severity = maliciousCount > 5 ? 'critical' : maliciousCount > 0 ? 'high' : suspiciousCount > 0 ? 'medium' : 'low';
  
  if (severity === 'low') {
    return { success: true }; // Don't send alerts for low severity
  }

  return sendThreatAlert({
    recipientEmail,
    recipientName,
    alertType: severity as 'critical' | 'high' | 'medium',
    threatDetails: {
      domain,
      attackType: 'Malicious Domain',
      severity: severity.charAt(0).toUpperCase() + severity.slice(1),
      description: `Domain scan detected ${maliciousCount} malicious and ${suspiciousCount} suspicious indicators from security engines.`,
      detectedAt: new Date().toISOString(),
      confidence: Math.round(((maliciousCount + suspiciousCount) / 90) * 100),
    },
  });
};
