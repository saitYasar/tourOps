'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Users, CheckCircle, XCircle, MessageSquare, Building2, Clock, ChevronDown, ChevronUp, FileText, Timer, Percent } from 'lucide-react';
import { toast } from 'sonner';

import { preReservationOrgApi, organizationApi, type PreReservationDto } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate, formatDateTime, formatShortDateTime } from '@/lib/dateUtils';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LoadingState, EmptyState, ErrorState, RequestStatusBadge } from '@/components/shared';

type PreReservationStatus = 'pending' | 'approved' | 'rejected';

export default function RestaurantRequestsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const apiLang = (locale === 'de' ? 'en' : locale) as 'tr' | 'en';

  const { data: orgResult } = useQuery({
    queryKey: ['my-organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });
  const orgStatus = orgResult?.success ? orgResult.data?.status : undefined;

  const [statusFilter, setStatusFilter] = useState<PreReservationStatus | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<PreReservationDto | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [choiceDeadline, setChoiceDeadline] = useState<string>('');

  // Query: Pre-reservation requests — pass status filter to API
  const {
    data: requestsResult,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['org-pre-reservations', statusFilter, apiLang],
    queryFn: () => preReservationOrgApi.getAll(statusFilter === 'all' ? undefined : statusFilter, apiLang),
  });

  const requests = requestsResult?.success ? requestsResult.data || [] : [];

  // Mutation: Approve
  const approveMutation = useMutation({
    mutationFn: ({ id, choiceDeadline: deadline, responseNote: note }: { id: number; choiceDeadline?: number; responseNote?: string }) =>
      preReservationOrgApi.approve(id, deadline, note, apiLang),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || t.common.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['org-pre-reservations'] });
      toast.success(t.requests.approvedSuccess);
      closeDialog();
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  // Mutation: Reject — now sends rejectionReason
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      preReservationOrgApi.reject(id, reason, apiLang),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || t.common.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['org-pre-reservations'] });
      toast.success(t.requests.rejectedSuccess);
      closeDialog();
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  const openApproveDialog = (request: PreReservationDto) => {
    setSelectedRequest(request);
    setActionType('approve');
    setResponseNote('');
    setChoiceDeadline('');
  };

  const openRejectDialog = (request: PreReservationDto) => {
    setSelectedRequest(request);
    setActionType('reject');
    setResponseNote('');
    setChoiceDeadline('');
  };

  const closeDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setResponseNote('');
    setChoiceDeadline('');
  };

  const handleConfirmAction = () => {
    if (!selectedRequest || !actionType) return;

    if (actionType === 'approve') {
      const deadline = choiceDeadline ? Number(choiceDeadline) : undefined;
      const note = responseNote.trim() || undefined;
      approveMutation.mutate({ id: selectedRequest.id, choiceDeadline: deadline, responseNote: note });
    } else {
      if (!responseNote.trim()) {
        toast.error(t.requests.rejectionReasonRequired);
        return;
      }
      rejectMutation.mutate({ id: selectedRequest.id, reason: responseNote.trim() });
    }
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  // Get tour display name
  const getTourName = (r: PreReservationDto) =>
    r.tour?.tourName || `#${r.tourId}`;

  const getTourDate = (r: PreReservationDto) => {
    if (r.tour?.startDate) return formatDate(r.tour.startDate);
    return null;
  };

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
            ) : error ? (
              <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
            ) : requestsResult && !requestsResult.success ? (
              <ErrorState message={requestsResult.error} onRetry={() => refetch()} />
            ) : !requests.length ? (
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
                {requests.map((request) => {
                  const isExpanded = expandedId === request.id;
                  const hasDetails = request.tour?.description || request.note || request.responseNote || request.rejectionReason;

                  return (
                    <Card key={request.id} className="border transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-semibold text-lg">
                                {getTourName(request)}
                              </h3>
                              <RequestStatusBadge status={request.status} />
                            </div>

                            {/* Summary row: description snippet + createdAt */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                              {getTourDate(request) && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {getTourDate(request)}
                                </span>
                              )}
                              {(request.scheduledStartTime || request.scheduledEndTime) && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {request.scheduledStartTime && formatShortDateTime(request.scheduledStartTime)}
                                  {request.scheduledStartTime && request.scheduledEndTime && ' - '}
                                  {request.scheduledEndTime && formatShortDateTime(request.scheduledEndTime)}
                                </span>
                              )}
                              {request.headcount != null && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {request.headcount} {t.venue.persons}
                                </span>
                              )}
                              {request.tour?.agency && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-4 w-4" />
                                  {request.tour.agency.name}
                                </span>
                              )}
                              {request.organization?.agencyCommissionRate != null && (
                                <span className="flex items-center gap-1">
                                  <Percent className="h-4 w-4" />
                                  {t.tours.commissionRate}: %{request.organization.agencyCommissionRate}
                                </span>
                              )}
                              {request.createdAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {formatDate(request.createdAt)}
                                </span>
                              )}
                            </div>

                            {/* Description snippet (always visible, truncated) */}
                            {request.tour?.description && !isExpanded && (
                              <div className="flex items-center gap-1 text-sm text-slate-500">
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span className="line-clamp-1">{request.tour.description}</span>
                              </div>
                            )}

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="space-y-2 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                {request.tour?.description && (
                                  <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                                    <span className="font-medium flex items-center gap-1 mb-1">
                                      <FileText className="h-3.5 w-3.5" />
                                      {t.requests.tourDescription}
                                    </span>
                                    <span className="block text-slate-500 whitespace-pre-line">{request.tour.description}</span>
                                  </div>
                                )}

                                {request.note && (
                                  <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded">
                                    <span className="font-medium">{t.requests.note}:</span> {request.note}
                                  </div>
                                )}

                                {request.responseNote && (
                                  <div className="text-sm text-slate-500 bg-blue-50 p-2 rounded">
                                    <span className="font-medium">{t.requests.responseNote}:</span>{' '}
                                    {request.responseNote}
                                  </div>
                                )}

                                {request.rejectionReason && (
                                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                    <span className="font-medium">{t.requests.rejectionReason}:</span>{' '}
                                    {request.rejectionReason}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Expand/collapse toggle */}
                            {hasDetails && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : request.id)}
                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors pt-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-3.5 w-3.5" />
                                    {t.requests.hideDetails}
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                    {t.requests.showDetails}
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!(!request.status || request.status.toLowerCase() === 'pending')}
                                    onClick={() => openRejectDialog(request)}
                                  >
                                    <XCircle className="h-4 w-4 mr-1 text-red-500" />
                                    {t.requests.reject}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {request.status && request.status.toLowerCase() !== 'pending' && (
                                <TooltipContent>{t.tooltips.requestNotPending}</TooltipContent>
                              )}
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button
                                    size="sm"
                                    disabled={!(!request.status || request.status.toLowerCase() === 'pending')}
                                    onClick={() => openApproveDialog(request)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {t.requests.approve}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {request.status && request.status.toLowerCase() !== 'pending' && (
                                <TooltipContent>{t.tooltips.requestNotPending}</TooltipContent>
                              )}
                            </Tooltip>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
                <p className="font-medium">{getTourName(selectedRequest)}</p>
                {getTourDate(selectedRequest) && (
                  <p className="text-sm text-slate-600">
                    {getTourDate(selectedRequest)}
                  </p>
                )}
                {(selectedRequest.scheduledStartTime || selectedRequest.scheduledEndTime) && (
                  <p className="text-sm text-slate-600 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {selectedRequest.scheduledStartTime && formatShortDateTime(selectedRequest.scheduledStartTime)}
                    {selectedRequest.scheduledStartTime && selectedRequest.scheduledEndTime && ' - '}
                    {selectedRequest.scheduledEndTime && formatShortDateTime(selectedRequest.scheduledEndTime)}
                  </p>
                )}
                {selectedRequest.headcount != null && (
                  <p className="text-sm text-slate-600">{selectedRequest.headcount} {t.venue.persons}</p>
                )}
                {selectedRequest.tour?.agency && (
                  <p className="text-sm text-slate-600">
                    <Building2 className="h-3.5 w-3.5 inline mr-1" />
                    {selectedRequest.tour.agency.name}
                  </p>
                )}
                {selectedRequest.organization?.agencyCommissionRate != null && (
                  <p className="text-sm text-slate-600">
                    <Percent className="h-3.5 w-3.5 inline mr-1" />
                    {t.tours.commissionRate}: %{selectedRequest.organization.agencyCommissionRate}
                  </p>
                )}
              </div>

              {/* Choice Deadline - only for approve */}
              {actionType === 'approve' && (
                <div className="space-y-2">
                  <Label htmlFor="choiceDeadline" className="flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5" />
                    {t.requests.choiceDeadline}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="choiceDeadline"
                      type="number"
                      min={1}
                      value={choiceDeadline}
                      onChange={(e) => setChoiceDeadline(e.target.value)}
                      placeholder="24"
                      className="w-24"
                    />
                    <span className="text-sm text-slate-500">{t.requests.choiceDeadlineUnit}</span>
                  </div>
                  <p className="text-xs text-slate-400">{t.requests.choiceDeadlineDesc}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="responseNote">
                  {actionType === 'reject' ? `${t.requests.rejectionReason} *` : t.requests.responseNote}
                </Label>
                <Textarea
                  id="responseNote"
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder={
                    actionType === 'reject'
                      ? t.requests.rejectionReasonPlaceholder
                      : t.requests.responseNote
                  }
                  rows={3}
                  required={actionType === 'reject'}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              {t.common.cancel}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    type="submit"
                    disabled={isPending || (actionType === 'reject' && !responseNote.trim())}
                    variant={actionType === 'reject' ? 'destructive' : 'default'}
                  >
                    {isPending
                      ? t.common.loading
                      : actionType === 'approve'
                      ? t.requests.approve
                      : t.requests.reject}
                  </Button>
                </span>
              </TooltipTrigger>
              {(isPending || (actionType === 'reject' && !responseNote.trim())) && (
                <TooltipContent>
                  {isPending ? t.tooltips.formSubmitting : t.tooltips.rejectNeedsReason}
                </TooltipContent>
              )}
            </Tooltip>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
