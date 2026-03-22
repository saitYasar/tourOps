'use client';

import { useState, useEffect, useMemo } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';
import { useChoiceDeadline } from '@/hooks/useChoiceDeadline';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChoiceDeadlineCountdownProps {
  tourStopId: number | null | undefined;
  enabled?: boolean;
  compact?: boolean;
  /** Provide stop data directly — skips API call, computes deadline client-side */
  scheduledEndTime?: string | null;
  choiceDeadlineHours?: number | null;
}

function useLocalCountdown(deadlineTime: string | null | undefined) {
  const [state, setState] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });

  useEffect(() => {
    if (!deadlineTime) return;

    const tick = () => {
      const diff = new Date(deadlineTime).getTime() - Date.now();
      if (diff <= 0) {
        setState({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }
      const total = Math.floor(diff / 1000);
      setState({
        days: Math.floor(total / 86400),
        hours: Math.floor((total % 86400) / 3600),
        minutes: Math.floor((total % 3600) / 60),
        seconds: total % 60,
        isExpired: false,
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadlineTime]);

  return state;
}

export function ChoiceDeadlineCountdown({
  tourStopId,
  enabled = true,
  compact = false,
  scheduledEndTime,
  choiceDeadlineHours,
}: ChoiceDeadlineCountdownProps) {
  const { t } = useLanguage();
  const tours = t.tours as Record<string, string>;
  const label = tours.lastSelectionTime || 'Son seçim saati';

  // Compute deadline from props if provided
  const localDeadlineTime = useMemo(() => {
    if (!scheduledEndTime || !choiceDeadlineHours) return null;
    return new Date(new Date(scheduledEndTime).getTime() - choiceDeadlineHours * 3600000).toISOString();
  }, [scheduledEndTime, choiceDeadlineHours]);

  // Use API hook only when no local data available
  const useApi = !localDeadlineTime;
  const apiData = useChoiceDeadline(useApi ? tourStopId : null, useApi && enabled);
  const localData = useLocalCountdown(localDeadlineTime);

  const { days, hours, minutes, seconds, isExpired } = localDeadlineTime ? localData : apiData;
  const deadlineTime = localDeadlineTime || apiData.deadlineTime;
  const isLoading = useApi ? apiData.isLoading : false;

  if (isLoading || !deadlineTime) return null;

  if (isExpired) {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
          <AlertTriangle className="h-3 w-3" />
          {tours.deadlineExpired}
        </span>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-medium bg-red-50 border-red-200 text-red-600">
        <AlertTriangle className="h-4 w-4" />
        <span>{tours.deadlineExpired}</span>
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
        {label}: {timeStr}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-medium tabular-nums ${bgClass} ${colorClass}`}>
      <Timer className="h-4 w-4" />
      <span>{label}: {timeStr}</span>
    </div>
  );
}
