import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Mail, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationSettings {
  emailEnabled: boolean;
  criticalOnly: boolean;
  alertThreshold: 'low' | 'medium' | 'high' | 'critical';
  digestMode: boolean;
}

const NotificationPreferences = () => {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    criticalOnly: false,
    alertThreshold: 'medium',
    digestMode: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.alert_preferences) {
      const prefs = profile.alert_preferences as unknown as Record<string, unknown>;
      setSettings({
        emailEnabled: prefs.email !== false,
        criticalOnly: prefs.critical_only === true,
        alertThreshold: (prefs.threshold as NotificationSettings['alertThreshold']) || 'medium',
        digestMode: prefs.digest === true,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          alert_preferences: {
            email: settings.emailEnabled,
            critical_only: settings.criticalOnly,
            threshold: settings.alertThreshold,
            digest: settings.digestMode,
            push: true,
          },
        })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const thresholdLevels: { value: NotificationSettings['alertThreshold']; label: string; description: string }[] = [
    { value: 'low', label: 'Low', description: 'All alerts including informational' },
    { value: 'medium', label: 'Medium', description: 'Suspicious and above' },
    { value: 'high', label: 'High', description: 'High severity and above' },
    { value: 'critical', label: 'Critical', description: 'Critical alerts only' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Email Alert Preferences</h2>
      </div>

      <div className="space-y-6">
        {/* Email Notifications Toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Email Alerts</p>
              <p className="text-sm text-muted-foreground">
                Receive threat alerts via email
              </p>
            </div>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, emailEnabled: !prev.emailEnabled }))}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              settings.emailEnabled ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                settings.emailEnabled && 'translate-x-6'
              )}
            />
          </button>
        </div>

        {/* Alert Threshold */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium">Alert Threshold</label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {thresholdLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => setSettings(prev => ({ ...prev, alertThreshold: level.value }))}
                className={cn(
                  'p-3 rounded-lg text-left transition-all border',
                  settings.alertThreshold === level.value
                    ? 'bg-primary/10 border-primary/50 text-primary'
                    : 'bg-muted/30 border-border hover:bg-muted/50'
                )}
              >
                <p className="font-medium text-sm">{level.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Critical Only Toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <ShieldCheck className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="font-medium">Critical Only Mode</p>
              <p className="text-sm text-muted-foreground">
                Only send emails for critical security threats
              </p>
            </div>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, criticalOnly: !prev.criticalOnly }))}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              settings.criticalOnly ? 'bg-destructive' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                settings.criticalOnly && 'translate-x-6'
              )}
            />
          </button>
        </div>

        {/* Digest Mode Toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-cyber-blue/10">
              <Info className="w-4 h-4 text-cyber-blue" />
            </div>
            <div>
              <p className="font-medium">Daily Digest</p>
              <p className="text-sm text-muted-foreground">
                Receive a daily summary instead of individual alerts
              </p>
            </div>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, digestMode: !prev.digestMode }))}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              settings.digestMode ? 'bg-cyber-blue' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                settings.digestMode && 'translate-x-6'
              )}
            />
          </button>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="cyber-btn w-full sm:w-auto"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default NotificationPreferences;
