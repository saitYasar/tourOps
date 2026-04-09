import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type ChoiceDeadlineRemainingDto } from '@/lib/api';

interface DeadlineState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isLoading: boolean;
  deadlineTime?: string;
}

export function useChoiceDeadline(tourStopId: number | null | undefined, enabled = true): DeadlineState {
  const { data, isLoading } = useQuery({
    queryKey: ['choice-deadline', tourStopId],
    queryFn: () => apiClient.getChoiceDeadlineRemaining(tourStopId!),
    enabled: enabled && !!tourStopId,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });

  const deadline = data as ChoiceDeadlineRemainingDto | undefined;

  // Prefer choiceDeadlineTime (new), fall back to deadlineTime (old)
  const resolvedDeadlineTime = deadline?.choiceDeadlineTime || deadline?.deadlineTime;

  const [remaining, setRemaining] = useState<{ days: number; hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true,
  });

  useEffect(() => {
    if (!resolvedDeadlineTime) return;

    const tick = () => {
      const now = Date.now();
      const stripped = resolvedDeadlineTime.replace(/[Zz]$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
      const end = new Date(stripped).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setRemaining({ days, hours, minutes, seconds, isExpired: false });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [resolvedDeadlineTime]);

  return {
    ...remaining,
    isLoading,
    deadlineTime: resolvedDeadlineTime,
  };
}
