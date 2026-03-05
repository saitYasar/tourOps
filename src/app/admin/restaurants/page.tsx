'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Search,
  MoreHorizontal,
  MapPin,
  List,
  Map as MapIcon,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Mail,
  Phone,
  Globe,
  FileText,
  User,
  Star,
  MessageSquare,
  ExternalLink,
  Navigation,
  Calendar,
  Hash,
  Landmark,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import { adminApi, type CompanyDto, type CompanyStatus } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, ConfirmDialog } from '@/components/shared';

// Map is loaded client-side only
const RestaurantMap = dynamic(
  () => import('@/components/shared/RestaurantMap').then((mod) => mod.RestaurantMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-slate-100 flex items-center justify-center rounded-lg">
        <p className="text-slate-500">Loading map...</p>
      </div>
    ),
  }
);

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
  pending: 'Beklemede',
  active: 'Aktif',
  suspended: 'Askıya Alındı',
};

// Expandable company detail card
function CompanyDetailCard({
  company,
  onStatusUpdate,
}: {
  company: CompanyDto;
  onStatusUpdate: (company: CompanyDto, newStatus: CompanyStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();
  const StatusIcon = statusIcons[company.status];

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
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Cover Image */}
            <div className="h-20 w-20 rounded-xl bg-orange-50 border border-orange-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {company.coverImageUrl ? (
                <img
                  src={company.coverImageUrl}
                  alt={company.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-8 w-8 text-orange-400" />
              )}
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg text-slate-900 truncate">
                      {company.name}
                    </h3>
                    <Badge className={`${statusColors[company.status]} text-xs`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusLabels[company.status]}
                    </Badge>
                    {company.category?.name && (
                      <Badge variant="outline" className="text-xs">
                        {company.category.name}
                      </Badge>
                    )}
                  </div>
                  {company.legalName && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      <FileText className="h-3 w-3 inline mr-1" />
                      {company.legalName}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="text-slate-500"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Detay
                    {expanded ? (
                      <ChevronUp className="h-3 w-3 ml-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Summary Row */}
              <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-slate-600">
                {/* Location */}
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {company.city?.name && company.district?.name
                      ? `${company.city.name} / ${company.district.name}`
                      : company.city?.name || company.address || '-'}
                  </span>
                </div>

                {/* Contact */}
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

                {/* Rating */}
                {(company.totalReviews ?? 0) > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span className="font-medium">{company.averageRating}</span>
                    <span className="text-slate-400">
                      ({company.totalReviews} değerlendirme)
                    </span>
                  </div>
                )}

                {/* Date */}
                <div className="flex items-center gap-1 text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(company.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <>
            <Separator />
            <div className="p-4 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Contact & Address */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-orange-500" />
                    Adres & Konum
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs mb-0.5">Adres</span>
                      <span className="text-slate-700">{fullAddress || '-'}</span>
                    </div>
                    {company.country?.name && (
                      <div className="flex items-center gap-4">
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
                    {!hasLocation && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1.5 rounded text-xs">
                        <MapPin className="h-3 w-3" />
                        Konum bilgisi girilmemiş
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-orange-500" />
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
                    <Landmark className="h-4 w-4 text-orange-500" />
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

                  {/* Stats */}
                  <div className="pt-2">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-orange-500" />
                      İstatistikler
                    </h4>
                    <div className="flex gap-3">
                      <div className="bg-white border rounded-lg px-3 py-2 text-center flex-1">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                          <span className="text-lg font-bold text-slate-800">
                            {company.averageRating || '0.00'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">Puan</span>
                      </div>
                      <div className="bg-white border rounded-lg px-3 py-2 text-center flex-1">
                        <div className="flex items-center justify-center gap-1">
                          <MessageSquare className="h-4 w-4 text-blue-400" />
                          <span className="text-lg font-bold text-slate-800">
                            {company.totalReviews ?? 0}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">Değerlendirme</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description if available */}
              {company.description && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-slate-700 mb-1">Açıklama</h4>
                  <p className="text-sm text-slate-600">{company.description}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="mt-4 pt-4 border-t flex items-center gap-6 text-xs text-slate-400">
                <span>
                  Kayıt: {new Date(company.createdAt).toLocaleString('tr-TR')}
                </span>
                <span>
                  Güncelleme: {new Date(company.updatedAt).toLocaleString('tr-TR')}
                </span>
                <span>ID: {company.id}</span>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-4 border-t flex gap-2 flex-wrap">
                {company.status !== 'active' && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => onStatusUpdate(company, 'active')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Onayla
                  </Button>
                )}
                {company.status !== 'suspended' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onStatusUpdate(company, 'suspended')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Askıya Al
                  </Button>
                )}
                {company.status !== 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusUpdate(company, 'pending')}
                    className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Beklemeye Al
                  </Button>
                )}
                {hasLocation && (
                  <a
                    href={`https://www.google.com/maps?q=${company.lat},${company.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <Globe className="h-4 w-4 mr-1" />
                      Haritada Gör
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminRestaurantsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDto | null>(null);
  const [statusUpdateTarget, setStatusUpdateTarget] = useState<{
    company: CompanyDto;
    newStatus: CompanyStatus;
  } | null>(null);

  // Fetch organizations from real API
  const { data: companiesResult, isLoading } = useQuery({
    queryKey: ['admin-organizations', statusFilter, page, limit],
    queryFn: () =>
      adminApi.getCompanies({
        type: 'organization',
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit,
      }),
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (data: { id: number; status: CompanyStatus }) =>
      adminApi.updateCompanyStatus({
        type: 'organization',
        id: data.id,
        status: data.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      toast.success('İşletme durumu güncellendi');
      setStatusUpdateTarget(null);
    },
    onError: (error) => {
      toast.error((error as Error).message || 'Durum güncellenemedi');
    },
  });

  if (isLoading) return <LoadingState message={t.common.loading} />;

  const companies = companiesResult?.success ? companiesResult.data?.data || [] : [];
  const meta = companiesResult?.success ? companiesResult.data?.meta : null;

  // Client-side search filter
  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.legalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.taxNumber?.toString().includes(searchTerm) ||
      company.authorizedPerson?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.authorizedPerson?.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Status counts
  const statusCounts = {
    all: companies.length,
    pending: companies.filter((c) => c.status === 'pending').length,
    active: companies.filter((c) => c.status === 'active').length,
    suspended: companies.filter((c) => c.status === 'suspended').length,
  };

  // Transform for map
  const mapRestaurants = filteredCompanies
    .filter((c) => c.lat && c.lng)
    .map((c) => ({
      id: String(c.id),
      name: c.name,
      address: c.address,
      location: { lat: parseFloat(c.lat!), lng: parseFloat(c.lng!) },
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 rounded-xl">
            <Building2 className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t.admin.restaurantManagement}
            </h1>
            <p className="text-slate-500 text-sm">İşletmeleri yönetin ve onaylayın</p>
          </div>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          className={`border cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-orange-500 border-orange-200' : 'hover:border-slate-300'}`}
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Building2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{meta?.total || 0}</p>
              <p className="text-xs text-slate-500">Toplam İşletme</p>
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
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
              <p className="text-xs text-slate-500">Beklemede</p>
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
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{statusCounts.active}</p>
              <p className="text-xs text-slate-500">Aktif</p>
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
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{statusCounts.suspended}</p>
              <p className="text-xs text-slate-500">Askıda</p>
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
              placeholder="İşletme adı, e-posta, adres, vergi no veya yetkili kişi ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs: List View / Map View */}
      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            {t.venue.listView}
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapIcon className="h-4 w-4 mr-2" />
            {t.tours.routeAndMap}
          </TabsTrigger>
        </TabsList>

        {/* List View - Card Based */}
        <TabsContent value="list">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {filteredCompanies.length} işletme listeleniyor
              </p>
            </div>

            {filteredCompanies.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">İşletme bulunamadı</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Arama kriterlerinizi değiştirmeyi deneyin
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredCompanies.map((company) => (
                <CompanyDetailCard
                  key={company.id}
                  company={company}
                  onStatusUpdate={handleStatusUpdate}
                />
              ))
            )}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-slate-500">
                  Sayfa {meta.page} / {meta.totalPages} (Toplam {meta.total} kayıt)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={page === meta.totalPages}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Map View */}
        <TabsContent value="map">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Map */}
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapIcon className="h-5 w-5 text-orange-600" />
                  {t.admin.restaurants}
                </CardTitle>
                <CardDescription>
                  {mapRestaurants.length} işletme haritada
                  {mapRestaurants.length < filteredCompanies.length && (
                    <span className="text-amber-600 ml-1">
                      ({filteredCompanies.length - mapRestaurants.length} işletmenin konum bilgisi
                      yok)
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RestaurantMap
                  restaurants={mapRestaurants}
                  selectedRestaurantId={selectedCompany ? String(selectedCompany.id) : null}
                  onRestaurantSelect={(r) => {
                    const found = filteredCompanies.find((c) => String(c.id) === r?.id);
                    setSelectedCompany(found || null);
                  }}
                  height="500px"
                />
              </CardContent>
            </Card>

            {/* Selected Restaurant Details */}
            <Card className="border-0 shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg">{t.admin.viewDetails}</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCompany ? (
                  <div className="space-y-4">
                    {selectedCompany.coverImageUrl && (
                      <img
                        src={selectedCompany.coverImageUrl}
                        alt={selectedCompany.name}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{selectedCompany.name}</h3>
                      {selectedCompany.legalName && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {selectedCompany.legalName}
                        </p>
                      )}
                      <p className="text-sm text-slate-500 mt-1">{selectedCompany.address}</p>
                    </div>

                    <Badge className={statusColors[selectedCompany.status]}>
                      {statusLabels[selectedCompany.status]}
                    </Badge>

                    <div className="space-y-2 text-sm">
                      <p className="text-slate-600">
                        <span className="font-medium">Kategori:</span>{' '}
                        {selectedCompany.category?.name || '-'}
                      </p>
                      <p className="text-slate-600">
                        <span className="font-medium">{t.auth.email}:</span>{' '}
                        {selectedCompany.email}
                      </p>
                      <p className="text-slate-600">
                        <span className="font-medium">{t.common.phone}:</span> +
                        {selectedCompany.phoneCountryCode} {selectedCompany.phone}
                      </p>
                      {selectedCompany.city?.name && (
                        <p className="text-slate-600">
                          <span className="font-medium">Konum:</span>{' '}
                          {selectedCompany.country?.name} / {selectedCompany.city.name} /{' '}
                          {selectedCompany.district?.name}
                        </p>
                      )}
                      {selectedCompany.lat && selectedCompany.lng && (
                        <p className="text-slate-600">
                          <span className="font-medium">Koordinat:</span>{' '}
                          <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                            {parseFloat(selectedCompany.lat).toFixed(6)},{' '}
                            {parseFloat(selectedCompany.lng).toFixed(6)}
                          </code>
                        </p>
                      )}
                      {selectedCompany.taxOffice && (
                        <p className="text-slate-600">
                          <span className="font-medium">Vergi Dairesi:</span>{' '}
                          {selectedCompany.taxOffice}
                        </p>
                      )}
                      {selectedCompany.taxNumber && (
                        <p className="text-slate-600">
                          <span className="font-medium">Vergi No:</span>{' '}
                          {selectedCompany.taxNumber}
                        </p>
                      )}
                      {selectedCompany.authorizedPerson && (
                        <p className="text-slate-600">
                          <span className="font-medium">Yetkili:</span>{' '}
                          {selectedCompany.authorizedPerson.firstName}{' '}
                          {selectedCompany.authorizedPerson.lastName}
                        </p>
                      )}
                      <p className="text-slate-600">
                        <span className="font-medium">{t.regions.createdAt}:</span>{' '}
                        {new Date(selectedCompany.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </div>

                    <div className="pt-2 flex gap-2 flex-wrap">
                      {selectedCompany.status !== 'active' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleStatusUpdate(selectedCompany, 'active')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Onayla
                        </Button>
                      )}
                      {selectedCompany.status !== 'suspended' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleStatusUpdate(selectedCompany, 'suspended')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Askıya Al
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">
                    Detay görmek için bir işletme seçin
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Update Confirmation */}
      <ConfirmDialog
        open={!!statusUpdateTarget}
        onOpenChange={() => setStatusUpdateTarget(null)}
        title="Durum Güncelle"
        description={
          statusUpdateTarget
            ? `"${statusUpdateTarget.company.name}" işletmesinin durumunu "${statusLabels[statusUpdateTarget.newStatus]}" olarak güncellemek istediğinize emin misiniz?`
            : ''
        }
        onConfirm={confirmStatusUpdate}
        variant={statusUpdateTarget?.newStatus === 'suspended' ? 'destructive' : 'default'}
        confirmLabel="Güncelle"
      />
    </div>
  );
}
