'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Building2,
  Bus,
  MapPin,
  DollarSign,
  X,
  Mail,
  Phone,
  Star,
  FileText,
  Users,
  Tag,
  Eye,
  Loader2,
  Search,
} from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import { adminApi, type AdminTourStopDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { LoadingState, ErrorState, AdminPagination } from '@/components/shared';
import { AdminStopVenuePreview } from '@/components/admin/AdminStopVenuePreview';

const preResStatusConfig: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

const choicesStatusConfig: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  submitted: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: AlertCircle },
  approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
}

// ── Inline Autocomplete helper ──
function AutocompleteInput({
  value,
  displayValue,
  onSelect,
  onClear,
  onSearchChange,
  options,
  loading,
  placeholder,
}: {
  value: string;
  displayValue: string;
  onSelect: (id: string, label: string) => void;
  onClear: () => void;
  onSearchChange: (q: string) => void;
  options: { value: string; label: string }[];
  loading: boolean;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState(displayValue);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display value from outside
  useEffect(() => { setInputValue(displayValue); }, [displayValue]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-52">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <Input
          className="pl-8 pr-8 h-9 text-sm"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            const v = e.target.value;
            setInputValue(v);
            onSearchChange(v);
            if (value) onClear();
            setOpen(v.length >= 2);
          }}
          onFocus={() => { if (inputValue.length >= 2 && !value) setOpen(true); }}
        />
        {(value || inputValue) && (
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => { setInputValue(''); onClear(); onSearchChange(''); setOpen(false); }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 w-full top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="py-4 text-center text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
            </div>
          ) : options.length === 0 ? (
            <div className="py-4 text-center text-sm text-slate-400">
              {inputValue.length < 2 ? placeholder : 'Sonuç bulunamadı'}
            </div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                onClick={() => {
                  onSelect(opt.value, opt.label);
                  setInputValue(opt.label);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Detail Row helper ──
function DetailRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-5 flex items-center justify-center shrink-0">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400 leading-none mb-1">{label}</p>
        <p className="text-sm text-slate-700 leading-snug">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function AdminRequestsPage() {
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filters
  const [preReservationStatus, setPreReservationStatus] = useState('');
  const [choicesStatus, setChoicesStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [systemCommissionPaid, setSystemCommissionPaid] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [agencyId, setAgencyId] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [agencySearch, setAgencySearch] = useState('');
  const debouncedOrgSearch = useDebounce(orgSearch, 400);
  const debouncedAgencySearch = useDebounce(agencySearch, 400);
  const [selectedOrg, setSelectedOrg] = useState<{ value: string; label: string } | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<{ value: string; label: string } | null>(null);

  // Organization search query
  const { data: orgResults, isLoading: orgLoading } = useQuery({
    queryKey: ['admin-orgs-search', debouncedOrgSearch],
    queryFn: () => adminApi.getOrganizationsList({ name: debouncedOrgSearch, limit: 20, lang: locale as 'tr' | 'en' | 'de' }),
    enabled: debouncedOrgSearch.length >= 2,
  });
  const orgList = orgResults?.data;
  const orgSearchResults = (Array.isArray(orgList) ? orgList : orgList?.data || []).map((o: { id: number; name: string }) => ({
    value: String(o.id),
    label: o.name,
  }));
  // Keep selected option visible even when search is cleared
  const orgOptions = selectedOrg && !orgSearchResults.find((o) => o.value === selectedOrg.value)
    ? [selectedOrg, ...orgSearchResults]
    : orgSearchResults;

  // Agency search query
  const { data: agencyResults, isLoading: agencyLoading } = useQuery({
    queryKey: ['admin-agencies-search', debouncedAgencySearch],
    queryFn: () => adminApi.getAgenciesList({ name: debouncedAgencySearch, limit: 20, lang: locale as 'tr' | 'en' | 'de' }),
    enabled: debouncedAgencySearch.length >= 2,
  });
  const agencyList = agencyResults?.data;
  const agencySearchResults = (Array.isArray(agencyList) ? agencyList : agencyList?.data || []).map((a: { id: number; name: string }) => ({
    value: String(a.id),
    label: a.name,
  }));
  const agencyOptions = selectedAgency && !agencySearchResults.find((a) => a.value === selectedAgency.value)
    ? [selectedAgency, ...agencySearchResults]
    : agencySearchResults;

  // Detail dialog
  const [selectedStop, setSelectedStop] = useState<AdminTourStopDto | null>(null);
  const [dialogTab, setDialogTab] = useState('stop');

  // Reset page on filter change
  const prevFilters = useRef({ preReservationStatus, choicesStatus, dateFrom, dateTo, systemCommissionPaid, organizationId, agencyId });
  useEffect(() => {
    const prev = prevFilters.current;
    if (
      prev.preReservationStatus !== preReservationStatus ||
      prev.choicesStatus !== choicesStatus ||
      prev.dateFrom !== dateFrom ||
      prev.dateTo !== dateTo ||
      prev.systemCommissionPaid !== systemCommissionPaid ||
      prev.organizationId !== organizationId ||
      prev.agencyId !== agencyId
    ) {
      setPage(1);
      prevFilters.current = { preReservationStatus, choicesStatus, dateFrom, dateTo, systemCommissionPaid, organizationId, agencyId };
    }
  }, [preReservationStatus, choicesStatus, dateFrom, dateTo, systemCommissionPaid, organizationId, agencyId]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-tour-stops', page, limit, locale, preReservationStatus, choicesStatus, dateFrom, dateTo, systemCommissionPaid, organizationId, agencyId],
    queryFn: () =>
      adminApi.getTourStops({
        page,
        limit,
        lang: locale,
        preReservationStatus: preReservationStatus && preReservationStatus !== 'all' ? preReservationStatus : undefined,
        choicesStatus: choicesStatus && choicesStatus !== 'all' ? choicesStatus : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        systemCommissionPaid: systemCommissionPaid === 'true' ? true : systemCommissionPaid === 'false' ? false : undefined,
        organizationId: organizationId ? Number(organizationId) : undefined,
        agencyId: agencyId ? Number(agencyId) : undefined,
      }),
  });

  const commissionPaidMutation = useMutation({
    mutationFn: ({ id, paid }: { id: number; paid: boolean }) =>
      adminApi.updateTourStopSystemCommissionPaid(id, paid, locale as 'tr' | 'en' | 'de'),
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(t.admin.commissionPaidSuccess);
        queryClient.invalidateQueries({ queryKey: ['admin-tour-stops'] });
        // Update selectedStop in-place so dialog reflects immediately
        setSelectedStop((prev) => {
          if (!prev || prev.id !== variables.id) return prev;
          return { ...prev, systemCommissionPaid: variables.paid };
        });
      } else {
        toast.error(t.admin.commissionPaidError);
      }
    },
    onError: () => {
      toast.error(t.admin.commissionPaidError);
    },
  });

  const tourStops: AdminTourStopDto[] = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 10, totalCount: 0, totalPages: 0 };
  const totalCount = meta.totalCount ?? 0;

  const hasActiveFilters = (preReservationStatus && preReservationStatus !== 'all') || (choicesStatus && choicesStatus !== 'all') || dateFrom || dateTo || (systemCommissionPaid && systemCommissionPaid !== 'all') || organizationId || agencyId;

  const clearFilters = () => {
    setPreReservationStatus('');
    setChoicesStatus('');
    setDateFrom('');
    setDateTo('');
    setSystemCommissionPaid('');
    setOrganizationId('');
    setAgencyId('');
    setOrgSearch('');
    setAgencySearch('');
    setSelectedOrg(null);
    setSelectedAgency(null);
  };

  const openDetail = (stop: AdminTourStopDto) => {
    setSelectedStop(stop);
    setDialogTab('stop');
  };

  const preResLabels: Record<string, string> = {
    pending: t.requests.pending,
    approved: t.requests.approved,
    rejected: t.requests.rejected,
  };

  const choicesLabels: Record<string, string> = {
    in_progress: t.admin.choicesInProgress,
    submitted: t.admin.choicesSubmitted,
    approved: t.admin.choicesApproved,
    rejected: t.admin.choicesRejected,
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={t.admin.tourStopLoadError} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl">
            <ClipboardList className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.admin.tourStopManagement}</h1>
            <p className="text-slate-500">{t.admin.tourStopManagementDesc}</p>
          </div>
        </div>
        <Badge className="bg-amber-100 text-amber-700">
          {totalCount} {t.admin.totalTourStops}
        </Badge>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">{t.admin.organizationName}</label>
              <AutocompleteInput
                value={organizationId}
                displayValue={selectedOrg?.label || ''}
                onSelect={(id, label) => { setOrganizationId(id); setSelectedOrg({ value: id, label }); }}
                onClear={() => { setOrganizationId(''); setSelectedOrg(null); }}
                onSearchChange={setOrgSearch}
                options={orgOptions}
                loading={orgLoading}
                placeholder={t.admin.organizationName}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">{t.admin.agencyName}</label>
              <AutocompleteInput
                value={agencyId}
                displayValue={selectedAgency?.label || ''}
                onSelect={(id, label) => { setAgencyId(id); setSelectedAgency({ value: id, label }); }}
                onClear={() => { setAgencyId(''); setSelectedAgency(null); }}
                onSearchChange={setAgencySearch}
                options={agencyOptions}
                loading={agencyLoading}
                placeholder={t.admin.agencyName}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">{t.admin.preReservationStatus}</label>
              <Select value={preReservationStatus} onValueChange={setPreReservationStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t.admin.allPreReservationStatuses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.admin.allPreReservationStatuses}</SelectItem>
                  <SelectItem value="pending">{t.requests.pending}</SelectItem>
                  <SelectItem value="approved">{t.requests.approved}</SelectItem>
                  <SelectItem value="rejected">{t.requests.rejected}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">{t.admin.choicesStatusLabel}</label>
              <Select value={choicesStatus} onValueChange={setChoicesStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t.admin.allChoicesStatuses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.admin.allChoicesStatuses}</SelectItem>
                  <SelectItem value="in_progress">{t.admin.choicesInProgress}</SelectItem>
                  <SelectItem value="submitted">{t.admin.choicesSubmitted}</SelectItem>
                  <SelectItem value="approved">{t.admin.choicesApproved}</SelectItem>
                  <SelectItem value="rejected">{t.admin.choicesRejected}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">{t.admin.dateFrom}</label>
              <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">{t.admin.dateTo}</label>
              <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">{t.admin.systemCommissionPaid}</label>
              <Select value={systemCommissionPaid} onValueChange={setSystemCommissionPaid}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t.admin.allPaymentStatuses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.admin.allPaymentStatuses}</SelectItem>
                  <SelectItem value="true">{t.admin.paid}</SelectItem>
                  <SelectItem value="false">{t.admin.notPaid}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
                <X className="h-4 w-4 mr-1" />
                {t.admin.clearFilters}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t.admin.tourStops}</CardTitle>
          <CardDescription>{t.admin.tourStopManagementDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {tourStops.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">{t.admin.noTourStops}</p>
              <p className="text-sm">{t.admin.noTourStopsDesc}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.admin.tourName}</TableHead>
                      <TableHead>{t.admin.organizationName}</TableHead>
                      <TableHead>{t.admin.agencyName}</TableHead>
                      <TableHead>{t.admin.scheduledTime}</TableHead>
                      <TableHead>{t.admin.preReservationStatus}</TableHead>
                      <TableHead>{t.admin.choicesStatusLabel}</TableHead>
                      <TableHead className="text-right">{t.admin.financialSummary}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tourStops.map((stop) => {
                      const preResStyle = preResStatusConfig[stop.preReservationStatus] || preResStatusConfig.pending;
                      const PreResIcon = preResStyle.icon;
                      const choicesStyle = choicesStatusConfig[stop.choicesStatus] || choicesStatusConfig.in_progress;
                      const ChoicesIcon = choicesStyle.icon;
                      const fs = stop.financialSummary;

                      return (
                        <TableRow
                          key={stop.id}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => openDetail(stop)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                                <Bus className="h-5 w-5 text-violet-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{stop.tour.tourName}</p>
                                <p className="text-xs text-slate-400">{stop.tour.tourCode}</p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                              <span className="text-slate-600 truncate">{stop.organization.name}</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-slate-600">
                            {stop.tour.agency.name}
                          </TableCell>

                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1 text-slate-600">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDateTime(stop.scheduledStartTime)}
                              </div>
                              <div className="text-xs text-slate-400 ml-5">
                                → {formatDateTime(stop.scheduledEndTime)}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className={`${preResStyle.bg} ${preResStyle.text}`}>
                                  <PreResIcon className="h-3 w-3 mr-1" />
                                  {preResLabels[stop.preReservationStatus] || stop.preReservationStatus}
                                </Badge>
                              </TooltipTrigger>
                              {stop.rejectionReason && (
                                <TooltipContent>
                                  {t.admin.rejectionReasonLabel}: {stop.rejectionReason}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TableCell>

                          <TableCell>
                            <Badge className={`${choicesStyle.bg} ${choicesStyle.text}`}>
                              <ChoicesIcon className="h-3 w-3 mr-1" />
                              {choicesLabels[stop.choicesStatus] || stop.choicesStatus}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="text-sm">
                              <p className="font-semibold text-slate-800">
                                {formatCurrency(fs.grandTotal, fs.currency)}
                              </p>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs text-slate-400 cursor-help">
                                    <DollarSign className="h-3 w-3 inline" />
                                    %{fs.systemCommissionRate} → {formatCurrency(fs.systemCommissionAmount, fs.currency)}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-1 text-xs">
                                    <p>{t.admin.commissionRate}: %{fs.commissionRate}</p>
                                    <p>{t.admin.commissionAmount}: {formatCurrency(fs.commissionAmount, fs.currency)}</p>
                                    <p>{t.admin.systemCommission}: %{fs.systemCommissionRate} → {formatCurrency(fs.systemCommissionAmount, fs.currency)}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                              <Badge className={`mt-1 text-[10px] px-1.5 py-0 ${stop.systemCommissionPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {stop.systemCommissionPaid ? t.admin.paid : t.admin.notPaid}
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Button variant="ghost" size="sm" className="text-slate-400">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <AdminPagination
                page={meta.page}
                limit={meta.limit}
                total={totalCount}
                totalPages={meta.totalPages}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Detail Dialog ── */}
      <Dialog
        open={!!selectedStop}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedStop(null);
            setDialogTab('stop');
          }
        }}
      >
        {selectedStop && (() => {
          const stop = selectedStop;
          const org = stop.organization;
          const tour = stop.tour;
          const agency = tour.agency;
          const fs = stop.financialSummary;
          const preResStyle = preResStatusConfig[stop.preReservationStatus] || preResStatusConfig.pending;
          const PreResIcon = preResStyle.icon;
          const choicesStyle = choicesStatusConfig[stop.choicesStatus] || choicesStatusConfig.in_progress;
          const ChoicesIcon = choicesStyle.icon;

          return (
            <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader className="shrink-0">
                <DialogTitle className="flex items-center gap-3 flex-wrap">
                  <span>{tour.tourName} — {org.name}</span>
                  <Badge className={`${preResStyle.bg} ${preResStyle.text}`}>
                    <PreResIcon className="h-3 w-3 mr-1" />
                    {preResLabels[stop.preReservationStatus]}
                  </Badge>
                  <Badge className={`${choicesStyle.bg} ${choicesStyle.text}`}>
                    <ChoicesIcon className="h-3 w-3 mr-1" />
                    {choicesLabels[stop.choicesStatus]}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <Tabs value={dialogTab} onValueChange={setDialogTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="shrink-0 w-full justify-start">
                  <TabsTrigger value="stop" className="gap-1.5">
                    <Bus className="h-4 w-4" />
                    {t.admin.tourInfo} & {t.admin.stopInfo}
                  </TabsTrigger>
                  <TabsTrigger value="organization" className="gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {t.admin.organizationInfo}
                  </TabsTrigger>
                  <TabsTrigger value="agency" className="gap-1.5">
                    <Tag className="h-4 w-4" />
                    {t.admin.agencyInfo}
                  </TabsTrigger>
                  <TabsTrigger value="financial" className="gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    {t.admin.financialSummary}
                  </TabsTrigger>
                  <TabsTrigger value="venue3d" className="gap-1.5">
                    <Building2 className="h-4 w-4" />
                    3D
                  </TabsTrigger>
                </TabsList>

                {/* ── Tour & Stop Info Tab ── */}
                <TabsContent value="stop" className="flex-1 overflow-y-auto mt-4 space-y-5">
                  {/* Tour section */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Bus className="h-3.5 w-3.5" />
                      {t.admin.tourInfo}
                    </h4>
                    <Card className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                          <DetailRow label={t.admin.tourName} value={tour.tourName} icon={Bus} />
                          <DetailRow label={t.admin.tourCode} value={tour.tourCode} icon={Tag} />
                          <DetailRow label={t.admin.tourStatus} value={<Badge variant="outline">{tour.status}</Badge>} />
                          <DetailRow label={t.admin.tourDates} value={`${formatDateTime(tour.startDate)} → ${formatDateTime(tour.endDate)}`} icon={Calendar} />
                          <DetailRow label={t.admin.currentParticipants} value={tour.currentParticipants} icon={Users} />
                          <DetailRow label={t.admin.minMaxParticipants} value={`${tour.minParticipants} / ${tour.maxParticipants}`} icon={Users} />
                          {tour.description && (
                            <div className="md:col-span-2">
                              <DetailRow label={t.admin.descriptionLabel} value={tour.description} icon={FileText} />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Stop section */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {t.admin.stopInfo}
                    </h4>
                    <Card className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                          <DetailRow label="ID" value={stop.id} icon={Tag} />
                          <DetailRow label={t.admin.descriptionLabel} value={stop.description} icon={FileText} />
                          <DetailRow label={t.admin.scheduledTime} value={`${formatDateTime(stop.scheduledStartTime)} → ${formatDateTime(stop.scheduledEndTime)}`} icon={Calendar} />
                          <DetailRow label={t.admin.preReservationStatus} value={
                            <Badge className={`${preResStyle.bg} ${preResStyle.text}`}>
                              <PreResIcon className="h-3 w-3 mr-1" />
                              {preResLabels[stop.preReservationStatus]}
                            </Badge>
                          } />
                          <DetailRow label={t.admin.choicesStatusLabel} value={
                            <Badge className={`${choicesStyle.bg} ${choicesStyle.text}`}>
                              <ChoicesIcon className="h-3 w-3 mr-1" />
                              {choicesLabels[stop.choicesStatus]}
                            </Badge>
                          } />
                          {stop.rejectionReason && (
                            <DetailRow label={t.admin.rejectionReasonLabel} value={stop.rejectionReason} icon={XCircle} />
                          )}
                          <DetailRow label={t.admin.showPriceToCustomer} value={stop.showPriceToCustomer ? t.admin.yes : t.admin.no} />
                          <DetailRow label={t.admin.maxSpendLimit} value={stop.maxSpendLimit != null ? formatCurrency(stop.maxSpendLimit, fs.currency) : t.admin.notSpecified} icon={DollarSign} />
                          <DetailRow label={t.admin.choiceDeadlineLabel} value={stop.choiceDeadlineTime ? formatDateTime(stop.choiceDeadlineTime) : stop.choiceDeadline != null ? `${stop.choiceDeadline} ${t.requests.choiceDeadlineUnit}` : t.admin.notSpecified} icon={Clock} />
                          <DetailRow label={t.admin.commissionRate} value={`%${stop.agencyCommissionRate}`} icon={DollarSign} />
                          {stop.choicesSubmittedAt && (
                            <DetailRow label={t.admin.choicesSubmittedAt} value={formatDateTime(stop.choicesSubmittedAt)} icon={Calendar} />
                          )}
                          {stop.choicesResolvedAt && (
                            <DetailRow label={t.admin.choicesResolvedAt} value={formatDateTime(stop.choicesResolvedAt)} icon={Calendar} />
                          )}
                          {stop.organizationChoicesNote && (
                            <div className="md:col-span-2">
                              <DetailRow label={t.admin.organizationChoicesNote} value={stop.organizationChoicesNote} icon={FileText} />
                            </div>
                          )}
                        </div>
                        <Separator className="my-2" />
                        <div className="text-xs text-slate-400 flex gap-6 pl-8">
                          <span>{t.requests.createdAt}: {formatDateTime(stop.createdAt)}</span>
                          <span>{t.admin.updatedAt}: {formatDateTime(stop.updatedAt)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* ── Organization Info Tab ── */}
                <TabsContent value="organization" className="flex-1 overflow-y-auto mt-4">
                  <Card className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <DetailRow label={t.admin.organizationName} value={org.name} icon={Building2} />
                        <DetailRow label={t.requests.status} value={<Badge variant="outline">{org.status}</Badge>} />
                        <DetailRow label={t.admin.emailLabel} value={org.email} icon={Mail} />
                        <DetailRow label={t.admin.phoneLabel} value={`+${org.phoneCountryCode} ${org.phone}`} icon={Phone} />
                        <DetailRow label={t.admin.addressLabel} value={org.address} icon={MapPin} />
                        <DetailRow label={t.admin.legalNameLabel} value={org.legalName} icon={FileText} />
                        <DetailRow label={t.admin.taxInfo} value={`${org.taxNumber} — ${org.taxOffice}`} icon={FileText} />
                        <DetailRow label={t.admin.currencyLabel} value={org.currency} icon={DollarSign} />
                        <DetailRow label={t.admin.commissionRate} value={`%${org.agencyCommissionRate}`} icon={DollarSign} />
                        <DetailRow label={t.admin.score} value={
                          <span className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            {org.averageRating} ({org.totalReviews} {t.admin.reviewLabel})
                          </span>
                        } icon={Star} />
                        {org.description && (
                          <div className="md:col-span-2">
                            <DetailRow label={t.admin.descriptionLabel} value={org.description} icon={FileText} />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Agency Info Tab ── */}
                <TabsContent value="agency" className="flex-1 overflow-y-auto mt-4">
                  <Card className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <DetailRow label={t.admin.agencyName} value={agency.name} icon={Tag} />
                        <DetailRow label={t.requests.status} value={<Badge variant="outline">{agency.status}</Badge>} />
                        <DetailRow label={t.admin.emailLabel} value={agency.email} icon={Mail} />
                        <DetailRow label={t.admin.phoneLabel} value={`+${agency.phoneCountryCode} ${agency.phone}`} icon={Phone} />
                        <DetailRow label={t.admin.addressLabel} value={agency.address} icon={MapPin} />
                        <DetailRow label={t.admin.legalNameLabel} value={agency.legalName} icon={FileText} />
                        <DetailRow label={t.admin.taxInfo} value={`${agency.taxNumber} — ${agency.taxOffice}`} icon={FileText} />
                        {agency.description && (
                          <div className="md:col-span-2">
                            <DetailRow label={t.admin.descriptionLabel} value={agency.description} icon={FileText} />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Financial Tab ── */}
                <TabsContent value="financial" className="flex-1 overflow-y-auto mt-4">
                  <Card className="border shadow-sm">
                    <CardContent className="p-4">
                      <table className="w-full text-sm">
                        <tbody className="divide-y">
                          <tr>
                            <td className="py-3 pl-8 text-slate-500">{t.admin.grandTotal}</td>
                            <td className="py-3 pr-2 text-right font-bold text-lg text-slate-800">
                              {formatCurrency(fs.grandTotal, fs.currency)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 pl-8 text-slate-500">{t.admin.commissionRate}</td>
                            <td className="py-3 pr-2 text-right text-slate-700">%{fs.commissionRate}</td>
                          </tr>
                          <tr>
                            <td className="py-3 pl-8 text-orange-600 font-medium">{t.admin.commissionAmount}</td>
                            <td className="py-3 pr-2 text-right font-semibold text-orange-600">
                              {formatCurrency(fs.commissionAmount, fs.currency)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 pl-8 text-slate-500">{t.admin.systemCommission} (%)</td>
                            <td className="py-3 pr-2 text-right text-slate-700">%{fs.systemCommissionRate}</td>
                          </tr>
                          <tr>
                            <td className="py-3 pl-8 text-violet-600 font-medium">{t.admin.systemCommission}</td>
                            <td className="py-3 pr-2 text-right font-semibold text-violet-600">
                              {formatCurrency(fs.systemCommissionAmount, fs.currency)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 pl-8 text-slate-500">{t.admin.systemCommissionPaid}</td>
                            <td className="py-3 pr-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Badge className={stop.systemCommissionPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                  {stop.systemCommissionPaid ? (
                                    <><CheckCircle2 className="h-3 w-3 mr-1" />{t.admin.paid}</>
                                  ) : (
                                    <><XCircle className="h-3 w-3 mr-1" />{t.admin.notPaid}</>
                                  )}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant={stop.systemCommissionPaid ? 'outline' : 'default'}
                                  className={stop.systemCommissionPaid ? 'text-red-600 border-red-200 hover:bg-red-50' : 'bg-green-600 hover:bg-green-700 text-white'}
                                  disabled={commissionPaidMutation.isPending}
                                  onClick={() => commissionPaidMutation.mutate({ id: stop.id, paid: !stop.systemCommissionPaid })}
                                >
                                  {commissionPaidMutation.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : stop.systemCommissionPaid ? (
                                    <><XCircle className="h-3.5 w-3.5 mr-1" />{t.admin.markAsNotPaid}</>
                                  ) : (
                                    <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />{t.admin.markAsPaid}</>
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {stop.systemCommissionPaid && stop.systemCommissionPaidAt && (
                            <tr>
                              <td className="py-3 pl-8 text-slate-500">{t.admin.paidAt}</td>
                              <td className="py-3 pr-2 text-right text-slate-700">
                                {formatDateTime(stop.systemCommissionPaidAt)}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── 3D Venue Tab ── */}
                <TabsContent value="venue3d" className="flex-1 overflow-y-auto mt-4">
                  <AdminStopVenuePreview stopId={selectedStop.id} categoryId={selectedStop.organization?.categoryId} />
                </TabsContent>
              </Tabs>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
}
