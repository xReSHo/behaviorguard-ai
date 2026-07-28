import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface Profile {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  last_login_at: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<{ error: string | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: string | null }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (m.includes('user already registered')) return 'An account with this email already exists.';
  if (m.includes('email rate limit')) return 'Too many attempts. Please wait a moment and try again.';
  if (m.includes('password should be at least'))
    return 'Password does not meet the minimum strength requirements.';
  if (m.includes('unable to validate email address') || m.includes('email_address_invalid'))
    return 'Please enter a valid email address.';
  if (m.includes('rate limit')) return 'Too many requests. Please wait and try again.';
  if (m.includes('network') || m.includes('fetch')) return 'Network error. Check your connection.';
  return 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name, created_at, last_login_at')
      .eq('id', uid)
      .maybeSingle();
    if (error) return null;
    return data as Profile | null;
  }, []);

  // Bootstrap the session on mount and subscribe to auth changes.
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        const p = await loadProfile(data.session.user.id);
        if (mounted) setProfile(p);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const p = await loadProfile(newSession.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await loadProfile(user.id);
      setProfile(p);
    }
  }, [user, loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) return { error: friendlyAuthError(error.message) };
      // Record last login time.
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session?.user) {
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', sess.session.user.id);
      }
      return { error: null };
    },
    [],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
    ): Promise<{ error: string | null }> => {
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), display_name: displayName } },
      });
      if (error) return { error: friendlyAuthError(error.message) };
      // Create the profile row (RLS allows the owner to insert their own row).
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          display_name: displayName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        });
      }
      return { error: null };
    },
    [],
  );

  const signInWithOAuth = useCallback(
    async (provider: 'google' | 'github'): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + '/dashboard' },
      });
      if (error) return { error: friendlyAuthError(error.message) };
      return { error: null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const updateDisplayName = useCallback(
    async (displayName: string): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not signed in.' };
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', user.id);
      if (error) return { error: 'Could not update your display name.' };
      await refreshProfile();
      return { error: null };
    },
    [user, refreshProfile],
  );

  const updateEmail = useCallback(
    async (newEmail: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim().toLowerCase() });
      if (error) return { error: friendlyAuthError(error.message) };
      return { error: null };
    },
    [],
  );

  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<{ error: string | null }> => {
      // Re-authenticate by signing in with the current password before changing it.
      if (!user?.email) return { error: 'Not signed in.' };
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) return { error: 'Your current password is incorrect.' };
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: friendlyAuthError(error.message) };
      return { error: null };
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      signIn,
      signUp,
      signInWithOAuth,
      signOut,
      refreshProfile,
      updateDisplayName,
      updateEmail,
      updatePassword,
    }),
    [
      session,
      user,
      profile,
      loading,
      signIn,
      signUp,
      signInWithOAuth,
      signOut,
      refreshProfile,
      updateDisplayName,
      updateEmail,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
