import { useEffect, useState } from 'react';
import { QrCode, KeyRound, Copy, Check, ShieldCheck, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  enrollTotp,
  verifyTotp,
  unenrollFactor,
  listFactors,
  findExistingTotpFactor,
  generateRecoveryCodes,
} from '@/lib/mfa';
import type { Factor } from '@supabase/supabase-js';

interface MfaSectionProps {
  onStatusChange?: () => void;
}

const FACTORY_NAME = 'Authenticator';

export function MfaSection({ onStatusChange }: MfaSectionProps) {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [enrollData, setEnrollData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshFactors() {
    setLoadingFactors(true);
    const f = await listFactors();
    setFactors(f);
    setLoadingFactors(false);
  }

  useEffect(() => {
    refreshFactors();
  }, []);

  const verifiedFactor = factors.find((f) => f.status === 'verified');
  const unverifiedFactor = factors.find((f) => f.status === 'unverified');
  const is2FAEnabled = !!verifiedFactor;

  // Root-cause fix: before creating a new TOTP factor, check whether one
  // already exists. If a verified factor exists, do nothing — show the
  // enabled state. If an unverified factor exists from a previous incomplete
  // enrollment, re-enroll it (Supabase returns a fresh QR/secret for the
  // same factor) instead of creating a duplicate. Only create a new factor
  // when no existing TOTP factor is found.
  async function handleEnroll() {
    setError(null);
    setEnrolling(true);
    try {
      const existing = await findExistingTotpFactor(FACTORY_NAME);

      if (existing && existing.status === 'verified') {
        // Already enabled — just refresh and show the enabled state.
        await refreshFactors();
        toast.info('Two-factor authentication is already enabled for your account.');
        return;
      }

      if (existing && existing.status === 'unverified') {
        // Resume an incomplete enrollment: unenroll the stale unverified
        // factor first, then create a fresh one. This avoids the duplicate
        // friendly-name error and gives the user a new QR code to scan.
        await unenrollFactor(existing.id);
      }

      // No existing factor (or we just cleaned up the stale one) — create new.
      const { data, error: enrollError } = await enrollTotp();
      if (enrollError || !data) {
        setError(enrollError ?? 'Could not start 2FA enrollment.');
        return;
      }
      setEnrollData(data);
    } catch (err) {
      console.error('[MFA] Enrollment error:', err);
      setError('Something went wrong while setting up 2FA. Please try again.');
    } finally {
      setEnrolling(false);
    }
  }

  async function handleVerify() {
    if (!enrollData) return;
    setError(null);
    setVerifying(true);
    const { error: verifyError } = await verifyTotp(enrollData.factorId, verifyCode);
    setVerifying(false);
    if (verifyError) {
      setError(verifyError);
      return;
    }
    // Generate recovery codes to show once.
    const codes = generateRecoveryCodes(10);
    setRecoveryCodes(codes);
    setEnrollData(null);
    setVerifyCode('');
    await refreshFactors();
    onStatusChange?.();
    toast.success('Two-factor authentication enabled');
  }

  async function handleUnenroll() {
    if (!verifiedFactor) return;
    setUnenrolling(true);
    const { error: unenrollError } = await unenrollFactor(verifiedFactor.id);
    setUnenrolling(false);
    if (unenrollError) {
      setError(unenrollError);
      return;
    }
    await refreshFactors();
    onStatusChange?.();
    toast.success('Two-factor authentication disabled');
  }

  function handleRegenerateCodes() {
    setRegenerating(true);
    const codes = generateRecoveryCodes(10);
    setRecoveryCodes(codes);
    setRegenerating(false);
    toast.success('New recovery codes generated');
  }

  function copyToClipboard(text: string, onCopied: () => void) {
    navigator.clipboard.writeText(text).then(() => {
      onCopied();
      setTimeout(() => onCopied(), 2000);
    });
  }

  function cancelEnrollment() {
    setEnrollData(null);
    setVerifyCode('');
    setError(null);
  }

  // Format the date the factor was created (enrollment date).
  const enabledDate = verifiedFactor
    ? new Date(verifiedFactor.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Two-Factor Authentication (2FA)
        </CardTitle>
        <CardDescription>
          Add an extra layer of security with a TOTP authenticator app such as Google
          Authenticator, 1Password, or Authy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingFactors ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking 2FA status…
          </div>
        ) : is2FAEnabled ? (
          // 2FA is enabled — show status, date, recovery code regen, disable.
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="gap-1 bg-success/10 text-success">
                <Check className="h-3.5 w-3.5" />
                Enabled
              </Badge>
              {enabledDate && (
                <span className="text-sm text-muted-foreground">
                  Enabled since {enabledDate}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleRegenerateCodes} disabled={regenerating}>
                {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Regenerate recovery codes
              </Button>
              <Button variant="outline" size="sm" onClick={handleUnenroll} disabled={unenrolling}>
                {unenrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {unenrolling ? 'Disabling…' : 'Disable 2FA'}
              </Button>
            </div>
          </div>
        ) : enrollData ? (
          // Enrollment step: show QR + secret, then verify
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-lg border border-border bg-white p-3">
                  <img src={enrollData.qrCode} alt="2FA QR code" className="h-40 w-40" />
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <QrCode className="h-3.5 w-3.5" />
                  Scan with your authenticator app
                </span>
              </div>
              <div className="flex-1 space-y-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <KeyRound className="h-3.5 w-3.5" />
                    Manual secret key
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
                      {enrollData.secret}
                    </code>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(enrollData.secret, () => setCopiedSecret(true))}
                    >
                      {copiedSecret ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app to verify and enable 2FA.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="verifyCode">Verification code</Label>
                  <Input
                    id="verifyCode"
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleVerify} disabled={verifying || verifyCode.length !== 6}>
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {verifying ? 'Verifying…' : 'Verify & enable'}
                  </Button>
                  <Button variant="ghost" onClick={cancelEnrollment} disabled={verifying}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Not enrolled — offer to start
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Not enabled</Badge>
            </div>
            <Button onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Enable Two-Factor Authentication
                </>
              )}
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Recovery codes — shown once after verification or after regeneration */}
        {recoveryCodes && (
          <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Your recovery codes</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Save these one-time codes in a secure location. They can be used to access your
                account if you lose your authenticator device. They will not be shown again.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 rounded-md bg-card p-3 font-mono text-xs">
              {recoveryCodes.map((code) => (
                <span key={code}>{code}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(recoveryCodes.join('\n'), () => setCopiedCodes(true))
                }
              >
                {copiedCodes ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                {copiedCodes ? 'Copied' : 'Copy all codes'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRecoveryCodes(null)}>
                I've saved them — dismiss
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
