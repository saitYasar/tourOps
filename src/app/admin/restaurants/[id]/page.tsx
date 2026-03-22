'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
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
  Plus,
  Layers,
  UtensilsCrossed,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Pencil,
  GripVertical,
  Upload,
  Eye,
  Square,
  Circle,
  Power,
  PowerOff,
  Box,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import { getCurrencySymbol } from '@/lib/utils';
import {
  adminApi,
  locationApi,
  resourceApi,
  type OrganizationDto,
  type CompanyStatus,
  type AdminUpdateOrganizationDto,
  type CategoryDto,
  type LocationDto,
  type PhotoDto,
  type PaginatedResponse,
  type ServiceCategoryDto,
  type ServiceDto,
  type ResourceDto,
  type ResourceTypeDto,
  type CreateServiceCategoryDto,
  type UpdateServiceCategoryDto,
  type CreateServiceDto,
  type UpdateServiceDto,
  type CreateResourceDto,
  type UpdateResourceDto,
  type PriceType,
  type ClientStopMenuCategoryDto,
  type ClientStopMenuServiceDto,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { LoadingState, ConfirmDialog, EmptyState, ErrorState, ImageCropper, ServiceDetailDialog } from '@/components/shared';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAutoSelect } from '@/hooks/useAutoSelect';
import { LayoutEditor, TablePreview, type LayoutApiAdapter } from '@/components/restaurant/layout-editor';
import { CardDescription } from '@/components/ui/card';

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

  // Cover image edit state
  const [editCoverImage, setEditCoverImage] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState('');
  const [cropperType, setCropperType] = useState<'cover' | 'gallery'>('cover');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [deletePhotoId, setDeletePhotoId] = useState<number | null>(null);

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

  // Location data - also used in read mode to resolve names when backend doesn't return nested objects
  const orgData = result?.success ? (result.data as unknown as OrganizationDto) : null;
  const needsLocationResolve = !!orgData && (!orgData.country || !orgData.city || !orgData.district);

  const { data: countriesResult } = useQuery({
    queryKey: ['countries'],
    queryFn: () => locationApi.getCountries(),
    enabled: editMode || needsLocationResolve,
  });

  const { data: citiesResult } = useQuery({
    queryKey: ['cities', editMode ? form.countryId : orgData?.countryId],
    queryFn: () => locationApi.getCities(editMode ? form.countryId : orgData?.countryId),
    enabled: editMode ? !!form.countryId : (needsLocationResolve && !!orgData?.countryId),
  });

  const { data: districtsResult } = useQuery({
    queryKey: ['districts', editMode ? form.cityId : orgData?.cityId],
    queryFn: () => locationApi.getDistricts(editMode ? form.cityId : orgData?.cityId),
    enabled: editMode ? !!form.cityId : (needsLocationResolve && !!orgData?.cityId),
  });

  const categories = categoriesResult?.success
    ? (categoriesResult.data as PaginatedResponse<CategoryDto>)?.data || []
    : [];
  const countries = countriesResult?.success ? (countriesResult.data as PaginatedResponse<LocationDto>)?.data || [] : [];
  const cities = citiesResult?.success ? (citiesResult.data as PaginatedResponse<LocationDto>)?.data || [] : [];
  const districts = districtsResult?.success ? (districtsResult.data as PaginatedResponse<LocationDto>)?.data || [] : [];

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

  // Photo mutations
  const addPhotoMutation = useMutation({
    mutationFn: (image: File) => adminApi.addOrgPhoto(id, image),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-org-detail', id] });
        toast.success(a.photoAdded || 'Fotoğraf eklendi');
      } else {
        toast.error(result.error || a.saveError);
      }
    },
    onError: (error) => {
      toast.error((error as Error).message || a.saveError);
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) => adminApi.deleteOrgPhoto(id, photoId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-org-detail', id] });
        toast.success(a.photoDeleted || 'Fotoğraf silindi');
        setDeletePhotoId(null);
      } else {
        toast.error(result.error || a.deleteError);
      }
    },
    onError: (error) => {
      toast.error((error as Error).message || a.deleteError);
    },
  });

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
      setCropperType('cover');
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setCropperType('gallery');
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    if (cropperType === 'cover') {
      const file = new File([croppedBlob], 'cover.jpg', { type: 'image/jpeg' });
      setEditCoverImage(file);
      setEditCoverPreview(URL.createObjectURL(croppedBlob));
    } else {
      const file = new File([croppedBlob], `gallery_${Date.now()}.jpg`, { type: 'image/jpeg' });
      addPhotoMutation.mutate(file);
    }
  };

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
      currency: (org.currency as 'TRY' | 'EUR' | 'USD') || undefined,
      socialMediaUrls: {
        instagram: org.socialMediaUrls?.instagram || '',
        facebook: org.socialMediaUrls?.facebook || '',
        youtube: org.socialMediaUrls?.youtube || '',
        pinterest: org.socialMediaUrls?.pinterest || '',
        twitter: org.socialMediaUrls?.twitter || '',
      },
    });
    setEditCoverImage(null);
    setEditCoverPreview(null);
    setEditMode(true);
  };

  const handleSave = () => {
    if (editCoverImage) {
      adminApi.updateOrganizationWithCover(id, form, editCoverImage).then((result) => {
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['admin-org-detail', id] });
          queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
          queryClient.invalidateQueries({ queryKey: ['admin-organizations-counts'] });
          toast.success(a.saveSuccess);
          setEditMode(false);
          setEditCoverImage(null);
          setEditCoverPreview(null);
        } else {
          toast.error(result.error || a.saveError);
        }
      });
    } else {
      updateMutation.mutate(form);
    }
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
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button onClick={enterEditMode} variant="outline" size="sm" disabled={editMode}>
                  <Edit3 className="h-4 w-4 mr-1" />
                  {a.editMode}
                </Button>
              </span>
            </TooltipTrigger>
            {editMode && <TooltipContent>{t.tooltips.inEditMode}</TooltipContent>}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button onClick={() => setEditMode(false)} variant="outline" size="sm" disabled={!editMode}>
                  <X className="h-4 w-4 mr-1" />
                  {a.cancelEdit}
                </Button>
              </span>
            </TooltipTrigger>
            {!editMode && <TooltipContent>{t.tooltips.notInEditMode}</TooltipContent>}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button onClick={handleSave} size="sm" disabled={!editMode || updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  {updateMutation.isPending ? a.saving : a.saveChanges}
                </Button>
              </span>
            </TooltipTrigger>
            {!editMode && <TooltipContent>{t.tooltips.notInEditMode}</TooltipContent>}
          </Tooltip>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            {a.deleteButton}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">{a.tabGeneral}</TabsTrigger>
          <TabsTrigger value="menu">{a.menuAndServices}</TabsTrigger>
          <TabsTrigger value="resources">{a.tabResources}</TabsTrigger>
        </TabsList>

        {/* ==================== GENERAL TAB ==================== */}
        <TabsContent value="general" className="space-y-6">

      {/* Cover Image */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{a.coverImage}</h3>
          {editMode ? (
            <>
              <div
                className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 hover:border-orange-400 transition-colors cursor-pointer group bg-slate-100"
                onClick={() => coverInputRef.current?.click()}
              >
                {editCoverPreview || (coverUrl && !imgError) ? (
                  <>
                    <img
                      src={editCoverPreview || coverUrl!}
                      alt={org.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={() => setImgError(true)}
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
            </>
          ) : (
            coverUrl && !imgError ? (
              <div className="h-48 rounded-xl overflow-hidden bg-slate-100">
                <img
                  src={coverUrl}
                  alt={org.name}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              <div className="h-48 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-sm">{a.noCoverImage || 'Kapak fotoğrafı yok'}</span>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-orange-500" />
              {a.gallery} ({photos.length})
            </h3>
            {editMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => galleryInputRef.current?.click()}
                disabled={addPhotoMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                {addPhotoMutation.isPending ? t.common.loading : (a.addPhoto || 'Fotoğraf Ekle')}
              </Button>
            )}
          </div>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleGalleryFileChange}
          />
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {photos.map((photo, idx) => {
                const photoUrl = resolveImageUrl(photo.imageUrl);
                return (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer hover:opacity-80 transition-opacity group"
                    onClick={() => setGalleryIndex(idx)}
                  >
                    {photoUrl && (
                      <img
                        src={photoUrl}
                        alt={`${org.name} - ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                    {editMode && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletePhotoId(photo.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-slate-400 text-sm">
              {a.noPhotos || 'Henüz fotoğraf eklenmemiş'}
            </div>
          )}
        </CardContent>
      </Card>

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
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white bg-black/50 hover:bg-black/70"
                      disabled={galleryIndex <= 0}
                      onClick={() => setGalleryIndex(galleryIndex - 1)}
                    >
                      &larr;
                    </Button>
                  </span>
                </TooltipTrigger>
                {galleryIndex <= 0 && <TooltipContent>{t.tooltips.firstImage}</TooltipContent>}
              </Tooltip>
              <span className="text-white text-sm bg-black/50 px-3 py-1 rounded">
                {galleryIndex + 1} / {photos.length}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white bg-black/50 hover:bg-black/70"
                      disabled={galleryIndex >= photos.length - 1}
                      onClick={() => setGalleryIndex(galleryIndex + 1)}
                    >
                      &rarr;
                    </Button>
                  </span>
                </TooltipTrigger>
                {galleryIndex >= photos.length - 1 && <TooltipContent>{t.tooltips.lastImage}</TooltipContent>}
              </Tooltip>
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
                  <InfoRow label={a.countryLabel} value={org.country?.name || countries.find(c => c.id === org.countryId)?.name} />
                  <InfoRow label={a.cityLabel} value={org.city?.name || cities.find(c => c.id === org.cityId)?.name} />
                  <InfoRow label={a.districtLabel} value={org.district?.name || districts.find(d => d.id === org.districtId)?.name} />
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
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.currencyLabel}</label>
                  <Select
                    value={form.currency || 'TRY'}
                    onValueChange={(val) => setForm({ ...form, currency: val as 'TRY' | 'EUR' | 'USD' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY (₺)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow label={a.legalNameLabel} value={org.legalName} icon={FileText} />
                <InfoRow label={a.taxNumberLabel} value={org.taxNumber} icon={Hash} />
                <InfoRow label={a.taxOfficeLabel} value={org.taxOffice} icon={Landmark} />
                <InfoRow label={a.agencyCommissionRateLabel} value={org.agencyCommissionRate != null ? `%${org.agencyCommissionRate}` : null} />
                <InfoRow label={a.currencyLabel} value={org.currency ? `${org.currency} (${getCurrencySymbol(org.currency)})` : 'TRY (₺)'} />
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={status === 'active'}
                      onClick={() => setStatusUpdateTarget('active')}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {a.approve}
                    </Button>
                  </span>
                </TooltipTrigger>
                {status === 'active' && <TooltipContent>{t.tooltips.alreadyActive}</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={status === 'suspended'}
                      onClick={() => setStatusUpdateTarget('suspended')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {a.suspend}
                    </Button>
                  </span>
                </TooltipTrigger>
                {status === 'suspended' && <TooltipContent>{t.tooltips.alreadySuspended}</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={status === 'pending'}
                      onClick={() => setStatusUpdateTarget('pending')}
                      className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      {a.setPending}
                    </Button>
                  </span>
                </TooltipTrigger>
                {status === 'pending' && <TooltipContent>{t.tooltips.alreadyPending}</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    {hasLocation ? (
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
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        <Globe className="h-4 w-4 mr-1" />
                        {a.viewOnMap}
                      </Button>
                    )}
                  </span>
                </TooltipTrigger>
                {!hasLocation && <TooltipContent>{t.tooltips.noLocation}</TooltipContent>}
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>

        </TabsContent>

        {/* ==================== MENU TAB ==================== */}
        <TabsContent value="menu">
          <MenuTab orgId={id} />
        </TabsContent>

        {/* ==================== RESOURCES TAB ==================== */}
        <TabsContent value="resources">
          <ResourcesTab orgId={id} />
        </TabsContent>
      </Tabs>

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

      {/* Delete Photo Confirmation */}
      <ConfirmDialog
        open={deletePhotoId !== null}
        onOpenChange={() => setDeletePhotoId(null)}
        title={a.deletePhotoTitle || 'Fotoğrafı Sil'}
        description={a.deletePhotoDesc || 'Bu fotoğrafı silmek istediğinize emin misiniz?'}
        onConfirm={() => deletePhotoId && deletePhotoMutation.mutate(deletePhotoId)}
        variant="destructive"
        confirmLabel={deletePhotoMutation.isPending ? a.deleting : (a.deleteButton || 'Sil')}
      />

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={cropperType === 'cover' ? 16 / 9 : 1}
        title={cropperType === 'cover' ? (a.coverImage || 'Kapak Fotoğrafı') : (a.gallery || 'Galeri Fotoğrafı')}
        cropShape="rect"
      />
    </div>
  );
}

// ===================================================================
// PriceTypeBadge — matching restaurant/menu/page.tsx
// ===================================================================
function PriceTypeBadge({ priceType, t: tl }: { priceType: PriceType; t: ReturnType<typeof useLanguage>['t'] }) {
  const labelMap: Record<PriceType, string> = {
    fixed: tl.menu.fixed,
    per_person: tl.menu.perPerson,
    per_hour: tl.menu.perHour,
    per_day: tl.menu.perDay,
  };
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
      {labelMap[priceType] || priceType}
    </Badge>
  );
}

// ===================================================================
// Menu Preview Components — matching restaurant/menu/page.tsx
// ===================================================================
function PreviewServiceList({ services, t: tl, onServiceClick }: { services: ClientStopMenuServiceDto[]; t: ReturnType<typeof useLanguage>['t']; onServiceClick?: (svc: ClientStopMenuServiceDto) => void }) {
  if (!services.length) return null;
  const priceLabel = (type: string) => {
    if (type === 'fixed') return '';
    if (type === 'per_person') return `/ ${tl.menu.perPerson}`;
    if (type === 'per_hour') return `/ ${tl.menu.perHour}`;
    if (type === 'per_day') return `/ ${tl.menu.perDay}`;
    return '';
  };
  return (
    <div className="space-y-1">
      {services.map((s) => (
        <div key={s.id} className="flex gap-3 p-2 rounded-lg hover:bg-white/60 transition-colors cursor-pointer" onClick={() => onServiceClick?.(s)}>
          {s.imageUrl ? (
            <img src={s.imageUrl} alt={s.title} className="w-14 h-14 rounded-md object-cover flex-shrink-0 shadow-sm" />
          ) : (
            <div className="w-14 h-14 rounded-md bg-stone-100 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-5 w-5 text-stone-300" />
            </div>
          )}
          <div className="flex-1 min-w-0 py-0.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-stone-800 leading-tight truncate hover:text-orange-700 transition-colors" title={s.title}>{s.title}</p>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-emerald-700">{Number(s.basePrice).toFixed(2)} {getCurrencySymbol(s.currency)}</p>
                {s.priceType !== 'fixed' && <p className="text-[10px] text-stone-400">{priceLabel(s.priceType)}</p>}
              </div>
            </div>
            {s.description && <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-snug">{s.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewCategoryItem({ cat, depth, t: tl, onServiceClick }: { cat: ClientStopMenuCategoryDto; depth: number; t: ReturnType<typeof useLanguage>['t']; onServiceClick?: (svc: ClientStopMenuServiceDto) => void }) {
  const [open, setOpen] = useState(depth === 0);
  const hasServices = cat.services?.length > 0;
  const hasChildren = cat.child_service_categories?.length > 0;
  if (!hasServices && !hasChildren) return null;
  return (
    <div>
      {depth === 0 ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="w-full bg-gradient-to-r from-stone-800 to-stone-700 px-4 py-3 rounded-xl mb-3 flex items-center justify-between cursor-pointer">
          <h3 className="text-lg font-bold text-white">{cat.name}</h3>
          <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen((v) => !v)} className="w-full px-4 py-2 mb-2 flex items-center justify-between cursor-pointer">
          <h4 className="text-sm font-semibold text-stone-600 border-b border-stone-200 pb-1 flex-1 text-left">{cat.name}</h4>
          <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform ml-2 ${open ? '' : '-rotate-90'}`} />
        </button>
      )}
      {open && (
        <>
          {hasServices && <PreviewServiceList services={cat.services} t={tl} onServiceClick={onServiceClick} />}
          {hasChildren && <PreviewCategoryTree categories={cat.child_service_categories} depth={depth + 1} t={tl} onServiceClick={onServiceClick} />}
        </>
      )}
    </div>
  );
}

function PreviewCategoryTree({ categories: cats, depth, t: tl, onServiceClick }: { categories: ClientStopMenuCategoryDto[]; depth: number; t: ReturnType<typeof useLanguage>['t']; onServiceClick?: (svc: ClientStopMenuServiceDto) => void }) {
  return <>{cats.map((cat) => <PreviewCategoryItem key={cat.id} cat={cat} depth={depth} t={tl} onServiceClick={onServiceClick} />)}</>;
}

// ===================================================================
// CategoryTreeItem — matching restaurant/menu/page.tsx
// ===================================================================
function AdminCategoryTreeItem({
  cat, depth, selectedCategory, setSelectedCategory, expandedCategories, setExpandedCategories,
  draggedId, setDraggedId, dragOverId, setDragOverId, handleCategoryReorder,
}: {
  cat: ClientStopMenuCategoryDto; depth: number;
  selectedCategory: ClientStopMenuCategoryDto | null; setSelectedCategory: (c: ClientStopMenuCategoryDto) => void;
  expandedCategories: Set<number>; setExpandedCategories: React.Dispatch<React.SetStateAction<Set<number>>>;
  draggedId: number | null; setDraggedId: (id: number | null) => void;
  dragOverId: number | null; setDragOverId: (id: number | null) => void;
  handleCategoryReorder: (fromId: number, toId: number) => void;
}) {
  const isSelected = selectedCategory?.id === cat.id;
  const isDragging = draggedId === cat.id;
  const isDragOver = dragOverId === cat.id;
  const children = cat.child_service_categories || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedCategories.has(cat.id);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat.id)) next.delete(cat.id);
      else next.add(cat.id);
      return next;
    });
  };

  return (
    <>
      <div
        draggable
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(cat.id)); e.dataTransfer.effectAllowed = 'move'; setDraggedId(cat.id); }}
        onDragEnd={() => setDraggedId(null)}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(cat.id); }}
        onDragLeave={() => setDragOverId(null)}
        onDrop={(e) => { e.preventDefault(); setDragOverId(null); const fromId = parseInt(e.dataTransfer.getData('text/plain')); if (fromId && fromId !== cat.id) handleCategoryReorder(fromId, cat.id); }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-slate-50 border border-transparent'} ${isDragging ? 'opacity-40' : ''} ${isDragOver ? 'border-b-2 !border-primary bg-primary/5' : ''}`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => setSelectedCategory(cat)}
      >
        <div className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-slate-200 rounded flex-shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <GripVertical className="h-3.5 w-3.5 text-slate-300" />
        </div>
        {hasChildren ? (
          <button className="p-0.5 hover:bg-slate-200 rounded flex-shrink-0" onClick={toggleExpand}>
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          </button>
        ) : (
          <div className="w-5 flex-shrink-0" />
        )}
        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${depth > 0 ? 'bg-primary/10' : 'bg-slate-100'}`}>
          <FolderTree className={`h-3 w-3 ${depth > 0 ? 'text-primary/50' : 'text-slate-400'}`} />
        </div>
        <span className="text-sm font-medium truncate flex-1">{cat.name}</span>
        {hasChildren && <span className="text-[10px] text-slate-400">{children.length}</span>}
      </div>
      {hasChildren && isExpanded && children.map((child) => (
        <AdminCategoryTreeItem
          key={child.id} cat={child} depth={depth + 1}
          selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
          expandedCategories={expandedCategories} setExpandedCategories={setExpandedCategories}
          draggedId={draggedId} setDraggedId={setDraggedId}
          dragOverId={dragOverId} setDragOverId={setDragOverId}
          handleCategoryReorder={handleCategoryReorder}
        />
      ))}
    </>
  );
}

// ===================================================================
// MENU TAB — Mirrors restaurant/menu/page.tsx with admin API
// ===================================================================

interface AdminCategoryFormData {
  name: string;
  displayOrder: number;
  parentId?: number;
}

interface AdminServiceFormData {
  title: string;
  description: string;
  basePrice: number;
  priceType: PriceType;
  serviceCategoryId: number;
}

const adminInitialCategoryForm: AdminCategoryFormData = { name: '', displayOrder: 0 };
const adminInitialServiceForm: AdminServiceFormData = { title: '', description: '', basePrice: 0, priceType: 'fixed', serviceCategoryId: 0 };

const ADMIN_PRICE_TYPE_OPTIONS: { value: PriceType; labelKey: 'fixed' | 'perPerson' | 'perHour' | 'perDay' }[] = [
  { value: 'fixed', labelKey: 'fixed' },
  { value: 'per_person', labelKey: 'perPerson' },
  { value: 'per_hour', labelKey: 'perHour' },
  { value: 'per_day', labelKey: 'perDay' },
];

function AdminPriceTypeBadge({ priceType, t }: { priceType: PriceType; t: ReturnType<typeof useLanguage>['t'] }) {
  const labelMap: Record<PriceType, string> = {
    fixed: t.menu.fixed,
    per_person: t.menu.perPerson,
    per_hour: t.menu.perHour,
    per_day: t.menu.perDay,
  };
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
      {labelMap[priceType] || priceType}
    </Badge>
  );
}

function MenuTab({ orgId }: { orgId: number }) {
  const queryClient = useQueryClient();
  const { t, locale } = useLanguage();

  // State
  const [selectedCategory, setSelectedCategory] = useState<ClientStopMenuCategoryDto | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClientStopMenuCategoryDto | null>(null);
  const [editingService, setEditingService] = useState<ClientStopMenuServiceDto | null>(null);
  const [categoryForm, setCategoryForm] = useState<AdminCategoryFormData>(adminInitialCategoryForm);
  const [serviceForm, setServiceForm] = useState<AdminServiceFormData>(adminInitialServiceForm);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'service'; id: number; name: string } | null>(null);

  // Service image states
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [serviceImagePreview, setServiceImagePreview] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLang, setPreviewLang] = useState<'tr' | 'en' | 'de'>('tr');
  const [detailService, setDetailService] = useState<ClientStopMenuServiceDto | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState('');
  const serviceFileInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  // ===== Queries — flat APIs, build tree on frontend =====
  const {
    data: catResult,
    isLoading: catLoading,
    error: catError,
    refetch: refetchCats,
  } = useQuery({
    queryKey: ['admin-org-service-categories', orgId],
    queryFn: () => adminApi.getOrgServiceCategories(orgId),
  });

  const {
    data: svcResult,
    isLoading: svcLoading,
    refetch: refetchSvcs,
  } = useQuery({
    queryKey: ['admin-org-services', orgId],
    queryFn: () => adminApi.getOrgServices(orgId),
  });

  const menuLoading = catLoading || svcLoading;
  const menuError = catError;
  const refetchMenu = () => { refetchCats(); refetchSvcs(); };

  // Build ServiceCategoryDto[] tree from flat result
  const rawCategories: ServiceCategoryDto[] = catResult?.success
    ? Array.isArray(catResult.data) ? catResult.data : (catResult.data as unknown as PaginatedResponse<ServiceCategoryDto>)?.data || []
    : [];

  const allServices: ServiceDto[] = svcResult?.success
    ? Array.isArray(svcResult.data) ? svcResult.data : (svcResult.data as unknown as PaginatedResponse<ServiceDto>)?.data || []
    : [];

  // Convert ServiceCategoryDto tree + flat services into ClientStopMenuCategoryDto tree
  const buildMenuTree = (cats: ServiceCategoryDto[], svcs: ServiceDto[]): ClientStopMenuCategoryDto[] => {
    return cats.map((cat) => ({
      id: cat.id,
      name: cat.name,
      displayOrder: cat.displayOrder,
      imageUrl: cat.imageUrl || null,
      services: svcs
        .filter((s) => s.serviceCategoryId === cat.id)
        .map((s) => ({
          id: s.id,
          title: s.title,
          subTitle: null,
          description: s.description || null,
          contentsDescription: null,
          basePrice: s.basePrice,
          priceType: s.priceType,
          imageUrl: (s as ServiceDto & { imageUrl?: string }).imageUrl || null,
          serviceCategoryId: s.serviceCategoryId,
        })),
      child_service_categories: cat.child_service_categories
        ? buildMenuTree(cat.child_service_categories, svcs)
        : [],
    }));
  };

  const categories = rawCategories.length ? buildMenuTree(rawCategories, allServices) : undefined;

  // Helper: find services for a given category id in the menu tree
  const findServicesInTree = (categoryId: number, tree: ClientStopMenuCategoryDto[]): ClientStopMenuServiceDto[] => {
    for (const cat of tree) {
      if (cat.id === categoryId) return cat.services || [];
      const found = findServicesInTree(categoryId, cat.child_service_categories || []);
      if (found.length) return found;
    }
    return [];
  };

  const services = selectedCategory && categories
    ? findServicesInTree(selectedCategory.id, categories)
    : [];

  // Preview uses same data (no separate language endpoint available on admin)
  const previewMenu = categories;

  // ===== Category Mutations =====
  const createCategoryMutation = useMutation({
    mutationFn: async ({ data }: { data: CreateServiceCategoryDto }) => {
      const res = await adminApi.createOrgServiceCategory(orgId, data);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-service-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin-org-services', orgId] });
      toast.success(`${t.menu.categories} ${t.menu.created}`);
      if (variables.data.parentId) {
        setExpandedCategories((prev) => new Set([...prev, variables.data.parentId!]));
      }
      closeCategoryForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateServiceCategoryDto }) => {
      const res = await adminApi.updateOrgServiceCategory(orgId, id, data);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-service-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin-org-services', orgId] });
      toast.success(`${t.menu.categories} ${t.menu.updated}`);
      closeCategoryForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await adminApi.deleteOrgServiceCategory(orgId, id);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-service-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin-org-services', orgId] });
      toast.success(`${t.menu.categories} ${t.menu.deleted}`);
      if (selectedCategory && deleteTarget?.id === selectedCategory.id) {
        setSelectedCategory(null);
      }
      setDeleteTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ===== Service Mutations =====
  const createServiceMutation = useMutation({
    mutationFn: async ({ data, image }: { data: CreateServiceDto; image?: File }) => {
      const res = await adminApi.createOrgService(orgId, data, image);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-service-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin-org-services', orgId] });
      toast.success(`${t.menu.services} ${t.menu.created}`);
      closeServiceForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data, image }: { id: number; data: UpdateServiceDto; image?: File }) => {
      const res = await adminApi.updateOrgService(orgId, id, data, image);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-service-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin-org-services', orgId] });
      toast.success(`${t.menu.services} ${t.menu.updated}`);
      closeServiceForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await adminApi.deleteOrgService(orgId, id);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-service-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin-org-services', orgId] });
      toast.success(`${t.menu.services} ${t.menu.deleted}`);
      setDeleteTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ===== Category Form Handlers =====
  const openCreateCategoryForm = (parentId?: number) => {
    setEditingCategory(null);
    setCategoryForm({ ...adminInitialCategoryForm, parentId });
    setIsCategoryFormOpen(true);
  };

  const openEditCategoryForm = (category: ClientStopMenuCategoryDto) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, displayOrder: category.displayOrder ?? 0 });
    setIsCategoryFormOpen(true);
  };

  const closeCategoryForm = () => {
    setIsCategoryFormOpen(false);
    setEditingCategory(null);
    setCategoryForm(adminInitialCategoryForm);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error(t.common.required);
      return;
    }
    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        data: { name: categoryForm.name, displayOrder: categoryForm.displayOrder },
      });
    } else {
      createCategoryMutation.mutate({
        data: { name: categoryForm.name, displayOrder: categoryForm.displayOrder, parentId: categoryForm.parentId },
      });
    }
  };

  // ===== Service Form Handlers =====
  const openCreateServiceForm = () => {
    if (!selectedCategory) return;
    setEditingService(null);
    setServiceForm({ ...adminInitialServiceForm, serviceCategoryId: selectedCategory.id });
    setServiceImageFile(null);
    setServiceImagePreview(null);
    setIsServiceFormOpen(true);
  };

  const openEditServiceForm = (service: ClientStopMenuServiceDto) => {
    setEditingService(service);
    setServiceForm({
      title: service.title,
      description: service.description || '',
      basePrice: Number(service.basePrice),
      priceType: service.priceType as PriceType,
      serviceCategoryId: service.serviceCategoryId || selectedCategory?.id || 0,
    });
    setServiceImageFile(null);
    setServiceImagePreview(service.imageUrl || null);
    setIsServiceFormOpen(true);
  };

  const closeServiceForm = () => {
    setIsServiceFormOpen(false);
    setEditingService(null);
    setServiceForm(adminInitialServiceForm);
    setServiceImageFile(null);
    setServiceImagePreview(null);
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.title.trim()) {
      toast.error(`${t.menu.serviceTitle} ${t.common.required.toLowerCase()}`);
      return;
    }
    if (!serviceForm.basePrice) {
      toast.error(`${t.menu.basePrice} ${t.common.required.toLowerCase()}`);
      return;
    }
    if (editingService) {
      updateServiceMutation.mutate({
        id: editingService.id,
        data: {
          title: serviceForm.title,
          description: serviceForm.description || undefined,
          basePrice: serviceForm.basePrice,
          priceType: serviceForm.priceType,
          serviceCategoryId: serviceForm.serviceCategoryId,
        },
        image: serviceImageFile || undefined,
      });
    } else {
      createServiceMutation.mutate({
        data: {
          title: serviceForm.title,
          description: serviceForm.description || undefined,
          basePrice: serviceForm.basePrice,
          priceType: serviceForm.priceType,
          serviceCategoryId: serviceForm.serviceCategoryId,
        },
        image: serviceImageFile || undefined,
      });
    }
  };

  // ===== Delete Handler =====
  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'category') deleteCategoryMutation.mutate(deleteTarget.id);
    else deleteServiceMutation.mutate(deleteTarget.id);
  };

  // ===== Image Handlers =====
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropperSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = (blob: Blob) => {
    const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
    const previewUrl = URL.createObjectURL(blob);
    setServiceImageFile(file);
    setServiceImagePreview(previewUrl);
  };

  // ===== Drag & Drop Category Reorder =====
  const handleCategoryReorder = async (fromId: number, toId: number) => {
    if (!categories) return;
    const findSiblingList = (id: number): ClientStopMenuCategoryDto[] | null => {
      if (categories.some((c) => c.id === id)) return categories;
      for (const parent of categories) {
        if (parent.child_service_categories?.some((c) => c.id === id)) return parent.child_service_categories;
      }
      return null;
    };
    const fromList = findSiblingList(fromId);
    const toList = findSiblingList(toId);
    if (!fromList || !toList || fromList !== toList) return;
    const list = [...fromList];
    const fromIdx = list.findIndex((c) => c.id === fromId);
    const toIdx = list.findIndex((c) => c.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [dragged] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, dragged);
    try {
      const updates = list
        .map((cat, i) => ({ id: cat.id, newOrder: i, oldOrder: cat.displayOrder ?? 0 }))
        .filter(({ newOrder, oldOrder }) => newOrder !== oldOrder);
      await Promise.all(
        updates.map(({ id, newOrder }) =>
          adminApi.updateOrgServiceCategory(orgId, id, { displayOrder: newOrder })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['admin-org-service-categories', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin-org-services', orgId] });
    } catch {
      toast.error(t.common.error);
    }
  };

  // Helper: find category by id in tree
  const findCategoryInTree = (id: number, list?: ClientStopMenuCategoryDto[]): ClientStopMenuCategoryDto | null => {
    for (const cat of list || []) {
      if (cat.id === id) return cat;
      const found = findCategoryInTree(id, cat.child_service_categories);
      if (found) return found;
    }
    return null;
  };

  const currentCategory = selectedCategory && categories
    ? findCategoryInTree(selectedCategory.id, categories) || null
    : null;

  const isCategoryPending = createCategoryMutation.isPending || updateCategoryMutation.isPending;
  const isServicePending = createServiceMutation.isPending || updateServiceMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Preview Button */}
      <div className="flex justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="outline" onClick={() => setIsPreviewOpen(true)} disabled={!categories?.length}>
                <Eye className="h-4 w-4 mr-2" />
                {t.menu.preview}
              </Button>
            </span>
          </TooltipTrigger>
          {!categories?.length && <TooltipContent>{t.tooltips.noCategoriesYet}</TooltipContent>}
        </Tooltip>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 h-full">
        {/* Left Panel: Category Tree */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-medium">{t.menu.categories}</CardTitle>
            <Button size="sm" onClick={() => openCreateCategoryForm()}>
              <Plus className="h-4 w-4 mr-1" />
              {t.common.create}
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {menuLoading ? (
              <LoadingState message={t.common.loading} />
            ) : menuError ? (
              <ErrorState onRetry={() => refetchMenu()} />
            ) : !categories?.length ? (
              <EmptyState
                icon={FolderTree}
                title={t.menu.noCategories}
                description={t.menu.noCategories}
                actionLabel={t.menu.newCategory}
                onAction={() => openCreateCategoryForm()}
              />
            ) : (
              <div className="space-y-0.5">
                {categories.map((cat) => (
                  <AdminCategoryTreeItem
                    key={cat.id}
                    cat={cat}
                    depth={0}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    expandedCategories={expandedCategories}
                    setExpandedCategories={setExpandedCategories}
                    draggedId={draggedId}
                    setDraggedId={setDraggedId}
                    dragOverId={dragOverId}
                    setDragOverId={setDragOverId}
                    handleCategoryReorder={handleCategoryReorder}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Selected Category Details + Services */}
        <Card className="lg:col-span-2 flex flex-col">
          {!currentCategory ? (
            <CardContent className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={FolderTree}
                title={t.menu.selectCategory}
                description={t.menu.selectCategory}
              />
            </CardContent>
          ) : (
            <>
              {/* Category Header */}
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-medium">
                      {currentCategory.name}
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-1">
                      {services?.length || 0} {t.menu.services.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={openCreateServiceForm}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t.menu.newService}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => openCreateCategoryForm(currentCategory.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Alt Kategori
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditCategoryForm(currentCategory)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setDeleteTarget({
                          type: 'category',
                          id: currentCategory.id,
                          name: currentCategory.name,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Services Section */}
              <CardContent className="flex-1 overflow-auto">
                {!services?.length ? (
                  <EmptyState
                    icon={FolderTree}
                    title={t.menu.noServices}
                    description={t.menu.noServices}
                    actionLabel={t.menu.newService}
                    onAction={openCreateServiceForm}
                  />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {services.map((service) => (
                      <Card key={service.id} className="overflow-hidden">
                        <div className="flex p-3 gap-3">
                          <div className="w-20 h-20 bg-slate-100 flex-shrink-0 rounded-lg overflow-hidden">
                            {service.imageUrl ? (
                              <img
                                src={service.imageUrl}
                                alt={service.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <ImageIcon className="h-8 w-8 text-slate-300" />
                              </div>
                            )}
                          </div>
                          <CardContent className="flex-1 p-0 overflow-hidden">
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm truncate" title={service.title}>{service.title}</h4>
                                {service.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                    {service.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-sm font-semibold text-primary">
                                    {Number(service.basePrice).toFixed(2)} {getCurrencySymbol(service.currency)}
                                  </span>
                                  <AdminPriceTypeBadge priceType={service.priceType as PriceType} t={t} />
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => openEditServiceForm(service)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'service',
                                      id: service.id,
                                      name: service.title,
                                    })
                                  }
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Category Form Dialog */}
      <Dialog open={isCategoryFormOpen} onOpenChange={() => closeCategoryForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? t.menu.editCategory
                : categoryForm.parentId
                ? 'Yeni Alt Kategori'
                : t.menu.newCategory}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit}>
            <div className="space-y-4 py-4">
              {categoryForm.parentId && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-500">Üst Kategori</p>
                  <p className="text-sm font-medium text-primary">
                    {findCategoryInTree(categoryForm.parentId, categories ?? [])?.name}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="categoryName">
                  {categoryForm.parentId ? 'Alt Kategori Adı' : t.menu.categoryName} *
                </Label>
                <Input
                  id="categoryName"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={categoryForm.parentId ? 'Örn: Izgaralar, Çorbalar...' : 'Örn: Ana Yemekler, Tatlılar, İçecekler...'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayOrder">{t.menu.displayOrder}</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min={0}
                  value={categoryForm.displayOrder || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      displayOrder: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCategoryForm}>
                {t.common.cancel}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button type="submit" disabled={isCategoryPending}>
                      {isCategoryPending
                        ? t.common.loading
                        : editingCategory
                        ? t.common.update
                        : t.common.create}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isCategoryPending && <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>}
              </Tooltip>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Service Form Dialog */}
      <Dialog open={isServiceFormOpen} onOpenChange={() => closeServiceForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingService ? t.menu.editService : t.menu.newService}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleServiceSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="serviceTitle">{t.menu.serviceTitle} *</Label>
                <Input
                  id="serviceTitle"
                  value={serviceForm.title}
                  onChange={(e) =>
                    setServiceForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder={t.menu.serviceTitle}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="serviceDesc">{t.menu.serviceContentsDescription}</Label>
                  <div className="relative group">
                    <span className="text-amber-500 cursor-help font-bold text-sm">*</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-normal w-64 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
                      {t.menu.serviceContentsDescriptionTooltip}
                    </div>
                  </div>
                </div>
                <Textarea
                  id="serviceDesc"
                  value={serviceForm.description}
                  onChange={(e) =>
                    setServiceForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder={t.menu.serviceContentsDescription}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">{t.menu.basePrice} *</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={serviceForm.basePrice || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setServiceForm((prev) => ({
                        ...prev,
                        basePrice: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.menu.priceType} *</Label>
                  <Select
                    value={serviceForm.priceType}
                    onValueChange={(v) =>
                      setServiceForm((prev) => ({ ...prev, priceType: v as PriceType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_PRICE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t.menu[opt.labelKey]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>{t.menu.uploadImage}</Label>
                <input
                  ref={serviceFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {serviceImagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={serviceImagePreview}
                      alt="Preview"
                      className="w-32 h-20 rounded-lg object-cover"
                    />
                    <div className="absolute top-1 right-1 flex gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => serviceFileInputRef.current?.click()}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setServiceImageFile(null);
                          setServiceImagePreview(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => serviceFileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t.menu.uploadImage}
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeServiceForm}>
                {t.common.cancel}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button type="submit" disabled={isServicePending}>
                      {isServicePending
                        ? t.common.loading
                        : editingService
                        ? t.common.update
                        : t.common.create}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isServicePending && <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>}
              </Tooltip>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Dialog */}
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`${t.common.delete} ${
          deleteTarget?.type === 'category' ? t.menu.categories : t.menu.services
        }`}
        description={`"${deleteTarget?.name}" ${t.menu.deleteConfirm}`}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        variant="destructive"
      />

      {/* Menu Preview Dialog — Phone mockup */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-transparent border-0 shadow-none [&>button]:hidden">
          <div className="mx-auto w-[375px] bg-stone-50 rounded-[2rem] shadow-2xl border-[6px] border-stone-800 overflow-hidden relative">
            <div className="bg-stone-800 flex items-center justify-center py-1">
              <div className="w-20 h-5 bg-stone-900 rounded-b-xl" />
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="bg-gradient-to-br from-stone-800 to-stone-900 px-5 pt-6 pb-5 text-center">
                <p className="text-[10px] uppercase tracking-[3px] text-stone-400 mb-1">{t.menu.preview}</p>
                <h2 className="text-xl font-bold text-white">{t.menu.menuPreview}</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-8 h-px bg-amber-500" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <div className="w-8 h-px bg-amber-500" />
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {(['tr', 'en', 'de'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setPreviewLang(lang)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        previewLang === lang
                          ? 'bg-amber-500 text-white'
                          : 'bg-white/10 text-stone-400 hover:bg-white/20'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-4 py-4 space-y-5">
                {previewMenu && previewMenu.length > 0 ? (
                  <PreviewCategoryTree categories={previewMenu} depth={0} t={t} onServiceClick={setDetailService} />
                ) : (
                  <div className="py-16 text-center">
                    <FolderTree className="h-10 w-10 text-stone-300 mx-auto mb-3" />
                    <p className="text-sm text-stone-400">{t.menu.noCategories}</p>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 text-center border-t border-stone-200 bg-white">
                <p className="text-[10px] text-stone-400">Powered by HerHafta</p>
              </div>
            </div>
            <div className="bg-stone-800 flex justify-center py-2">
              <div className="w-28 h-1 bg-stone-600 rounded-full" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Detail Popup */}
      <ServiceDetailDialog
        service={detailService}
        open={!!detailService}
        onOpenChange={(open) => { if (!open) setDetailService(null); }}
        t={t}
      />
    </div>
  );
}

// ===================================================================
// RESOURCES TAB — Mirrors restaurant/venue/page.tsx with admin API
// ===================================================================

// Icon mapping for resource types
const venueTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  floor: Layers,
  room: Square,
  table: Circle,
  chair: User,
  seat: User,
};

interface AdminVenueFormState {
  isOpen: boolean;
  editId: number | null;
  parentId: number | null;
  resourceTypeId: number | null;
  name: string;
  capacity: number;
  order: number;
  serviceStartAt: string;
  serviceEndAt: string;
  count: number;
}

const adminVenueInitialForm: AdminVenueFormState = {
  isOpen: false,
  editId: null,
  parentId: null,
  resourceTypeId: null,
  name: '',
  capacity: 4,
  order: 0,
  serviceStartAt: '09:00',
  serviceEndAt: '23:00',
  count: 1,
};

function ResourcesTab({ orgId }: { orgId: number }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<AdminVenueFormState>(adminVenueInitialForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [multipleCreating, setMultipleCreating] = useState(false);

  // Queries
  const { data: resourcesResult, isLoading: resLoading } = useQuery({
    queryKey: ['admin-org-resources', orgId],
    queryFn: () => adminApi.getOrgResources(orgId),
  });

  const { data: resourceTypesResult, isLoading: typesLoading } = useQuery({
    queryKey: ['admin-resource-types'],
    queryFn: () => adminApi.getResourceTypes(),
  });

  const allResources: ResourceDto[] = resourcesResult?.success
    ? Array.isArray(resourcesResult.data) ? resourcesResult.data : (resourcesResult.data as unknown as PaginatedResponse<ResourceDto>)?.data || []
    : [];

  const resourceTypes: ResourceTypeDto[] = resourceTypesResult?.success
    ? Array.isArray(resourceTypesResult.data) ? resourceTypesResult.data : (resourceTypesResult.data as unknown as PaginatedResponse<ResourceTypeDto>)?.data || []
    : [];

  // Flatten nested tree from API into flat list with parentId + resourceTypeId
  const normalizedResources = useMemo(() => {
    const flat: ResourceDto[] = [];
    const walk = (items: ResourceDto[], parentId: number | null) => {
      for (const r of items) {
        flat.push({
          ...r,
          resourceTypeId: r.resourceTypeId || r.resourceType?.id || 0,
          parentId: parentId,
          children: undefined, // remove nested children to avoid confusion
        });
        if (r.children?.length) {
          walk(r.children, r.id);
        }
      }
    };
    walk(allResources, null);
    return flat;
  }, [allResources]);

  // Build childrenCache from flat list for LayoutEditor
  const childrenCache = useMemo(() => {
    const cache: Record<number, ResourceDto[]> = {};
    for (const r of normalizedResources) {
      if (r.parentId !== null) {
        if (!cache[r.parentId]) cache[r.parentId] = [];
        cache[r.parentId].push(r);
      }
    }
    return cache;
  }, [normalizedResources]);

  // Admin API adapter for LayoutEditor — use /resources/layout API for reading (includes width/height/coordinates)
  const adminApiAdapter = useMemo<LayoutApiAdapter>(() => ({
    getLayout: async (parentId: number) => resourceApi.getLayout(parentId, orgId),
    getChildren: async (parentId: number) => resourceApi.getChildren(parentId),
    create: (data) => adminApi.createOrgResource(orgId, data),
    update: (id, data) => adminApi.updateOrgResource(orgId, id, data),
    delete: (id) => adminApi.deleteOrgResource(orgId, id),
  }), [orgId]);

  const refetchResources = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-org-resources', orgId] });
  }, [queryClient, orgId]);

  // Build tree from flat list
  const rootResources = normalizedResources.filter((r) => r.parentId === null);
  const sortedRoots = [...rootResources].sort((a, b) => b.order - a.order);
  const getChildren = (parentId: number): ResourceDto[] =>
    normalizedResources.filter((r) => r.parentId === parentId);

  const getTypeById = (typeId: number): ResourceTypeDto | undefined =>
    resourceTypes.find((t) => t.id === typeId);

  const getChildType = (parentTypeId: number): ResourceTypeDto | undefined => {
    const parentType = getTypeById(parentTypeId);
    // Prefer children array from API (resolve by id from main list), fallback to deprecated childId
    if (parentType?.children?.length) {
      const childId = parentType.children[0].id;
      return getTypeById(childId) || parentType.children[0];
    }
    if (parentType?.childId) return getTypeById(parentType.childId);
    return undefined;
  };

  const rootType = resourceTypes.find((t) => t.order === 1);

  // Stats
  const floors = rootResources;
  const rooms = normalizedResources.filter((r) => {
    const type = r.resourceType || getTypeById(r.resourceTypeId);
    return type?.code === 'room';
  });
  const tables = normalizedResources.filter((r) => {
    const type = r.resourceType || getTypeById(r.resourceTypeId);
    return type?.code === 'table';
  });
  const totalCapacity = floors.reduce((acc, f) => acc + f.capacity, 0);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateResourceDto) => adminApi.createOrgResource(orgId, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-org-resources', orgId] });
        toast.success(t.venue.resourceCreated);
        closeForm();
      } else {
        toast.error(result.error || t.venue.createError);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateResourceDto }) =>
      adminApi.updateOrgResource(orgId, id, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-org-resources', orgId] });
        toast.success(t.venue.resourceUpdated);
        closeForm();
      } else {
        toast.error(result.error || t.venue.updateError);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteOrgResource(orgId, id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-org-resources', orgId] });
        toast.success(t.venue.resourceDeleted);
        setDeleteTarget(null);
      } else {
        toast.error(result.error || t.venue.deleteError);
      }
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      adminApi.updateOrgResource(orgId, id, { active }),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-org-resources', orgId] });
        toast.success(result.data?.active ? t.venue.resourceActivated : t.venue.resourceDeactivated);
      }
    },
  });

  const toggleExpand = (id: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateForm = (parentId: number | null, resourceTypeId: number) => {
    const type = getTypeById(resourceTypeId);
    // Tables always default to 4-person (matching visual editor), others use defaultCapacity
    const isTable = type?.code === 'table';
    setForm({
      isOpen: true,
      editId: null,
      parentId,
      resourceTypeId,
      name: '',
      capacity: isTable ? 4 : (type?.defaultCapacity || 4),
      order: 0,
      serviceStartAt: '09:00',
      serviceEndAt: '23:00',
      count: type?.code === 'chair' || type?.code === 'seat' ? 4 : 1,
    });
  };

  const openEditForm = (resource: ResourceDto) => {
    setForm({
      isOpen: true,
      editId: resource.id,
      parentId: resource.parentId,
      resourceTypeId: resource.resourceTypeId,
      name: resource.name,
      capacity: resource.capacity,
      order: resource.order,
      serviceStartAt: resource.serviceStartAt || '09:00',
      serviceEndAt: resource.serviceEndAt || '23:00',
      count: 1,
    });
  };

  const closeForm = () => setForm(adminVenueInitialForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = form.resourceTypeId ? getTypeById(form.resourceTypeId) : null;
    const isChair = type?.code === 'chair' || type?.code === 'seat';

    if (!isChair && !form.name.trim()) {
      toast.error(t.venue.nameRequired);
      return;
    }
    if (!form.resourceTypeId) {
      toast.error(t.venue.selectResourceType);
      return;
    }

    const baseData: CreateResourceDto = {
      name: form.name,
      resourceTypeId: form.resourceTypeId,
      parentId: form.parentId,
      capacity: form.capacity,
      order: form.order,
      serviceStartAt: form.serviceStartAt,
      serviceEndAt: form.serviceEndAt,
    };

    if (form.editId) {
      updateMutation.mutate({
        id: form.editId,
        data: {
          name: form.name,
          capacity: form.capacity,
          order: form.order,
          serviceStartAt: form.serviceStartAt,
          serviceEndAt: form.serviceEndAt,
        },
      });
    } else if (isChair && form.count > 1) {
      const baseName = form.name.trim() || t.venue.chair;
      setMultipleCreating(true);
      try {
        for (let i = 1; i <= form.count; i++) {
          await adminApi.createOrgResource(orgId, { ...baseData, name: `${baseName} ${i}`, order: i });
        }
        queryClient.invalidateQueries({ queryKey: ['admin-org-resources', orgId] });
        toast.success(`${form.count} ${t.venue.chair.toLowerCase()} ${t.venue.resourceCreated.toLowerCase()}`);
        closeForm();
      } catch {
        toast.error(t.venue.chairCreateError);
      } finally {
        setMultipleCreating(false);
      }
    } else if (type?.code === 'table') {
      setMultipleCreating(true);
      try {
        const tableResult = await adminApi.createOrgResource(orgId, baseData);
        if (tableResult.success && tableResult.data) {
          const chairType = resourceTypes.find((t) => t.code === 'chair' || t.code === 'seat');
          if (chairType) {
            const cap = form.capacity || 4;
            // Find max seat number across all tables
            let maxSeatNum = 0;
            const findMaxSeat = (nodes: ResourceDto[]) => {
              for (const node of nodes) {
                if (node.resourceType?.code === 'seat' || node.resourceType?.code === 'chair') {
                  const num = parseInt(node.name, 10);
                  if (!isNaN(num) && num > maxSeatNum) maxSeatNum = num;
                }
                if (node.children?.length) findMaxSeat(node.children);
              }
            };
            findMaxSeat(allResources);
            let chairsCreated = 0;
            for (let i = 1; i <= cap; i++) {
              try {
                await adminApi.createOrgResource(orgId, {
                  name: `${maxSeatNum + i}`,
                  resourceTypeId: chairType.id,
                  parentId: tableResult.data.id,
                  capacity: 1,
                  order: i,
                });
                chairsCreated++;
              } catch { /* skip failed chair */ }
            }
            toast.success(`${t.venue.table} + ${chairsCreated} ${t.venue.chair.toLowerCase()} ${t.venue.resourceCreated.toLowerCase()}`);
          } else {
            toast.success(t.venue.resourceCreated);
          }
          queryClient.invalidateQueries({ queryKey: ['admin-org-resources', orgId] });
          closeForm();
        } else {
          toast.error(tableResult.error || t.venue.tableCreateError);
        }
      } catch {
        toast.error(t.venue.tableCreateErrorGeneral);
      } finally {
        setMultipleCreating(false);
      }
    } else {
      createMutation.mutate(baseData);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    // Delete all children first (e.g. chairs before table)
    const children = getChildren(deleteTarget.id);
    for (const child of children) {
      try { await adminApi.deleteOrgResource(orgId, child.id); } catch { /* ignore */ }
    }
    deleteMutation.mutate(deleteTarget.id);
  };

  const isPending = createMutation.isPending || updateMutation.isPending || multipleCreating;

  // Recursive tree item
  const ResourceTreeItem = ({ resource, depth = 0 }: { resource: ResourceDto; depth?: number }) => {
    const type = resource.resourceType || getTypeById(resource.resourceTypeId);
    const childType = type ? getChildType(type.id) : undefined;
    const children = getChildren(resource.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedItems.has(resource.id);
    const Icon = type ? venueTypeIcons[type.code] || Layers : Layers;

    return (
      <div className={depth > 0 ? 'ml-4' : ''}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(resource.id)}>
          <div className={`border rounded-lg ${!resource.active ? 'opacity-50 bg-slate-50' : ''}`}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-2">
                  {type?.allowsChildren ? (
                    isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />
                  ) : (
                    <div className="w-4" />
                  )}
                  <Icon className="h-5 w-5 text-indigo-500" />
                  <span className="font-medium">{resource.name}</span>
                  <Badge variant="outline" className="text-xs">{type?.name || '-'}</Badge>
                  {type?.code === 'floor' && (
                    <span className="text-sm text-slate-400">({t.venue.floorLabel} {resource.order})</span>
                  )}
                  {resource.capacity > 1 && (
                    <span className="text-sm text-slate-400">({resource.capacity} {t.venue.people})</span>
                  )}
                  {!resource.active && (
                    <Badge variant="secondary" className="text-xs">{t.team.inactive}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {childType && (
                    <Button variant="ghost" size="sm" onClick={() => openCreateForm(resource.id, childType.id)}>
                      <Plus className="h-4 w-4 mr-1" />
                      {childType.name}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive.mutate({ id: resource.id, active: !resource.active })}
                    title={resource.active ? t.venue.deactivate : t.venue.activate}
                  >
                    {resource.active ? <PowerOff className="h-4 w-4 text-orange-500" /> : <Power className="h-4 w-4 text-green-500" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEditForm(resource)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: resource.id, name: resource.name })}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CollapsibleTrigger>
            {type?.allowsChildren && (
              <CollapsibleContent className="overflow-visible">
                <div
                  className="border-t bg-slate-50/50 p-2 space-y-2"
                  style={{
                    maxHeight: type?.code === 'table' ? '200px' : type?.code === 'room' ? '400px' : '500px',
                    overflowY: 'auto',
                  }}
                >
                  {hasChildren ? (
                    children.map((child) => <ResourceTreeItem key={child.id} resource={child} depth={depth + 1} />)
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">
                      {t.venue.noChildResources} {childType?.name?.toLowerCase() || ''} {t.venue.noChildResourcesSuffix}
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            )}
          </div>
        </Collapsible>
      </div>
    );
  };

  if (resLoading || typesLoading) return <LoadingState message={t.common.loading} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t.venue.title}</h3>
          <p className="text-sm text-slate-500">{t.venue.description}</p>
        </div>
        {rootType ? (
          <Button onClick={() => openCreateForm(null, rootType.id)}>
            <Plus className="h-4 w-4 mr-2" />
            {t.venue.addNew} {rootType.name}
          </Button>
        ) : (
          <Button variant="outline" disabled>
            <Plus className="h-4 w-4 mr-2" />
            {t.venue.selectResourceType}
          </Button>
        )}
      </div>

      {normalizedResources.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-6">
                <Building2 className="h-10 w-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">{t.venue.createSeatingTitle}</h2>
              <p className="text-slate-500 mb-6 leading-relaxed">{t.venue.createSeatingDesc}</p>
              <div className="grid grid-cols-3 gap-4 mb-8 w-full">
                <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                  <Layers className="h-6 w-6 text-indigo-500 mb-2" />
                  <span className="text-sm font-medium text-slate-700">{t.venue.addFloorStep}</span>
                  <span className="text-xs text-slate-400 mt-1">{t.venue.addFloorStepDesc}</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                  <Square className="h-6 w-6 text-blue-500 mb-2" />
                  <span className="text-sm font-medium text-slate-700">{t.venue.addRoomStep}</span>
                  <span className="text-xs text-slate-400 mt-1">{t.venue.addRoomStepDesc}</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                  <Circle className="h-6 w-6 text-amber-500 mb-2" />
                  <span className="text-sm font-medium text-slate-700">{t.venue.addTableStep}</span>
                  <span className="text-xs text-slate-400 mt-1">{t.venue.addTableStepDesc}</span>
                </div>
              </div>
              {rootType && (
                <Button size="lg" onClick={() => openCreateForm(null, rootType.id)} className="gap-2">
                  <Plus className="h-5 w-5" />
                  {t.venue.startByAddingFloor}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.venue.totalFloors}</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{floors.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.venue.totalRooms}</CardTitle>
                <Square className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{rooms.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.venue.totalTables}</CardTitle>
                <Circle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{tables.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.venue.totalCapacity}</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalCapacity} {t.venue.people}</div></CardContent>
            </Card>
          </div>

          {/* Layout Editor — 2D visual floor planning */}
          <div className="mt-4">
            <LayoutEditor
              resources={sortedRoots}
              resourceTypes={resourceTypes}
              childrenCache={childrenCache}
              onResourceCreated={refetchResources}
              onResourceUpdated={refetchResources}
              onResourceDeleted={refetchResources}
              apiAdapter={adminApiAdapter}
            />
          </div>

          {/* Resource Tree */}
          <div className="space-y-2">
            {sortedRoots.map((res) => (
              <ResourceTreeItem key={res.id} resource={res} />
            ))}
          </div>
        </>
      )}

      {/* Form Dialog */}
      <Dialog open={form.isOpen} onOpenChange={() => closeForm()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.editId ? t.venue.editResource : t.venue.addNew}: {form.resourceTypeId && getTypeById(form.resourceTypeId)?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="resName">
                  {t.venue.nameLabel} {form.resourceTypeId && (getTypeById(form.resourceTypeId)?.code === 'chair' || getTypeById(form.resourceTypeId)?.code === 'seat') && !form.editId ? t.venue.optional : '*'}
                </Label>
                <Input
                  id="resName"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={(() => {
                    const code = form.resourceTypeId ? getTypeById(form.resourceTypeId)?.code : '';
                    switch (code) {
                      case 'floor': return t.venue.floorNameExample;
                      case 'room': return t.venue.roomNameExample;
                      case 'table': return t.venue.tableNameExample;
                      case 'chair': case 'seat': return t.venue.chairNameExample;
                      default: return '';
                    }
                  })()}
                />
              </div>

              {form.resourceTypeId && getTypeById(form.resourceTypeId)?.code === 'floor' && (
                <div className="space-y-2">
                  <Label htmlFor="floorOrder">{t.venue.floorNumber}</Label>
                  <Select
                    value={String(form.order)}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, order: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-2">-2. {t.venue.floorLabel} ({t.venue.basement})</SelectItem>
                      <SelectItem value="-1">-1. {t.venue.floorLabel} ({t.venue.basement})</SelectItem>
                      <SelectItem value="0">{t.venue.groundFloor}</SelectItem>
                      <SelectItem value="1">1. {t.venue.floorLabel}</SelectItem>
                      <SelectItem value="2">2. {t.venue.floorLabel}</SelectItem>
                      <SelectItem value="3">3. {t.venue.floorLabel}</SelectItem>
                      <SelectItem value="4">4. {t.venue.floorLabel}</SelectItem>
                      <SelectItem value="5">5. {t.venue.floorLabel}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Capacity — visual picker for tables, number input for others */}
              {form.resourceTypeId && getTypeById(form.resourceTypeId)?.code === 'table' ? (
                <div className="space-y-2">
                  <Label>{t.venue.personCount}</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {[2, 4, 6, 8].map((cap) => (
                      <TablePreview
                        key={cap}
                        capacity={cap}
                        selected={form.capacity === cap}
                        onClick={() => setForm((prev) => ({ ...prev, capacity: cap }))}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, capacity: prev.capacity > 8 ? prev.capacity : 10 }))}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        ![2, 4, 6, 8].includes(form.capacity)
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-2xl font-bold text-slate-400">+</span>
                      <span className={`text-sm font-medium ${
                        ![2, 4, 6, 8].includes(form.capacity) ? 'text-blue-700' : 'text-slate-600'
                      }`}>
                        {t.venue.customCapacity}
                      </span>
                    </button>
                  </div>
                  {![2, 4, 6, 8].includes(form.capacity) && (
                    <div className="mt-2">
                      <Input
                        type="number"
                        min={1}
                        value={form.capacity || ''}
                        onFocus={(e) => e.target.select()}
                        placeholder={t.venue.personCount}
                        onChange={(e) => setForm((prev) => ({ ...prev, capacity: Math.max(1, parseInt(e.target.value) || 1) }))}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="resCapacity">
                    {(() => {
                      const code = form.resourceTypeId ? getTypeById(form.resourceTypeId)?.code : '';
                      switch (code) {
                        case 'floor': return t.venue.floorCapacity;
                        case 'room': return t.venue.roomCapacity;
                        default: return t.venue.capacityLabel;
                      }
                    })()}
                  </Label>
                  <Input
                    id="resCapacity"
                    type="number"
                    min={1}
                    value={form.capacity || ''}
                    onFocus={(e) => e.target.select()}
                    placeholder={(() => {
                      const code = form.resourceTypeId ? getTypeById(form.resourceTypeId)?.code : '';
                      switch (code) {
                        case 'floor': return `${t.venue.examplePrefix} 100`;
                        case 'room': return `${t.venue.examplePrefix} 30`;
                        default: return `${t.venue.examplePrefix} 1`;
                      }
                    })()}
                    onChange={(e) => setForm((prev) => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceStart">{t.venue.serviceStart}</Label>
                  <Input
                    id="serviceStart"
                    type="time"
                    value={form.serviceStartAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, serviceStartAt: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceEnd">{t.venue.serviceEnd}</Label>
                  <Input
                    id="serviceEnd"
                    type="time"
                    value={form.serviceEndAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, serviceEndAt: e.target.value }))}
                  />
                </div>
              </div>

              {form.resourceTypeId && (getTypeById(form.resourceTypeId)?.code === 'chair' || getTypeById(form.resourceTypeId)?.code === 'seat') && !form.editId && (
                <div className="space-y-2">
                  <Label htmlFor="chairCount">{t.venue.chairCountLabel}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="chairCount"
                      type="number"
                      min={1}
                      max={50}
                      value={form.count || ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setForm((prev) => ({ ...prev, count: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)) }))}
                      className="w-24"
                    />
                    <span className="text-sm text-slate-500">
                      {form.count > 1 ? `"${form.name || t.venue.chair} 1" ... "${form.name || t.venue.chair} ${form.count}" ${t.venue.willBeCreatedAs}` : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>{t.common.cancel}</Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? t.common.loading : form.editId ? t.common.update : t.common.create}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isPending && <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>}
              </Tooltip>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t.venue.deleteResource}
        description={`"${deleteTarget?.name}" ${t.venue.deleteResourceDesc}`}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
