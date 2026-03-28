'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Eye, Users, Upload, X, CheckCircle, Ban, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

import { tourApi, agencyApi } from '@/lib/api';
import type { ApiTourDto, CreateTourPayload } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TourStatus } from '@/types';

function resolveImageUrl(url?: string | null): string | null {
  return url || null;
}

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LoadingState, EmptyState, ErrorState, ConfirmDialog, TourStatusBadge, AdminPagination } from '@/components/shared';
import { formatDate } from '@/lib/dateUtils';

interface TourFormData {
  tourCode: string;
  tourName: string;
  description: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  minParticipants: number;
}

const initialFormData: TourFormData = {
  tourCode: '',
  tourName: '',
  description: '',
  startDate: '',
  endDate: '',
  maxParticipants: 20,
  minParticipants: 1,
};

export default function ToursPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useLanguage();
  const apiLang = locale as 'tr' | 'en' | 'de';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TourStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<ApiTourDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiTourDto | null>(null);
  const [formData, setFormData] = useState<TourFormData>(initialFormData);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'tourCode' | 'tourName' | 'startDate' | 'endDate', string>>>({});
  // Status action confirm
  const [statusAction, setStatusAction] = useState<{ tour: ApiTourDto; action: 'publish' | 'cancel' | 'complete' } | null>(null);

  const LIMIT = 10;

  // Fetch agency data for status badge
  const { data: agencyResult } = useQuery({
    queryKey: ['my-agency'],
    queryFn: () => agencyApi.getMyAgency(),
  });
  const agencyStatus = agencyResult?.success ? agencyResult.data?.status : undefined;

  // Query: Tours
  const {
    data: toursResponse,
    isLoading: toursLoading,
    error: toursError,
    refetch,
  } = useQuery({
    queryKey: ['agency-tours', page, apiLang],
    queryFn: async () => {
      const result = await tourApi.list(page, LIMIT, apiLang);
      if (!result.success) throw new Error(result.error);
      return { data: result.data!, meta: result.meta! };
    },
  });

  const tours = toursResponse?.data || [];
  const meta = toursResponse?.meta;

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateTourPayload = {
        tourCode: formData.tourCode,
        tourName: formData.tourName,
        description: formData.description || undefined,
        startDate: formData.startDate || '',
        endDate: formData.endDate || '',
        maxParticipants: formData.maxParticipants || undefined,
        minParticipants: formData.minParticipants || undefined,
      };
      const result = await tourApi.create(payload, coverImageFile || undefined, galleryFiles.length > 0 ? galleryFiles : undefined, apiLang);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tours'] });
      toast.success(t.tours.created);
      closeForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingTour) return;
      const payload = {
        tourCode: formData.tourCode,
        tourName: formData.tourName,
        description: formData.description || undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        maxParticipants: formData.maxParticipants || undefined,
        minParticipants: formData.minParticipants || undefined,
      };
      const result = await tourApi.update(editingTour.id, payload, coverImageFile || undefined, galleryFiles.length > 0 ? galleryFiles : undefined, apiLang);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tours'] });
      toast.success(t.tours.updated);
      closeForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await tourApi.delete(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tours'] });
      toast.success(t.tours.deleted);
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'publish' | 'cancel' | 'complete' }) => {
      const fn = action === 'publish' ? tourApi.publish : action === 'cancel' ? tourApi.cancel : tourApi.complete;
      const result = await fn(id);
      if (!result.success) throw new Error(result.error);
      return { action };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agency-tours'] });
      const msg = data.action === 'publish' ? t.tours.publishSuccess : data.action === 'cancel' ? t.tours.cancelSuccess : t.tours.completeSuccess;
      toast.success(msg);
      setStatusAction(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  const openCreateForm = () => {
    setEditingTour(null);
    setFormData(initialFormData);
    setCoverImageFile(null);
    setCoverImagePreview(null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setIsFormOpen(true);
  };

  const openEditForm = (tour: ApiTourDto) => {
    setEditingTour(tour);
    setFormData({
      tourCode: tour.tourCode,
      tourName: tour.tourName,
      description: tour.description || '',
      startDate: tour.startDate ? tour.startDate.slice(0, 16) : '',
      endDate: tour.endDate ? tour.endDate.slice(0, 16) : '',
      maxParticipants: tour.maxParticipants || 20,
      minParticipants: tour.minParticipants || 1,
    });
    setCoverImageFile(null);
    setCoverImagePreview(resolveImageUrl(tour.coverImageUrl));
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTour(null);
    setFormData(initialFormData);
    setCoverImageFile(null);
    setCoverImagePreview(null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setFieldErrors({});
  };

  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setGalleryFiles((prev) => [...prev, ...files]);
    setGalleryPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Partial<Record<'tourCode' | 'tourName' | 'startDate' | 'endDate', string>> = {};
    if (!formData.tourCode.trim()) errors.tourCode = t.common.required;
    if (!formData.tourName.trim()) errors.tourName = t.common.required;
    if (!formData.startDate) errors.startDate = t.common.required;
    if (!formData.endDate) errors.endDate = t.common.required;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(t.common.required);
      return;
    }
    setFieldErrors({});

    if (editingTour) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  // Client-side filtering
  const filteredTours = tours.filter((tour) => {
    const matchesSearch =
      tour.tourName.toLowerCase().includes(search.toLowerCase()) ||
      tour.tourCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tour.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header title={t.tours.title} description={t.tours.description} organizationStatus={agencyStatus} lang={locale} />

      <div className="flex-1 p-3 md:p-6">
        <Card>
          <CardHeader className="p-3 md:p-6 pb-3 md:pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base md:text-lg font-medium">{t.tours.list}</CardTitle>
              <Button size="sm" onClick={openCreateForm} className="md:hidden">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="relative flex-1 min-w-[120px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t.common.search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as TourStatus | 'all')}
              >
                <SelectTrigger className="w-28 md:w-36">
                  <SelectValue placeholder={t.tours.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.all}</SelectItem>
                  <SelectItem value="draft">{t.tours.draft}</SelectItem>
                  <SelectItem value="published">{t.tours.published}</SelectItem>
                  <SelectItem value="cancelled">{t.tours.cancelled}</SelectItem>
                  <SelectItem value="completed">{t.tours.completed}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openCreateForm} className="hidden md:inline-flex">
                <Plus className="h-4 w-4 mr-2" />
                {t.tours.new}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {toursLoading ? (
              <LoadingState message={t.common.loading} />
            ) : toursError ? (
              <ErrorState onRetry={() => refetch()} />
            ) : !filteredTours.length ? (
              <EmptyState
                icon={Users}
                title={t.tours.notFound}
                description={
                  search || statusFilter !== 'all'
                    ? t.tours.notFoundDesc
                    : t.tours.noTours
                }
                actionLabel={!search && statusFilter === 'all' ? t.tours.new : undefined}
                onAction={!search && statusFilter === 'all' ? openCreateForm : undefined}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.tours.tourCode}</TableHead>
                      <TableHead>{t.tours.name}</TableHead>
                      <TableHead>{t.tours.startDate} - {t.tours.endDate}</TableHead>
                      <TableHead>{t.tours.maxParticipants}</TableHead>
                      <TableHead>{t.tours.status}</TableHead>
                      <TableHead className="text-right">{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTours.map((tour) => (
                      <TableRow
                        key={tour.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => router.push(`/agency/tours/${tour.id}`)}
                      >
                        <TableCell className="font-mono text-sm">{tour.tourCode}</TableCell>
                        <TableCell className="font-medium">{tour.tourName}</TableCell>
                        <TableCell>
                          {formatDate(tour.startDate)} - {formatDate(tour.endDate)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-slate-400" />
                            {tour.participants?.length || 0} / {tour.maxParticipants || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TourStatusBadge status={tour.status} />
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/agency/tours/${tour.id}`)}
                              title={t.tours.detail}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={tour.status !== 'draft' && tour.status !== 'published'}
                                    onClick={() => openEditForm(tour)}
                                    title={t.tours.edit}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {tour.status !== 'draft' && tour.status !== 'published' && (
                                <TooltipContent>{t.tooltips.tourNotDraftOrPublished}</TooltipContent>
                              )}
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={tour.status !== 'draft'}
                                    onClick={() => setStatusAction({ tour, action: 'publish' })}
                                    title={t.tours.publish}
                                  >
                                    <PlayCircle className="h-4 w-4 text-green-600" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {tour.status !== 'draft' && (
                                <TooltipContent>{t.tooltips.tourNotDraft}</TooltipContent>
                              )}
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={tour.status !== 'draft'}
                                    onClick={() => setDeleteTarget(tour)}
                                    title={t.common.delete}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {tour.status !== 'draft' && (
                                <TooltipContent>{t.tooltips.tourNotDraft}</TooltipContent>
                              )}
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={tour.status !== 'published'}
                                    onClick={() => setStatusAction({ tour, action: 'complete' })}
                                    title={t.tours.complete}
                                  >
                                    <CheckCircle className="h-4 w-4 text-blue-600" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {tour.status !== 'published' && (
                                <TooltipContent>{t.tooltips.tourNotPublished}</TooltipContent>
                              )}
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={tour.status !== 'published'}
                                    onClick={() => setStatusAction({ tour, action: 'cancel' })}
                                    title={t.tours.cancel}
                                  >
                                    <Ban className="h-4 w-4 text-red-500" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {tour.status !== 'published' && (
                                <TooltipContent>{t.tooltips.tourNotPublished}</TooltipContent>
                              )}
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                {/* Pagination */}
                <AdminPagination
                  page={page}
                  limit={LIMIT}
                  total={meta?.total || tours.length}
                  totalPages={meta?.totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTour ? t.tours.edit : t.tours.new}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tourCode">{t.tours.tourCode} *</Label>
                  <Input
                    id="tourCode"
                    value={formData.tourCode}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, tourCode: e.target.value }));
                      if (fieldErrors.tourCode) setFieldErrors((prev) => ({ ...prev, tourCode: undefined }));
                    }}
                    placeholder="TR-001"
                    className={fieldErrors.tourCode ? 'border-red-500' : ''}
                  />
                  {fieldErrors.tourCode && <p className="text-xs text-red-500">{fieldErrors.tourCode}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tourName">{t.tours.name} *</Label>
                  <Input
                    id="tourName"
                    value={formData.tourName}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, tourName: e.target.value }));
                      if (fieldErrors.tourName) setFieldErrors((prev) => ({ ...prev, tourName: undefined }));
                    }}
                    placeholder={t.tours.name}
                    className={fieldErrors.tourName ? 'border-red-500' : ''}
                  />
                  {fieldErrors.tourName && <p className="text-xs text-red-500">{fieldErrors.tourName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t.tours.startDate} *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, startDate: e.target.value }));
                      if (fieldErrors.startDate) setFieldErrors((prev) => ({ ...prev, startDate: undefined }));
                    }}
                    className={fieldErrors.startDate ? 'border-red-500' : ''}
                  />
                  {fieldErrors.startDate && <p className="text-xs text-red-500">{fieldErrors.startDate}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t.tours.endDate} *</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, endDate: e.target.value }));
                      if (fieldErrors.endDate) setFieldErrors((prev) => ({ ...prev, endDate: undefined }));
                    }}
                    className={fieldErrors.endDate ? 'border-red-500' : ''}
                  />
                  {fieldErrors.endDate && <p className="text-xs text-red-500">{fieldErrors.endDate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minParticipants">{t.tours.minParticipants}</Label>
                  <Input
                    id="minParticipants"
                    type="number"
                    min={1}
                    value={formData.minParticipants || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        minParticipants: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">{t.tours.maxParticipants}</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min={1}
                    value={formData.maxParticipants || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        maxParticipants: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t.tours.tourDescription}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder={t.tours.tourDescription}
                  rows={3}
                />
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <Label>{t.tours.coverImage}</Label>
                <div className="flex items-center gap-4">
                  {coverImagePreview ? (
                    <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={coverImagePreview}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImageFile(null);
                          setCoverImagePreview(null);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {t.tours.coverImage}
                    </Button>
                  )}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverImageSelect}
                  />
                </div>
              </div>

              {/* Gallery Images */}
              <div className="space-y-2">
                <Label>{t.tours.gallery}</Label>
                <div className="flex flex-wrap gap-2">
                  {galleryPreviews.map((preview, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100">
                      <img src={preview} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-20 w-20"
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleGallerySelect}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                {t.common.cancel}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? t.common.loading : editingTour ? t.common.update : t.common.create}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isPending && <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>}
              </Tooltip>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t.common.delete}
        description={`"${deleteTarget?.tourName}" ${t.tours.deleteConfirm}`}
        confirmLabel={t.common.delete}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        variant="destructive"
      />

      {/* Status Action Confirm Dialog */}
      <ConfirmDialog
        open={!!statusAction}
        onOpenChange={(open) => !open && setStatusAction(null)}
        title={
          statusAction?.action === 'publish'
            ? t.tours.publish
            : statusAction?.action === 'cancel'
            ? t.tours.cancel
            : t.tours.complete
        }
        description={
          statusAction?.action === 'publish'
            ? t.tours.publishConfirm
            : statusAction?.action === 'cancel'
            ? t.tours.cancelConfirm
            : t.tours.completeConfirm
        }
        confirmLabel={t.common.confirm}
        onConfirm={() =>
          statusAction &&
          statusMutation.mutate({ id: statusAction.tour.id, action: statusAction.action })
        }
        variant={statusAction?.action === 'cancel' ? 'destructive' : 'default'}
      />
    </div>
  );
}
