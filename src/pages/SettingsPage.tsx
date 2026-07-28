import { useEffect, useMemo, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  Sliders,
  KeyRound,
  UserCog,
  Mail,
  ShieldCheck,
  CalendarClock,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/Feedback';
import { PasswordStrength } from '@/components/PasswordStrength';
import { MfaSection } from '@/components/MfaSection';
import { getSettings, updateSettings, retrainModel } from '@/lib/service';
import { useAuth } from '@/lib/auth-context';
import { validateEmail, validateName, validatePassword } from '@/lib/validation';
import type { ModelSettings } from '@/lib/types';

export function SettingsPage() {
  const { user, profile, updateDisplayName, updateEmail, updatePassword, refreshProfile } =
    useAuth();

  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retraining, setRetraining] = useState(false);

  // Display name form
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Email form
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);
      if (profile) setDisplayName(profile.display_name);
      if (user?.email) setNewEmail(user.email);
      setLoading(false);
    })();
  }, [profile, user?.email]);

  const pwStrength = useMemo(() => validatePassword(newPw), [newPw]);

  if (loading || !settings) return <Loading label="Loading settings…" />;

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings(settings);
      toast.success('Settings saved', {
        description: 'Model retrained with new parameters.',
      });
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleRetrain() {
    setRetraining(true);
    try {
      await retrainModel();
      const s = await getSettings();
      setSettings(s);
      toast.success('Model retrained', {
        description: 'Predictions refreshed for all employees.',
      });
    } catch {
      toast.error('Retraining failed');
    } finally {
      setRetraining(false);
    }
  }

  async function handleDisplayName(e: React.FormEvent) {
    e.preventDefault();
    if (!validateName(displayName)) {
      toast.error('Please enter a valid display name.');
      return;
    }
    setSavingName(true);
    const { error } = await updateDisplayName(displayName);
    setSavingName(false);
    if (error) toast.error(error);
    else toast.success('Display name updated');
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail(newEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      toast.error('This is already your email address.');
      return;
    }
    setSavingEmail(true);
    const { error } = await updateEmail(newEmail);
    setSavingEmail(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Email update requested', {
        description: 'You may need to confirm the new email address.',
      });
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!pwStrength.meetsAll) {
      toast.error('New password does not meet the strength requirements.');
      return;
    }
    if (newPw !== confirmPw) {
      toast.error('Passwords do not match.');
      return;
    }
    setPwSaving(true);
    const { error } = await updatePassword(currentPw, newPw);
    setPwSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Password updated');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure the anomaly detection model and your account.
          </p>
        </div>
      </div>

      {/* Account overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="h-4 w-4 text-primary" />
            Account
          </CardTitle>
          <CardDescription>Your analyst account details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.email ?? '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Account created</p>
                <p className="text-sm font-medium text-foreground">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <LogIn className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Last login</p>
                <p className="text-sm font-medium text-foreground">
                  {profile?.last_login_at
                    ? new Date(profile.last_login_at).toLocaleString()
                    : user?.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleString()
                      : '—'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Model Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sliders className="h-4 w-4 text-primary" />
              Model Parameters
            </CardTitle>
            <CardDescription>
              Adjust the Isolation Forest configuration. Saving retrains the model automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Contamination rate</Label>
                <span className="text-sm font-semibold tabular-nums text-primary">
                  {settings.contamination.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[settings.contamination]}
                min={0.01}
                max={0.5}
                step={0.01}
                onValueChange={(v) => setSettings({ ...settings, contamination: v[0] })}
              />
              <p className="text-xs text-muted-foreground">
                The expected fraction of anomalous employees. Higher values flag more employees.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seed">Random seed</Label>
              <Input
                id="seed"
                type="number"
                value={settings.random_seed}
                onChange={(e) =>
                  setSettings({ ...settings, random_seed: Number(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Controls reproducibility of the random forest.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimators">Number of estimators (trees)</Label>
              <Input
                id="estimators"
                type="number"
                min={10}
                max={500}
                value={settings.n_estimators}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    n_estimators: Math.max(10, Number(e.target.value)),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                More trees improve stability at the cost of training time.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save settings'}
              </Button>
              <Button variant="outline" onClick={handleRetrain} disabled={retraining}>
                {retraining ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {retraining ? 'Retraining…' : 'Retrain model'}
              </Button>
            </div>

            {settings.last_trained_at && (
              <p className="text-xs text-muted-foreground">
                Last trained: {new Date(settings.last_trained_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Profile + Email */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="h-4 w-4 text-primary" />
                Display Name
              </CardTitle>
              <CardDescription>The name shown throughout the application.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDisplayName} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={80}
                    required
                  />
                </div>
                <Button type="submit" disabled={savingName}>
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save name
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-primary" />
                Change Email
              </CardTitle>
              <CardDescription>Update the email address used to sign in.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail">New email address</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={savingEmail}>
                  {savingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Update email
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Password change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>
            Choose a strong password — at least 12 characters with upper and lower case letters, a
            number, and a special character.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="currentPw">Current password</Label>
                <div className="relative">
                  <Input
                    id="currentPw"
                    type={showPw ? 'text' : 'password'}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPw">New password</Label>
                <Input
                  id="newPw"
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  autoComplete="new-password"
                  aria-invalid={newPw.length > 0 && !pwStrength.meetsAll}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPw">Confirm new password</Label>
                <Input
                  id="confirmPw"
                  type={showPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  autoComplete="new-password"
                  aria-invalid={confirmPw.length > 0 && confirmPw !== newPw}
                />
              </div>
            </div>
            {newPw.length > 0 && <PasswordStrength strength={pwStrength} />}
            {confirmPw.length > 0 && confirmPw !== newPw && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                Passwords do not match.
              </p>
            )}
            <Button type="submit" disabled={pwSaving}>
              {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 2FA */}
      <MfaSection onStatusChange={refreshProfile} />
    </div>
  );
}
