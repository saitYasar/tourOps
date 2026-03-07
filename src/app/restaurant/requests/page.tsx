'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Users, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

import { preReservationOrgApi, organizationApi, type PreReservationDto } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/dateUtils';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState, EmptyState, ErrorState, RequestStatusBadge } from '@/components/shared';

type PreReservationStatus = 'pending' | 'approved' | 'rejected';

export default function RestaurantRequestsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t, locale } = useLanguage();

  const { data: orgResult } = useQuery({
    queryKey: ['my-organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });
  const orgStatus = orgResult?.success ? orgResult.data?.status : undefined;

  const [statusFilter, setStatusFilter] = useState<PreReservationStatus | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<PreReservationDto | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  // Query: Pre-reservation requests from real API
  const {
    data: requestsResult,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['org-pre-reservations'],
    queryFn: () => preReservationOrgApi.getAll(),
  });

  const requests = requestsResult?.success ? requestsResult.data || [] : [];

  // Mutation: Approve
  const approveMutation = useMutation({
    mutationFn: (id: number) => preReservationOrgApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-pre-reservations'] });
      toast.success(t.requests.approvedSuccess);
      closeDialog();
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

  // Mutation: Reject
  const rejectMutation = useMutation({
    mutationFn: (id: number) => preReservationOrgApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-pre-reservations'] });
      toast.success(t.requests.rejectedSuccess);
      closeDialog();
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

  const openApproveDialog = (request: PreReservationDto) => {
    setSelectedRequest(request);
    setActionType('approve');
    setResponseNote('');
  };

  const openRejectDialog = (request: PreReservationDto) => {
    setSelectedRequest(request);
    setActionType('reject');
    setResponseNote('');
  };

  const closeDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setResponseNote('');
  };

  const handleConfirmAction = () => {
    if (!selectedRequest || !actionType) return;

    if (actionType === 'approve') {
      approveMutation.mutate(selectedRequest.id);
    } else {
      rejectMutation.mutate(selectedRequest.id);
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header
        title={t.requests.title}
        description={t.requests.description}
        organizationStatus={orgStatus}
        lang={locale}
      />

      <div className="flex-1 p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-medium">{t.requests.list}</CardTitle>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as PreReservationStatus | 'all')}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t.requests.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                <SelectItem value="pending">{t.requests.pending}</SelectItem>
                <SelectItem value="approved">{t.requests.approved}</SelectItem>
                <SelectItem value="rejected">{t.requests.rejected}</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState message={t.common.loading} />
            ) : error || (requestsResult && !requestsResult.success) ? (
              <ErrorState onRetry={() => refetch()} />
            ) : !filteredRequests.length ? (
              <EmptyState
                icon={MessageSquare}
                title={t.requests.notFound}
                description={
                  statusFilter !== 'all'
                    ? t.common.notFoundDesc
                    : t.requests.noRequests
                }
              />
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">
                              {request.tour?.title || `Tur #${request.tourId}`}
                            </h3>
                            <RequestStatusBadge status={request.status === 'pending' ? 'Pending' : request.status === 'approved' ? 'Approved' : 'Rejected'} />
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                            {request.tour?.tourDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(request.tour.tourDate)}
                              </span>
                            )}
                            {request.headcount && (
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {request.headcount} {t.venue.persons}
                              </span>
                            )}
                          </div>

                          {request.note && (
                            <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded">
                              <span className="font-medium">{t.requests.note}:</span> {request.note}
                            </p>
                          )}

                          {request.responseNote && (
                            <p className="text-sm text-slate-500 bg-blue-50 p-2 rounded">
                              <span className="font-medium">{t.requests.responseNote}:</span>{' '}
                              {request.responseNote}
                            </p>
                          )}
                        </div>

                        {request.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRejectDialog(request)}
                            >
                              <XCircle className="h-4 w-4 mr-1 text-red-500" />
                              {t.requests.reject}
                            </Button>
                            <Button size="sm" onClick={() => openApproveDialog(request)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {t.requests.approve}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Onay/Red Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? t.requests.approve : t.requests.reject}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? t.requests.approveConfirm
                : t.requests.rejectConfirm}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleConfirmAction(); }}>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                <p className="font-medium">{selectedRequest.tour?.title || `Tur #${selectedRequest.tourId}`}</p>
                {selectedRequest.tour?.tourDate && (
                  <p className="text-sm text-slate-600">
                    {formatDate(selectedRequest.tour.tourDate)}
                  </p>
                )}
                {selectedRequest.headcount && (
                  <p className="text-sm text-slate-600">{selectedRequest.headcount} {t.venue.persons}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="responseNote">
                  {t.requests.responseNote}
                </Label>
                <Textarea
                  id="responseNote"
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder={t.requests.responseNote}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {isPending
                ? t.common.loading
                : actionType === 'approve'
                ? t.requests.approve
                : t.requests.reject}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
