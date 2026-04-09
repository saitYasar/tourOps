'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  FileText,
  User,
  Star,
  MessageSquare,
  ExternalLink,
  Navigation,
  Calendar,
  Hash,
  Landmark,
  MapPin,
  ChevronDown,
  ChevronUp,
  Eye,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import { adminApi, type CompanyDto, type CompanyStatus } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingState, ConfirmDialog, AdminPagination } from '@/components/shared';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

function resolveImageUrl(company: CompanyDto): string | null {
  return company.coverImageUrl || null;
}

const statusColors: Record<CompanyStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  active: 'bg-green-100 text-green-700 border-green-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
};

const statusIcons: Record<CompanyStatus, typeof Clock> = {
  pending: Clock,
  active: CheckCircle,
  suspended: XCircle,
};

const statusLabels: Record<CompanyStatus, string> = {
  pending: 'agencyStatusPending',
  active: 'agencyStatusActive',
  suspended: 'agencyStatusSuspended',
};

function AgencyDetailCard({
  company,
  onStatusUpdate,
}: {
  company: CompanyDto;
  onStatusUpdate: (company: CompanyDto, newStatus: CompanyStatus) => void;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const StatusIcon = statusIcons[company.status];
  const coverUrl = resolveImageUrl(company);

  const hasLocation = company.lat && company.lng;
  const fullAddress = [
    company.address,
    company.district?.name,
    company.city?.name,
    company.country?.name,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Main Row */}
        <div className="p-3 sm:p-4">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Cover Image */}
            <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-xl bg-blue-50 border border-blue-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {coverUrl && !imgError ? (
                <img
                  src={coverUrl}
                  alt={company.name}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              )}
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base sm:text-lg text-slate-900 break-words">
                  {company.name}
                </h3>
                <Badge className={`${statusColors[company.status]} text-xs`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {(t.admin as Record<string, string>)[statusLabels[company.status]] || statusLabels[company.status]}
                </Badge>
                {company.category?.name && (
                  <Badge variant="outline" className="text-xs">
                    {company.category.name}
                  </Badge>
                )}
              </div>
              {company.legalName && (
                <p className="text-sm text-slate-500 mt-0.5 truncate">
                  <FileText className="h-3 w-3 inline mr-1" />
                  {company.legalName}
                </p>
              )}

              {/* Summary Row - hidden on mobile, shown on sm+ */}
              <div className="hidden sm:flex items-center gap-4 mt-2 flex-wrap text-sm text-slate-600">
                {company.city?.name && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {company.city?.name && company.district?.name
                        ? `${company.city.name} / ${company.district.name}`
                        : company.city?.name || company.address || '-'}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate max-w-[200px]">{company.email}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    +{company.phoneCountryCode} {company.phone}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(company.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>

              {/* Mobile compact summary */}
              <div className="flex sm:hidden flex-col gap-1 mt-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate">{company.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                  <span>+{company.phoneCountryCode} {company.phone}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{new Date(company.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions - separate row on mobile */}
          <div className="flex items-center gap-1.5 mt-2 sm:mt-0 sm:justify-end">
            <Link href={`/admin/agencies/${company.id}`}>
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs sm:text-sm">
                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                {(t.admin as Record<string, string>).goToDetail}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-slate-500 text-xs sm:text-sm"
            >
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Detay</span>
              {expanded ? (
                <ChevronUp className="h-3 w-3 ml-0.5" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-0.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <>
            <Separator />
            <div className="p-3 sm:p-4 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Contact & Address */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    Adres & Konum
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs mb-0.5">Adres</span>
                      <span className="text-slate-700">{fullAddress || '-'}</span>
                    </div>
                    {company.country?.name && (
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <div>
                          <span className="text-slate-400 block text-xs mb-0.5">Ülke</span>
                          <span className="text-slate-700">{company.country.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-xs mb-0.5">Şehir</span>
                          <span className="text-slate-700">{company.city?.name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-xs mb-0.5">İlçe</span>
                          <span className="text-slate-700">{company.district?.name || '-'}</span>
                        </div>
                      </div>
                    )}
                    {hasLocation && (
                      <div>
                        <span className="text-slate-400 block text-xs mb-0.5">Koordinatlar</span>
                        <div className="flex items-center gap-2">
                          <Navigation className="h-3 w-3 text-blue-500" />
                          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            {parseFloat(company.lat!).toFixed(6)},{' '}
                            {parseFloat(company.lng!).toFixed(6)}
                          </code>
                          <a
                            href={`https://www.google.com/maps?q=${company.lat},${company.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-500" />
                    İletişim Bilgileri
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs mb-0.5">E-posta</span>
                      <a
                        href={`mailto:${company.email}`}
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        {company.email}
                      </a>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs mb-0.5">Telefon</span>
                      <span className="text-slate-700 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        +{company.phoneCountryCode} {company.phone}
                      </span>
                    </div>
                    {company.authorizedPerson && (
                      <div className="pt-1">
                        <span className="text-slate-400 block text-xs mb-0.5">Yetkili Kişi</span>
                        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <span className="text-slate-700 font-medium text-sm block">
                              {company.authorizedPerson.firstName}{' '}
                              {company.authorizedPerson.lastName}
                            </span>
                            <span className="text-slate-400 text-xs">
                              {company.authorizedPerson.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tax & Legal */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-blue-500" />
                    Vergi & Yasal Bilgiler
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs mb-0.5">Ticari Unvan</span>
                      <span className="text-slate-700">{company.legalName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs mb-0.5">Vergi No</span>
                      <span className="text-slate-700 flex items-center gap-1">
                        <Hash className="h-3 w-3 text-slate-400" />
                        {company.taxNumber || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs mb-0.5">Vergi Dairesi</span>
                      <span className="text-slate-700 flex items-center gap-1">
                        <Landmark className="h-3 w-3 text-slate-400" />
                        {company.taxOffice || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-slate-400">
                <span>
                  Kayıt: {new Date(company.createdAt).toLocaleString('tr-TR')}
                </span>
                <span>
                  Güncelleme: {new Date(company.updatedAt).toLocaleString('tr-TR')}
                </span>
                <span>ID: {company.id}</span>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t flex gap-1.5 sm:gap-2 flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={company.status === 'active'}
                        onClick={() => onStatusUpdate(company, 'active')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t.admin.agencyApprove}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {company.status === 'active' && <TooltipContent>{t.tooltips.alreadyActive}</TooltipContent>}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={company.status === 'suspended'}
                        onClick={() => onStatusUpdate(company, 'suspended')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {t.admin.agencySuspend}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {company.status === 'suspended' && <TooltipContent>{t.tooltips.alreadySuspended}</TooltipContent>}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={company.status === 'pending'}
                        onClick={() => onStatusUpdate(company, 'pending')}
                        className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Beklemeye Al
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {company.status === 'pending' && <TooltipContent>{t.tooltips.alreadyPending}</TooltipContent>}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <a
                        href={hasLocation ? `https://www.google.com/maps?q=${company.lat},${company.lng}` : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={!hasLocation ? { pointerEvents: 'none' } : undefined}
                      >
                        <Button variant="outline" size="sm" disabled={!hasLocation}>
                          <Globe className="h-4 w-4 mr-1" />
                          Haritada Gör
                        </Button>
                      </a>
                    </span>
                  </TooltipTrigger>
                  {!hasLocation && <TooltipContent>{t.tooltips.noLocation}</TooltipContent>}
                </Tooltip>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAgenciesPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 800);
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusUpdateTarget, setStatusUpdateTarget] = useState<{
    company: CompanyDto;
    newStatus: CompanyStatus;
  } | null>(null);

  // Reset page when search term changes
  const prevSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch) {
      setPage(1);
      prevSearchRef.current = debouncedSearch;
    }
  }, [debouncedSearch]);

  // Fetch status counts via separate small queries (limit: 1 just to get meta.total)
  const { data: totalAgencyCount } = useQuery({
    queryKey: ['admin-agencies-count-all'],
    queryFn: () => adminApi.getAgenciesList({ limit: 1 }),
  });
  const { data: pendingAgencyCount } = useQuery({
    queryKey: ['admin-agencies-count-pending'],
    queryFn: () => adminApi.getAgenciesList({ status: 'pending', limit: 1 }),
  });
  const { data: activeAgencyCount } = useQuery({
    queryKey: ['admin-agencies-count-active'],
    queryFn: () => adminApi.getAgenciesList({ status: 'active', limit: 1 }),
  });
  const { data: suspendedAgencyCount } = useQuery({
    queryKey: ['admin-agencies-count-suspended'],
    queryFn: () => adminApi.getAgenciesList({ status: 'suspended', limit: 1 }),
  });

  // Fetch agencies with current filter (for the list)
  const { data: companiesResult, isLoading } = useQuery({
    queryKey: ['admin-agencies', statusFilter, debouncedSearch, page, limit],
    queryFn: () =>
      adminApi.getAgenciesList({
        name: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { id: number; status: CompanyStatus }) =>
      adminApi.updateCompanyStatus({
        type: 'agency',
        id: data.id,
        status: data.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agencies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-agencies-count-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-agencies-count-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-agencies-count-active'] });
      queryClient.invalidateQueries({ queryKey: ['admin-agencies-count-suspended'] });
      toast.success(t.admin.agencyStatusUpdated);
      setStatusUpdateTarget(null);
    },
    onError: (error) => {
      toast.error((error as Error).message || t.admin.statusUpdateError);
    },
  });

  if (isLoading) return <LoadingState message={t.common.loading} />;

  const companies = companiesResult?.success ? companiesResult.data?.data || [] : [];
  const meta = companiesResult?.success ? companiesResult.data?.meta : null;

  // Status counts from meta.total of each filtered query
  const getMetaTotal = (r: typeof totalAgencyCount) => (r?.success ? r.data?.meta?.total || r.data?.meta?.totalCount || 0 : 0);
  const statusCounts = {
    all: getMetaTotal(totalAgencyCount),
    pending: getMetaTotal(pendingAgencyCount),
    active: getMetaTotal(activeAgencyCount),
    suspended: getMetaTotal(suspendedAgencyCount),
  };

  const handleStatusUpdate = (company: CompanyDto, newStatus: CompanyStatus) => {
    setStatusUpdateTarget({ company, newStatus });
  };

  const confirmStatusUpdate = () => {
    if (statusUpdateTarget) {
      updateStatusMutation.mutate({
        id: statusUpdateTarget.company.id,
        status: statusUpdateTarget.newStatus,
      });
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-blue-100 rounded-xl">
            <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900">
              {t.admin.agencyManagement}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm hidden sm:block">{t.admin.agencyManageAndApprove}</p>
          </div>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Card
          className={`border cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-blue-500 border-blue-200' : 'hover:border-slate-300'}`}
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
        >
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg">
              <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{statusCounts.all}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">{t.admin.agencyTotalLabel}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500 border-yellow-200' : 'hover:border-slate-300'}`}
          onClick={() => {
            setStatusFilter('pending');
            setPage(1);
          }}
        >
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">{t.admin.agencyPendingLabel}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border cursor-pointer transition-all ${statusFilter === 'active' ? 'ring-2 ring-green-500 border-green-200' : 'hover:border-slate-300'}`}
          onClick={() => {
            setStatusFilter('active');
            setPage(1);
          }}
        >
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{statusCounts.active}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">{t.admin.agencyActiveLabel}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border cursor-pointer transition-all ${statusFilter === 'suspended' ? 'ring-2 ring-red-500 border-red-200' : 'hover:border-slate-300'}`}
          onClick={() => {
            setStatusFilter('suspended');
            setPage(1);
          }}
        >
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{statusCounts.suspended}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">Askıda</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t.admin.agencySearchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Agency List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {companies.length} acente listeleniyor
          </p>
        </div>

        {companies.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">{t.admin.agencyNotFound}</p>
              <p className="text-slate-400 text-sm mt-1">
                Arama kriterlerinizi değiştirmeyi deneyin
              </p>
            </CardContent>
          </Card>
        ) : (
          companies.map((company) => (
            <AgencyDetailCard
              key={company.id}
              company={company}
              onStatusUpdate={handleStatusUpdate}
            />
          ))
        )}

        {/* Pagination */}
        <AdminPagination
          page={page}
          limit={limit}
          total={meta?.total || meta?.totalCount || companies.length}
          totalPages={meta?.totalPages}
          onPageChange={setPage}
          onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
        />
      </div>

      {/* Status Update Confirmation */}
      <ConfirmDialog
        open={!!statusUpdateTarget}
        onOpenChange={() => setStatusUpdateTarget(null)}
        title="Durum Güncelle"
        description={
          statusUpdateTarget
            ? `"${statusUpdateTarget.company.name}" acentesinin durumunu "${(t.admin as Record<string, string>)[statusLabels[statusUpdateTarget.newStatus]] || statusLabels[statusUpdateTarget.newStatus]}" olarak güncellemek istediğinize emin misiniz?`
            : ''
        }
        onConfirm={confirmStatusUpdate}
        variant={statusUpdateTarget?.newStatus === 'suspended' ? 'destructive' : 'default'}
        confirmLabel="Güncelle"
      />
    </div>
  );
}
