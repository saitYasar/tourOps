'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Search,
  Image as ImageIcon,
  Users,
  Eye,
  Building2,
  ArrowUpDown,
} from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import { adminApi } from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { Card, CardContent } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LoadingState, EmptyState, ErrorState, TourStatusBadge, AdminPagination,
} from '@/components/shared';

function resolveImageUrl(url?: string | null): string | null {
  return url || null;
}

const ITEMS_PER_PAGE = 20;

export default function AdminToursPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('active');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(ITEMS_PER_PAGE);

  const lang = locale as 'tr' | 'en' | 'de';

  // Reset page on filter change
  const prevFilters = useRef({ debouncedSearch, statusFilter, agencyFilter, timeFilter, sortBy, sortOrder });
  useEffect(() => {
    const prev = prevFilters.current;
    if (
      prev.debouncedSearch !== debouncedSearch ||
      prev.statusFilter !== statusFilter ||
      prev.agencyFilter !== agencyFilter ||
      prev.timeFilter !== timeFilter ||
      prev.sortBy !== sortBy ||
      prev.sortOrder !== sortOrder
    ) {
      setPage(1);
      prevFilters.current = { debouncedSearch, statusFilter, agencyFilter, timeFilter, sortBy, sortOrder };
    }
  }, [debouncedSearch, statusFilter, agencyFilter, timeFilter, sortBy, sortOrder]);

  // Fetch agencies for filter
  const { data: agenciesResult } = useQuery({
    queryKey: ['admin-agencies-list-for-filter'],
    queryFn: () => adminApi.getAgenciesList({ limit: 100 }),
  });
  const agencies = agenciesResult?.success ? agenciesResult.data?.data || [] : [];

  // Map UI time filter to backend timeStatus param
  const timeStatusMap: Record<string, string | undefined> = {
    active: 'active',
    upcoming: 'future',
    past: 'past',
    all: undefined,
  };

  // Fetch tours
  const { data: toursResponse, isLoading, error } = useQuery({
    queryKey: ['admin-tours', page, limit, statusFilter, debouncedSearch, agencyFilter, timeFilter, sortBy, sortOrder, lang],
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
        timeStatus: timeStatusMap[timeFilter],
      });
      if (!result.success) throw new Error(result.error);
      return { data: result.data || [], meta: result.meta };
    },
  });

  const tours = toursResponse?.data || [];
  const meta = toursResponse?.meta;

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
            <Select value={timeFilter} onValueChange={(v) => { setTimeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t.admin.tourTimeFilterActive}</SelectItem>
                <SelectItem value="upcoming">{t.admin.tourTimeFilterUpcoming}</SelectItem>
                <SelectItem value="past">{t.admin.tourTimeFilterPast}</SelectItem>
                <SelectItem value="all">{t.admin.tourTimeFilterAll}</SelectItem>
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
                        onClick={() => router.push(`/admin/tours/${tour.id}`)}
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
    </div>
  );
}
