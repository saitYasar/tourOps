'use client';

import React, { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
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
  Building2,
  Users,
  Eye,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  DollarSign,
  User as UserIcon,
  Printer,
  Plus,
  Loader2,
  Lock,
  Unlock,
  Upload,
  Pencil,
  FileSpreadsheet,
  Download,
  MessageCircle,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import { locales, type Locale } from '@/locales';
import { useDebounce } from '@/hooks/useDebounce';
import {
  adminApi,
  type AgencyResponseDto,
  type CompanyStatus,
  type AdminUpdateAgencyDto,
  type ApiTourDto,
  type AgencyStopChoicesDto,
  type AgencyStopServiceSummaryDto,
  type CreateTourStopPayload,
  type UpdateTourStopPayload,
  type CreateTourPayload,
  type SelectionLimit,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LoadingState, EmptyState, ConfirmDialog, TourStatusBadge, AdminPagination,
  ChoiceDeadlineCountdown,
  CompactReceipt, DetailedListReceipt, KitchenSummaryReceipt, ReceiptTableServices, ReceiptServiceSummary,
  handleReceiptPrint, exportReceiptExcel, OrgMenuPreviewDialog,
} from '@/components/shared';
import type { ReceiptTemplate } from '@/components/shared';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { formatDate, formatShortDateTime } from '@/lib/dateUtils';
import { getCurrencySymbol } from '@/lib/utils';
import { AdminStopVenuePreview } from '@/components/admin/AdminStopVenuePreview';

type AgencyDetail = AgencyResponseDto & {
  coverImageUrl?: string | null;
};

function resolveAgencyImageUrl(agency: AgencyDetail): string | null {
  return agency.coverImageUrl || null;
}

function resolveImageUrl(url?: string | null): string | null {
  return url || null;
}

const TOURS_PER_PAGE = 20;

function AgencyToursTab({ agencyId }: { agencyId: number }) {
  const { t, locale } = useLanguage();
  const a = t.admin as Record<string, string>;
  const lang = locale as 'tr' | 'en' | 'de';
  const queryClient = useQueryClient();

  // List state
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(TOURS_PER_PAGE);

  // Create tour dialog state
  const [createTourOpen, setCreateTourOpen] = useState(false);
  const [tourFormData, setTourFormData] = useState({
    tourCode: '',
    tourName: '',
    description: '',
    startDate: '',
    endDate: '',
    maxParticipants: 20,
    minParticipants: 1,
  });
  const [tourFieldErrors, setTourFieldErrors] = useState<Record<string, string | undefined>>({});
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Detail dialog state
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [dialogTab, setDialogTab] = useState('info');
  const [expandedParticipantId, setExpandedParticipantId] = useState<number | null>(null);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [whatsappTarget, setWhatsappTarget] = useState<any>(null);
  const [whatsappLang, setWhatsappLang] = useState<Locale>('tr');
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchPreview, setBatchPreview] = useState<string[][]>([]);
  const batchFileRef = useRef<HTMLInputElement>(null);
  const [choicesStopId, setChoicesStopId] = useState<number | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTemplate, setReceiptTemplate] = useState<ReceiptTemplate>('compact');
  const printRef = useRef<HTMLDivElement>(null);

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = useCallback((images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImages([]);
    setLightboxIndex(0);
  }, []);

  useEffect(() => {
    if (lightboxImages.length === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i > 0 ? i - 1 : i));
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i < lightboxImages.length - 1 ? i + 1 : i));
    };
    // Disable pointer events on everything except lightbox overlay
    const style = document.createElement('style');
    style.textContent = 'body > *:not(#tour-lightbox) { pointer-events: none !important; }';
    document.head.appendChild(style);
    window.addEventListener('keydown', handleKey);
    return () => {
      style.remove();
      window.removeEventListener('keydown', handleKey);
    };
  }, [lightboxImages, closeLightbox]);

  // Stop management state
  const [addStopOpen, setAddStopOpen] = useState(false);
  const [addStopOrgSearch, setAddStopOrgSearch] = useState('');
  const debouncedOrgSearch = useDebounce(addStopOrgSearch, 400);
  const [selectedOrgDetail, setSelectedOrgDetail] = useState<{ id: number; name: string; address?: string; email?: string; phone?: string; phoneCountryCode?: number } | null>(null);
  const [stopStartTime, setStopStartTime] = useState('');
  const [stopEndTime, setStopEndTime] = useState('');
  const [stopDescription, setStopDescription] = useState('');
  const [stopShowPrice, setStopShowPrice] = useState(false);
  const [stopMaxSpend, setStopMaxSpend] = useState('');
  const [stopChoiceDeadline, setStopChoiceDeadline] = useState('');
  const [stopSelectionLimits, setStopSelectionLimits] = useState<Record<number, number>>({});
  const [menuPreviewOpen, setMenuPreviewOpen] = useState(false);
  const [deleteStopId, setDeleteStopId] = useState<number | null>(null);
  const [rejectStopId, setRejectStopId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Edit stop state
  const [editingStopId, setEditingStopId] = useState<number | null>(null);
  const [editStopDescription, setEditStopDescription] = useState('');
  const [editStopStartTime, setEditStopStartTime] = useState('');
  const [editStopEndTime, setEditStopEndTime] = useState('');
  const [editStopShowPrice, setEditStopShowPrice] = useState(true);
  const [editStopMaxSpend, setEditStopMaxSpend] = useState('');
  const [editStopChoiceDeadline, setEditStopChoiceDeadline] = useState('');
  const [editStopSelectionLimits, setEditStopSelectionLimits] = useState<Record<number, number>>({});
  const [editMenuPreviewOpen, setEditMenuPreviewOpen] = useState(false);
  const [editMenuPreviewOrgId, setEditMenuPreviewOrgId] = useState<number | null>(null);
  const [editMenuPreviewOrgName, setEditMenuPreviewOrgName] = useState('');

  // Map UI time filter to backend timeStatus param
  const timeStatusMap: Record<string, string | undefined> = {
    active: 'active',
    upcoming: 'future',
    past: 'past',
    all: undefined,
  };

  // Reset page on filter change
  const prevFilters = useRef({ debouncedSearch, statusFilter, timeFilter });
  useEffect(() => {
    const prev = prevFilters.current;
    if (prev.debouncedSearch !== debouncedSearch || prev.statusFilter !== statusFilter || prev.timeFilter !== timeFilter) {
      setPage(1);
      prevFilters.current = { debouncedSearch, statusFilter, timeFilter };
    }
  }, [debouncedSearch, statusFilter, timeFilter]);

  // Tours list query
  const { data: toursResponse, isLoading } = useQuery({
    queryKey: ['admin-agency-tours', agencyId, page, limit, statusFilter, timeFilter, debouncedSearch, lang],
    queryFn: async () => {
      const result = await adminApi.getTours({
        page,
        limit,
        lang,
        agencyId,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: debouncedSearch || undefined,
        timeStatus: timeStatusMap[timeFilter],
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

  // Stop choices query
  const { data: stopChoices, isLoading: choicesLoading } = useQuery({
    queryKey: ['admin-stop-choices', choicesStopId, lang],
    queryFn: async () => {
      const result = await adminApi.getStopChoices(choicesStopId!, lang);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!choicesStopId,
  });

  // Stop service summary query
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

  // Organization search for add stop
  const { data: orgsResult, isLoading: orgSearchLoading } = useQuery({
    queryKey: ['admin-organizations-for-stop', debouncedOrgSearch],
    queryFn: () => adminApi.getOrganizationsList({ name: debouncedOrgSearch || undefined, limit: 20, status: 'active' as any }),
    enabled: addStopOpen && !selectedOrgDetail,
  });
  const searchedOrgs = orgsResult?.success ? (orgsResult.data?.data || []) : [];

  // Create tour mutation
  const createTourMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateTourPayload & { agencyId: number } = {
        agencyId,
        tourCode: tourFormData.tourCode,
        tourName: tourFormData.tourName,
        description: tourFormData.description || undefined,
        startDate: tourFormData.startDate || '',
        endDate: tourFormData.endDate || '',
        maxParticipants: tourFormData.maxParticipants || undefined,
        minParticipants: tourFormData.minParticipants || undefined,
      };
      const result = await adminApi.createTour(
        payload,
        coverImageFile || undefined,
        galleryFiles.length > 0 ? galleryFiles : undefined,
        lang
      );
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agency-tours'] });
      toast.success(a.adminTourCreated);
      closeCreateTourForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || a.adminTourCreateError);
    },
  });

  const openCreateTourForm = () => {
    setTourFormData({ tourCode: '', tourName: '', description: '', startDate: '', endDate: '', maxParticipants: 20, minParticipants: 1 });
    setCoverImageFile(null);
    setCoverImagePreview(null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setTourFieldErrors({});
    setCreateTourOpen(true);
  };

  const closeCreateTourForm = () => {
    setCreateTourOpen(false);
    setTourFieldErrors({});
  };

  const handleCreateTourSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!tourFormData.tourCode) errors.tourCode = t.tours.tourCode;
    if (!tourFormData.tourName) errors.tourName = t.tours.name;
    if (!tourFormData.startDate) errors.startDate = t.tours.startDate;
    if (!tourFormData.endDate) errors.endDate = t.tours.endDate;
    if (Object.keys(errors).length > 0) {
      setTourFieldErrors(errors);
      return;
    }
    createTourMutation.mutate();
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

  // Mutations
  const invalidateTourDetail = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-tour-detail', selectedTourId, lang] });
  };

  const closeBatchImport = () => {
    setBatchImportOpen(false);
    setBatchFile(null);
    setBatchPreview([]);
  };

  const batchImportMutation = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      if (!selectedTourId) throw new Error('No tour selected');
      const result = await adminApi.batchImportTourClients(selectedTourId, file, lang);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (result) => {
      const msg = t.invitations.batchImportSuccess
        .replace('{successful}', String(result?.successful ?? 0))
        .replace('{totalRows}', String(result?.totalRows ?? 0));
      toast.success(msg);
      invalidateTourDetail();
      closeBatchImport();
    },
    onError: (err: Error) => {
      toast.error(err.message || t.invitations.batchImportFailed);
    },
  });

  const addStopMutation = useMutation({
    mutationFn: async (data: CreateTourStopPayload) => {
      const result = await adminApi.createTourStop(data, lang);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success(t.admin.tourStopAdded);
      invalidateTourDetail();
      setAddStopOpen(false);
      setSelectedOrgDetail(null);
      setStopStartTime('');
      setStopEndTime('');
      setStopDescription('');
      setStopShowPrice(false);
      setStopMaxSpend('');
      setStopChoiceDeadline('');
      setStopSelectionLimits({});
    },
    onError: (error) => toast.error((error as Error).message || t.admin.tourStopError),
  });

  const deleteStopMutation = useMutation({
    mutationFn: async (stopId: number) => {
      const result = await adminApi.deleteTourStop(stopId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast.success(t.admin.tourStopRemoved);
      invalidateTourDetail();
      setDeleteStopId(null);
    },
    onError: (error) => toast.error((error as Error).message || t.admin.tourStopError),
  });

  const approveStopMutation = useMutation({
    mutationFn: async (stopId: number) => {
      const result = await adminApi.approveTourStop(stopId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast.success(t.admin.tourStopApproved);
      invalidateTourDetail();
    },
    onError: (error) => toast.error((error as Error).message || t.admin.tourStopError),
  });

  const rejectStopMutation = useMutation({
    mutationFn: async ({ stopId, reason }: { stopId: number; reason: string }) => {
      const result = await adminApi.rejectTourStop(stopId, reason);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast.success(t.admin.tourStopRejected);
      invalidateTourDetail();
      setRejectStopId(null);
      setRejectReason('');
    },
    onError: (error) => toast.error((error as Error).message || t.admin.tourStopError),
  });

  const updateStopMutation = useMutation({
    mutationFn: async ({ stopId, data }: { stopId: number; data: UpdateTourStopPayload }) => {
      const result = await adminApi.updateTourStop(stopId, data, lang);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success(t.admin.tourStopUpdated);
      invalidateTourDetail();
      setEditingStopId(null);
    },
    onError: (error) => toast.error((error as Error).message || t.admin.tourStopError),
  });

  const lockChoicesMutation = useMutation({
    mutationFn: async (stopId: number) => {
      const result = await adminApi.submitAndApproveChoices(stopId, lang);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast.success(t.tours.choicesLocked);
      invalidateTourDetail();
      queryClient.invalidateQueries({ queryKey: ['admin-stop-choices', choicesStopId, lang] });
      queryClient.invalidateQueries({ queryKey: ['admin-stop-service-summary', choicesStopId, lang] });
    },
    onError: (err: Error) => toast.error(err.message || t.tours.choicesLockError),
  });

  const unlockChoicesMutation = useMutation({
    mutationFn: async (stopId: number) => {
      const result = await adminApi.revokeChoicesApproval(stopId, lang);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast.success(t.tours.choicesUnlocked);
      invalidateTourDetail();
      queryClient.invalidateQueries({ queryKey: ['admin-stop-choices', choicesStopId, lang] });
      queryClient.invalidateQueries({ queryKey: ['admin-stop-service-summary', choicesStopId, lang] });
    },
    onError: (err: Error) => toast.error(err.message || t.tours.choicesUnlockError),
  });

  const choicesArr: AgencyStopChoicesDto[] = Array.isArray(stopChoices) ? stopChoices : [];
  const selectedStop = stops?.find(s => s.id === choicesStopId);

  // Receipt data
  const choicesOrgName = selectedStop?.organization?.name || '';
  const receiptTourInfo = tourDetail ? {
    tourName: tourDetail.tourName,
    agencyName: tourDetail.agency?.name,
    startDate: tourDetail.startDate,
    stopStartDate: selectedStop?.scheduledStartTime,
    stopEndDate: selectedStop?.scheduledEndTime,
  } : undefined;

  const handlePrint = () => {
    handleReceiptPrint(printRef, receiptTemplate);
  };

  const handleExportExcel = () => {
    if (receiptTourInfo) {
      exportReceiptExcel(receiptTourInfo, choicesArr, serviceSummary as AgencyStopServiceSummaryDto, choicesOrgName, t);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={a.tourSearchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t.tours.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{a.allStatuses}</SelectItem>
                <SelectItem value="draft">{t.tours.draft}</SelectItem>
                <SelectItem value="published">{t.tours.published}</SelectItem>
                <SelectItem value="cancelled">{t.tours.cancelled}</SelectItem>
                <SelectItem value="completed">{t.tours.completed}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{a.tourTimeFilterAll}</SelectItem>
                <SelectItem value="active">{a.tourTimeFilterActive}</SelectItem>
                <SelectItem value="upcoming">{a.tourTimeFilterUpcoming}</SelectItem>
                <SelectItem value="past">{a.tourTimeFilterPast}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreateTourForm} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              {a.createTour}
            </Button>
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
              <EmptyState icon={Calendar} title={t.tours.title} description={a.noAgencyTours} />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]"></TableHead>
                    <TableHead>{t.tours.name}</TableHead>
                    <TableHead>{t.tours.tourCode}</TableHead>
                    <TableHead>{t.tours.startDate}</TableHead>
                    <TableHead>{t.tours.endDate}</TableHead>
                    <TableHead className="text-center">{a.tourParticipants}</TableHead>
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
        <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden p-4 sm:p-6">
          {isDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingState />
            </div>
          ) : tourDetail ? (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="flex items-start sm:items-center gap-2 flex-wrap">
                  <span className="break-words">{tourDetail.tourName}</span>
                  <TourStatusBadge status={tourDetail.status} />
                </DialogTitle>
              </DialogHeader>

              <Tabs value={dialogTab} onValueChange={setDialogTab} className="flex-1 flex flex-col min-h-0">
                <div className="shrink-0 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <TabsList className="w-max sm:w-full justify-start">
                    <TabsTrigger value="info" className="gap-1.5 text-xs sm:text-sm">
                      <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t.admin.detail}
                    </TabsTrigger>
                    <TabsTrigger value="stops" className="gap-1.5 text-xs sm:text-sm">
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t.admin.tourStops}
                      {tourDetail.stops && tourDetail.stops.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{tourDetail.stops.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="clients" className="gap-1.5 text-xs sm:text-sm">
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t.tours.clients}
                      {tourDetail.participants && tourDetail.participants.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{tourDetail.participants.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="choices" className="gap-1.5 text-xs sm:text-sm">
                      <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t.tours.customerChoices}
                      {tourDetail.stops && tourDetail.stops.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{tourDetail.stops.length}</Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* ===== TAB: Tur Bilgileri ===== */}
                <TabsContent value="info" className="flex-1 overflow-y-auto mt-4 space-y-4">
                  {/* Cover Image */}
                  {resolveImageUrl(tourDetail.coverImageUrl) && (
                    <div
                      className="w-full h-36 sm:h-56 rounded-lg overflow-hidden bg-slate-100 cursor-pointer"
                      onClick={() => openLightbox([resolveImageUrl(tourDetail.coverImageUrl)!], 0)}
                    >
                      <img
                        src={resolveImageUrl(tourDetail.coverImageUrl)!}
                        alt={tourDetail.tourName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 text-sm">
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
                            const client = p.client;
                            const name = client
                              ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || `#${p.clientId}`
                              : p.clientName || `#${p.clientId}`;
                            const isExpanded = expandedParticipantId === p.id;
                            const phoneDisplay = client?.phone
                              ? `+${client.phoneCountryCode || '90'} ${client.phone}`
                              : null;
                            const genderLabel = client?.gender === 'm' ? t.common.male : client?.gender === 'f' ? t.common.female : null;
                            return (
                              <Fragment key={p.id}>
                                <button
                                  className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm transition-colors cursor-pointer"
                                  onClick={() => setExpandedParticipantId(isExpanded ? null : p.id)}
                                >
                                  <div className="flex items-center gap-2.5">
                                    {client?.profilePhoto ? (
                                      <img
                                        src={resolveImageUrl(client.profilePhoto) || ''}
                                        alt={name}
                                        className="h-7 w-7 rounded-full object-cover cursor-zoom-in"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openLightbox([resolveImageUrl(client.profilePhoto)!], 0);
                                        }}
                                      />
                                    ) : (
                                      <div className="h-7 w-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
                                        {name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="text-left">
                                      <span className="font-medium">{name}</span>
                                      {client?.email && (
                                        <span className="text-xs text-slate-400 ml-2">{client.email}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {genderLabel && (
                                      <Badge variant="outline" className="text-[10px] px-1.5">{genderLabel}</Badge>
                                    )}
                                    {p.status && (
                                      <Badge variant="outline" className="text-xs">
                                        {p.status}
                                      </Badge>
                                    )}
                                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </div>
                                </button>
                                {isExpanded && (
                                  <div className="ml-4 sm:ml-9 p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5">
                                    {phoneDisplay && (
                                      <div className="flex items-center gap-2 text-slate-600">
                                        <Phone className="h-3 w-3 text-slate-400" />
                                        <span className="font-medium text-slate-800">{phoneDisplay}</span>
                                      </div>
                                    )}
                                    {client?.email && (
                                      <div className="flex items-center gap-2 text-slate-600">
                                        <Mail className="h-3 w-3 text-slate-400" />
                                        <span className="font-medium text-slate-800">{client.email}</span>
                                      </div>
                                    )}
                                    {p.pricePaid != null && (
                                      <div className="flex items-center gap-2 text-slate-600">
                                        <DollarSign className="h-3 w-3 text-slate-400" />
                                        <span className="font-medium text-slate-800">{Number(p.pricePaid).toFixed(2)} {getCurrencySymbol()}</span>
                                      </div>
                                    )}
                                    {p.paidAt && (
                                      <div className="flex items-center gap-2 text-slate-600">
                                        <Clock className="h-3 w-3 text-slate-400" />
                                        <span className="font-medium text-slate-800">{formatDate(p.paidAt)}</span>
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

                  {/* Gallery */}
                  {tourDetail.galleryImages && tourDetail.galleryImages.length > 0 && (() => {
                    const gallerySrcs = tourDetail.galleryImages
                      .map((img) => resolveImageUrl(img.imageUrl))
                      .filter((src): src is string => !!src);
                    return (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">{t.tours.gallery} ({tourDetail.galleryImages.length})</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                            {gallerySrcs.map((src, idx) => (
                              <div
                                key={idx}
                                className="h-20 sm:h-24 rounded-lg overflow-hidden bg-slate-100 cursor-pointer"
                                onClick={() => openLightbox(gallerySrcs, idx)}
                              >
                                <img src={src} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </TabsContent>

                {/* ===== TAB: Duraklar ===== */}
                <TabsContent value="stops" className="flex-1 overflow-y-auto mt-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700">
                      {t.admin.tourStops} ({tourDetail.stops?.length || 0})
                    </p>
                    <Button size="sm" onClick={() => setAddStopOpen(true)} className="gap-1.5 shrink-0">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">{t.admin.addTourStop}</span>
                    </Button>
                  </div>

                  {!tourDetail.stops?.length ? (
                    <EmptyState icon={MapPin} title={t.admin.tourStops} description={t.tours.noStops} />
                  ) : (
                    <div className="space-y-2">
                      {tourDetail.stops.map((stop, index) => {
                        const isEditing = editingStopId === stop.id;
                        return (
                        <Card key={stop.id} className="border shadow-sm">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                              <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-violet-100 text-violet-600 text-xs sm:text-sm font-bold shrink-0 mt-0.5">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm mb-1">
                                  {stop.organization?.name || `${t.tours.organization} #${stop.organizationId}`}
                                </p>
                                <div className="flex flex-wrap items-center gap-1 mb-1">
                                  {stop.preReservationStatus && (
                                    <Badge
                                      variant={stop.preReservationStatus === 'approved' ? 'default' : stop.preReservationStatus === 'rejected' ? 'destructive' : 'secondary'}
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {stop.preReservationStatus === 'approved' ? t.tours.stopStatusApproved
                                        : stop.preReservationStatus === 'rejected' ? t.tours.stopStatusRejected
                                        : t.tours.stopStatusPending}
                                    </Badge>
                                  )}
                                  {stop.choicesStatus && (
                                    <Badge
                                      variant={stop.choicesStatus === 'approved' ? 'default' : stop.choicesStatus === 'rejected' ? 'destructive' : 'outline'}
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {stop.choicesStatus === 'approved' ? t.tours.choicesStatusApproved
                                        : stop.choicesStatus === 'submitted' ? t.tours.choicesStatusSubmitted
                                        : stop.choicesStatus === 'rejected' ? t.tours.choicesStatusRejected
                                        : stop.choicesStatus === 'revision_requested' ? t.tours.choicesStatusRevisionRequested
                                        : t.tours.choicesStatusInProgress}
                                    </Badge>
                                  )}
                                </div>
                                {stop.organization?.address && (
                                  <p className="text-slate-400 text-xs flex items-center gap-1 mb-1">
                                    <MapPin className="h-3 w-3" />
                                    {stop.organization.address}
                                  </p>
                                )}
                                <p className="text-slate-500 text-xs flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatShortDateTime(stop.scheduledStartTime)} - {formatShortDateTime(stop.scheduledEndTime)}
                                </p>
                                <ChoiceDeadlineCountdown
                                  tourStopId={stop.id}
                                  compact
                                  choiceDeadlineTime={stop.choiceDeadlineTime}
                                  scheduledEndTime={stop.scheduledEndTime}
                                  choiceDeadlineHours={stop.choiceDeadline}
                                />
                                {!isEditing && stop.description && (
                                  <p className="text-slate-500 text-xs mt-1">{stop.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {stop.preReservationStatus === 'pending' && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                          onClick={() => approveStopMutation.mutate(stop.id)}
                                          disabled={approveStopMutation.isPending}
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{t.admin.approvePreReservation}</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => setRejectStopId(stop.id)}
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{t.admin.rejectPreReservation}</TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={`h-8 w-8 p-0 ${isEditing ? 'text-violet-600 bg-violet-50' : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'}`}
                                      onClick={() => {
                                        if (isEditing) {
                                          setEditingStopId(null);
                                        } else {
                                          const toLocalInput = (iso: string) => iso ? iso.replace(/[Zz]$/, '').replace(/[+-]\d{2}:\d{2}$/, '').slice(0, 16) : '';
                                          setEditingStopId(stop.id);
                                          setEditStopDescription(stop.description || '');
                                          setEditStopStartTime(toLocalInput(stop.scheduledStartTime));
                                          setEditStopEndTime(toLocalInput(stop.scheduledEndTime));
                                          setEditStopShowPrice(stop.showPriceToCustomer ?? true);
                                          setEditStopMaxSpend(stop.maxSpendLimit != null ? String(stop.maxSpendLimit) : '');
                                          setEditStopChoiceDeadline(stop.choiceDeadlineTime ? toLocalInput(stop.choiceDeadlineTime) : '');
                                          // Populate selectionLimits from stop data
                                          if (stop.selectionLimits?.length) {
                                            const limitsMap: Record<number, number> = {};
                                            for (const sl of stop.selectionLimits) {
                                              if (sl.type === 'service-category') limitsMap[sl.id] = sl.max;
                                            }
                                            setEditStopSelectionLimits(limitsMap);
                                          } else {
                                            setEditStopSelectionLimits({});
                                          }
                                          setEditMenuPreviewOrgId(stop.organizationId);
                                          setEditMenuPreviewOrgName(stop.organization?.name || '');
                                        }
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{isEditing ? t.common.cancel : t.common.edit}</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => setDeleteStopId(stop.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t.admin.removeTourStop}</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>

                            {/* Inline edit form */}
                            {isEditing && (
                              <div className="mt-3 pt-3 border-t space-y-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => setEditMenuPreviewOpen(true)}
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                                  {t.menu.menuPreview}
                                </Button>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">{t.admin.descriptionLabel}</Label>
                                  <Textarea
                                    value={editStopDescription}
                                    onChange={(e) => setEditStopDescription(e.target.value)}
                                    rows={2}
                                    className="text-sm"
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">{t.admin.scheduledStartTime}</Label>
                                    <DateTimeInput
                                      value={editStopStartTime}
                                      min={tourDetail?.startDate ? `${tourDetail.startDate.split('T')[0]}T00:00` : undefined}
                                      max={tourDetail?.endDate ? `${tourDetail.endDate.split('T')[0]}T23:59` : undefined}
                                      onChange={(e) => setEditStopStartTime(e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">{t.admin.scheduledEndTime}</Label>
                                    <DateTimeInput
                                      value={editStopEndTime}
                                      min={tourDetail?.startDate ? `${tourDetail.startDate.split('T')[0]}T00:00` : undefined}
                                      max={tourDetail?.endDate ? `${tourDetail.endDate.split('T')[0]}T23:59` : undefined}
                                      onChange={(e) => setEditStopEndTime(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">{t.requests.choiceDeadline}</Label>
                                  <DateTimeInput
                                    value={editStopChoiceDeadline}
                                    onChange={(e) => setEditStopChoiceDeadline(e.target.value)}
                                  />
                                  <p className="text-[11px] text-slate-400">{t.requests.choiceDeadlineDesc}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Switch
                                    checked={editStopShowPrice}
                                    onCheckedChange={setEditStopShowPrice}
                                  />
                                  <Label className="text-xs">{t.tours.showPriceToCustomer}</Label>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">{t.tours.maxSpendLimit}</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder={t.tours.maxSpendLimitPlaceholder}
                                    value={editStopMaxSpend}
                                    onChange={(e) => setEditStopMaxSpend(e.target.value)}
                                    className="text-sm"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingStopId(null)}
                                  >
                                    {t.common.cancel}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="gap-1.5"
                                    disabled={!editStopStartTime || !editStopEndTime || updateStopMutation.isPending}
                                    onClick={() => {
                                      const editLimits: SelectionLimit[] = Object.entries(editStopSelectionLimits).map(([id, max]) => ({
                                        id: Number(id),
                                        type: 'service-category' as const,
                                        max,
                                      }));
                                      const data: UpdateTourStopPayload = {
                                        description: editStopDescription,
                                        scheduledStartTime: editStopStartTime,
                                        scheduledEndTime: editStopEndTime,
                                        showPriceToCustomer: editStopShowPrice,
                                        maxSpendLimit: editStopMaxSpend ? Number(editStopMaxSpend) : null,
                                        choiceDeadlineTime: editStopChoiceDeadline || undefined,
                                        selectionLimits: editLimits.length > 0 ? editLimits : null,
                                      };
                                      updateStopMutation.mutate({ stopId: stop.id, data });
                                    }}
                                  >
                                    {updateStopMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    {t.common.save}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* ===== TAB: Misafirler ===== */}
                <TabsContent value="clients" className="flex-1 overflow-y-auto mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      {t.tours.clients} ({tourDetail.participants?.length || 0})
                    </p>
                    <div className="flex items-center gap-2">
                      {tourDetail.participants && tourDetail.participants.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-green-600 hover:text-green-800 hover:bg-green-50"
                          onClick={() => {
                            const lines = tourDetail.participants!.map((p: any, i: number) => {
                              const c = p.client;
                              const n = c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : p.clientName || `#${p.clientId}`;
                              return `${i + 1}. ${n}`;
                            });
                            const header = `*${t.invitations.clientList}* — ${tourDetail.tourName}`;
                            const text = encodeURIComponent(`${header}\n\n${lines.join('\n')}`);
                            window.open(`https://web.whatsapp.com/send?text=${text}`, '_blank');
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {t.invitations.sendViaWhatsapp}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setBatchImportOpen(true)} className="gap-1.5">
                        <FileSpreadsheet className="h-4 w-4" />
                        {t.invitations.batchImport}
                      </Button>
                    </div>
                  </div>
                  {!tourDetail.participants?.length ? (
                    <EmptyState icon={Users} title={t.tours.clients} description={t.tours.noClients} />
                  ) : (
                    <div className="space-y-1">
                      {tourDetail.participants.map((p) => {
                        const client = p.client;
                        const name = client
                          ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || `#${p.clientId}`
                          : p.clientName || `#${p.clientId}`;
                        const isExpanded = expandedParticipantId === p.id;
                        const phoneDisplay = client?.phone
                          ? `+${client.phoneCountryCode || '90'} ${client.phone}`
                          : null;
                        const genderLabel = client?.gender === 'm' ? t.common.male : client?.gender === 'f' ? t.common.female : null;
                        return (
                          <Fragment key={p.id}>
                            <button
                              className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm transition-colors cursor-pointer"
                              onClick={() => setExpandedParticipantId(isExpanded ? null : p.id)}
                            >
                              <div className="flex items-center gap-2.5">
                                {client?.profilePhoto ? (
                                  <img
                                    src={resolveImageUrl(client.profilePhoto) || ''}
                                    alt={name}
                                    className="h-7 w-7 rounded-full object-cover cursor-zoom-in"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openLightbox([resolveImageUrl(client.profilePhoto)!], 0);
                                    }}
                                  />
                                ) : (
                                  <div className="h-7 w-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
                                    {name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="text-left">
                                  <span className="font-medium">{name}</span>
                                  {client?.email && (
                                    <span className="text-xs text-slate-400 ml-2">{client.email}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {genderLabel && (
                                  <Badge variant="outline" className="text-[10px] px-1.5">{genderLabel}</Badge>
                                )}
                                {p.status && (
                                  <Badge variant="outline" className="text-xs">
                                    {p.status}
                                  </Badge>
                                )}
                                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="ml-4 sm:ml-9 p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5">
                                {phoneDisplay && (
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <Phone className="h-3 w-3 text-slate-400" />
                                    <span className="font-medium text-slate-800">{phoneDisplay}</span>
                                  </div>
                                )}
                                {client?.email && (
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <Mail className="h-3 w-3 text-slate-400" />
                                    <span className="font-medium text-slate-800">{client.email}</span>
                                  </div>
                                )}
                                {p.pricePaid != null && (
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <DollarSign className="h-3 w-3 text-slate-400" />
                                    <span className="font-medium text-slate-800">{Number(p.pricePaid).toFixed(2)} {getCurrencySymbol()}</span>
                                  </div>
                                )}
                                {p.paidAt && (
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    <span className="font-medium text-slate-800">{formatDate(p.paidAt)}</span>
                                  </div>
                                )}
                                {client?.username && (
                                  <div className="pt-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-green-600 hover:text-green-800 hover:bg-green-50 gap-1.5"
                                      onClick={(e) => { e.stopPropagation(); setWhatsappTarget({ client, name }); }}
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                      <span className="text-xs">{t.invitations.whatsappShare}</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </Fragment>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* ===== TAB: Misafir Seçimleri ===== */}
                <TabsContent value="choices" className="flex-1 overflow-y-auto mt-4">
                  {!tourDetail.stops?.length ? (
                    <EmptyState icon={ClipboardList} title={t.tours.customerChoices} description={t.tours.noStops} />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* Stop selector */}
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
                                      const st = stop.preReservationStatus;
                                      const cfg = st
                                        ? (dotConfig[st] || { color: 'bg-slate-300', label: st })
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
                                  {stop.preReservationStatus === 'approved' && stop.choicesStatus !== 'approved' && (
                                    <ChoiceDeadlineCountdown tourStopId={stop.id} compact choiceDeadlineTime={stop.choiceDeadlineTime} scheduledEndTime={stop.scheduledEndTime} choiceDeadlineHours={stop.choiceDeadline} />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Choices + Summary */}
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
                                ) : (() => {
                                  const currSymbol = getCurrencySymbol(serviceSummary.currency || serviceSummary.services[0]?.currency);
                                  return (
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
                                                <td className="py-2 text-right">{Number(item.unitPrice).toFixed(2)} {currSymbol}</td>
                                                <td className="py-2 text-right font-medium">{Number(item.totalPrice).toFixed(2)} {currSymbol}</td>
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
                                          <td className="py-2 text-right font-bold text-lg">{Number(serviceSummary.grandTotal).toFixed(2)} {currSymbol}</td>
                                        </tr>
                                        {serviceSummary.commissionRate != null && serviceSummary.commissionAmount != null && (
                                          <tr>
                                            <td colSpan={3} className="py-1 text-right text-sm font-medium text-orange-600">
                                              {t.tours.agencyCommission} %{serviceSummary.commissionRate}
                                            </td>
                                            <td className="py-1 text-right font-semibold text-orange-600">{Number(serviceSummary.commissionAmount).toFixed(2)} {currSymbol}</td>
                                          </tr>
                                        )}
                                        {(serviceSummary as Record<string, unknown>).systemCommissionRate != null && (serviceSummary as Record<string, unknown>).systemCommissionAmount != null && (
                                          <tr>
                                            <td colSpan={3} className="py-1 text-right text-sm font-medium text-violet-600">
                                              {t.tours.systemCommission} %{String((serviceSummary as Record<string, unknown>).systemCommissionRate)}
                                            </td>
                                            <td className="py-1 text-right font-semibold text-violet-600">{Number((serviceSummary as Record<string, unknown>).systemCommissionAmount).toFixed(2)} {currSymbol}</td>
                                          </tr>
                                        )}
                                      </tfoot>
                                    </table>
                                  </div>
                                  );
                                })()}
                              </CardContent>
                            </Card>

                            {/* 3D Venue Occupancy */}
                            {selectedStop && (
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    {t.venue?.modelView || '3D Model'}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <AdminStopVenuePreview stopId={selectedStop.id} />
                                </CardContent>
                              </Card>
                            )}

                            {/* Customer Choices Detail */}
                            <Card>
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" />
                                    {t.tours.customerChoices}
                                  </CardTitle>
                                  {selectedStop?.preReservationStatus === 'approved' && selectedStop?.choicesStatus !== 'approved' && (
                                    <ChoiceDeadlineCountdown
                                      tourStopId={choicesStopId}
                                      choiceDeadlineTime={selectedStop.choiceDeadlineTime}
                                      scheduledEndTime={selectedStop.scheduledEndTime}
                                      choiceDeadlineHours={selectedStop.choiceDeadline}
                                    />
                                  )}
                                </div>
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
                                                            <span className="font-medium">{(Number(sc.service.basePrice) * sc.quantity).toFixed(2)} {getCurrencySymbol(sc.service?.currency)}</span>
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
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                  {cs && choicesStatusConfig[cs] ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-slate-500">{t.tours.choicesStatus}:</span>
                                      <Badge variant={choicesStatusConfig[cs].variant}>
                                        {choicesStatusConfig[cs].label}
                                      </Badge>
                                    </div>
                                  ) : <div />}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {currentStop?.preReservationStatus === 'approved' && cs === 'in_progress' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => choicesStopId && lockChoicesMutation.mutate(choicesStopId)}
                                        disabled={lockChoicesMutation.isPending}
                                        className="gap-2"
                                      >
                                        {lockChoicesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                                        {t.tours.lockChoices}
                                      </Button>
                                    )}
                                    {(cs === 'approved' || cs === 'submitted') && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => choicesStopId && unlockChoicesMutation.mutate(choicesStopId)}
                                        disabled={unlockChoicesMutation.isPending}
                                        className="gap-2"
                                      >
                                        {unlockChoicesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                                        {t.tours.unlockChoices}
                                      </Button>
                                    )}
                                    {choicesArr.length > 0 && (
                                      <Button variant="outline" size="sm" onClick={() => setReceiptOpen(true)} className="gap-2">
                                        <Printer className="h-4 w-4" />
                                        {t.guests.printReceipt}
                                      </Button>
                                    )}
                                  </div>
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

      {/* Add Stop Dialog */}
      <Dialog open={addStopOpen} onOpenChange={(open) => { if (!open) { setAddStopOpen(false); setSelectedOrgDetail(null); setAddStopOrgSearch(''); setStopStartTime(''); setStopEndTime(''); setStopDescription(''); setStopShowPrice(false); setStopMaxSpend(''); setStopChoiceDeadline(''); setStopSelectionLimits({}); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t.admin.addTourStop}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Organization Search */}
            <div className="space-y-2">
              <Label>{t.tours.organization} *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t.admin.searchOrganization}
                  value={addStopOrgSearch}
                  onChange={(e) => {
                    setAddStopOrgSearch(e.target.value);
                    if (selectedOrgDetail) {
                      setSelectedOrgDetail(null);
                      setStopSelectionLimits({});
                    }
                  }}
                  className="pl-9"
                />
                {orgSearchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>

              {/* Search results dropdown */}
              {!selectedOrgDetail && searchedOrgs.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto bg-white shadow-sm">
                  {searchedOrgs.map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors border-b last:border-b-0"
                      onClick={() => {
                        setSelectedOrgDetail({ id: org.id, name: org.name, address: org.address, email: org.email, phone: org.phone?.toString(), phoneCountryCode: org.phoneCountryCode });
                        setAddStopOrgSearch(org.name);
                      }}
                    >
                      <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{org.name}</p>
                        {org.address && (
                          <p className="text-xs text-slate-500 truncate max-w-[320px]" title={org.address}>{org.address}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!selectedOrgDetail && !orgSearchLoading && addStopOrgSearch && searchedOrgs.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">{t.admin.noOrganizationsFound}</p>
              )}

              {/* Selected organization detail card */}
              {selectedOrgDetail && (
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                        <span className="font-medium text-sm truncate">{selectedOrgDetail.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => {
                          setSelectedOrgDetail(null);
                          setAddStopOrgSearch('');
                          setStopSelectionLimits({});
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 mt-2">
                      {selectedOrgDetail.address && (
                        <div className="col-span-2 flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-slate-400" />
                          <span>{selectedOrgDetail.address}</span>
                        </div>
                      )}
                      {selectedOrgDetail.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{selectedOrgDetail.email}</span>
                        </div>
                      )}
                      {selectedOrgDetail.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{selectedOrgDetail.phoneCountryCode ? `+${selectedOrgDetail.phoneCountryCode} ` : ''}{selectedOrgDetail.phone}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setMenuPreviewOpen(true)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      {t.menu.menuPreview}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Time fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.admin.scheduledStartTime}</Label>
                <DateTimeInput
                  value={stopStartTime}
                  min={tourDetail?.startDate ? `${tourDetail.startDate.split('T')[0]}T00:00` : undefined}
                  max={tourDetail?.endDate ? `${tourDetail.endDate.split('T')[0]}T23:59` : undefined}
                  onChange={(e) => setStopStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.admin.scheduledEndTime}</Label>
                <DateTimeInput
                  value={stopEndTime}
                  min={tourDetail?.startDate ? `${tourDetail.startDate.split('T')[0]}T00:00` : undefined}
                  max={tourDetail?.endDate ? `${tourDetail.endDate.split('T')[0]}T23:59` : undefined}
                  onChange={(e) => setStopEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>{t.tours.tourDescription}</Label>
              <Textarea
                value={stopDescription}
                onChange={(e) => setStopDescription(e.target.value)}
                placeholder={t.tours.tourDescription}
                rows={2}
              />
            </div>

            {/* Show price toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={stopShowPrice}
                onCheckedChange={setStopShowPrice}
              />
              <Label>{t.tours.showPriceToCustomer}</Label>
            </div>

            {/* Max spend limit */}
            <div className="space-y-2">
              <Label>{t.tours.maxSpendLimit}</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder={t.tours.maxSpendLimitPlaceholder}
                value={stopMaxSpend}
                onChange={(e) => setStopMaxSpend(e.target.value)}
              />
            </div>

            {/* Choice deadline */}
            <Separator />
            <div className="space-y-2">
              <Label className="font-semibold">{t.requests.choiceDeadline}</Label>
              <p className="text-xs text-slate-500">{t.requests.choiceDeadlineDesc}</p>
              <DateTimeInput
                value={stopChoiceDeadline}
                onChange={(e) => setStopChoiceDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddStopOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={!selectedOrgDetail || !stopStartTime || !stopEndTime || addStopMutation.isPending}
              onClick={() => {
                const limits: SelectionLimit[] = Object.entries(stopSelectionLimits).map(([id, max]) => ({
                  id: Number(id),
                  type: 'service-category' as const,
                  max,
                }));
                addStopMutation.mutate({
                  tourId: selectedTourId!,
                  organizationId: selectedOrgDetail!.id,
                  description: stopDescription || undefined,
                  scheduledStartTime: stopStartTime,
                  scheduledEndTime: stopEndTime,
                  showPriceToCustomer: stopShowPrice,
                  maxSpendLimit: stopMaxSpend ? Number(stopMaxSpend) : undefined,
                  choiceDeadlineTime: stopChoiceDeadline || undefined,
                  ...(limits.length > 0 ? { selectionLimits: limits } : {}),
                });
              }}
            >
              {addStopMutation.isPending ? t.common.loading : t.admin.addTourStop}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Stop Confirmation */}
      <ConfirmDialog
        open={!!deleteStopId}
        onOpenChange={() => setDeleteStopId(null)}
        title={t.admin.removeTourStop}
        description={t.admin.removeTourStopConfirm}
        onConfirm={() => deleteStopId && deleteStopMutation.mutate(deleteStopId)}
        variant="destructive"
      />

      {/* Reject Stop Dialog */}
      <Dialog open={!!rejectStopId} onOpenChange={(open) => { if (!open) { setRejectStopId(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.admin.rejectPreReservation}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder={t.admin.rejectReasonPlaceholder}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setRejectStopId(null); setRejectReason(''); }}>
                {t.common.cancel}
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || rejectStopMutation.isPending}
                onClick={() => rejectStopId && rejectStopMutation.mutate({ stopId: rejectStopId, reason: rejectReason })}
              >
                {rejectStopMutation.isPending ? t.common.loading : t.admin.rejectPreReservation}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.guests.printReceipt}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 mb-4">
            {([
              { key: 'compact' as ReceiptTemplate, label: t.guests.compactReceipt },
              { key: 'detailed' as ReceiptTemplate, label: t.guests.detailedList },
              { key: 'kitchen' as ReceiptTemplate, label: t.guests.kitchenSummary },
            ]).map((tmpl) => (
              <Button
                key={tmpl.key}
                variant={receiptTemplate === tmpl.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setReceiptTemplate(tmpl.key)}
              >
                {tmpl.label}
              </Button>
            ))}
          </div>
          <div ref={printRef}>
            {receiptTourInfo && receiptTemplate === 'compact' && (
              <CompactReceipt choices={choicesArr} orgName={choicesOrgName} t={t} tourInfo={receiptTourInfo} />
            )}
            {receiptTourInfo && receiptTemplate === 'detailed' && (
              <DetailedListReceipt choices={choicesArr} orgName={choicesOrgName} t={t} tourInfo={receiptTourInfo} />
            )}
            {receiptTourInfo && receiptTemplate === 'kitchen' && (
              <KitchenSummaryReceipt choices={choicesArr} orgName={choicesOrgName} t={t} tourInfo={receiptTourInfo} />
            )}
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={handleExportExcel} className="gap-2">
              <FileText className="h-4 w-4" />
              Excel
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              {t.guests.printReceipt}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Menu Preview (Add Stop) */}
      <OrgMenuPreviewDialog
        open={menuPreviewOpen}
        onOpenChange={setMenuPreviewOpen}
        organizationId={selectedOrgDetail?.id}
        organizationName={selectedOrgDetail?.name}
        selectionLimits={stopSelectionLimits}
        onSelectionLimitChange={(catId, val) => {
          setStopSelectionLimits((prev) => {
            if (val === undefined) {
              const next = { ...prev };
              delete next[catId];
              return next;
            }
            return { ...prev, [catId]: val };
          });
        }}
      />

      {/* Menu Preview (Edit Stop) */}
      <OrgMenuPreviewDialog
        open={editMenuPreviewOpen}
        onOpenChange={setEditMenuPreviewOpen}
        organizationId={editMenuPreviewOrgId}
        organizationName={editMenuPreviewOrgName}
        stopId={editingStopId}
        selectionLimits={editStopSelectionLimits}
        onSelectionLimitChange={(catId, val) => {
          setEditStopSelectionLimits((prev) => {
            if (val === undefined) {
              const next = { ...prev };
              delete next[catId];
              return next;
            }
            return { ...prev, [catId]: val };
          });
        }}
      />

      {/* WhatsApp Share Dialog */}
      <Dialog open={!!whatsappTarget} onOpenChange={(open) => { if (!open) { setWhatsappTarget(null); setWhatsappLang('tr'); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              {t.invitations.whatsappShare}
            </DialogTitle>
            <DialogDescription className="sr-only">{t.invitations.whatsappShare}</DialogDescription>
          </DialogHeader>
          {whatsappTarget && (() => {
            const fullName = whatsappTarget.name || `${whatsappTarget.client?.firstName || ''} ${whatsappTarget.client?.lastName || ''}`.trim();
            const username = whatsappTarget.client?.username || '';
            const wpT = locales[whatsappLang];
            const message = wpT.invitations.whatsappMessage
              .replace('{fullName}', fullName)
              .replace('{username}', username);
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {(['tr', 'en', 'de'] as Locale[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setWhatsappLang(l)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        whatsappLang === l
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {l === 'tr' ? 'Türkçe' : l === 'en' ? 'English' : 'Deutsch'}
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">{t.invitations.whatsappPreview}</p>
                  <div className="bg-slate-50 rounded-lg p-3 text-sm whitespace-pre-line text-slate-700 border max-h-60 overflow-y-auto">
                    {message}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setWhatsappTarget(null); setWhatsappLang('tr'); }}>
                    {t.common.cancel}
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      const encoded = encodeURIComponent(message);
                      window.open(`https://web.whatsapp.com/send?text=${encoded}`, '_blank');
                      setWhatsappTarget(null);
                      setWhatsappLang('tr');
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {t.invitations.whatsappSend}
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Batch Import Dialog */}
      <Dialog open={batchImportOpen} onOpenChange={(open) => !open && closeBatchImport()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.invitations.batchImportTitle}</DialogTitle>
            <DialogDescription className="sr-only">{t.invitations.batchImportTitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.invitations.selectExcelFile}</Label>
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                onClick={() => batchFileRef.current?.click()}
              >
                {batchFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">{batchFile.name}</span>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-500"
                      onClick={(e) => { e.stopPropagation(); setBatchFile(null); setBatchPreview([]); }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-6 w-6 text-slate-400" />
                    <p className="text-sm text-slate-500">{t.invitations.selectExcelFile}</p>
                  </div>
                )}
              </div>
              <input
                ref={batchFileRef}
                type="file"
                className="hidden"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setBatchFile(file);
                    const XLSX = require('xlsx-js-style');
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const wb = XLSX.read(ev.target?.result, { type: 'array' });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                        setBatchPreview(rows);
                      } catch { setBatchPreview([]); }
                    };
                    reader.readAsArrayBuffer(file);
                  }
                  e.target.value = '';
                }}
              />
            </div>

            {batchPreview.length > 0 ? (() => {
              const headerIdx = batchPreview.findIndex(row => row.some(c => String(c).toUpperCase().includes('SOYADI')));
              const titleText = headerIdx > 0 ? batchPreview.slice(0, headerIdx).map(r => r.filter(c => String(c).trim()).join(' ')).filter(Boolean).join(' ') : null;
              const headerRow = headerIdx >= 0 ? batchPreview[headerIdx] : batchPreview[0];
              const dataRows = batchPreview.slice((headerIdx >= 0 ? headerIdx : 0) + 1);
              const colCount = headerRow?.length || 4;
              return (
              <div className="space-y-2">
                <Label>{t.invitations.excelPreview} ({dataRows.length} {t.tours.clients.toLowerCase()})</Label>
                <div className="border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0">
                      {titleText && (
                        <tr className="bg-blue-50 border-b">
                          <th colSpan={colCount} className="px-3 py-1.5 text-left font-semibold text-blue-700 italic">{titleText}</th>
                        </tr>
                      )}
                      <tr className="bg-green-50 border-b">
                        {headerRow?.map((cell, i) => (
                          <th key={i} className="px-3 py-1.5 text-left font-semibold text-green-800">{String(cell)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dataRows.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-1">{String(cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              ); })() : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t.invitations.excelTemplate}</Label>
                  <button
                    type="button"
                    onClick={() => {
                      const XLSX = require('xlsx-js-style');
                      const data = [
                        [t.invitations.excelRowNo, t.invitations.excelLastName, t.invitations.excelFirstName, t.invitations.excelGender],
                        [1, 'HILLEBRAND', 'INGE', 'MRS'],
                        [2, 'SUPPAN-DANIA', 'BETTINA', 'MRS'],
                        [3, 'SCHNEIDER', 'KARIN', 'MR'],
                      ];
                      const ws = XLSX.utils.aoa_to_sheet(data);
                      ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 12 }];
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Misafirler');
                      XLSX.writeFile(wb, 'misafir_sablonu.xlsx');
                    }}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t.invitations.downloadTemplate}
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b">
                        <th className="px-3 py-1.5 text-left font-semibold text-slate-700">{t.invitations.excelRowNo}</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-slate-700">{t.invitations.excelLastName}</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-slate-700">{t.invitations.excelFirstName}</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-slate-700">{t.invitations.excelGender}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr><td className="px-3 py-1 text-slate-500">1</td><td className="px-3 py-1">HILLEBRAND</td><td className="px-3 py-1">INGE</td><td className="px-3 py-1">MRS</td></tr>
                      <tr><td className="px-3 py-1 text-slate-500">2</td><td className="px-3 py-1">SUPPAN-DANIA</td><td className="px-3 py-1">BETTINA</td><td className="px-3 py-1">MRS</td></tr>
                      <tr><td className="px-3 py-1 text-slate-500">3</td><td className="px-3 py-1">SCHNEIDER</td><td className="px-3 py-1">KARIN</td><td className="px-3 py-1">MR</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                  ⚠ {t.invitations.excelTemplateDesc}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeBatchImport}>
                {t.common.cancel}
              </Button>
              <Button
                disabled={!batchFile || batchImportMutation.isPending}
                onClick={() => {
                  if (batchFile) {
                    batchImportMutation.mutate({ file: batchFile });
                  }
                }}
              >
                {batchImportMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" />{t.common.loading}</>
                ) : (
                  <><Upload className="h-4 w-4 mr-1" />{t.invitations.batchImport}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox — portal ile body seviyesinde render, Dialog'un üstünde */}
      {lightboxImages.length > 0 && createPortal(
        <div
          id="tour-lightbox"
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {lightboxImages.length > 1 && lightboxIndex > 0 && (
            <button
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i - 1); }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {lightboxImages.length > 1 && lightboxIndex < lightboxImages.length - 1 && (
            <button
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i + 1); }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute -top-3 -right-3 bg-black/70 hover:bg-black/90 text-white rounded-full p-1 z-10"
              onClick={closeLightbox}
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightboxImages[lightboxIndex]}
              alt=""
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            />
          </div>

          {lightboxImages.length > 1 && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
              {lightboxIndex + 1} / {lightboxImages.length}
            </span>
          )}
        </div>,
        document.body
      )}

      {/* Create Tour Dialog */}
      <Dialog open={createTourOpen} onOpenChange={setCreateTourOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{a.createTour}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTourSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tourCode">{t.tours.tourCode} *</Label>
                  <Input
                    id="tourCode"
                    value={tourFormData.tourCode}
                    onChange={(e) => {
                      setTourFormData((prev) => ({ ...prev, tourCode: e.target.value }));
                      if (tourFieldErrors.tourCode) setTourFieldErrors((prev) => ({ ...prev, tourCode: undefined }));
                    }}
                    placeholder="TR-001"
                    className={tourFieldErrors.tourCode ? 'border-red-500' : ''}
                  />
                  {tourFieldErrors.tourCode && <p className="text-xs text-red-500">{tourFieldErrors.tourCode}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tourName">{t.tours.name} *</Label>
                  <Input
                    id="tourName"
                    value={tourFormData.tourName}
                    onChange={(e) => {
                      setTourFormData((prev) => ({ ...prev, tourName: e.target.value }));
                      if (tourFieldErrors.tourName) setTourFieldErrors((prev) => ({ ...prev, tourName: undefined }));
                    }}
                    placeholder={t.tours.name}
                    className={tourFieldErrors.tourName ? 'border-red-500' : ''}
                  />
                  {tourFieldErrors.tourName && <p className="text-xs text-red-500">{tourFieldErrors.tourName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t.tours.startDate} *</Label>
                  <DateTimeInput
                    id="startDate"
                    value={tourFormData.startDate}
                    onChange={(e) => {
                      setTourFormData((prev) => ({ ...prev, startDate: e.target.value }));
                      if (tourFieldErrors.startDate) setTourFieldErrors((prev) => ({ ...prev, startDate: undefined }));
                    }}
                    className={tourFieldErrors.startDate ? 'border-red-500' : ''}
                  />
                  {tourFieldErrors.startDate && <p className="text-xs text-red-500">{tourFieldErrors.startDate}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t.tours.endDate} *</Label>
                  <DateTimeInput
                    id="endDate"
                    value={tourFormData.endDate}
                    onChange={(e) => {
                      setTourFormData((prev) => ({ ...prev, endDate: e.target.value }));
                      if (tourFieldErrors.endDate) setTourFieldErrors((prev) => ({ ...prev, endDate: undefined }));
                    }}
                    className={tourFieldErrors.endDate ? 'border-red-500' : ''}
                  />
                  {tourFieldErrors.endDate && <p className="text-xs text-red-500">{tourFieldErrors.endDate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minParticipants">{t.tours.minParticipants}</Label>
                  <Input
                    id="minParticipants"
                    type="number"
                    min={1}
                    value={tourFormData.minParticipants || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setTourFormData((prev) => ({
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
                    value={tourFormData.maxParticipants || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setTourFormData((prev) => ({
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
                  value={tourFormData.description}
                  onChange={(e) =>
                    setTourFormData((prev) => ({ ...prev, description: e.target.value }))
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
              <Button type="button" variant="outline" onClick={closeCreateTourForm}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={createTourMutation.isPending}>
                {createTourMutation.isPending ? t.common.loading : t.common.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
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

export default function AgencyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<AdminUpdateAgencyDto>({});
  const [imgError, setImgError] = useState(false);
  const [statusUpdateTarget, setStatusUpdateTarget] = useState<CompanyStatus | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const a = t.admin as Record<string, string>;

  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-agency-detail', id],
    queryFn: () => adminApi.getAgencyById(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: AdminUpdateAgencyDto) => adminApi.updateAgency(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agency-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-agencies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-agencies-counts'] });
      toast.success(a.saveSuccess);
      setEditMode(false);
    },
    onError: (error) => {
      toast.error((error as Error).message || a.saveError);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: CompanyStatus) =>
      adminApi.updateCompanyStatus({ type: 'agency', id, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agency-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-agencies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-agencies-counts'] });
      toast.success(a.agencyStatusUpdated);
      setStatusUpdateTarget(null);
    },
    onError: (error) => {
      toast.error((error as Error).message || a.statusUpdateError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteAgency(id),
    onSuccess: () => {
      toast.success(a.deleteSuccess);
      router.push('/admin/agencies');
    },
    onError: (error) => {
      toast.error((error as Error).message || a.deleteError);
    },
  });

  if (isLoading) return <LoadingState message={t.common.loading} />;

  if (!result?.success || !result.data) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.push('/admin/agencies')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {a.backToList}
        </Button>
        <div className="mt-8 text-center">
          <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">{a.notFound}</p>
        </div>
      </div>
    );
  }

  const agency = result.data as AgencyDetail;
  const coverUrl = resolveAgencyImageUrl(agency);
  const status = agency.status as CompanyStatus;
  const StatusIcon = statusIcons[status];

  const enterEditMode = () => {
    setForm({
      name: agency.name,
      description: agency.description || '',
      email: agency.email,
      phone: agency.phone?.toString() || '',
      address: agency.address || '',
      legalName: agency.legalName || '',
      taxNumber: agency.taxNumber?.toString() || '',
      taxOffice: agency.taxOffice || '',
    });
    setEditMode(true);
  };

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: typeof Mail }) => (
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => router.push('/admin/agencies')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {a.backToList}
          </Button>
          <div className="p-2.5 bg-blue-100 rounded-xl shrink-0">
            <Briefcase className="h-6 w-6 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{agency.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${statusColors[status]} text-xs`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {a[`agencyStatus${status.charAt(0).toUpperCase()}${status.slice(1)}` as string] || status}
              </Badge>
              <span className="text-xs text-slate-400">ID: {agency.id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!editMode ? (
            <Button onClick={enterEditMode} variant="outline" size="sm">
              <Edit3 className="h-4 w-4 mr-1" />
              {a.editMode}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setEditMode(false)}
                variant="outline"
                size="sm"
              >
                <X className="h-4 w-4 mr-1" />
                {a.cancelEdit}
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {updateMutation.isPending ? a.saving : a.saveChanges}
              </Button>
            </>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {a.deleteButton}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">{a.tabGeneral}</TabsTrigger>
          <TabsTrigger value="tours">{a.tabTours}</TabsTrigger>
        </TabsList>

        {/* ==================== GENERAL TAB ==================== */}
        <TabsContent value="general" className="space-y-6">

      {/* Cover Image */}
      {coverUrl && !imgError && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{a.coverImage}</h3>
            <div className="h-48 rounded-xl overflow-hidden bg-slate-100">
              <img
                src={coverUrl}
                alt={agency.name}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Info */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
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
                  <label className="text-xs text-slate-500 mb-1 block">{a.descriptionLabel}</label>
                  <Textarea
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow label={a.nameLabel} value={agency.name} />
                <InfoRow label={a.descriptionLabel} value={agency.description} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" />
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
                    href={`mailto:${agency.email}`}
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" />
                    {agency.email}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs mb-0.5">{a.phoneLabel}</span>
                  <span className="text-slate-700 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {agency.phoneCountryCode ? `+${agency.phoneCountryCode} ` : ''}
                    {agency.phone || '-'}
                  </span>
                </div>
                {/* Authorized Person - from AgencyResponseDto doesn't have this, but show if available */}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              {a.addressLocation}
            </h3>
            {editMode ? (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{a.addressLabel}</label>
                <Textarea
                  value={form.address || ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                />
              </div>
            ) : (
              <InfoRow label={a.addressLabel} value={agency.address} icon={MapPin} />
            )}
          </CardContent>
        </Card>

        {/* Tax & Legal */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-blue-500" />
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
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow label={a.legalNameLabel} value={agency.legalName} icon={FileText} />
                <InfoRow label={a.taxNumberLabel} value={agency.taxNumber?.toString()} icon={Hash} />
                <InfoRow label={a.taxOfficeLabel} value={agency.taxOffice} icon={Landmark} />
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
                {a.createdAt}: {new Date(agency.createdAt).toLocaleString('tr-TR')}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {a.updatedAt}: {new Date(agency.updatedAt).toLocaleString('tr-TR')}
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
                      {a.agencyApprove}
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
                      {a.agencySuspend}
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
                      {a.setPending || 'Beklemeye Al'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {status === 'pending' && <TooltipContent>{t.tooltips.alreadyPending}</TooltipContent>}
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>

        </TabsContent>

        {/* ==================== TOURS TAB ==================== */}
        <TabsContent value="tours">
          <AgencyToursTab agencyId={id} />
        </TabsContent>
      </Tabs>

      {/* Status Update Confirmation */}
      <ConfirmDialog
        open={!!statusUpdateTarget}
        onOpenChange={() => setStatusUpdateTarget(null)}
        title={a.statusLabel}
        description={
          statusUpdateTarget === 'suspended'
            ? (a.agencyConfirmSuspend || '').replace('{name}', agency.name)
            : statusUpdateTarget === 'active'
              ? (a.agencyConfirmApprove || '').replace('{name}', agency.name)
              : statusUpdateTarget === 'pending'
                ? (a.agencyConfirmPending || '').replace('{name}', agency.name)
                : ''
        }
        onConfirm={() => statusUpdateTarget && statusMutation.mutate(statusUpdateTarget)}
        variant={statusUpdateTarget === 'suspended' ? 'destructive' : 'default'}
        confirmLabel={t.common.yes}
        cancelLabel={t.common.no}
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
