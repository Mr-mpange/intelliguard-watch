import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, QrCode, Copy, Check, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { auditLog } from '@/services/auditLog';

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const TwoFactorSetup = ({ open, onOpenChange, onSuccess }: TwoFactorSetupProps) => {
  const [step, setStep] = useState<'start' | 'scan' | 'verify'>('start');
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);

  const startEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep('scan');
    } catch (error: any) {
      toast.error('Failed to start 2FA setup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!factorId || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) throw verifyError;

      await auditLog.enable2FA();
      toast.success('Two-factor authentication enabled!');
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      toast.error('Verification failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success('Secret copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep('start');
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setVerificationCode('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Set Up Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Add an extra layer of security to your account
          </DialogDescription>
        </DialogHeader>

        {step === 'start' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-4"
          >
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <h4 className="font-medium mb-2">What you'll need:</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">1</span>
                  An authenticator app (Google Authenticator, Authy, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">2</span>
                  Your phone to scan the QR code
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={startEnrollment} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'scan' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-4"
          >
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your authenticator app
              </p>
              
              {qrCode && (
                <div className="inline-block p-4 bg-white rounded-xl mb-4">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
              )}

              <p className="text-xs text-muted-foreground mb-2">
                Or enter this code manually:
              </p>
              
              {secret && (
                <div className="flex items-center justify-center gap-2">
                  <code className="px-3 py-2 bg-muted rounded font-mono text-sm">
                    {secret}
                  </code>
                  <Button variant="ghost" size="sm" onClick={copySecret}>
                    {copied ? (
                      <Check className="w-4 h-4 text-cyber-green" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep('start')}>
                Back
              </Button>
              <Button onClick={() => setStep('verify')}>
                I've scanned the code
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-4"
          >
            <div className="space-y-2">
              <Label htmlFor="verificationCode">
                Enter the 6-digit code from your authenticator app
              </Label>
              <Input
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                autoComplete="one-time-code"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep('scan')}>
                Back
              </Button>
              <Button 
                onClick={verifyAndEnable} 
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Enable 2FA'
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorSetup;