'use client';

import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { RequestStatus, TourStatus } from '@/types';

interface RequestStatusBadgeProps {
  status: RequestStatus;
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  const { t } = useLanguage();

  const config: Record<RequestStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    Pending: { label: t.requests.pending, variant: 'secondary' },
    Approved: { label: t.requests.approved, variant: 'default' },
    Rejected: { label: t.requests.rejected, variant: 'destructive' },
  };

  const statusConfig = config[status];
  return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
}

interface TourStatusBadgeProps {
  status: TourStatus;
}

export function TourStatusBadge({ status }: TourStatusBadgeProps) {
  const { t } = useLanguage();

  const config: Record<TourStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
    draft: { label: t.tours.draft, variant: 'secondary' },
    published: { label: t.tours.published, variant: 'default' },
    cancelled: { label: t.tours.cancelled || 'Cancelled', variant: 'destructive' },
    completed: { label: t.tours.completed || 'Completed', variant: 'outline', className: 'border-blue-300 bg-blue-50 text-blue-700' },
  };

  const statusConfig = config[status];
  return (
    <Badge variant={statusConfig.variant} className={statusConfig.className}>
      {statusConfig.label}
    </Badge>
  );
}
