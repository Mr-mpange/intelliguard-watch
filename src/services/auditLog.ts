import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'signup'
  | 'password_change'
  | 'profile_update'
  | 'avatar_upload'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'session_signout_all'
  | 'domain_scan'
  | 'file_analysis';

export type AuditSeverity = 'info' | 'warning' | 'critical';

interface AuditLogParams {
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  severity?: AuditSeverity;
}

export const logAuditEvent = async ({
  action,
  resourceType,
  resourceId,
  details = {},
  severity = 'info',
}: AuditLogParams): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log audit event: No authenticated user');
      return;
    }

    const { error } = await supabase.from('audit_logs').insert([{
      user_id: user.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      details: details as Json,
      severity,
      ip_address: null,
      user_agent: navigator.userAgent,
    }]);

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (e) {
    console.error('Error logging audit event:', e);
  }
};

// Convenience methods for common actions
export const auditLog = {
  login: () => logAuditEvent({
    action: 'login',
    resourceType: 'auth',
    details: { method: 'password' },
  }),

  loginWithGoogle: () => logAuditEvent({
    action: 'login',
    resourceType: 'auth',
    details: { method: 'google_oauth' },
  }),

  logout: () => logAuditEvent({
    action: 'logout',
    resourceType: 'auth',
  }),

  signup: (email: string) => logAuditEvent({
    action: 'signup',
    resourceType: 'auth',
    details: { email },
  }),

  passwordChange: () => logAuditEvent({
    action: 'password_change',
    resourceType: 'security',
    severity: 'warning',
  }),

  profileUpdate: (changes: Record<string, unknown>) => logAuditEvent({
    action: 'profile_update',
    resourceType: 'profile',
    details: { fields_updated: Object.keys(changes) },
  }),

  avatarUpload: () => logAuditEvent({
    action: 'avatar_upload',
    resourceType: 'profile',
  }),

  enable2FA: () => logAuditEvent({
    action: '2fa_enabled',
    resourceType: 'security',
    severity: 'warning',
    details: { method: 'totp' },
  }),

  disable2FA: () => logAuditEvent({
    action: '2fa_disabled',
    resourceType: 'security',
    severity: 'critical',
    details: { method: 'totp' },
  }),

  signOutAllDevices: () => logAuditEvent({
    action: 'session_signout_all',
    resourceType: 'security',
    severity: 'warning',
  }),

  domainScan: (domain: string, threatFound: boolean) => logAuditEvent({
    action: 'domain_scan',
    resourceType: 'analysis',
    resourceId: domain,
    details: { domain, threat_found: threatFound },
  }),

  fileAnalysis: (fileName: string, threatCount: number) => logAuditEvent({
    action: 'file_analysis',
    resourceType: 'analysis',
    resourceId: fileName,
    details: { file_name: fileName, threats_found: threatCount },
  }),
};
