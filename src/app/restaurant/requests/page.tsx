'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Users, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

import { preReservationApi, tourApi } from '@/lib/mockApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PreReservationRequest, RequestStatus } from '@/types';
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

export default function RestaurantRequestsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const restaurantId = user?.restaurantId;

  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<PreReservationRequest | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  // Query: Gelen istekler
  const {
    data: requests,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['restaurantRequests', restaurantId],
    queryFn: () => preReservationApi.listByRestaurant(restaurantId || ''),
    enabled: !!restaurantId,
  });

  // Query: Turlar (tur adini gostermek icin)
  const { data: tours } = useQuery({
    queryKey: ['tours'],
    queryFn: tourApi.list,
  });

  // Mutation: Durum güncelle
  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: RequestStatus;
      note?: string;
    }) => preReservationApi.updateStatus(id, status, note),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['restaurantRequests', restaurantId] });
      toast.success(
        variables.status === 'Approved'
          ? t.requests.approvedSuccess
          : t.requests.rejectedSuccess
      );
      closeDialog();
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

  const getTourName = (tourId: string) => {
    return tours?.find((t) => t.id === tourId)?.name || '-';
  };

  const openApproveDialog = (request: PreReservationRequest) => {
    setSelectedRequest(request);
    setActionType('approve');
    setResponseNote('');
  };

  const openRejectDialog = (request: PreReservationRequest) => {
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

    updateStatusMutation.mutate({
      id: selectedRequest.id,
      status: actionType === 'approve' ? 'Approved' : 'Rejected',
      note: responseNote || undefined,
    });
  };

  const filteredRequests = requests?.filter((request) => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  return (
    <div className="flex flex-col h-full">
      <Header
        title={t.requests.title}
        description={t.requests.description}
      />

      <div className="flex-1 p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-medium">{t.requests.list}</CardTitle>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as RequestStatus | 'all')}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t.requests.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                <SelectItem value="Pending">{t.requests.pending}</SelectItem>
                <SelectItem value="Approved">{t.requests.approved}</SelectItem>
                <SelectItem value="Rejected">{t.requests.rejected}</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState message={t.common.loading} />
            ) : error ? (
              <ErrorState onRetry={() => refetch()} />
            ) : !filteredRequests?.length ? (
              <EmptyState
                icon={MessageSquare}
                title={t.requests.notFound}
                description={
                  statusFilter !== 'all'
                    ? t.regions.notFoundDesc
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
                              {getTourName(request.tourId)}
                            </h3>
                            <RequestStatusBadge status={request.status} />
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(request.date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {request.timeStart} - {request.timeEnd}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {request.headcount} {t.venue.persons}
                            </span>
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

                        {request.status === 'Pending' && (
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

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                <p className="font-medium">{getTourName(selectedRequest.tourId)}</p>
                <p className="text-sm text-slate-600">
                  {formatDate(selectedRequest.date)} | {selectedRequest.timeStart} -{' '}
                  {selectedRequest.timeEnd}
                </p>
                <p className="text-sm text-slate-600">{selectedRequest.headcount} {t.venue.persons}</p>
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
            <Button variant="outline" onClick={closeDialog}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={updateStatusMutation.isPending}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {updateStatusMutation.isPending
                ? t.common.loading
                : actionType === 'approve'
                ? t.requests.approve
                : t.requests.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
