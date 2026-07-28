import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PasswordStrength as PasswordStrengthValue } from '@/lib/validation';

interface PasswordStrengthProps {
  strength: PasswordStrengthValue;
}

export function PasswordStrength({ strength }: PasswordStrengthProps) {
  const checks = [
    { key: 'length', label: 'At least 12 characters' },
    { key: 'uppercase', label: 'One uppercase letter' },
    { key: 'lowercase', label: 'One lowercase letter' },
    { key: 'number', label: 'One number' },
    { key: 'special', label: 'One special character' },
  ] as const;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'h-full flex-1 rounded-full transition-colors',
                i < strength.score ? strength.color : 'bg-muted',
              )}
            />
          ))}
        </div>
        <span
          className={cn(
            'w-20 text-right text-xs font-medium',
            strength.score <= 1
              ? 'text-destructive'
              : strength.score === 2
                ? 'text-warning'
                : 'text-success',
          )}
        >
          {strength.label}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {checks.map((c) => {
          const passed = strength.checks[c.key];
          return (
            <li
              key={c.key}
              className={cn(
                'flex items-center gap-1.5 text-xs',
                passed ? 'text-success' : 'text-muted-foreground',
              )}
            >
              {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {c.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
