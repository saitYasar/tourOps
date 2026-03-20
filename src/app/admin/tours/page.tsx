'use client';

import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Search,
  Image as ImageIcon,
  Users,
  Eye,
  Building2,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  User,
  ClipboardList,
  DollarSign,
  User as UserIcon,
  Printer,
  FileSpreadsheet,
  ArrowUpDown,
} from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import { adminApi } from '@/lib/api';
import type { ApiTourDto, AgencyStopChoicesDto, AgencyStopServiceSummaryDto } from '@/lib/api';
import { formatDate, formatShortDateTime } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LoadingState, EmptyState, ErrorState, TourStatusBadge, AdminPagination,
  CompactReceipt, DetailedListReceipt, KitchenSummaryReceipt, ReceiptServiceSummary,
  handleReceiptPrint, exportReceiptExcel,
} from '@/components/shared';
import type { ReceiptTemplate } from '@/components/shared';

function resolveImageUrl(url?: string | null): string | null {
  return url || null;
}

const ITEMS_PER_PAGE = 20;

export default function AdminToursPage() {
  const { t, locale } = useLanguage();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(ITEMS_PER_PAGE);

  // Detail dialog
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [dialogTab, setDialogTab] = useState('info');
  const [expandedParticipantId, setExpandedParticipantId] = useState<number | null>(null);
  const [choicesStopId, setChoicesStopId] = useState<number | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTemplate, setReceiptTemplate] = useState<ReceiptTemplate>('compact');
  const printRef = useRef<HTMLDivElement>(null);

  const lang = (locale === 'de' ? 'en' : locale) as 'tr' | 'en';

  // Reset page on filter change
  const prevFilters = useRef({ debouncedSearch, statusFilter, agencyFilter, sortBy, sortOrder });
  useEffect(() => {
    const prev = prevFilters.current;
    if (
      prev.debouncedSearch !== debouncedSearch ||
      prev.statusFilter !== statusFilter ||
      prev.agencyFilter !== agencyFilter ||
      prev.sortBy !== sortBy ||
      prev.sortOrder !== sortOrder
    ) {
      setPage(1);
      prevFilters.current = { debouncedSearch, statusFilter, agencyFilter, sortBy, sortOrder };
    }
  }, [debouncedSearch, statusFilter, agencyFilter, sortBy, sortOrder]);

  // Fetch agencies for filter
  const { data: agenciesResult } = useQuery({
    queryKey: ['admin-agencies-list-for-filter'],
    queryFn: () => adminApi.getAgenciesList({ limit: 100 }),
  });
  const agencies = agenciesResult?.success ? agenciesResult.data?.data || [] : [];

  // Fetch tours
  const { data: toursResponse, isLoading, error } = useQuery({
    queryKey: ['admin-tours', page, limit, statusFilter, debouncedSearch, agencyFilter, sortBy, sortOrder, lang],
    queryFn: async () => {
      const result = await adminApi.getTours({
        page,
        limit,
        lang,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: debouncedSearch || undefined,
        agencyId: agencyFilter !== 'all' ? Number(agencyFilter) : undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      });
      if (!result.success) throw new Error(result.error);
      return { data: result.data || [], meta: result.meta };
    },
  });

  const tours = toursResponse?.data || [];
  const meta = toursResponse?.meta;

  // Tour detail query
  const { data: tourDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-tour-detail', selectedTourId, lang],
    queryFn: async () => {
      if (!selectedTourId) return null;
      const result = await adminApi.getTourById(selectedTourId, lang);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!selectedTourId,
  });

  // Query: Stop choices
  const { data: stopChoices, isLoading: choicesLoading } = useQuery({
    queryKey: ['admin-stop-choices', choicesStopId, lang],
    queryFn: async () => {
      const result = await adminApi.getStopChoices(choicesStopId!, lang);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!choicesStopId,
  });

  // Query: Stop service summary
  const { data: serviceSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin-stop-service-summary', choicesStopId, lang],
    queryFn: async () => {
      const result = await adminApi.getStopServiceSummary(choicesStopId!, lang);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!choicesStopId,
  });

  // Auto-select first stop when tour detail loads
  const stops = tourDetail?.stops;
  useEffect(() => {
    if (stops?.length && !choicesStopId) {
      setChoicesStopId(stops[0].id);
    }
  }, [stops, choicesStopId]);

  // Reset choices state when dialog closes
  useEffect(() => {
    if (!selectedTourId) {
      setChoicesStopId(null);
      setExpandedClientId(null);
    }
  }, [selectedTourId]);

  // Receipt helpers
  const choicesArr: AgencyStopChoicesDto[] = stopChoices || [];
  const selectedStop = stops?.find(s => s.id === choicesStopId);
  const choicesOrgName = selectedStop?.organization?.name || '';
  const receiptTourInfo = tourDetail ? { tourName: tourDetail.tourName, startDate: tourDetail.startDate } : { tourName: '', startDate: '' };

  const handlePrint = useCallback(() => {
    handleReceiptPrint(printRef, receiptTemplate);
  }, [receiptTemplate]);

  const handleExportExcel = useCallback(() => {
    if (!choicesArr.length) return;
    exportReceiptExcel(receiptTourInfo, choicesArr, serviceSummary ?? null, choicesOrgName, t);
  }, [choicesArr, serviceSummary, choicesOrgName, t, receiptTourInfo]);

  const handleSortChange = (val: string) => {
    switch (val) {
      case 'date_desc': setSortBy('startDate'); setSortOrder('DESC'); break;
      case 'date_asc': setSortBy('startDate'); setSortOrder('ASC'); break;
      case 'name_asc': setSortBy('tourName'); setSortOrder('ASC'); break;
      case 'name_desc': setSortBy('tourName'); setSortOrder('DESC'); break;
      default: setSortBy(''); setSortOrder(''); break;
    }
  };

  const currentSortValue = sortBy === 'startDate' && sortOrder === 'DESC' ? 'date_desc'
    : sortBy === 'startDate' && sortOrder === 'ASC' ? 'date_asc'
    : sortBy === 'tourName' && sortOrder === 'ASC' ? 'name_asc'
    : sortBy === 'tourName' && sortOrder === 'DESC' ? 'name_desc'
    : 'none';

  if (error) return <ErrorState message={t.admin.tourLoadError} />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 rounded-xl">
            <Calendar className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.admin.tourManagement}</h1>
            <p className="text-slate-500 text-sm">{t.tours.description}</p>
          </div>
        </div>
        <Badge className="bg-violet-100 text-violet-700 text-sm px-3 py-1">
          {meta?.total || meta?.totalCount || tours.length} {t.admin.tours}
        </Badge>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t.admin.tourSearchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t.tours.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.admin.allStatuses}</SelectItem>
                <SelectItem value="draft">{t.tours.draft}</SelectItem>
                <SelectItem value="published">{t.tours.published}</SelectItem>
                <SelectItem value="cancelled">{t.tours.cancelled}</SelectItem>
                <SelectItem value="completed">{t.tours.completed}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={agencyFilter} onValueChange={(v) => { setAgencyFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t.admin.tourAgency} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                {agencies.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={currentSortValue} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t.commissions.sortDefault} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.commissions.sortDefault}</SelectItem>
                <SelectItem value="date_desc">{t.commissions.sortNewest}</SelectItem>
                <SelectItem value="date_asc">{t.commissions.sortOldest}</SelectItem>
                <SelectItem value="name_asc">A → Z</SelectItem>
                <SelectItem value="name_desc">Z → A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tours Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12"><LoadingState /></div>
          ) : tours.length === 0 ? (
            <div className="py-12">
              <EmptyState icon={Calendar} title={t.tours.list} description={t.tours.noTours} />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]"></TableHead>
                    <TableHead>{t.tours.name}</TableHead>
                    <TableHead>{t.tours.tourCode}</TableHead>
                    <TableHead>{t.admin.tourAgency}</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        {t.tours.startDate}
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </span>
                    </TableHead>
                    <TableHead>{t.tours.endDate}</TableHead>
                    <TableHead className="text-center">{t.admin.tourParticipants}</TableHead>
                    <TableHead>{t.tours.status}</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tours.map((tour) => {
                    const coverUrl = resolveImageUrl(tour.coverImageUrl);
                    return (
                      <TableRow
                        key={tour.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setSelectedTourId(tour.id)}
                      >
                        <TableCell className="pr-0">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                            {coverUrl ? (
                              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-slate-300" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{tour.tourName}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{tour.tourCode}</TableCell>
                        <TableCell>
                          {tour.agency ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              {tour.agency.name}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(tour.startDate)}</TableCell>
                        <TableCell className="text-sm">{formatDate(tour.endDate)}</TableCell>
                        <TableCell className="text-center">
                          {tour.maxParticipants ? (
                            <span className="flex items-center justify-center gap-1 text-sm">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              {tour.maxParticipants}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <TourStatusBadge status={tour.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-slate-500">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="p-4 border-t">
                <AdminPagination
                  page={page}
                  limit={limit}
                  total={meta?.total || meta?.totalCount || tours.length}
                  totalPages={meta?.totalPages}
                  onPageChange={setPage}
                  onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tour Detail Dialog */}
      <Dialog open={!!selectedTourId} onOpenChange={(open) => { if (!open) { setSelectedTourId(null); setExpandedParticipantId(null); setDialogTab('info'); } }}>
        <DialogContent className="max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          {isDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingState />
            </div>
          ) : tourDetail ? (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  {tourDetail.tourName}
                  <TourStatusBadge status={tourDetail.status} />
                </DialogTitle>
              </DialogHeader>

              <Tabs value={dialogTab} onValueChange={setDialogTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="shrink-0 w-full justify-start">
                  <TabsTrigger value="info" className="gap-1.5">
                    <Eye className="h-4 w-4" />
                    {t.admin.detail}
                  </TabsTrigger>
                  <TabsTrigger value="choices" className="gap-1.5">
                    <ClipboardList className="h-4 w-4" />
                    {t.tours.customerChoices}
                    {tourDetail.stops && tourDetail.stops.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{tourDetail.stops.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* ===== TAB: Tur Bilgileri ===== */}
                <TabsContent value="info" className="flex-1 overflow-y-auto mt-4 space-y-4">
                  {/* Cover Image */}
                  {resolveImageUrl(tourDetail.coverImageUrl) && (
                    <div className="w-full h-56 rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={resolveImageUrl(tourDetail.coverImageUrl)!}
                        alt={tourDetail.tourName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Gallery */}
                  {tourDetail.galleryImages && tourDetail.galleryImages.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">{t.tours.gallery} ({tourDetail.galleryImages.length})</p>
                      <div className="grid grid-cols-6 gap-2">
                        {tourDetail.galleryImages.map((img) => {
                          const imgSrc = resolveImageUrl(img.imageUrl);
                          if (!imgSrc) return null;
                          return (
                            <div key={img.id} className="h-24 rounded-lg overflow-hidden bg-slate-100">
                              <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">{t.tours.tourCode}</p>
                      <p className="font-mono font-medium">{tourDetail.tourCode}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">{t.tours.status}</p>
                      <TourStatusBadge status={tourDetail.status} />
                    </div>
                    <div>
                      <p className="text-slate-500">{t.tours.startDate}</p>
                      <p className="font-medium">{formatDate(tourDetail.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">{t.tours.endDate}</p>
                      <p className="font-medium">{formatDate(tourDetail.endDate)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">{t.tours.minParticipants}</p>
                      <p className="font-medium">{tourDetail.minParticipants || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">{t.tours.maxParticipants}</p>
                      <p className="font-medium">{tourDetail.maxParticipants || '-'}</p>
                    </div>
                  </div>

                  {/* Agency */}
                  {tourDetail.agency && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-500">{t.admin.tourAgency}:</span>
                        <span className="font-medium">{tourDetail.agency.name}</span>
                      </div>
                    </>
                  )}

                  {/* Description */}
                  {tourDetail.description && (
                    <>
                      <Separator />
                      <div className="text-sm">
                        <p className="text-slate-500">{t.tours.tourDescription}</p>
                        <p className="mt-1">{tourDetail.description}</p>
                      </div>
                    </>
                  )}

                  {/* Stops */}
                  {tourDetail.stops && tourDetail.stops.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">
                          {t.tours.stops} ({tourDetail.stops.length})
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {tourDetail.stops.map((stop, index) => (
                            <div key={stop.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg text-sm">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-600 text-xs font-bold shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {stop.organization?.name || `${t.tours.organization} #${stop.organizationId}`}
                                </p>
                                {stop.organization?.address && (
                                  <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3" />
                                    {stop.organization.address}
                                  </p>
                                )}
                                <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  {formatShortDateTime(stop.scheduledStartTime)} - {formatShortDateTime(stop.scheduledEndTime)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Participants */}
                  {tourDetail.participants && tourDetail.participants.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">
                          {t.admin.tourParticipants} ({tourDetail.participants.length})
                        </p>
                        <div className="space-y-1">
                          {tourDetail.participants.map((p) => {
                            const name = p.client
                              ? `${p.client.firstName || ''} ${p.client.lastName || ''}`.trim()
                              : p.clientName || `#${p.clientId}`;
                            const isExpanded = expandedParticipantId === p.id;
                            return (
                              <Fragment key={p.id}>
                                <button
                                  className="w-full flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded text-sm transition-colors cursor-pointer"
                                  onClick={() => setExpandedParticipantId(isExpanded ? null : p.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="font-medium">{name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {p.status && (
                                      <Badge variant="outline" className="text-xs">
                                        {p.status}
                                      </Badge>
                                    )}
                                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </div>
                                </button>
                                {isExpanded && p.client && (
                                  <div className="ml-6 p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5">
                                    {p.client.username && (
                                      <div className="flex items-center gap-2 text-slate-600">
                                        <User className="h-3 w-3 text-slate-400" />
                                        <span className="font-medium text-slate-800">{p.client.username}</span>
                                      </div>
                                    )}
                                    {p.client.email && (
                                      <div className="flex items-center gap-2 text-slate-600">
                                        <Mail className="h-3 w-3 text-slate-400" />
                                        <span className="font-medium text-slate-800">{p.client.email}</span>
                                      </div>
                                    )}
                                    {p.client.phone && (
                                      <div className="flex items-center gap-2 text-slate-600">
                                        <Phone className="h-3 w-3 text-slate-400" />
                                        <span className="font-medium text-slate-800">{p.client.phone}</span>
                                      </div>
                                    )}
                                    {p.pricePaid != null && (
                                      <div className="flex items-center gap-2 text-slate-600">
                                        <DollarSign className="h-3 w-3 text-slate-400" />
                                        <span className="font-medium text-slate-800">{Number(p.pricePaid).toFixed(2)} ₺</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* ===== TAB: Müşteri Seçimleri ===== */}
                <TabsContent value="choices" className="flex-1 overflow-y-auto mt-4">
                  {!tourDetail.stops?.length ? (
                    <EmptyState icon={ClipboardList} title={t.tours.customerChoices} description={t.tours.noStops} />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* Stop selector - 1 column */}
                      <Card className="lg:col-span-1">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{t.tours.stops}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1">
                            {tourDetail.stops.map((stop, index) => (
                              <button
                                key={stop.id}
                                type="button"
                                className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-colors ${
                                  choicesStopId === stop.id
                                    ? 'bg-blue-50 border border-blue-300'
                                    : 'hover:bg-slate-50 border border-transparent'
                                }`}
                                onClick={() => {
                                  setChoicesStopId(stop.id);
                                  setExpandedClientId(null);
                                }}
                              >
                                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium truncate">{stop.organization?.name || `#${stop.organizationId}`}</p>
                                    {(() => {
                                      const dotConfig: Record<string, { color: string; label: string }> = {
                                        pending: { color: 'bg-orange-400', label: t.tours.stopStatusPending },
                                        approved: { color: 'bg-green-500', label: t.tours.stopStatusApproved },
                                        rejected: { color: 'bg-red-500', label: t.tours.stopStatusRejected },
                                      };
                                      const status = stop.preReservationStatus;
                                      const cfg = status
                                        ? (dotConfig[status] || { color: 'bg-slate-300', label: status })
                                        : { color: 'bg-slate-300', label: t.tours.stopStatusNoRequest };
                                      return (
                                        <span
                                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.color}`}
                                          title={cfg.label}
                                        />
                                      );
                                    })()}
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    {stop.scheduledStartTime ? formatShortDateTime(stop.scheduledStartTime) : ''}
                                    {stop.scheduledStartTime && stop.scheduledEndTime ? ' - ' : ''}
                                    {stop.scheduledEndTime ? formatShortDateTime(stop.scheduledEndTime) : ''}
                                  </p>
                                  {(() => {
                                    const choicesConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
                                      in_progress: { variant: 'outline', label: t.tours.choicesStatusInProgress },
                                      submitted: { variant: 'secondary', label: t.tours.choicesStatusSubmitted },
                                      approved: { variant: 'default', label: t.tours.choicesStatusApproved },
                                      rejected: { variant: 'destructive', label: t.tours.choicesStatusRejected },
                                      revision_requested: { variant: 'outline', label: t.tours.choicesStatusRevisionRequested },
                                    };
                                    const cs = stop.choicesStatus;
                                    if (!cs) return null;
                                    const cfg = choicesConfig[cs] || { variant: 'outline' as const, label: cs };
                                    return (
                                      <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0 mt-0.5">
                                        {cfg.label}
                                      </Badge>
                                    );
                                  })()}
                                </div>
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Choices + Summary - 3 columns */}
                      <div className="lg:col-span-3 space-y-4">
                        {!choicesStopId ? (
                          <Card>
                            <CardContent className="py-12">
                              <EmptyState
                                icon={ClipboardList}
                                title={t.tours.customerChoices}
                                description={t.tours.selectStop}
                              />
                            </CardContent>
                          </Card>
                        ) : (
                          <>
                            {/* Service Summary */}
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  {t.tours.serviceSummary}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {summaryLoading ? (
                                  <LoadingState message={t.common.loading} />
                                ) : !serviceSummary?.services?.length ? (
                                  <p className="text-sm text-slate-500 text-center py-4">{t.tours.noChoices}</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b text-slate-500">
                                          <th className="text-left py-2 font-medium">{t.tours.service}</th>
                                          <th className="text-center py-2 font-medium">{t.tours.quantity}</th>
                                          <th className="text-right py-2 font-medium">{t.tours.unitPrice}</th>
                                          <th className="text-right py-2 font-medium">{t.tours.totalPrice}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {serviceSummary.services.map((item, idx) => {
                                          const svcId = Number(item.serviceId || item.service?.id || 0);
                                          const notes: { name: string; note: string }[] = [];
                                          for (const ch of choicesArr) {
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
                                                <tr className="border-b last:border-b-0">
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

                            {/* Customer Choices Detail */}
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <ClipboardList className="h-4 w-4" />
                                  {t.tours.customerChoices}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {choicesLoading ? (
                                  <LoadingState message={t.common.loading} />
                                ) : !choicesArr.length ? (
                                  <p className="text-sm text-slate-500 text-center py-4">{t.tours.noChoices}</p>
                                ) : (
                                  <div className="space-y-2">
                                    {choicesArr.map((choice: AgencyStopChoicesDto, choiceIdx: number) => {
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
                                                <Badge variant="outline" className="text-xs">{t.tours.resource}</Badge>
                                              )}
                                              {choice.serviceChoices && choice.serviceChoices.length > 0 && (
                                                <Badge variant="secondary" className="text-xs">
                                                  {choice.serviceChoices.length} {t.tours.service.toLowerCase()}
                                                </Badge>
                                              )}
                                              {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                            </div>
                                          </button>

                                          {isExpanded && (
                                            <div className="border-t px-3 py-3 bg-slate-50 space-y-3">
                                              {choice.resourceChoice && (
                                                <div>
                                                  <p className="text-xs font-medium text-slate-500 mb-1">{t.tours.resource}</p>
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
                                                  <p className="text-xs font-medium text-slate-500 mb-1">{t.tours.service}</p>
                                                  <div className="space-y-1">
                                                    {choice.serviceChoices.map((sc) => (
                                                      <div key={sc.id} className="flex items-center justify-between text-sm bg-white rounded p-2 border">
                                                        <div className="flex-1 min-w-0">
                                                          <span>{sc.service?.title || `#${sc.serviceId}`}</span>
                                                          {sc.note && (
                                                            <span className="ml-2 text-xs italic bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                                                              {sc.note}
                                                            </span>
                                                          )}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-slate-600 shrink-0">
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
                                                <p className="text-sm text-slate-400 text-center">{t.tours.noChoices}</p>
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

                            {/* Choices Status & Print */}
                            {(() => {
                              const currentStop = stops?.find(s => s.id === choicesStopId);
                              const cs = currentStop?.choicesStatus;
                              const choicesStatusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
                                submitted: { variant: 'secondary', label: t.tours.choicesStatusSubmitted },
                                approved: { variant: 'default', label: t.tours.choicesStatusApproved },
                                rejected: { variant: 'destructive', label: t.tours.choicesStatusRejected },
                                revision_requested: { variant: 'outline', label: t.tours.choicesStatusRevisionRequested },
                                in_progress: { variant: 'outline', label: t.tours.choicesStatusInProgress },
                              };
                              return (
                                <div className="flex items-center justify-between">
                                  {cs && choicesStatusConfig[cs] ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-slate-500">{t.tours.choicesStatus}:</span>
                                      <Badge variant={choicesStatusConfig[cs].variant}>
                                        {choicesStatusConfig[cs].label}
                                      </Badge>
                                    </div>
                                  ) : <div />}
                                  {choicesArr.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={() => setReceiptOpen(true)} className="gap-2">
                                      <Printer className="h-4 w-4" />
                                      {t.guests.printReceipt}
                                    </Button>
                                  )}
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.guests.printReceipt}</DialogTitle>
            <DialogDescription>{t.guests.receiptTemplate}</DialogDescription>
          </DialogHeader>

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
                <p className="text-xs text-slate-500">{tmpl.desc}</p>
              </button>
            ))}
          </div>

          <div ref={printRef} className="border rounded-lg p-4 bg-white overflow-x-auto">
            {receiptTemplate === 'compact' && (
              <CompactReceipt tourInfo={receiptTourInfo} choices={choicesArr} orgName={choicesOrgName} t={t} />
            )}
            {receiptTemplate === 'detailed' && (
              <DetailedListReceipt tourInfo={receiptTourInfo} choices={choicesArr} orgName={choicesOrgName} t={t} />
            )}
            {receiptTemplate === 'kitchen' && (
              <KitchenSummaryReceipt tourInfo={receiptTourInfo} choices={choicesArr} orgName={choicesOrgName} t={t} />
            )}
            <ReceiptServiceSummary serviceSummary={serviceSummary} t={t} />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="outline" onClick={handleExportExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              {t.guests.printReceipt}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
