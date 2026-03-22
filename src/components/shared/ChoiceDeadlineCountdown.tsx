'use client';

import { Timer, AlertTriangle } from 'lucide-react';
import { useChoiceDeadline } from '@/hooks/useChoiceDeadline';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChoiceDeadlineCountdownProps {
  tourStopId: number | null | undefined;
  enabled?: boolean;
  compact?: boolean;
}

export function ChoiceDeadlineCountdown({ tourStopId, enabled = true, compact = false }: ChoiceDeadlineCountdownProps) {
  const { days, hours, minutes, seconds, isExpired, isLoading, deadlineTime } = useChoiceDeadline(tourStopId, enabled);
  const { t } = useLanguage();

  if (isLoading || !deadlineTime) return null;

  if (isExpired) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'} text-red-600 font-medium`}>
        <AlertTriangle className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        <span>{(t.tours as Record<string, string>).deadlineExpired || 'Süre doldu'}</span>
      </div>
    );
  }

  const isUrgent = days === 0 && hours < 3;
  const colorClass = isUrgent ? 'text-red-600' : days === 0 ? 'text-amber-600' : 'text-emerald-600';
  const bgClass = isUrgent ? 'bg-red-50 border-red-200' : days === 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';

  const pad = (n: number) => n.toString().padStart(2, '0');

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}g`);
  parts.push(`${pad(hours)}s`);
  parts.push(`${pad(minutes)}dk`);
  parts.push(`${pad(seconds)}sn`);
  const timeStr = parts.join(' ');

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${colorClass}`}>
        <Timer className="h-3 w-3" />
        {timeStr}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-medium tabular-nums ${bgClass} ${colorClass}`}>
      <Timer className="h-4 w-4" />
      <span>{timeStr}</span>
    </div>
  );
}
