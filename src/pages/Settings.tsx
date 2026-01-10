import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Shield, Key, Database, Save, RotateCcw, Monitor, Smartphone, LogOut, Globe, Calendar } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Settings as SettingsType } from '@/types/intelliguard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import NotificationPreferences from '@/components/settings/NotificationPreferences';
import ScheduledReports from '@/components/settings/ScheduledReports';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Settings = () => {
  const [settings, setSettings] = useState<SettingsType>({
    alertThreshold: 0.75,
    sensitivityLevel: 'medium',
    emailNotifications: true,
    telegramNotifications: false,
    webhookUrl: '',
    autoBlock: false,
    retentionDays: 30,
  });

  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  
  const { user, session, signOut } = useAuth();

  // Session info
  const sessionInfo = {
    expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null,
    lastSignIn: user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null,
  };

  const getDeviceIcon = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad/.test(userAgent)) {
      return <Smartphone className="w-5 h-5 text-primary" />;
    }
    return <Monitor className="w-5 h-5 text-primary" />;
  };

  const getDeviceName = () => {
    const userAgent = navigator.userAgent;
    if (/Windows/.test(userAgent)) return 'Windows PC';
    if (/Mac/.test(userAgent)) return 'Mac';
    if (/Linux/.test(userAgent)) return 'Linux';
    if (/iPhone/.test(userAgent)) return 'iPhone';
    if (/iPad/.test(userAgent)) return 'iPad';
    if (/Android/.test(userAgent)) return 'Android';
    return 'Unknown Device';
  };

  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (/Chrome/.test(userAgent) && !/Edg/.test(userAgent)) return 'Chrome';
    if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) return 'Safari';
    if (/Firefox/.test(userAgent)) return 'Firefox';
    if (/Edg/.test(userAgent)) return 'Edge';
    if (/Opera|OPR/.test(userAgent)) return 'Opera';
    return 'Unknown Browser';
  };

  const handleSignOutAllDevices = async () => {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.success('Signed out from all devices');
    } catch (error: any) {
      toast.error('Failed to sign out: ' + error.message);
    } finally {
      setSigningOut(false);
      setShowSignOutDialog(false);
    }
  };

  const handleSignOutCurrentSession = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error('Failed to sign out: ' + error.message);
    }
  };

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    setSettings({
      alertThreshold: 0.75,
      sensitivityLevel: 'medium',
      emailNotifications: true,
      telegramNotifications: false,
      webhookUrl: '',
      autoBlock: false,
      retentionDays: 30,
    });
    toast.success('Settings reset to defaults');
  };

  const generateApiKey = () => {
    const key = 'ig_' + Array.from({ length: 32 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
    ).join('');
    setApiKey(key);
    toast.success('New API key generated');
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="p-3 rounded-xl bg-gradient-to-br from-muted to-secondary">
            <SettingsIcon className="w-8 h-8 text-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Configure your IntelliGuard system preferences
            </p>
          </div>
        </motion.div>

        {/* Detection Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Detection Settings</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Alert Threshold
                <span className="text-muted-foreground ml-2">
                  ({(settings.alertThreshold * 100).toFixed(0)}%)
                </span>
              </label>
              <input
                type="range"
                min="0.5"
                max="0.99"
                step="0.01"
                value={settings.alertThreshold}
                onChange={(e) => setSettings(prev => ({ ...prev, alertThreshold: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>More Alerts</span>
                <span>Fewer Alerts</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sensitivity Level</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setSettings(prev => ({ ...prev, sensitivityLevel: level }))}
                    className={cn(
                      'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
                      settings.sensitivityLevel === level
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-Block Threats</p>
                <p className="text-sm text-muted-foreground">Automatically block detected threats</p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, autoBlock: !prev.autoBlock }))}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  settings.autoBlock ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                    settings.autoBlock && 'translate-x-6'
                  )}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Email Alert Preferences Panel */}
        <NotificationPreferences />

        {/* Scheduled Reports */}
        <ScheduledReports />

        {/* Legacy Notification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Other Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Telegram Notifications</p>
                <p className="text-sm text-muted-foreground">Receive alerts via Telegram</p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, telegramNotifications: !prev.telegramNotifications }))}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  settings.telegramNotifications ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                    settings.telegramNotifications && 'translate-x-6'
                  )}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Webhook URL (Optional)</label>
              <input
                type="url"
                value={settings.webhookUrl}
                onChange={(e) => setSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                placeholder="https://your-webhook.com/endpoint"
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              />
            </div>
          </div>
        </motion.div>

        {/* API Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Key className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">API Configuration</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey || 'No API key generated'}
                    readOnly
                    className="w-full px-4 py-3 rounded-lg bg-muted border border-border font-mono text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={generateApiKey}
                  className="cyber-btn text-sm"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Use this key to authenticate API requests to IntelliGuard
              </p>
            </div>
          </div>
        </motion.div>

        {/* Data Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Data Retention</h2>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Retention Period: {settings.retentionDays} days
            </label>
            <input
              type="range"
              min="7"
              max="90"
              step="1"
              value={settings.retentionDays}
              onChange={(e) => setSettings(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>7 days</span>
              <span>90 days</span>
            </div>
          </div>
        </motion.div>

        {/* Session Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Active Sessions</h2>
          </div>

          <div className="space-y-4">
            {/* Current Session */}
            <div className="p-4 rounded-lg bg-muted/50 border border-primary/20">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {getDeviceIcon()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{getDeviceName()}</p>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-cyber-green/20 text-cyber-green">
                        Current
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{getBrowserName()}</p>
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      {sessionInfo.lastSignIn && (
                        <p>Last sign in: {sessionInfo.lastSignIn.toLocaleString()}</p>
                      )}
                      {sessionInfo.expiresAt && (
                        <p>Session expires: {sessionInfo.expiresAt.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOutCurrentSession}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Security Info */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm text-muted-foreground">
                For security reasons, you can sign out from all devices at once. This will require you to sign in again on all your devices.
              </p>
            </div>

            {/* Sign Out All Devices */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-medium text-destructive">Sign Out All Devices</p>
                <p className="text-sm text-muted-foreground">
                  End all active sessions including this one
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowSignOutDialog(true)}
              >
                Sign Out All
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-end gap-4"
        >
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="cyber-btn flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </motion.div>
      </div>

      {/* Sign Out All Devices Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out from all devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end all active sessions, including this one. You'll need to sign in again on all your devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOutAllDevices}
              disabled={signingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {signingOut ? 'Signing out...' : 'Sign Out All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Settings;
