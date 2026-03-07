'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Trash2,
  Calendar,
  Clock,
  Users,
  Plus,
  Pencil,
  Upload,
  X,
  Store,
  PlayCircle,
  Ban,
  CheckCircle,
  Image as ImageIcon,
  UserCheck,
  Link2,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

import dynamic from 'next/dynamic';

import { tourApi, tourStopApi, apiClient, agencyApi } from '@/lib/api';
import type { ApiTourDto, ApiTourStopDto, CreateTourStopPayload, UpdateTourPayload, ServiceRequestDto, OrganizationPublicDto, TourClientDto } from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';

const TourStopsMap = dynamic(
  () => import('@/components/agency/TourStopsMap').then((mod) => mod.TourStopsMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[450px] bg-slate-100 flex items-center justify-center rounded-lg">
        <p className="text-slate-500">Loading map...</p>
      </div>
    ),
  }
);

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, EmptyState, ErrorState, TourStatusBadge, ConfirmDialog } from '@/components/shared';

function resolveImageUrl(url?: string | null): string | null {
  return url || null;
}

export default function TourDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useLanguage();
  const tourId = Number(params.tourId);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStopFormOpen, setIsStopFormOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<ApiTourStopDto | null>(null);
  const [deleteStopTarget, setDeleteStopTarget] = useState<ApiTourStopDto | null>(null);
  const [statusAction, setStatusAction] = useState<'publish' | 'cancel' | 'complete' | null>(null);
  const [highlightedStopId, setHighlightedStopId] = useState<number | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    tourCode: '',
    tourName: '',
    description: '',
    startDate: '',
    endDate: '',
    maxParticipants: 0,
    minParticipants: 0,
  });
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [editGalleryFiles, setEditGalleryFiles] = useState<File[]>([]);
  const [editGalleryPreviews, setEditGalleryPreviews] = useState<string[]>([]);
  const editCoverRef = useRef<HTMLInputElement>(null);
  const editGalleryRef = useRef<HTMLInputElement>(null);

  // Stop form state
  const [stopForm, setStopForm] = useState({
    organizationId: 0,
    description: '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    showPriceToCustomer: false,
  });
  // Fetch agency data for status badge
  const { data: agencyResult } = useQuery({
    queryKey: ['my-agency'],
    queryFn: () => agencyApi.getMyAgency(),
  });
  const agencyStatus = agencyResult?.success ? agencyResult.data?.status : undefined;

  // Query: Tour detail
  const {
    data: tour,
    isLoading: tourLoading,
    error: tourError,
  } = useQuery({
    queryKey: ['agency-tour', tourId],
    queryFn: async () => {
      const result = await tourApi.getById(tourId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: !!tourId,
  });

  // Query: Tour stops
  const { data: stops, isLoading: stopsLoading } = useQuery({
    queryKey: ['tour-stops', tourId],
    queryFn: async () => {
      const result = await tourStopApi.list(tourId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: !!tourId,
  });

  // Query: Service requests for tour
  const { data: serviceRequests } = useQuery({
    queryKey: ['tour-service-requests', tourId],
    queryFn: async () => {
      const response = await apiClient.getServiceRequestsByTour(tourId, 1, 100);
      return response.data;
    },
    enabled: !!tourId,
  });

  // Query: Tour clients
  const { data: tourClients } = useQuery({
    queryKey: ['tour-clients', tourId],
    queryFn: async () => {
      const result = await tourApi.getClients(tourId);
      if (!result.success) return [];
      return result.data!;
    },
    enabled: !!tourId,
  });

  // Query: All organizations (for map + stop form)
  const { data: allOrganizations } = useQuery({
    queryKey: ['organizations-public-all'],
    queryFn: async () => {
      const response = await apiClient.getOrganizationsPublic(1, 100);
      return response.data;
    },
    enabled: !!tourId,
  });

  // organizations list for both map and stop form
  const organizations = allOrganizations;

  // Mutations

  const updateClientStatusMutation = useMutation({
    mutationFn: async ({ participantId, status }: { participantId: number; status: string }) => {
      const result = await tourApi.updateClientStatus(tourId, participantId, status);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-clients', tourId] });
      toast.success(t.tours.statusUpdated);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateTourMutation = useMutation({
    mutationFn: async () => {
      const payload: UpdateTourPayload = {
        tourCode: editForm.tourCode,
        tourName: editForm.tourName,
        description: editForm.description || undefined,
        startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : undefined,
        endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : undefined,
        maxParticipants: editForm.maxParticipants || undefined,
        minParticipants: editForm.minParticipants || undefined,
      };
      const result = await tourApi.update(
        tourId,
        payload,
        editCoverFile || undefined,
        editGalleryFiles.length > 0 ? editGalleryFiles : undefined
      );
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tour', tourId] });
      queryClient.invalidateQueries({ queryKey: ['agency-tours'] });
      toast.success(t.tours.updated);
      setIsEditOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (action: 'publish' | 'cancel' | 'complete') => {
      const fn = action === 'publish' ? tourApi.publish : action === 'cancel' ? tourApi.cancel : tourApi.complete;
      const result = await fn(tourId);
      if (!result.success) throw new Error(result.error);
      return action;
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ['agency-tour', tourId] });
      queryClient.invalidateQueries({ queryKey: ['agency-tours'] });
      const msg = action === 'publish' ? t.tours.publishSuccess : action === 'cancel' ? t.tours.cancelSuccess : t.tours.completeSuccess;
      toast.success(msg);
      setStatusAction(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const result = await tourApi.deletePhoto(tourId, photoId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tour', tourId] });
      toast.success(t.tours.photoDeleted);
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  const createStopMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateTourStopPayload = {
        tourId,
        organizationId: stopForm.organizationId,
        description: stopForm.description || undefined,
        scheduledStartTime: stopForm.scheduledStartTime,
        scheduledEndTime: stopForm.scheduledEndTime,
        showPriceToCustomer: stopForm.showPriceToCustomer,
      };
      const result = await tourStopApi.create(payload);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-stops', tourId] });
      toast.success(t.tours.stopCreated);
      closeStopForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  const updateStopMutation = useMutation({
    mutationFn: async () => {
      if (!editingStop) return;
      const result = await tourStopApi.update(editingStop.id, {
        organizationId: stopForm.organizationId,
        description: stopForm.description || undefined,
        scheduledStartTime: stopForm.scheduledStartTime,
        scheduledEndTime: stopForm.scheduledEndTime,
        showPriceToCustomer: stopForm.showPriceToCustomer,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-stops', tourId] });
      toast.success(t.tours.stopUpdated);
      closeStopForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  const deleteStopMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await tourStopApi.delete(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-stops', tourId] });
      toast.success(t.tours.stopDeleted);
      setDeleteStopTarget(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  // Handlers

  const openEditForm = () => {
    if (!tour) return;
    setEditForm({
      tourCode: tour.tourCode,
      tourName: tour.tourName,
      description: tour.description || '',
      startDate: tour.startDate ? tour.startDate.split('T')[0] : '',
      endDate: tour.endDate ? tour.endDate.split('T')[0] : '',
      maxParticipants: tour.maxParticipants || 0,
      minParticipants: tour.minParticipants || 0,
    });
    setEditCoverFile(null);
    setEditCoverPreview(resolveImageUrl(tour.coverImageUrl));
    setEditGalleryFiles([]);
    setEditGalleryPreviews([]);
    setIsEditOpen(true);
  };

  const getDefaultStopTimes = () => {
    if (!tour?.startDate) return { start: '', end: '' };
    const startDate = tour.startDate.split('T')[0];
    return {
      start: `${startDate}T10:00`,
      end: `${startDate}T12:00`,
    };
  };

  const openCreateStopForm = () => {
    const defaults = getDefaultStopTimes();
    setEditingStop(null);
    setStopForm({
      organizationId: 0,
      description: '',
      scheduledStartTime: defaults.start,
      scheduledEndTime: defaults.end,
      showPriceToCustomer: false,
    });
    setIsStopFormOpen(true);
  };

  const openEditStopForm = (stop: ApiTourStopDto) => {
    setEditingStop(stop);
    setStopForm({
      organizationId: stop.organizationId,
      description: stop.description || '',
      scheduledStartTime: stop.scheduledStartTime ? stop.scheduledStartTime.substring(0, 16) : '',
      scheduledEndTime: stop.scheduledEndTime ? stop.scheduledEndTime.substring(0, 16) : '',
      showPriceToCustomer: stop.showPriceToCustomer || false,
    });
    setIsStopFormOpen(true);
  };

  const openCreateStopFromMap = (org: OrganizationPublicDto) => {
    if (tour?.status !== 'draft') return;
    const defaults = getDefaultStopTimes();
    setEditingStop(null);
    setStopForm({
      organizationId: org.id,
      description: '',
      scheduledStartTime: defaults.start,
      scheduledEndTime: defaults.end,
      showPriceToCustomer: false,
    });
    setIsStopFormOpen(true);
  };

  const closeStopForm = () => {
    setIsStopFormOpen(false);
    setEditingStop(null);
    setStopForm({
      organizationId: 0,
      description: '',
      scheduledStartTime: '',
      scheduledEndTime: '',
      showPriceToCustomer: false,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTourMutation.mutate();
  };

  const handleStopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopForm.organizationId) {
      toast.error(t.tours.selectOrganization);
      return;
    }
    if (!stopForm.scheduledStartTime || !stopForm.scheduledEndTime) {
      toast.error(t.common.required);
      return;
    }
    if (editingStop) {
      updateStopMutation.mutate();
    } else {
      createStopMutation.mutate();
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      cancelled: 'bg-slate-50 text-slate-700 border-slate-200',
      completed: 'bg-blue-50 text-blue-700 border-blue-200',
    };
    return colors[status] || 'bg-slate-50 text-slate-700';
  };

  if (tourLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t.tours.detail} organizationStatus={agencyStatus} lang={locale} />
        <div className="flex-1 p-6">
          <LoadingState message={t.tours.loadingTour} />
        </div>
      </div>
    );
  }

  if (tourError || !tour) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t.tours.detail} organizationStatus={agencyStatus} lang={locale} />
        <div className="flex-1 p-6">
          <ErrorState
            title={t.tours.notFound}
            message={t.tours.notFoundDesc}
            onRetry={() => router.push('/agency/tours')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={tour.tourName} description={tour.tourCode} organizationStatus={agencyStatus} lang={locale} />

      <div className="flex-1 p-6 overflow-auto">
        {/* Top Info Bar */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.push('/agency/tours')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{tour.tourName}</h2>
              <TourStatusBadge status={tour.status} />
            </div>
            <p className="text-slate-500 mt-1">{tour.description}</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(tour.startDate)} - {formatDate(tour.endDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="h-4 w-4" />
              <span>{tour.minParticipants || '-'} / {tour.maxParticipants || '-'} {t.tours.people}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tour.status === 'draft' && (
              <>
                <Button variant="outline" size="sm" onClick={openEditForm}>
                  <Pencil className="h-4 w-4 mr-1" />
                  {t.common.edit}
                </Button>
                <Button size="sm" onClick={() => setStatusAction('publish')}>
                  <PlayCircle className="h-4 w-4 mr-1" />
                  {t.tours.publish}
                </Button>
              </>
            )}
            {tour.status === 'published' && (
              <>
                <Button size="sm" variant="outline" onClick={() => setStatusAction('complete')}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {t.tours.complete}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setStatusAction('cancel')}>
                  <Ban className="h-4 w-4 mr-1" />
                  {t.tours.cancel}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">{t.tours.info}</TabsTrigger>
            <TabsTrigger value="stops">{t.tours.stops} ({stops?.length || 0})</TabsTrigger>
            <TabsTrigger value="requests">{t.tours.requests} ({serviceRequests?.length || 0})</TabsTrigger>
            <TabsTrigger value="clients">{t.tours.clients} ({tourClients?.length || 0})</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Tour Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.tours.info}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">{t.tours.tourCode}</p>
                      <p className="font-mono font-medium">{tour.tourCode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{t.tours.status}</p>
                      <TourStatusBadge status={tour.status} />
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">{t.tours.startDate}</p>
                      <p className="font-medium">{formatDate(tour.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{t.tours.endDate}</p>
                      <p className="font-medium">{formatDate(tour.endDate)}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">{t.tours.minParticipants}</p>
                      <p className="font-medium">{tour.minParticipants || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{t.tours.maxParticipants}</p>
                      <p className="font-medium">{tour.maxParticipants || '-'}</p>
                    </div>
                  </div>
                  {tour.description && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-slate-500">{t.tours.tourDescription}</p>
                        <p className="mt-1">{tour.description}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Images */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    {t.tours.gallery}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cover Image */}
                  {resolveImageUrl(tour.coverImageUrl) && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">{t.tours.coverImage}</p>
                      <div className="w-full h-48 rounded-lg overflow-hidden bg-slate-100">
                        <img
                          src={resolveImageUrl(tour.coverImageUrl)!}
                          alt={tour.tourName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* Gallery Images */}
                  {tour.galleryImages && tour.galleryImages.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">{t.tours.gallery} ({tour.galleryImages.length})</p>
                      <div className="grid grid-cols-3 gap-2">
                        {tour.galleryImages.map((img) => {
                          const imgSrc = resolveImageUrl(img.imageUrl);
                          if (!imgSrc) return null;
                          return (
                            <div key={img.id} className="relative group">
                              <div className="w-full h-24 rounded-lg overflow-hidden bg-slate-100">
                                <img
                                  src={imgSrc}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              {tour.status === 'draft' && (
                                <button
                                  type="button"
                                  onClick={() => deletePhotoMutation.mutate(img.id)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!resolveImageUrl(tour.coverImageUrl) && (!tour.galleryImages || tour.galleryImages.length === 0) && (
                    <EmptyState
                      icon={ImageIcon}
                      title={t.tours.gallery}
                      description={t.tours.noTours}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Registration Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  {t.tours.registrationLinks || 'Kayıt Linkleri'}
                </CardTitle>
                <CardDescription>
                  {t.tours.registrationLinksDesc || 'Müşterilerin tura veya acenteye kayıt olması için paylaşılabilir linkler'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tour Registration Link */}
                {tour.uuid && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.tours.tourRegistrationLink || 'Tur Kayıt Linki'}</Label>
                    <p className="text-xs text-slate-500">{t.tours.tourRegistrationLinkDesc || 'Bu linki paylaştığınızda müşteri kayıt olunca otomatik tura eklenir'}</p>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/agency/login?${agencyResult?.data?.uuid ? `uuid=${agencyResult.data.uuid}&` : ''}tourUuid=${tour.uuid}`}
                        className="text-xs font-mono bg-slate-50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = `${window.location.origin}/agency/login?${agencyResult?.data?.uuid ? `uuid=${agencyResult.data.uuid}&` : ''}tourUuid=${tour.uuid}`;
                          navigator.clipboard.writeText(link);
                          toast.success(t.tours.linkCopied || 'Link kopyalandı');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Agency Registration Link */}
                {agencyResult?.data?.uuid && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.tours.agencyRegistrationLink || 'Acente Kayıt Linki'}</Label>
                    <p className="text-xs text-slate-500">{t.tours.agencyRegistrationLinkDesc || 'Bu linki paylaştığınızda müşteri kayıt olunca acentenize bağlanır'}</p>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/agency/login?uuid=${agencyResult.data.uuid}`}
                        className="text-xs font-mono bg-slate-50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = `${window.location.origin}/agency/login?uuid=${agencyResult.data!.uuid}`;
                          navigator.clipboard.writeText(link);
                          toast.success(t.tours.linkCopied || 'Link kopyalandı');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stops Tab */}
          <TabsContent value="stops" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Left: Map (3/5) */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Store className="h-5 w-5 text-blue-600" />
                      {t.tours.stops} - {t.tours.mapView}
                    </CardTitle>
                    <CardDescription>
                      {tour.status === 'draft'
                        ? (t.tours.clickOrgToAddStop || 'Click a gray marker on the map to add it as a stop')
                        : `${stops?.length || 0} ${t.tours.stops.toLowerCase()}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TourStopsMap
                      stops={stops || []}
                      organizations={allOrganizations || []}
                      highlightedStopId={highlightedStopId}
                      onOrganizationClick={tour.status === 'draft' ? openCreateStopFromMap : undefined}
                      onStopClick={(stop) => setHighlightedStopId(stop.id)}
                      height="450px"
                    />
                    {/* Legend */}
                    <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow flex items-center justify-center text-white text-[9px] font-bold">1</div>
                        <span>{t.tours.stops}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-white shadow" />
                        <span>{t.tours.restaurants}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 border-t-2 border-dashed border-blue-600" />
                        <span>{t.tours.route}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Stop list (2/5) */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-lg">{t.tours.stops}</CardTitle>
                      <CardDescription>
                        {stops?.length || 0} {t.tours.stops.toLowerCase()}
                      </CardDescription>
                    </div>
                    {tour.status === 'draft' && (
                      <Button size="sm" onClick={openCreateStopForm}>
                        <Plus className="h-4 w-4 mr-1" />
                        {t.tours.addStop}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {stopsLoading ? (
                      <LoadingState message={t.common.loading} />
                    ) : !stops?.length ? (
                      <EmptyState
                        icon={Store}
                        title={t.tours.noStops}
                        description={t.tours.noStops}
                        actionLabel={tour.status === 'draft' ? t.tours.addStop : undefined}
                        onAction={tour.status === 'draft' ? openCreateStopForm : undefined}
                      />
                    ) : (
                      <div className="space-y-2 max-h-[450px] overflow-y-auto">
                        {stops.map((stop, index) => (
                          <div
                            key={stop.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                              highlightedStopId === stop.id
                                ? 'bg-blue-50 border-blue-300'
                                : 'hover:bg-slate-50'
                            }`}
                            onClick={() => setHighlightedStopId(stop.id)}
                            onMouseEnter={() => setHighlightedStopId(stop.id)}
                            onMouseLeave={() => setHighlightedStopId(null)}
                          >
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {stop.organization?.name || `Organization #${stop.organizationId}`}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span>
                                  {stop.scheduledStartTime ? new Date(stop.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                  {' - '}
                                  {stop.scheduledEndTime ? new Date(stop.scheduledEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                </span>
                              </div>
                            </div>
                            {tour.status === 'draft' && (
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); openEditStopForm(stop); }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); setDeleteStopTarget(stop); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.tours.requests}</CardTitle>
              </CardHeader>
              <CardContent>
                {!serviceRequests?.length ? (
                  <EmptyState
                    icon={Store}
                    title={t.tours.noRequests}
                    description={t.tours.noRequests}
                  />
                ) : (
                  <div className="space-y-3">
                    {serviceRequests.map((request: ServiceRequestDto) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Store className="h-8 w-8 text-slate-400" />
                          <div>
                            <h4 className="font-medium">
                              Organization #{request.organizationId}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(request.requestedDate)}
                              </span>
                              <span className="capitalize">{request.requestType.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={getStatusBadge(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.tours.clients}</CardTitle>
              </CardHeader>
              <CardContent>
                {!tourClients?.length ? (
                  <EmptyState
                    icon={UserCheck}
                    title={t.tours.noClients}
                    description={t.tours.noClients}
                  />
                ) : (
                  <div className="space-y-3">
                    {tourClients.map((tc: TourClientDto) => {
                      const clientStatusColors: Record<string, string> = {
                        pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                        confirmed: 'bg-green-50 text-green-700 border-green-200',
                        cancelled: 'bg-red-50 text-red-700 border-red-200',
                        completed: 'bg-blue-50 text-blue-700 border-blue-200',
                        no_show: 'bg-slate-50 text-slate-700 border-slate-200',
                      };
                      const clientStatusLabels: Record<string, string> = {
                        pending: t.tours.statusPending,
                        confirmed: t.tours.statusConfirmed,
                        cancelled: t.tours.statusCancelled,
                        completed: t.tours.statusCompleted || 'Tamamlandı',
                        no_show: t.tours.statusNoShow || 'Gelmedi',
                      };
                      return (
                        <div
                          key={tc.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            {tc.client.profilePhoto ? (
                              <img
                                src={tc.client.profilePhoto}
                                alt={`${tc.client.firstName} ${tc.client.lastName}`}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                <UserCheck className="h-5 w-5 text-slate-400" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium">
                                {tc.client.firstName} {tc.client.lastName}
                              </h4>
                              <p className="text-sm text-slate-500">@{tc.client.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={clientStatusColors[tc.status] || ''}>
                              {clientStatusLabels[tc.status] || tc.status}
                            </Badge>
                            <Select
                              value={tc.status}
                              onValueChange={(value) =>
                                updateClientStatusMutation.mutate({ participantId: tc.id, status: value })
                              }
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue placeholder={t.tours.changeStatus} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">{t.tours.statusPending}</SelectItem>
                                <SelectItem value="confirmed">{t.tours.statusConfirmed}</SelectItem>
                                <SelectItem value="cancelled">{t.tours.statusCancelled}</SelectItem>
                                <SelectItem value="completed">{t.tours.statusCompleted || 'Tamamlandı'}</SelectItem>
                                <SelectItem value="no_show">{t.tours.statusNoShow || 'Gelmedi'}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Tour Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.tours.edit}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.tours.tourCode} *</Label>
                  <Input
                    value={editForm.tourCode}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, tourCode: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.tours.name} *</Label>
                  <Input
                    value={editForm.tourName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, tourName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.tours.startDate}</Label>
                  <Input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.tours.endDate}</Label>
                  <Input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.tours.minParticipants}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.minParticipants || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, minParticipants: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.tours.maxParticipants}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.maxParticipants || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, maxParticipants: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.tours.tourDescription}</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <Label>{t.tours.coverImage}</Label>
                <div className="flex items-center gap-4">
                  {editCoverPreview ? (
                    <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-slate-100">
                      <img src={editCoverPreview} alt="Cover" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setEditCoverFile(null); setEditCoverPreview(null); }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => editCoverRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      {t.tours.coverImage}
                    </Button>
                  )}
                  <input ref={editCoverRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setEditCoverFile(file); setEditCoverPreview(URL.createObjectURL(file)); }
                    }}
                  />
                </div>
              </div>

              {/* Gallery */}
              <div className="space-y-2">
                <Label>{t.tours.gallery}</Label>
                <div className="flex flex-wrap gap-2">
                  {editGalleryPreviews.map((preview, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setEditGalleryFiles((prev) => prev.filter((_, idx) => idx !== i));
                          setEditGalleryPreviews((prev) => prev.filter((_, idx) => idx !== i));
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="h-20 w-20"
                    onClick={() => editGalleryRef.current?.click()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <input ref={editGalleryRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setEditGalleryFiles((prev) => [...prev, ...files]);
                      setEditGalleryPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
                    }}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={updateTourMutation.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {updateTourMutation.isPending ? t.common.loading : t.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stop Form Dialog */}
      <Dialog open={isStopFormOpen} onOpenChange={setIsStopFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingStop ? t.tours.editStop : t.tours.addStop}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStopSubmit}>
            <div className="space-y-4 py-4">
              {/* Organization Select */}
              <div className="space-y-2">
                <Label>{t.tours.organization} *</Label>
                <Select
                  value={stopForm.organizationId ? String(stopForm.organizationId) : ''}
                  onValueChange={(value) => setStopForm((prev) => ({ ...prev, organizationId: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.tours.selectOrganization} />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations && organizations.map((org) => (
                      <SelectItem key={org.id} value={String(org.id)}>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>{org.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.tours.scheduledTime} ({t.tours.startDate}) *</Label>
                  <Input
                    type="datetime-local"
                    value={stopForm.scheduledStartTime}
                    min={tour?.startDate ? `${tour.startDate.split('T')[0]}T00:00` : undefined}
                    max={tour?.endDate ? `${tour.endDate.split('T')[0]}T23:59` : undefined}
                    onChange={(e) => setStopForm((prev) => ({ ...prev, scheduledStartTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.tours.scheduledTime} ({t.tours.endDate}) *</Label>
                  <Input
                    type="datetime-local"
                    value={stopForm.scheduledEndTime}
                    min={tour?.startDate ? `${tour.startDate.split('T')[0]}T00:00` : undefined}
                    max={tour?.endDate ? `${tour.endDate.split('T')[0]}T23:59` : undefined}
                    onChange={(e) => setStopForm((prev) => ({ ...prev, scheduledEndTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.tours.tourDescription}</Label>
                <Textarea
                  value={stopForm.description}
                  onChange={(e) => setStopForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={stopForm.showPriceToCustomer}
                  onCheckedChange={(checked) => setStopForm((prev) => ({ ...prev, showPriceToCustomer: checked }))}
                />
                <Label>{t.tours.showPriceToCustomer}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeStopForm}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={createStopMutation.isPending || updateStopMutation.isPending}>
                {(createStopMutation.isPending || updateStopMutation.isPending)
                  ? t.common.loading
                  : editingStop ? t.common.update : t.common.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Action Confirm */}
      <ConfirmDialog
        open={!!statusAction}
        onOpenChange={(open) => !open && setStatusAction(null)}
        title={
          statusAction === 'publish' ? t.tours.publish
            : statusAction === 'cancel' ? t.tours.cancel
            : t.tours.complete
        }
        description={
          statusAction === 'publish' ? t.tours.publishConfirm
            : statusAction === 'cancel' ? t.tours.cancelConfirm
            : t.tours.completeConfirm
        }
        confirmLabel={t.common.confirm}
        onConfirm={() => statusAction && statusMutation.mutate(statusAction)}
        variant={statusAction === 'cancel' ? 'destructive' : 'default'}
      />

      {/* Delete Stop Confirm */}
      <ConfirmDialog
        open={!!deleteStopTarget}
        onOpenChange={(open) => !open && setDeleteStopTarget(null)}
        title={t.tours.deleteStop}
        description={t.tours.deleteStopConfirm}
        confirmLabel={t.common.delete}
        onConfirm={() => deleteStopTarget && deleteStopMutation.mutate(deleteStopTarget.id)}
        variant="destructive"
      />
    </div>
  );
}
