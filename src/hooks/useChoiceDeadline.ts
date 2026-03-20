import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type ChoiceDeadlineRemainingDto } from '@/lib/api';

interface DeadlineState {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
  isLoading: boolean;
  deadlineTime?: string;
}

export function useChoiceDeadline(tourStopId: number | null | undefined, enabled = true): DeadlineState {
  const { data, isLoading } = useQuery({
    queryKey: ['choice-deadline', tourStopId],
    queryFn: () => apiClient.getChoiceDeadlineRemaining(tourStopId!),
    enabled: enabled && !!tourStopId,
    refetchInterval: 60_000, // refetch every minute
    staleTime: 30_000,
  });

  const deadline = data as ChoiceDeadlineRemainingDto | undefined;

  const [remaining, setRemaining] = useState<{ days: number; hours: number; minutes: number; isExpired: boolean }>({
    days: 0, hours: 0, minutes: 0, isExpired: true,
  });

  useEffect(() => {
    if (!deadline?.deadlineTime) return;

    const tick = () => {
      const now = Date.now();
      const end = new Date(deadline.deadlineTime).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setRemaining({ days: 0, hours: 0, minutes: 0, isExpired: true });
        return;
      }
      const totalMinutes = Math.floor(diff / 60_000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;
      setRemaining({ days, hours, minutes, isExpired: false });
    };

    tick();
    const interval = setInterval(tick, 30_000); // update every 30s
    return () => clearInterval(interval);
  }, [deadline?.deadlineTime]);

  return {
    ...remaining,
    isLoading,
    deadlineTime: deadline?.deadlineTime,
  };
}
