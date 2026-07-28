// TOTP MFA helpers built on Supabase Auth's MFA API.
// The QR code returned by Supabase is an SVG string; we render it as a data URL.
// Recovery codes are generated client-side and shown once — the user must
// store them. We do not persist recovery codes anywhere (Supabase does not
// store them either); they are the user's responsibility.

import type { Factor } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface EnrollResult {
  factorId: string;
  qrCode: string; // data URL ready for <img src=...>
  secret: string;
  uri: string;
}

// Map raw Supabase MFA error messages to user-friendly text. Unexpected
// errors are logged to the console for debugging and replaced with a generic
// message so the user never sees a raw backend string.
export function friendlyMfaError(rawMessage: string): string {
  const m = rawMessage.toLowerCase();
  if (m.includes('already exists') && m.includes('friendly name'))
    return 'Two-factor authentication is already enabled for your account.';
  if (m.includes('factor') && m.includes('already'))
    return 'Your authenticator has already been configured.';
  if (m.includes('invalid') && m.includes('code'))
    return 'That code did not match. Please try again.';
  if (m.includes('challenge') && m.includes('expired'))
    return 'The verification session expired. Please try again.';
  if (m.includes('rate limit'))
    return 'Too many attempts. Please wait a moment and try again.';
  // Log unexpected errors for debugging, return a clean message.
  console.error('[MFA] Unexpected backend error:', rawMessage);
  return 'Something went wrong. Please try again.';
}

export async function listFactors(): Promise<Factor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return [];
  return data.all ?? [];
}

// Find an existing TOTP factor by friendly name. Returns the factor or null.
export async function findExistingTotpFactor(
  friendlyName = 'Authenticator',
): Promise<Factor | null> {
  const factors = await listFactors();
  return (
    factors.find((f) => f.factor_type === 'totp' && f.friendly_name === friendlyName) ??
    factors.find((f) => f.factor_type === 'totp') ??
    null
  );
}

// Create a new TOTP factor. Only call this after confirming no existing
// factor with the same friendly name exists — otherwise Supabase returns a
// duplicate error.
export async function enrollTotp(): Promise<{ data: EnrollResult | null; error: string | null }> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'BehaviorGuard AI',
    friendlyName: 'Authenticator',
  });
  if (error) return { data: null, error: friendlyMfaError(error.message) };
  return {
    data: {
      factorId: data.id,
      qrCode: `data:image/svg+xml;utf8,${encodeURIComponent(data.totp.qr_code)}`,
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
    error: null,
  };
}

export async function verifyTotp(
  factorId: string,
  code: string,
): Promise<{ error: string | null }> {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) return { error: friendlyMfaError(challengeError.message) };
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (error) return { error: friendlyMfaError(error.message) };
  return { error: null };
}

export async function unenrollFactor(factorId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: friendlyMfaError(error.message) };
  return { error: null };
}

export async function getAuthenticatorAssuranceLevel(): Promise<{
  currentLevel: string | null;
  nextLevel: string | null;
}> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return { currentLevel: null, nextLevel: null };
  return { currentLevel: data.currentLevel, nextLevel: data.nextLevel };
}

// Generate 10 cryptographically-random recovery codes using the Web Crypto
// API. Format: XXXX-XXXX-XXXX (alphanumeric).
export function generateRecoveryCodes(count = 10): string[] {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const codes: string[] = [];
  const bytes = new Uint32Array(count * 12);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 12; j++) {
      code += alphabet[bytes[i * 12 + j] % alphabet.length];
      if (j === 3 || j === 7) code += '-';
    }
    codes.push(code);
  }
  return codes;
}
