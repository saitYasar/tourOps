'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ArrowLeft,
  Edit3,
  Save,
  X,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Navigation,
  ExternalLink,
  Calendar,
  Hash,
  Landmark,
  User,
  FileText,
  Globe,
  Image as ImageIcon,
  Star,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  adminApi,
  locationApi,
  type OrganizationDto,
  type CompanyStatus,
  type AdminUpdateOrganizationDto,
  type CategoryDto,
  type LocationDto,
  type PhotoDto,
  type PaginatedResponse,
} from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, ConfirmDialog } from '@/components/shared';
import { useAutoSelect } from '@/hooks/useAutoSelect';

function resolveImageUrl(url?: string | null): string | null {
  return url || null;
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

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<AdminUpdateOrganizationDto>({});
  const [imgError, setImgError] = useState(false);
  const [statusUpdateTarget, setStatusUpdateTarget] = useState<CompanyStatus | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  const a = t.admin as Record<string, string>;

  // Fetch organization detail
  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-org-detail', id],
    queryFn: () => adminApi.getOrganizationById(id),
    enabled: !!id,
  });

  // Fetch categories for edit mode
  const { data: categoriesResult } = useQuery({
    queryKey: ['admin-org-categories'],
    queryFn: () => adminApi.getOrganizationCategories(),
    enabled: editMode,
  });

  // Location data for edit mode
  const { data: countriesResult } = useQuery({
    queryKey: ['countries'],
    queryFn: () => locationApi.getCountries(),
    enabled: editMode,
  });

  const { data: citiesResult } = useQuery({
    queryKey: ['cities', form.countryId],
    queryFn: () => locationApi.getCities(form.countryId),
    enabled: editMode && !!form.countryId,
  });

  const { data: districtsResult } = useQuery({
    queryKey: ['districts', form.cityId],
    queryFn: () => locationApi.getDistricts(form.cityId),
    enabled: editMode && !!form.cityId,
  });

  const categories = categoriesResult?.success
    ? (categoriesResult.data as PaginatedResponse<CategoryDto>)?.data || []
    : [];
  const countries = countriesResult?.success ? (countriesResult.data as unknown as LocationDto[]) || [] : [];
  const cities = citiesResult?.success ? (citiesResult.data as unknown as LocationDto[]) || [] : [];
  const districts = districtsResult?.success ? (districtsResult.data as unknown as LocationDto[]) || [] : [];

  // Auto-select for cascading location
  useAutoSelect(
    cities,
    form.cityId,
    (city: LocationDto) => setForm((f) => ({ ...f, cityId: city.id, districtId: undefined })),
    { enabled: editMode }
  );

  useAutoSelect(
    districts,
    form.districtId,
    (district: LocationDto) => setForm((f) => ({ ...f, districtId: district.id })),
    { enabled: editMode }
  );

  const updateMutation = useMutation({
    mutationFn: (data: AdminUpdateOrganizationDto) => adminApi.updateOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations-counts'] });
      toast.success(a.saveSuccess);
      setEditMode(false);
    },
    onError: (error) => {
      toast.error((error as Error).message || a.saveError);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: CompanyStatus) =>
      adminApi.updateCompanyStatus({ type: 'organization', id, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations-counts'] });
      toast.success(a.orgStatusUpdated);
      setStatusUpdateTarget(null);
    },
    onError: (error) => {
      toast.error((error as Error).message || a.statusUpdateError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteOrganization(id),
    onSuccess: () => {
      toast.success(a.deleteSuccess);
      router.push('/admin/restaurants');
    },
    onError: (error) => {
      toast.error((error as Error).message || a.deleteError);
    },
  });

  if (isLoading) return <LoadingState message={t.common.loading} />;

  if (!result?.success || !result.data) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.push('/admin/restaurants')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {a.backToList}
        </Button>
        <div className="mt-8 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">{a.notFound}</p>
        </div>
      </div>
    );
  }

  const org = result.data as unknown as OrganizationDto;
  const coverUrl = resolveImageUrl(org.coverImageUrl);
  const status = org.status as CompanyStatus;
  const StatusIcon = statusIcons[status];
  const photos = org.photos || [];
  const hasLocation = org.lat && org.lng;

  const enterEditMode = () => {
    setForm({
      name: org.name,
      categoryId: org.categoryId,
      description: org.description || '',
      email: org.email,
      phone: org.phone,
      address: org.address || '',
      countryId: org.countryId,
      cityId: org.cityId,
      districtId: org.districtId,
      lat: org.lat || '',
      lng: org.lng || '',
      legalName: org.legalName || '',
      taxNumber: org.taxNumber || '',
      taxOffice: org.taxOffice || '',
      agencyCommissionRate: org.agencyCommissionRate ?? undefined,
      socialMediaUrls: {
        instagram: org.socialMediaUrls?.instagram || '',
        facebook: org.socialMediaUrls?.facebook || '',
        youtube: org.socialMediaUrls?.youtube || '',
        pinterest: org.socialMediaUrls?.pinterest || '',
        twitter: org.socialMediaUrls?.twitter || '',
      },
    });
    setEditMode(true);
  };

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const InfoRow = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: string | number | null | undefined;
    icon?: typeof Mail;
  }) => (
    <div>
      <span className="text-slate-400 block text-xs mb-0.5">{label}</span>
      <span className="text-slate-700 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3 text-slate-400" />}
        {value || '-'}
      </span>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/restaurants')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {a.backToList}
          </Button>
          <div className="p-2.5 bg-orange-100 rounded-xl">
            <Building2 className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${statusColors[status]} text-xs`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {a[`status${status.charAt(0).toUpperCase()}${status.slice(1)}` as string] || status}
              </Badge>
              {org.category?.name && (
                <Badge variant="outline" className="text-xs">
                  {org.category.name}
                </Badge>
              )}
              <span className="text-xs text-slate-400">ID: {org.id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editMode ? (
            <Button onClick={enterEditMode} variant="outline" size="sm">
              <Edit3 className="h-4 w-4 mr-1" />
              {a.editMode}
            </Button>
          ) : (
            <>
              <Button onClick={() => setEditMode(false)} variant="outline" size="sm">
                <X className="h-4 w-4 mr-1" />
                {a.cancelEdit}
              </Button>
              <Button onClick={handleSave} size="sm" disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {updateMutation.isPending ? a.saving : a.saveChanges}
              </Button>
            </>
          )}
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            {a.deleteButton}
          </Button>
        </div>
      </div>

      {/* Cover Image */}
      {coverUrl && !imgError && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{a.coverImage}</h3>
            <div className="h-48 rounded-xl overflow-hidden bg-slate-100">
              <img
                src={coverUrl}
                alt={org.name}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-orange-500" />
              {a.gallery} ({photos.length})
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {photos.map((photo, idx) => {
                const photoUrl = resolveImageUrl(photo.imageUrl);
                return (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setGalleryIndex(idx)}
                  >
                    {photoUrl && (
                      <img
                        src={photoUrl}
                        alt={`${org.name} - ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gallery Lightbox */}
      {galleryIndex !== null && photos[galleryIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setGalleryIndex(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={resolveImageUrl(photos[galleryIndex].imageUrl) || ''}
              alt={`${org.name} - ${galleryIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70"
              onClick={() => setGalleryIndex(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
              {galleryIndex > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white bg-black/50 hover:bg-black/70"
                  onClick={() => setGalleryIndex(galleryIndex - 1)}
                >
                  &larr;
                </Button>
              )}
              <span className="text-white text-sm bg-black/50 px-3 py-1 rounded">
                {galleryIndex + 1} / {photos.length}
              </span>
              {galleryIndex < photos.length - 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white bg-black/50 hover:bg-black/70"
                  onClick={() => setGalleryIndex(galleryIndex + 1)}
                >
                  &rarr;
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rating summary */}
      {(org.totalReviews || org.averageRating) && (
        <div className="flex items-center gap-4 text-sm">
          {org.averageRating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold">{org.averageRating}</span>
              <span className="text-slate-400">{a.points}</span>
            </div>
          )}
          {org.totalReviews !== undefined && (
            <div className="flex items-center gap-1 text-slate-500">
              <MessageSquare className="h-4 w-4" />
              <span>
                {org.totalReviews} {a.reviewCount}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Info */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              {a.generalInfo}
            </h3>
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.nameLabel}</label>
                  <Input
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.categoryLabel2}</label>
                  <Select
                    value={form.categoryId?.toString() || ''}
                    onValueChange={(val) => setForm({ ...form, categoryId: Number(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={a.selectCategory} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    {a.descriptionLabel}
                  </label>
                  <Textarea
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow label={a.nameLabel} value={org.name} />
                <InfoRow label={a.categoryLabel2} value={org.category?.name} />
                <InfoRow label={a.descriptionLabel} value={org.description} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Phone className="h-4 w-4 text-orange-500" />
              {a.contactInfo}
            </h3>
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.emailLabel}</label>
                  <Input
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.phoneLabel}</label>
                  <Input
                    value={form.phone || ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-slate-400 block text-xs mb-0.5">{a.emailLabel}</span>
                  <a
                    href={`mailto:${org.email}`}
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" />
                    {org.email}
                  </a>
                </div>
                <InfoRow
                  label={a.phoneLabel}
                  value={`+${org.phoneCountryCode} ${org.phone}`}
                  icon={Phone}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address & Location */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              {a.addressLocation}
            </h3>
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.addressLabel}</label>
                  <Textarea
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.countryLabel}</label>
                  <Select
                    value={form.countryId?.toString() || ''}
                    onValueChange={(val) =>
                      setForm({ ...form, countryId: Number(val), cityId: undefined, districtId: undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={a.selectCountry} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.cityLabel}</label>
                  <Select
                    value={form.cityId?.toString() || ''}
                    onValueChange={(val) =>
                      setForm({ ...form, cityId: Number(val), districtId: undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={a.selectCity} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.districtLabel}</label>
                  <Select
                    value={form.districtId?.toString() || ''}
                    onValueChange={(val) => setForm({ ...form, districtId: Number(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={a.selectDistrict} />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">{a.latLabel}</label>
                    <Input
                      value={form.lat || ''}
                      onChange={(e) => setForm({ ...form, lat: e.target.value })}
                      placeholder="41.0082"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">{a.lngLabel}</label>
                    <Input
                      value={form.lng || ''}
                      onChange={(e) => setForm({ ...form, lng: e.target.value })}
                      placeholder="28.9784"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow label={a.addressLabel} value={org.address} icon={MapPin} />
                <div className="flex items-center gap-4">
                  <InfoRow label={a.countryLabel} value={org.country?.name} />
                  <InfoRow label={a.cityLabel} value={org.city?.name} />
                  <InfoRow label={a.districtLabel} value={org.district?.name} />
                </div>
                {hasLocation && (
                  <div>
                    <span className="text-slate-400 block text-xs mb-0.5">
                      {a.coordinatesLabel}
                    </span>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-3 w-3 text-orange-500" />
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {parseFloat(org.lat!).toFixed(6)}, {parseFloat(org.lng!).toFixed(6)}
                      </code>
                      <a
                        href={`https://www.google.com/maps?q=${org.lat},${org.lng}`}
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
            )}
          </CardContent>
        </Card>

        {/* Tax & Legal */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-orange-500" />
              {a.taxLegalInfo}
            </h3>
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.legalNameLabel}</label>
                  <Input
                    value={form.legalName || ''}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.taxNumberLabel}</label>
                  <Input
                    value={form.taxNumber || ''}
                    onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.taxOfficeLabel}</label>
                  <Input
                    value={form.taxOffice || ''}
                    onChange={(e) => setForm({ ...form, taxOffice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.agencyCommissionRateLabel}</label>
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      value={form.agencyCommissionRate ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm({ ...form, agencyCommissionRate: val ? Number(val) : undefined });
                      }}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow label={a.legalNameLabel} value={org.legalName} icon={FileText} />
                <InfoRow label={a.taxNumberLabel} value={org.taxNumber} icon={Hash} />
                <InfoRow label={a.taxOfficeLabel} value={org.taxOffice} icon={Landmark} />
                <InfoRow label={a.agencyCommissionRateLabel} value={org.agencyCommissionRate != null ? `%${org.agencyCommissionRate}` : null} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Globe className="h-4 w-4 text-orange-500" />
              {a.socialMedia}
            </h3>
            {editMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(['instagram', 'facebook', 'youtube', 'pinterest', 'twitter'] as const).map(
                  (platform) => (
                    <div key={platform}>
                      <label className="text-xs text-slate-500 mb-1 block capitalize">
                        {a[platform] || platform}
                      </label>
                      <Input
                        value={form.socialMediaUrls?.[platform] || ''}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            socialMediaUrls: {
                              ...form.socialMediaUrls,
                              [platform]: e.target.value || null,
                            },
                          })
                        }
                        placeholder={`https://${platform}.com/...`}
                      />
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(['instagram', 'facebook', 'youtube', 'pinterest', 'twitter'] as const).map(
                  (platform) => {
                    const url = org.socialMediaUrls?.[platform];
                    return (
                      <div key={platform}>
                        <span className="text-slate-400 block text-xs mb-0.5 capitalize">
                          {a[platform] || platform}
                        </span>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {url}
                          </a>
                        ) : (
                          <span className="text-slate-300 text-sm">-</span>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timestamps & Status Actions */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {a.createdAt}: {new Date(org.createdAt).toLocaleString('tr-TR')}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {a.updatedAt}: {new Date(org.updatedAt).toLocaleString('tr-TR')}
              </span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {status !== 'active' && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setStatusUpdateTarget('active')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {a.approve}
                </Button>
              )}
              {status !== 'suspended' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setStatusUpdateTarget('suspended')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {a.suspend}
                </Button>
              )}
              {status !== 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusUpdateTarget('pending')}
                  className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  {a.setPending}
                </Button>
              )}
              {hasLocation && (
                <a
                  href={`https://www.google.com/maps?q=${org.lat},${org.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <Globe className="h-4 w-4 mr-1" />
                    {a.viewOnMap}
                  </Button>
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Update Confirmation */}
      <ConfirmDialog
        open={!!statusUpdateTarget}
        onOpenChange={() => setStatusUpdateTarget(null)}
        title={a.statusLabel}
        description={
          statusUpdateTarget
            ? `"${org.name}" - ${a[`status${statusUpdateTarget.charAt(0).toUpperCase()}${statusUpdateTarget.slice(1)}` as string] || statusUpdateTarget}`
            : ''
        }
        onConfirm={() => statusUpdateTarget && statusMutation.mutate(statusUpdateTarget)}
        variant={statusUpdateTarget === 'suspended' ? 'destructive' : 'default'}
        confirmLabel={a.saveChanges}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={() => setDeleteOpen(false)}
        title={a.deleteConfirmTitle}
        description={a.deleteConfirmDesc}
        onConfirm={() => deleteMutation.mutate()}
        variant="destructive"
        confirmLabel={deleteMutation.isPending ? a.deleting : a.deleteButton}
      />
    </div>
  );
}
