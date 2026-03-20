'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Printer,
  DollarSign,
  ClipboardList,
  RotateCcw,
  User as UserIcon,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  preReservationOrgApi,
  organizationApi,
  type PreReservationDto,
  type AgencyStopChoicesDto,
  type AgencyStopServiceSummaryDto,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/dateUtils';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  LoadingState, EmptyState, ErrorState,
  CompactReceipt, DetailedListReceipt, KitchenSummaryReceipt, ReceiptServiceSummary,
  handleReceiptPrint, exportReceiptExcel,
} from '@/components/shared';
import type { ReceiptTemplate } from '@/components/shared';

// ============================================
// Choices Status Badge
// ============================================
function ChoicesStatusBadge({ status, t }: { status: PreReservationDto['choicesStatus']; t: ReturnType<typeof useLanguage>['t'] }) {
  if (!status) return null;
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    in_progress: { variant: 'outline', label: t.tours.choicesStatusInProgress },
    submitted: { variant: 'secondary', label: t.tours.choicesStatusSubmitted },
    approved: { variant: 'default', label: t.tours.choicesStatusApproved },
    rejected: { variant: 'destructive', label: t.tours.choicesStatusRejected },
    revision_requested: { variant: 'outline', label: t.tours.choicesStatusRevisionRequested },
  };
  const info = map[status];
  if (!info) return null;
  return <Badge variant={info.variant} className="text-xs">{info.label}</Badge>;
}

// ============================================
// Main Page
// ============================================
export default function RestaurantGuestsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const apiLang = (locale === 'de' ? 'en' : locale) as 'tr' | 'en';
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);

  // Action dialogs
  const [actionType, setActionType] = useState<'reject' | 'revision' | null>(null);
  const [actionNote, setActionNote] = useState('');

  // Receipt dialog
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTemplate, setReceiptTemplate] = useState<ReceiptTemplate>('compact');

  // Organization info
  const { data: orgResult } = useQuery({
    queryKey: ['my-organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });
  const orgName = orgResult?.success ? orgResult.data?.name || '' : '';

  // Pre-reservations list (approved only)
  const {
    data: reservationsResult,
    isLoading: reservationsLoading,
    error: reservationsError,
  } = useQuery({
    queryKey: ['org-pre-reservations', 'approved', apiLang],
    queryFn: () => preReservationOrgApi.getAll('approved', apiLang),
  });

  const reservations = reservationsResult?.success ? reservationsResult.data || [] : [];

  // Sort: submitted first
  const sortedReservations = [...reservations].sort((a, b) => {
    if (a.choicesStatus === 'submitted' && b.choicesStatus !== 'submitted') return -1;
    if (b.choicesStatus === 'submitted' && a.choicesStatus !== 'submitted') return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Auto-select first reservation
  useEffect(() => {
    if (sortedReservations.length > 0 && !selectedId) {
      setSelectedId(sortedReservations[0].id);
    }
  }, [sortedReservations, selectedId]);

  const selectedReservation = reservations.find((r) => r.id === selectedId) || null;

  // Choices for selected reservation
  const { data: choicesResult, isLoading: choicesLoading } = useQuery({
    queryKey: ['org-choices', selectedId, apiLang],
    queryFn: () => preReservationOrgApi.getChoices(selectedId!, apiLang),
    enabled: !!selectedId,
  });
  const choices = choicesResult?.success ? choicesResult.data || [] : [];

  // Service summary for selected reservation
  const { data: summaryResult, isLoading: summaryLoading } = useQuery({
    queryKey: ['org-service-summary', selectedId, apiLang],
    queryFn: () => preReservationOrgApi.getServiceSummary(selectedId!, apiLang),
    enabled: !!selectedId,
  });
  const serviceSummary = summaryResult?.success ? summaryResult.data : null;

  // Mutations
  const approveChoicesMutation = useMutation({
    mutationFn: (id: number) => preReservationOrgApi.approveChoices(id, apiLang),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || t.common.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['org-pre-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['org-choices', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['org-service-summary', selectedId] });
      toast.success(t.guests.choicesApproved);
    },
    onError: (err: Error) => toast.error(err.message || t.common.error),
  });

  const rejectChoicesMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      preReservationOrgApi.rejectChoices(id, note, apiLang),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || t.common.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['org-pre-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['org-choices', selectedId] });
      toast.success(t.guests.choicesRejected);
      setActionType(null);
      setActionNote('');
    },
    onError: (err: Error) => toast.error(err.message || t.common.error),
  });

  const revisionMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      preReservationOrgApi.requestChoicesRevision(id, note, apiLang),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || t.common.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['org-pre-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['org-choices', selectedId] });
      toast.success(t.guests.revisionRequested);
      setActionType(null);
      setActionNote('');
    },
    onError: (err: Error) => toast.error(err.message || t.common.error),
  });

  const handleAction = useCallback(() => {
    if (!selectedId || !actionType) return;
    if (!actionNote.trim()) {
      toast.error(t.guests.noteRequired);
      return;
    }
    if (actionType === 'reject') {
      rejectChoicesMutation.mutate({ id: selectedId, note: actionNote });
    } else {
      revisionMutation.mutate({ id: selectedId, note: actionNote });
    }
  }, [selectedId, actionType, actionNote, rejectChoicesMutation, revisionMutation, t]);

  const handlePrint = useCallback(() => {
    handleReceiptPrint(printRef, receiptTemplate);
  }, [receiptTemplate]);

  const tourInfo = selectedReservation ? { tourName: selectedReservation.tour?.tourName, startDate: selectedReservation.tour?.startDate } : { tourName: '', startDate: '' };

  const handleExportExcel = useCallback(() => {
    if (!selectedReservation) return;
    exportReceiptExcel(tourInfo, choices, serviceSummary ?? null, orgName, t);
  }, [selectedReservation, choices, serviceSummary, orgName, t, tourInfo]);

  return (
    <div>
      <Header title={t.guests.title} description={t.guests.description} />

      <div className="p-6">
        <div className="flex gap-6 min-h-[calc(100vh-180px)]">
          {/* Left Panel - Reservation List (1/3) */}
          <div className="w-1/3 space-y-2">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {t.requests.approved}
            </h3>
            {reservationsLoading ? (
              <LoadingState message={t.common.loading} />
            ) : reservationsError ? (
              <ErrorState message={t.common.error} />
            ) : sortedReservations.length === 0 ? (
              <EmptyState title={t.guests.noReservations} description={t.guests.noReservationsDesc} />
            ) : (
              sortedReservations.map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(res.id);
                    setExpandedClientId(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedId === res.id
                      ? 'bg-slate-100 border-slate-400 ring-1 ring-slate-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{res.tour?.tourName || `#${res.tourId}`}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{formatDate(res.tour?.startDate)}</span>
                      </div>
                      {res.tour?.agency?.name && (
                        <p className="text-xs text-slate-400 mt-0.5">{res.tour.agency.name}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <ChoicesStatusBadge status={res.choicesStatus} t={t} />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Right Panel - Details (2/3) */}
          <div className="w-2/3">
            {!selectedReservation ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent>
                  <EmptyState
                    title={t.guests.title}
                    description={t.guests.selectReservation}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Service Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {t.guests.serviceSummary}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summaryLoading ? (
                      <LoadingState message={t.common.loading} />
                    ) : !serviceSummary?.services?.length ? (
                      <p className="text-sm text-slate-500 text-center py-4">{t.guests.noChoices}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-slate-500">
                              <th className="text-left py-2 font-medium">{t.guests.service}</th>
                              <th className="text-center py-2 font-medium">{t.guests.quantity}</th>
                              <th className="text-right py-2 font-medium">{t.tours.unitPrice}</th>
                              <th className="text-right py-2 font-medium">{t.tours.totalPrice}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {serviceSummary.services.map((item, idx) => {
                              const svcId = Number(item.serviceId || item.service?.id || 0);
                              const notes: { name: string; note: string }[] = [];
                              for (const ch of choices) {
                                const cName = [ch.client?.firstName, ch.client?.lastName].filter(Boolean).join(' ') || ch.clientName || `#${ch.clientId}`;
                                for (const sc of ch.serviceChoices || []) {
                                  if (Number(sc.serviceId) === svcId && sc.note) {
                                    notes.push({ name: cName, note: sc.note });
                                  }
                                }
                              }
                              return (
                                <React.Fragment key={svcId || idx}>
                                  <tr className={notes.length ? '' : 'border-b last:border-b-0'}>
                                    <td className="py-2">{item.serviceName || item.service?.title}</td>
                                    <td className="py-2 text-center">{item.totalQuantity}</td>
                                    <td className="py-2 text-right">{Number(item.unitPrice).toFixed(2)} ₺</td>
                                    <td className="py-2 text-right font-medium">{Number(item.totalPrice).toFixed(2)} ₺</td>
                                  </tr>
                                  {notes.length > 0 && (
                                    <tr key={`notes-${svcId}`} className="border-b last:border-b-0">
                                      <td colSpan={4} className="pb-2 pl-4">
                                        {notes.map((n, ni) => (
                                          <span key={ni} className="inline-block text-xs italic bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded mr-1 mb-0.5">
                                            {n.name}: {n.note}
                                          </span>
                                        ))}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2">
                              <td colSpan={3} className="py-2 font-semibold text-right">{t.tours.grandTotal}</td>
                              <td className="py-2 text-right font-bold text-lg">{Number(serviceSummary.grandTotal).toFixed(2)} ₺</td>
                            </tr>
                            {serviceSummary.commissionRate != null && serviceSummary.commissionAmount != null && (
                              <tr>
                                <td colSpan={3} className="py-1 text-right text-sm font-medium text-orange-600">
                                  {t.tours.agencyCommission} %{serviceSummary.commissionRate}
                                </td>
                                <td className="py-1 text-right font-semibold text-orange-600">{Number(serviceSummary.commissionAmount).toFixed(2)} ₺</td>
                              </tr>
                            )}
                            {(serviceSummary as Record<string, unknown>).systemCommissionRate != null && (serviceSummary as Record<string, unknown>).systemCommissionAmount != null && (
                              <tr>
                                <td colSpan={3} className="py-1 text-right text-sm font-medium text-violet-600">
                                  {t.tours.systemCommission} %{String((serviceSummary as Record<string, unknown>).systemCommissionRate)}
                                </td>
                                <td className="py-1 text-right font-semibold text-violet-600">{Number((serviceSummary as Record<string, unknown>).systemCommissionAmount).toFixed(2)} ₺</td>
                              </tr>
                            )}
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Choices */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      {t.guests.customerChoices}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {choicesLoading ? (
                      <LoadingState message={t.common.loading} />
                    ) : !choices.length ? (
                      <p className="text-sm text-slate-500 text-center py-4">{t.guests.noChoices}</p>
                    ) : (
                      <div className="space-y-2">
                        {choices.map((choice, choiceIdx) => {
                          const clientName = choice.client
                            ? `${choice.client.firstName || ''} ${choice.client.lastName || ''}`.trim()
                            : choice.clientName || `#${choice.clientId}`;
                          const isExpanded = expandedClientId === choice.clientId;

                          return (
                            <div key={`${choice.clientId}-${choiceIdx}`} className="border rounded-lg overflow-hidden">
                              <button
                                type="button"
                                className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors"
                                onClick={() => setExpandedClientId(isExpanded ? null : choice.clientId)}
                              >
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                  {choice.client?.profilePhoto ? (
                                    <img src={choice.client.profilePhoto} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <UserIcon className="h-4 w-4 text-slate-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-sm font-medium truncate">{clientName}</p>
                                  {choice.client?.email && (
                                    <p className="text-xs text-slate-500">{choice.client.email}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {choice.resourceChoice && (
                                    <Badge variant="outline" className="text-xs">{t.guests.resource}</Badge>
                                  )}
                                  {choice.serviceChoices && choice.serviceChoices.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {choice.serviceChoices.length} {t.guests.service.toLowerCase()}
                                    </Badge>
                                  )}
                                  {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="border-t px-3 py-3 bg-slate-50 space-y-3">
                                  {choice.resourceChoice && (
                                    <div>
                                      <p className="text-xs font-medium text-slate-500 mb-1">{t.guests.resource}</p>
                                      <div className="text-sm bg-white rounded p-2 border">
                                        {Array.isArray(choice.resourceChoice)
                                          ? choice.resourceChoice.map((item) => `${item.resourceTypeName}: ${item.resourceName}`).join(' · ')
                                          : (choice.resourceChoice.resource?.name || `#${choice.resourceChoice.resourceId}`)
                                        }
                                      </div>
                                    </div>
                                  )}

                                  {choice.serviceChoices && choice.serviceChoices.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-slate-500 mb-1">{t.guests.service}</p>
                                      <div className="space-y-1">
                                        {choice.serviceChoices.map((sc) => (
                                          <div key={sc.id} className="flex items-center justify-between text-sm bg-white rounded p-2 border">
                                            <div>
                                              <span>{sc.service?.title || `#${sc.serviceId}`}</span>
                                              {sc.note && <p className="text-xs text-slate-400 italic mt-0.5">{sc.note}</p>}
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-600">
                                              <span>{sc.quantity}x</span>
                                              {sc.service?.basePrice != null && (
                                                <span className="font-medium">{(Number(sc.service.basePrice) * sc.quantity).toFixed(2)} ₺</span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {!choice.resourceChoice && (!choice.serviceChoices || choice.serviceChoices.length === 0) && (
                                    <p className="text-sm text-slate-400 text-center">{t.guests.noChoices}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            if (confirm(t.guests.approveChoicesConfirm)) {
                              approveChoicesMutation.mutate(selectedId!);
                            }
                          }}
                          disabled={selectedReservation.choicesStatus !== 'submitted' || approveChoicesMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {t.guests.approveChoices}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {(selectedReservation.choicesStatus !== 'submitted' || approveChoicesMutation.isPending) && (
                      <TooltipContent>{selectedReservation.choicesStatus !== 'submitted' ? t.tooltips.choicesNotSubmitted : t.tooltips.formSubmitting}</TooltipContent>
                    )}
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button
                          variant="destructive"
                          onClick={() => { setActionType('reject'); setActionNote(''); }}
                          disabled={selectedReservation.choicesStatus !== 'submitted' || rejectChoicesMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {t.guests.rejectChoices}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {(selectedReservation.choicesStatus !== 'submitted' || rejectChoicesMutation.isPending) && (
                      <TooltipContent>{selectedReservation.choicesStatus !== 'submitted' ? t.tooltips.choicesNotSubmitted : t.tooltips.formSubmitting}</TooltipContent>
                    )}
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button
                          variant="outline"
                          className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                          onClick={() => { setActionType('revision'); setActionNote(''); }}
                          disabled={selectedReservation.choicesStatus !== 'submitted' || revisionMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          {t.guests.requestRevision}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {(selectedReservation.choicesStatus !== 'submitted' || revisionMutation.isPending) && (
                      <TooltipContent>{selectedReservation.choicesStatus !== 'submitted' ? t.tooltips.choicesNotSubmitted : t.tooltips.formSubmitting}</TooltipContent>
                    )}
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button
                          variant="outline"
                          onClick={() => setReceiptOpen(true)}
                          disabled={choices.length === 0}
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          {t.guests.printReceipt}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {choices.length === 0 && (
                      <TooltipContent>{t.tooltips.noChoicesToPrint}</TooltipContent>
                    )}
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject / Revision Dialog */}
      <Dialog open={!!actionType} onOpenChange={(open) => { if (!open) { setActionType(null); setActionNote(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'reject' ? t.guests.rejectChoices : t.guests.requestRevision}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'reject' ? t.guests.rejectNote : t.guests.revisionNote}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{actionType === 'reject' ? t.guests.rejectNote : t.guests.revisionNote}</Label>
            <Textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder={t.guests.notePlaceholder}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionType(null); setActionNote(''); }}>
              {t.common.cancel}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    variant={actionType === 'reject' ? 'destructive' : 'default'}
                    onClick={handleAction}
                    disabled={rejectChoicesMutation.isPending || revisionMutation.isPending}
                  >
                    {actionType === 'reject' ? t.guests.rejectChoices : t.guests.requestRevision}
                  </Button>
                </span>
              </TooltipTrigger>
              {(rejectChoicesMutation.isPending || revisionMutation.isPending) && (
                <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>
              )}
            </Tooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.guests.printReceipt}</DialogTitle>
            <DialogDescription>{t.guests.receiptTemplate}</DialogDescription>
          </DialogHeader>

          {/* Template selector */}
          <div className="flex gap-2 mb-4">
            {([
              { key: 'compact' as ReceiptTemplate, label: t.guests.compactReceipt, desc: t.guests.compactReceiptDesc },
              { key: 'detailed' as ReceiptTemplate, label: t.guests.detailedList, desc: t.guests.detailedListDesc },
              { key: 'kitchen' as ReceiptTemplate, label: t.guests.kitchenSummary, desc: t.guests.kitchenSummaryDesc },
            ]).map((tmpl) => (
              <button
                key={tmpl.key}
                type="button"
                onClick={() => setReceiptTemplate(tmpl.key)}
                className={`flex-1 p-3 rounded-lg border text-left transition-colors ${
                  receiptTemplate === tmpl.key
                    ? 'bg-slate-100 border-slate-400 ring-1 ring-slate-400'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <p className="text-sm font-medium">{tmpl.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{tmpl.desc}</p>
              </button>
            ))}
          </div>

          {/* Receipt preview */}
          <div className="border rounded-lg p-4 bg-white overflow-auto max-h-[50vh]" ref={printRef}>
            {selectedReservation && (
              <>
                {receiptTemplate === 'compact' && (
                  <CompactReceipt tourInfo={tourInfo} choices={choices} orgName={orgName} t={t} />
                )}
                {receiptTemplate === 'detailed' && (
                  <DetailedListReceipt tourInfo={tourInfo} choices={choices} orgName={orgName} t={t} />
                )}
                {receiptTemplate === 'kitchen' && (
                  <KitchenSummaryReceipt tourInfo={tourInfo} choices={choices} orgName={orgName} t={t} />
                )}
                <ReceiptServiceSummary serviceSummary={serviceSummary} t={t} />
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {t.guests.exportExcel}
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              {t.guests.print}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
