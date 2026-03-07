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
import { LoadingState, EmptyState, ErrorState, ConfirmDialog, TourStatusBadge } from '@/components/shared';
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
    queryKey: ['agency-tours', page],
    queryFn: async () => {
      const result = await tourApi.list(page, LIMIT);
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
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : '',
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : '',
        maxParticipants: formData.maxParticipants || undefined,
        minParticipants: formData.minParticipants || undefined,
      };
      const result = await tourApi.create(payload, coverImageFile || undefined, galleryFiles.length > 0 ? galleryFiles : undefined);
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
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        maxParticipants: formData.maxParticipants || undefined,
        minParticipants: formData.minParticipants || undefined,
      };
      const result = await tourApi.update(editingTour.id, payload, coverImageFile || undefined, galleryFiles.length > 0 ? galleryFiles : undefined);
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
      startDate: tour.startDate ? tour.startDate.split('T')[0] : '',
      endDate: tour.endDate ? tour.endDate.split('T')[0] : '',
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
    if (!formData.tourCode.trim() || !formData.tourName.trim()) {
      toast.error(t.common.required);
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error(t.common.required);
      return;
    }

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

      <div className="flex-1 p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-medium">{t.tours.list}</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t.common.search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48 pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as TourStatus | 'all')}
              >
                <SelectTrigger className="w-36">
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
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4 mr-2" />
                {t.tours.new}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                      <TableRow key={tour.id}>
                        <TableCell className="font-mono text-sm">{tour.tourCode}</TableCell>
                        <TableCell className="font-medium">{tour.tourName}</TableCell>
                        <TableCell>
                          {formatDate(tour.startDate)} - {formatDate(tour.endDate)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-slate-400" />
                            {tour.minParticipants || '-'} / {tour.maxParticipants || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TourStatusBadge status={tour.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/agency/tours/${tour.id}`)}
                              title={t.tours.detail}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {tour.status === 'draft' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditForm(tour)}
                                  title={t.tours.edit}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setStatusAction({ tour, action: 'publish' })}
                                  title={t.tours.publish}
                                >
                                  <PlayCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteTarget(tour)}
                                  title={t.common.delete}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            {tour.status === 'published' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setStatusAction({ tour, action: 'complete' })}
                                  title={t.tours.complete}
                                >
                                  <CheckCircle className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setStatusAction({ tour, action: 'cancel' })}
                                  title={t.tours.cancel}
                                >
                                  <Ban className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-slate-500">
                      {meta.total} tour, page {meta.page}/{meta.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        {t.common.back}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= meta.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        {t.common.next}
                      </Button>
                    </div>
                  </div>
                )}
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
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tourCode: e.target.value }))
                    }
                    placeholder="TR-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tourName">{t.tours.name} *</Label>
                  <Input
                    id="tourName"
                    value={formData.tourName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tourName: e.target.value }))
                    }
                    placeholder={t.tours.name}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t.tours.startDate} *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t.tours.endDate} *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                  />
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
              <Button type="submit" disabled={isPending}>
                {isPending ? t.common.loading : editingTour ? t.common.update : t.common.create}
              </Button>
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
