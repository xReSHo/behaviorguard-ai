import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import type { PredictionLabel } from '@/lib/types';

interface RiskBadgeProps {
  score: number;
  label: PredictionLabel;
  className?: string;
}

export function RiskBadge({ score, label, className }: RiskBadgeProps) {
  const anomalous = label === 'Anomalous';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant={anomalous ? 'destructive' : 'secondary'}>
        {anomalous ? 'Anomalous' : 'Normal'}
      </Badge>
      <span
        className={cn(
          'text-sm font-semibold tabular-nums',
          anomalous ? 'text-destructive' : 'text-foreground',
        )}
      >
        {Math.round(score)}
      </span>
    </div>
  );
}
