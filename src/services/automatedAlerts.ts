import { supabase } from '@/integrations/supabase/client';
import { sendThreatAlert, ThreatAlertData } from './emailNotifications';

export interface ThreatEvent {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  domain?: string;
  sourceIP?: string;
  description: string;
  confidence: number;
  timestamp: Date;
}

interface AlertPreferences {
  email: boolean;
  push: boolean;
  critical_only: boolean;
}

// Check if a threat event should trigger an alert based on user preferences
const shouldAlert = (
  event: ThreatEvent,
  preferences: AlertPreferences | null
): boolean => {
  if (!preferences) return true; // Default to alerting if no preferences set
  if (!preferences.email) return false; // User disabled email alerts
  if (preferences.critical_only && event.severity !== 'critical') return false;
  return true;
};

// Process a threat event and send alerts if necessary
export const processThreatEvent = async (
  userId: string,
  event: ThreatEvent
): Promise<{ alerted: boolean; error?: string }> => {
  try {
    // Fetch user profile for alert preferences and email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, alert_preferences')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError);
      return { alerted: false, error: 'Failed to fetch user profile' };
    }

    // Fetch user email from auth
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData?.user?.email;

    if (!userEmail) {
      return { alerted: false, error: 'User email not found' };
    }

    const preferences = profile?.alert_preferences as unknown as AlertPreferences | null;

    if (!shouldAlert(event, preferences)) {
      return { alerted: false };
    }

    // Prepare and send the alert
    const alertData: ThreatAlertData = {
      recipientEmail: userEmail,
      recipientName: profile?.full_name || undefined,
      alertType: event.severity,
      threatDetails: {
        domain: event.domain,
        attackType: event.type,
        severity: event.severity.charAt(0).toUpperCase() + event.severity.slice(1),
        description: event.description,
        detectedAt: event.timestamp.toISOString(),
        sourceIP: event.sourceIP,
        confidence: event.confidence,
      },
    };

    const result = await sendThreatAlert(alertData);
    return { alerted: result.success, error: result.error };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing threat event:', errorMessage);
    return { alerted: false, error: errorMessage };
  }
};

// Process timeline threats and send batch alerts for critical ones
export const processTimelineThreats = async (
  userId: string,
  threats: ThreatEvent[]
): Promise<{ totalAlerts: number; errors: string[] }> => {
  const criticalThreats = threats.filter((t) => t.severity === 'critical');
  const highThreats = threats.filter((t) => t.severity === 'high');

  const errors: string[] = [];
  let totalAlerts = 0;

  // Send individual alerts for critical threats
  for (const threat of criticalThreats) {
    const result = await processThreatEvent(userId, threat);
    if (result.alerted) {
      totalAlerts++;
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  // Send a summary alert if there are multiple high-severity threats
  if (highThreats.length >= 3) {
    const summaryEvent: ThreatEvent = {
      severity: 'high',
      type: 'Multiple High-Severity Threats',
      description: `${highThreats.length} high-severity threats detected in the analysis period. Types include: ${[...new Set(highThreats.map((t) => t.type))].join(', ')}.`,
      confidence: 85,
      timestamp: new Date(),
    };

    const result = await processThreatEvent(userId, summaryEvent);
    if (result.alerted) {
      totalAlerts++;
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return { totalAlerts, errors };
};

// Monitor real-time scan results and trigger alerts
export const monitorScanResult = async (
  userId: string,
  domain: string,
  isMalicious: boolean,
  positives: number,
  total: number,
  reputation: number | null
): Promise<void> => {
  // Only alert for malicious domains or very low reputation
  if (!isMalicious && (reputation === null || reputation >= 30)) {
    return;
  }

  const severity: ThreatEvent['severity'] = 
    positives > 10 ? 'critical' : 
    positives > 5 ? 'high' : 
    positives > 0 ? 'medium' : 'low';

  if (severity === 'low') return;

  const event: ThreatEvent = {
    severity,
    type: 'Malicious Domain Detected',
    domain,
    description: `Domain ${domain} flagged by ${positives}/${total} security engines. ${reputation !== null ? `Reputation score: ${reputation}/100.` : ''}`,
    confidence: Math.round((positives / total) * 100),
    timestamp: new Date(),
  };

  await processThreatEvent(userId, event);
};
