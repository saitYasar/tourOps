'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAutoSelect } from '@/hooks/useAutoSelect';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Building2, UtensilsCrossed, CheckCircle, XCircle, Clock, MapPin, Users, Settings, Pencil, X, Phone, Mail, FileText, Globe, Hash, ImageIcon, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

import { organizationApi, locationApi, resourceApi, serviceCategoryApi, preReservationOrgApi } from '@/lib/api';
import { formatPhoneNumber, cleanPhoneNumber } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { LoadingState, SprinterLoading, ImageCropper } from '@/components/shared';

// Map is loaded client-side only
const RestaurantMap = dynamic(
  () => import('@/components/shared/RestaurantMap').then((mod) => mod.RestaurantMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[200px] bg-slate-100 flex items-center justify-center rounded-lg">
        <p className="text-slate-500">Loading map...</p>
      </div>
    ),
  }
);

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const apiLang = (locale === 'de' ? 'en' : locale) as 'tr' | 'en';
  const router = useRouter();
  const queryClient = useQueryClient();
  // Dialog states
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [editLocationAddress, setEditLocationAddress] = useState('');

  // Info edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhoneCountryCode, setEditPhoneCountryCode] = useState(90);
  const [editAddress, setEditAddress] = useState('');
  const [editAgencyCommissionRate, setEditAgencyCommissionRate] = useState<number | undefined>(undefined);

  // Cover image edit state
  const [editCoverImage, setEditCoverImage] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Query: Organization details from real API
  const { data: organizationResult, isLoading: organizationLoading } = useQuery({
    queryKey: ['my-organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });

  const organization = organizationResult?.success ? organizationResult.data : null;
  const shouldRedirectToSetup = !organizationLoading && !organization && organizationResult?.error?.includes('bulunamadı');

  // Query: Countries
  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: () => locationApi.getCountries(),
    enabled: isLocationDialogOpen,
  });

  // Query: Cities based on selected country
  const { data: citiesData, isLoading: citiesLoading } = useQuery({
    queryKey: ['cities', selectedCountryId],
    queryFn: () => locationApi.getCities(selectedCountryId!),
    enabled: isLocationDialogOpen && !!selectedCountryId,
  });

  // Query: Districts based on selected city
  const { data: districtsData, isLoading: districtsLoading } = useQuery({
    queryKey: ['districts', selectedCityId],
    queryFn: () => locationApi.getDistricts(selectedCityId!),
    enabled: isLocationDialogOpen && !!selectedCityId,
  });

  const countries = countriesData?.success ? countriesData.data?.data || [] : [];
  const cities = citiesData?.success ? citiesData.data?.data || [] : [];
  const districts = districtsData?.success ? districtsData.data?.data || [] : [];

  // Auto-select: Tek secenek varsa otomatik sec (location dialog)
  useAutoSelect(countries, selectedCountryId, (country) => {
    setSelectedCountryId(country.id);
    setSelectedCityId(null);
    setSelectedDistrictId(null);
  }, { enabled: isLocationDialogOpen });

  useAutoSelect(cities, selectedCityId, (city) => {
    setSelectedCityId(city.id);
    setSelectedDistrictId(null);
  }, { enabled: isLocationDialogOpen });

  useAutoSelect(districts, selectedDistrictId, (district) => {
    setSelectedDistrictId(district.id);
  }, { enabled: isLocationDialogOpen });

  // Update mutation
  const updateLocationMutation = useMutation({
    mutationFn: () => organizationApi.updateMyOrganization({
      countryId: selectedCountryId!,
      cityId: selectedCityId!,
      districtId: selectedDistrictId!,
      address: editLocationAddress.trim() || undefined,
    }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.restaurant.orgUpdated);
        queryClient.invalidateQueries({ queryKey: ['my-organization'] });
        setIsLocationDialogOpen(false);
      } else {
        toast.error(result.error || t.restaurant.orgCreateFailed);
      }
    },
    onError: () => {
      toast.error(t.restaurant.orgCreateError);
    },
  });

  // Open dialog and set current values
  const handleOpenLocationDialog = () => {
    if (organization) {
      setSelectedCountryId(organization.countryId || null);
      setSelectedCityId(organization.cityId || null);
      setSelectedDistrictId(organization.districtId || null);
      setEditLocationAddress(organization.address || '');
    }
    setIsLocationDialogOpen(true);
  };

  const handleSaveLocation = () => {
    if (!selectedCountryId || !selectedCityId || !selectedDistrictId) {
      toast.error(t.common.required);
      return;
    }
    updateLocationMutation.mutate();
  };

  // Update info mutation
  const updateInfoMutation = useMutation({
    mutationFn: () => organizationApi.updateMyOrganization({
      name: editName,
      description: editDescription,
      phone: parseInt(cleanPhoneNumber(editPhone)),
      phoneCountryCode: editPhoneCountryCode,
      address: editAddress,
      agencyCommissionRate: editAgencyCommissionRate,
    }, editCoverImage || undefined),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.restaurant.orgUpdated);
        queryClient.invalidateQueries({ queryKey: ['my-organization'] });
        setIsInfoDialogOpen(false);
      } else {
        toast.error(result.error || t.restaurant.orgCreateFailed);
      }
    },
    onError: () => {
      toast.error(t.restaurant.orgCreateError);
    },
  });

  // Open info edit dialog
  const handleOpenInfoDialog = () => {
    if (organization) {
      setEditName(organization.name || '');
      setEditDescription(organization.description || '');
      setEditPhone(organization.phone ? formatPhoneNumber(String(organization.phone)) : '');
      setEditPhoneCountryCode(organization.phoneCountryCode || 90);
      setEditAddress(organization.address || '');
      setEditAgencyCommissionRate(organization.agencyCommissionRate ?? undefined);
      setEditCoverImage(null);
      setEditCoverPreview(null);
    }
    setIsInfoDialogOpen(true);
  };

  // Cover image handlers
  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t.common.error);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t.common.error);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCoverCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'cover.jpg', { type: 'image/jpeg' });
    setEditCoverImage(file);
    setEditCoverPreview(URL.createObjectURL(croppedBlob));
  };

  const handleSaveInfo = () => {
    if (!editName.trim()) {
      toast.error(t.restaurant.orgNameRequired);
      return;
    }
    updateInfoMutation.mutate();
  };

  // Redirect to setup if no organization
  useEffect(() => {
    if (shouldRedirectToSetup) {
      router.push('/restaurant/setup');
    }
  }, [shouldRedirectToSetup, router]);

  // Query: Pre-reservation requests (real API)
  const { data: requestsResult, isLoading: requestsLoading } = useQuery({
    queryKey: ['org-pre-reservations', apiLang],
    queryFn: () => preReservationOrgApi.getAll(undefined, apiLang),
    enabled: !!organization,
  });

  const requests = requestsResult?.success ? requestsResult.data || [] : [];

  // Query: Resource layout (floors) from real API
  const { data: layoutResult, isLoading: floorsLoading } = useQuery({
    queryKey: ['resource-layout'],
    queryFn: () => resourceApi.getLayout(),
    enabled: !!organization,
  });

  const floors = layoutResult?.success ? layoutResult.data || [] : [];

  // Query: Service categories from real API
  const { data: categoriesResult, isLoading: categoriesLoading } = useQuery({
    queryKey: ['service-categories', locale],
    queryFn: () => serviceCategoryApi.getAll(locale),
    enabled: !!organization,
  });

  const categories = categoriesResult?.success ? categoriesResult.data || [] : [];

  const isLoading = requestsLoading || floorsLoading || categoriesLoading || organizationLoading;

  // Memoize map data to prevent re-renders when dialog state changes
  const mapRestaurants = useMemo(() => {
    if (!organization?.lat || !organization?.lng) return null;
    return [{
      id: String(organization.id),
      name: organization.name,
      location: { lat: parseFloat(organization.lat), lng: parseFloat(organization.lng) },
      address: organization.address,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    }];
  }, [organization?.id, organization?.name, organization?.lat, organization?.lng, organization?.address, organization?.createdAt, organization?.updatedAt]);

  const mapCenter = useMemo(() => {
    if (!organization?.lat || !organization?.lng) return null;
    return { lat: parseFloat(organization.lat), lng: parseFloat(organization.lng) };
  }, [organization?.lat, organization?.lng]);

  const selectedRestaurantId = useMemo(() => {
    return organization?.id ? String(organization.id) : undefined;
  }, [organization?.id]);

  const pendingRequests = requests.filter((r) => r.status === 'pending').length;
  const approvedRequests = requests.filter((r) => r.status === 'approved').length;
  const rejectedRequests = requests.filter((r) => r.status === 'rejected').length;

  // Show loading while redirecting or loading data
  if (isLoading || shouldRedirectToSetup) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t.restaurant.title} />
        <div className="flex-1 p-6">
          <LoadingState message={t.common.loading} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={organization?.name || t.restaurant.title} organizationStatus={organization?.status} lang={locale} />

      <div className="flex-1 p-6 overflow-auto">
        {/* Ozet Kartlari */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.restaurant.pendingRequests}</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests}</div>
              <p className="text-xs text-muted-foreground">{t.restaurant.waitingApproval}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.restaurant.approvedRequests}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedRequests}</div>
              <p className="text-xs text-muted-foreground">{t.restaurant.reservationApproved}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.restaurant.rejectedRequests}</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rejectedRequests}</div>
              <p className="text-xs text-muted-foreground">{t.restaurant.reservationRejected}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.restaurant.totalRequests}</CardTitle>
              <ClipboardList className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
              <p className="text-xs text-muted-foreground">{t.restaurant.allTime}</p>
            </CardContent>
          </Card>
        </div>

        {/* İşletme Bilgileri - Tam Genişlik */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-6 w-6 text-blue-600" />
                {t.restaurant.orgInfo}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInfoDialog}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                {t.common.edit}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Kapak Fotoğrafı */}
            {organization?.coverImageUrl && (
              <div className="mb-6 rounded-lg overflow-hidden">
                <img
                  src={organization.coverImageUrl}
                  alt={t.tours.coverImage}
                  className="w-full h-48 md:h-56 object-cover"
                />
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* İşletme Adı */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">{t.restaurant.orgName}</p>
                <p className="text-lg font-semibold text-slate-900">{organization?.name || '-'}</p>
              </div>

              {/* Kategori */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">{t.admin.categoryLabel}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {organization?.category?.name || '-'}
                  </span>
                </div>
              </div>

              {/* Telefon */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">{t.common.phone}</p>
                <p className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {organization?.phone ? `+${organization.phoneCountryCode} ${organization.phone}` : '-'}
                </p>
              </div>

              {/* E-posta */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">{t.admin.emailLabel}</p>
                <p className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {organization?.email || '-'}
                </p>
              </div>

              {/* Resmi Ünvan */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">{t.admin.legalName}</p>
                <p className="text-base font-medium text-slate-900">{organization?.legalName || '-'}</p>
              </div>

              {/* Vergi Dairesi */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">{t.admin.taxOffice}</p>
                <p className="text-base font-medium text-slate-900">{organization?.taxOffice || '-'}</p>
              </div>

              {/* Vergi No */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">{t.admin.taxNumber}</p>
                <p className="text-base font-medium text-slate-900 font-mono">{organization?.taxNumber || '-'}</p>
              </div>

              {/* Acente Komisyon Oranı */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">{t.restaurant.agencyCommissionRate}</p>
                <p className="text-base font-medium text-slate-900">
                  {organization?.agencyCommissionRate != null ? `%${organization.agencyCommissionRate}` : '-'}
                </p>
              </div>

              {/* Adres - Tam Genişlik */}
              <div className="space-y-1 md:col-span-2">
                <p className="text-sm text-slate-500 font-medium">{t.admin.addressLabel}</p>
                <p className="text-base text-slate-900 flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-1 shrink-0" />
                  {organization?.address || '-'}
                </p>
              </div>

              {/* Açıklama - Tam Genişlik */}
              {organization?.description && (
                <div className="space-y-1 lg:col-span-3 md:col-span-2">
                  <p className="text-sm text-slate-500 font-medium">{t.admin.descriptionLabel}</p>
                  <p className="text-base text-slate-700 bg-slate-50 p-3 rounded-lg">{organization.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Konum ve Hızlı Erişim */}
        <div className="grid gap-6 lg:grid-cols-3 mb-6">
          {/* Konum Kartı */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  {t.restaurant.locationStep}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenLocationDialog}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  {t.common.edit}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* İl ve İlçe Bilgisi */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {organization?.country && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                    {organization.country.name}
                  </span>
                )}
                {organization?.city && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {organization.city.name}
                  </span>
                )}
                {organization?.district && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                    {organization.district.name}
                  </span>
                )}
                {!organization?.city && !organization?.district && (
                  <span className="text-sm text-slate-400">{t.admin.noLocation}</span>
                )}
              </div>
              {mapRestaurants && mapCenter ? (
                <RestaurantMap
                  restaurants={mapRestaurants}
                  selectedRestaurantId={selectedRestaurantId}
                  height="250px"
                  zoom={15}
                  center={mapCenter}
                />
              ) : (
                <div className="h-[250px] bg-slate-100 rounded-lg flex items-center justify-center">
                  <p className="text-slate-500">{t.admin.noLocation}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hızlı Erişim */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t.admin.quickActions}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/restaurant/team" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">{t.restaurant.teamManagement}</span>
              </Link>
              <Link href="/restaurant/photos" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border">
                <Settings className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-medium">{t.nav.photos}</span>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Hızlı Eylemler */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t.admin.quickActions}</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/restaurant/requests">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ClipboardList className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t.requests.title}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {pendingRequests} {t.requests.pending.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    {t.requests.description}
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/restaurant/venue">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t.venue.title}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {floors.length} {t.venue.floor.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    {t.venue.description}
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/restaurant/menu">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <UtensilsCrossed className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t.menu.title}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {categories.length} {t.menu.categories.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    {t.menu.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* Location Edit Dialog */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              {t.restaurant.editLocationInfo}
            </DialogTitle>
            <DialogDescription>
              {t.restaurant.editLocationDesc}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveLocation(); }}>
            {countriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <SprinterLoading size="xs" />
                <span className="ml-2 text-slate-500">{t.common.loading}</span>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {/* Country Select */}
                <div className="space-y-2">
                  <Label>{t.admin.countryLabel}</Label>
                  <Select
                    value={selectedCountryId?.toString() || ''}
                    onValueChange={(v) => {
                      setSelectedCountryId(parseInt(v));
                      setSelectedCityId(null);
                      setSelectedDistrictId(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.admin.countryLabel} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id.toString()}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City + District side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t.admin.cityLabel}</Label>
                    <Select
                      value={selectedCityId?.toString() || ''}
                      onValueChange={(v) => {
                        setSelectedCityId(parseInt(v));
                        setSelectedDistrictId(null);
                      }}
                      disabled={!selectedCountryId}
                    >
                      <SelectTrigger>
                        {citiesLoading ? (
                          <span className="flex items-center gap-2 text-slate-500">
                            <SprinterLoading size="xs" />
                            {t.common.loading}
                          </span>
                        ) : (
                          <SelectValue placeholder={t.admin.cityLabel} />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.id.toString()}>
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t.admin.districtLabel}</Label>
                    <Select
                      value={selectedDistrictId?.toString() || ''}
                      onValueChange={(v) => setSelectedDistrictId(parseInt(v))}
                      disabled={!selectedCityId}
                    >
                      <SelectTrigger>
                        {districtsLoading ? (
                          <span className="flex items-center gap-2 text-slate-500">
                            <SprinterLoading size="xs" />
                            {t.common.loading}
                          </span>
                        ) : (
                          <SelectValue placeholder={t.admin.districtLabel} />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((district) => (
                          <SelectItem key={district.id} value={district.id.toString()}>
                            {district.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="locationAddress">{t.admin.addressLabel}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Textarea
                      id="locationAddress"
                      value={editLocationAddress}
                      onChange={(e) => setEditLocationAddress(e.target.value)}
                      placeholder={t.admin.addressLabel}
                      rows={2}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLocationDialogOpen(false)}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                disabled={updateLocationMutation.isPending || !selectedDistrictId || countriesLoading}
              >
                {updateLocationMutation.isPending ? (
                  <>
                    <SprinterLoading size="xs" className="mr-2" />
                    {t.common.loading}
                  </>
                ) : (
                  t.common.save
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Info Edit Dialog */}
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              {t.restaurant.editOrgInfo}
            </DialogTitle>
            <DialogDescription>
              {t.restaurant.editOrgInfoDesc}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveInfo(); }}>
          <div className="space-y-4 py-4">
            {/* Kapak Fotoğrafı */}
            <div className="space-y-2">
              <Label>{t.tours.coverImage}</Label>
              <div
                className="relative w-full h-40 rounded-lg overflow-hidden border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors cursor-pointer group"
                onClick={() => coverInputRef.current?.click()}
              >
                {editCoverPreview || organization?.coverImageUrl ? (
                  <>
                    <img
                      src={editCoverPreview || organization!.coverImageUrl!}
                      alt={t.tours.coverImage}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-white text-sm font-medium flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {t.menu.changeImage}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <span className="text-sm">{t.menu.uploadImage} (16:9)</span>
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCoverFileChange}
              />
            </div>

            {/* İşletme Adı */}
            <div className="space-y-2">
              <Label htmlFor="editName">{t.restaurant.orgNameLabel}</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t.restaurant.orgNamePlaceholder}
              />
            </div>

            {/* Telefon */}
            <div className="space-y-2">
              <Label htmlFor="editPhone">{t.common.phone}</Label>
              <div className="flex gap-2">
                <Select
                  value={editPhoneCountryCode.toString()}
                  onValueChange={(v) => setEditPhoneCountryCode(parseInt(v))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">+90</SelectItem>
                    <SelectItem value="1">+1</SelectItem>
                    <SelectItem value="44">+44</SelectItem>
                    <SelectItem value="49">+49</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="editPhone"
                  type="tel"
                  inputMode="numeric"
                  value={editPhone}
                  onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
                  placeholder="5XX XXX XX XX"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Adres */}
            <div className="space-y-2">
              <Label htmlFor="editAddress">{t.admin.addressLabel}</Label>
              <Textarea
                id="editAddress"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder={t.admin.addressLabel}
                rows={2}
              />
            </div>

            {/* Açıklama */}
            <div className="space-y-2">
              <Label htmlFor="editDescription">{t.admin.descriptionLabel}</Label>
              <Textarea
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t.restaurant.orgDescPlaceholder}
                rows={3}
              />
            </div>

            {/* Acente Komisyon Oranı */}
            <div className="space-y-2">
              <Label htmlFor="editAgencyCommissionRate">{t.restaurant.agencyCommissionRate}</Label>
              <p className="text-xs text-slate-500">{t.restaurant.agencyCommissionRateDesc}</p>
              <div className="relative">
                <Input
                  id="editAgencyCommissionRate"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  placeholder={t.restaurant.agencyCommissionRatePlaceholder}
                  value={editAgencyCommissionRate ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditAgencyCommissionRate(val ? Number(val) : undefined);
                  }}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInfoDialogOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={updateInfoMutation.isPending}
            >
              {updateInfoMutation.isPending ? (
                <>
                  <SprinterLoading size="xs" className="mr-2" />
                  {t.common.loading}
                </>
              ) : (
                t.common.save
              )}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cover Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImageSrc}
        onCropComplete={handleCoverCropComplete}
        aspectRatio={16 / 9}
        title={t.tours.coverImage}
        cropShape="rect"
      />
    </div>
  );
}
