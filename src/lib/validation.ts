// Shared input validation utilities. Used by every form in the app so
// validation rules stay consistent and are enforced on the client before
// any request is made. Server-side (Supabase Auth) validation is the
// authoritative check; this layer improves UX and prevents malformed
// submissions from leaving the browser.

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
  color: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  meetsAll: boolean;
}

const SPECIAL_CHARS = /[^A-Za-z0-9]/;

export function validatePassword(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: SPECIAL_CHARS.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  // Length is mandatory; without it the password is never acceptable.
  let score: PasswordStrength['score'] = 0;
  if (password.length === 0) score = 0;
  else if (passed <= 1) score = 1;
  else if (passed === 2) score = 2;
  else if (passed === 3) score = 3;
  else if (!checks.length) score = 3;
  else score = 4;

  const labelMap: PasswordStrength['label'][] = [
    'Too weak',
    'Weak',
    'Fair',
    'Strong',
    'Very strong',
  ];
  const colorMap = ['bg-muted', 'bg-destructive', 'bg-warning', 'bg-primary', 'bg-success'];

  return {
    score,
    label: labelMap[score],
    color: colorMap[score],
    checks,
    meetsAll: Object.values(checks).every(Boolean),
  };
}

export const PASSWORD_RULES =
  'At least 12 characters with one uppercase letter, one lowercase letter, one number, and one special character.';

export function validateEmail(email: string): boolean {
  // Pragmatic email regex — not RFC-perfect, but rejects malformed input.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length > 80) return false;
  // Disallow control characters and angle brackets to prevent markup injection.
  return !/[<>\u0000-\u001F]/.test(trimmed);
}

// Sanitize a free-text string for safe display. Strips control characters and
// trims whitespace. React escapes output by default, so this is defense in
// depth rather than the primary XSS control.
export function sanitizeText(input: string): string {
  return input.replace(/[\u0000-\u001F]/g, '').trim();
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateLoginForm(email: string, password: string): ValidationResult {
  if (!email.trim()) return { valid: false, message: 'Please enter your email address.' };
  if (!validateEmail(email)) return { valid: false, message: 'Please enter a valid email address.' };
  if (!password) return { valid: false, message: 'Please enter your password.' };
  return { valid: true };
}

export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateRegisterForm(v: RegisterFormValues): ValidationResult {
  if (!validateName(v.firstName)) return { valid: false, message: 'Please enter your first name.' };
  if (!validateName(v.lastName)) return { valid: false, message: 'Please enter your last name.' };
  if (!validateEmail(v.email)) return { valid: false, message: 'Please enter a valid email address.' };
  const strength = validatePassword(v.password);
  if (!strength.meetsAll) return { valid: false, message: PASSWORD_RULES };
  if (v.password !== v.confirmPassword)
    return { valid: false, message: 'Password and confirmation do not match.' };
  return { valid: true };
}
