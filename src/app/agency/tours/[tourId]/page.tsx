'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  UserPlus,
  Link2,
  Copy,
  Search,
  Mail,
  Phone,
  CalendarPlus,
  Star,
  MapPin,
  Loader2,
  Minus,
  Percent,
  ClipboardList,
  DollarSign,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  Send,
  MessageCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

import dynamic from 'next/dynamic';

import { tourApi, tourStopApi, apiClient, agencyApi } from '@/lib/api';
import { getCurrencySymbol } from '@/lib/utils';
import type { ApiTourDto, ApiTourStopDto, CreateTourStopPayload, UpdateTourPayload, ServiceRequestDto, OrganizationPublicDto, TourClientDto, AgencyClientDto, AgencyStopChoicesDto, AgencyStopServiceSummaryDto, CategoryDto, LocationDto, CreateAgencyClientDto, ClientStopMenuCategoryDto, ClientStopMenuServiceDto, SelectionLimit } from '@/lib/api';
import { ServiceDetailDialog } from '@/components/shared/ServiceDetailDialog';
import { formatDate, formatShortDateTime } from '@/lib/dateUtils';

// UTC ISO string'i datetime-local input formatına (yerel saat) çevirir
const toLocalDatetimeString = (isoString: string): string => {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
import { useLanguage } from '@/contexts/LanguageContext';
import { locales, type Locale } from '@/locales';

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
import { DateTimeInput } from '@/components/ui/datetime-input';
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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LoadingState, EmptyState, ErrorState, TourStatusBadge, ConfirmDialog,
  CompactReceipt, DetailedListReceipt, KitchenSummaryReceipt, ReceiptTableServices, ReceiptServiceSummary,
  handleReceiptPrint, exportReceiptExcel, ChoiceDeadlineCountdown,
} from '@/components/shared';
import type { ReceiptTemplate } from '@/components/shared';
import { DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

function resolveImageUrl(url?: string | null): string | null {
  return url || null;
}

// Menu Preview Components
function MenuPreviewServiceList({ services, t, onServiceClick }: { services: ClientStopMenuServiceDto[]; t: ReturnType<typeof useLanguage>['t']; onServiceClick?: (svc: ClientStopMenuServiceDto) => void }) {
  if (!services.length) return null;
  const priceLabel = (type: string) => {
    if (type === 'per_person') return `/ ${t.menu.perPerson}`;
    if (type === 'per_hour') return `/ ${t.menu.perHour}`;
    if (type === 'per_day') return `/ ${t.menu.perDay}`;
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
              <p className="text-sm font-semibold text-stone-800 leading-tight truncate" title={s.title}>{s.title}</p>
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

function MenuPreviewCategoryLimitControl({ categoryId, value, onChange, t }: { categoryId: number; value: number | undefined; onChange: (categoryId: number, value: number | undefined) => void; t: ReturnType<typeof useLanguage>['t'] }) {
  const isUnlimited = value === undefined;
  return (
    <div className="flex items-center gap-0.5 bg-white/10 rounded-lg px-1 py-0.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (!isUnlimited) { onChange(categoryId, value === 0 ? undefined : value - 1); } }}
        className="w-5 h-5 flex items-center justify-center rounded text-white/70 hover:bg-white/20 transition-colors"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="min-w-[52px] text-center text-[11px] font-medium text-amber-400 select-none">
        {isUnlimited ? t.menu.stockUnlimited : value}
      </span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onChange(categoryId, isUnlimited ? 0 : value + 1); }}
        className="w-5 h-5 flex items-center justify-center rounded text-white/70 hover:bg-white/20 transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

function MenuPreviewCategoryItem({ cat, depth, t, onServiceClick, selectionLimits, onSelectionLimitChange }: { cat: ClientStopMenuCategoryDto; depth: number; t: ReturnType<typeof useLanguage>['t']; onServiceClick?: (svc: ClientStopMenuServiceDto) => void; selectionLimits?: Record<number, number>; onSelectionLimitChange?: (categoryId: number, value: number | undefined) => void }) {
  const [open, setOpen] = useState(depth === 0);
  const hasServices = cat.services?.length > 0;
  const hasChildren = cat.child_service_categories?.length > 0;
  if (!hasServices && !hasChildren) return null;
  return (
    <div>
      {depth === 0 ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="w-full bg-gradient-to-r from-stone-800 to-stone-700 px-4 py-3 rounded-xl mb-3 flex items-center justify-between cursor-pointer">
          <h3 className="text-lg font-bold text-white truncate mr-2">{cat.name}</h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {selectionLimits !== undefined && onSelectionLimitChange && (
              <MenuPreviewCategoryLimitControl
                categoryId={cat.id}
                value={selectionLimits[cat.id]}
                onChange={onSelectionLimitChange}
                t={t}
              />
            )}
            <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${open ? '' : '-rotate-90'}`} />
          </div>
        </button>
      ) : (
        <button type="button" onClick={() => setOpen((v) => !v)} className="w-full px-4 py-2 mb-2 flex items-center justify-between cursor-pointer">
          <h4 className="text-sm font-semibold text-stone-600 border-b border-stone-200 pb-1 flex-1 text-left">{cat.name}</h4>
          <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform ml-2 ${open ? '' : '-rotate-90'}`} />
        </button>
      )}
      {open && (
        <>
          {hasServices && <MenuPreviewServiceList services={cat.services} t={t} onServiceClick={onServiceClick} />}
          {hasChildren && <MenuPreviewCategoryTree categories={cat.child_service_categories} depth={depth + 1} t={t} onServiceClick={onServiceClick} selectionLimits={selectionLimits} onSelectionLimitChange={onSelectionLimitChange} />}
        </>
      )}
    </div>
  );
}

function MenuPreviewCategoryTree({ categories, depth, t, onServiceClick, selectionLimits, onSelectionLimitChange }: { categories: ClientStopMenuCategoryDto[]; depth: number; t: ReturnType<typeof useLanguage>['t']; onServiceClick?: (svc: ClientStopMenuServiceDto) => void; selectionLimits?: Record<number, number>; onSelectionLimitChange?: (categoryId: number, value: number | undefined) => void }) {
  return (
    <>
      {categories.map((cat) => (
        <MenuPreviewCategoryItem key={cat.id} cat={cat} depth={depth} t={t} onServiceClick={onServiceClick} selectionLimits={selectionLimits} onSelectionLimitChange={onSelectionLimitChange} />
      ))}
    </>
  );
}

export default function TourDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useLanguage();
  const apiLang = locale as 'tr' | 'en' | 'de';
  const tourId = Number(params.tourId);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStopFormOpen, setIsStopFormOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<ApiTourStopDto | null>(null);
  const [deleteStopTarget, setDeleteStopTarget] = useState<ApiTourStopDto | null>(null);
  const [statusAction, setStatusAction] = useState<'publish' | 'cancel' | 'complete' | null>(null);
  const [highlightedStopId, setHighlightedStopId] = useState<number | null>(null);
  const [deletePhotoId, setDeletePhotoId] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [whatsappTarget, setWhatsappTarget] = useState<any>(null);
  const [whatsappLang, setWhatsappLang] = useState<Locale>('tr');
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchPreview, setBatchPreview] = useState<string[][]>([]);
  const batchFileRef = useRef<HTMLInputElement>(null);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [addParticipantSearch, setAddParticipantSearch] = useState('');
  const [addParticipantNotes, setAddParticipantNotes] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [orgSearchDebounced, setOrgSearchDebounced] = useState('');
  const [selectedOrgDetail, setSelectedOrgDetail] = useState<OrganizationPublicDto | null>(null);
  const [orgFilterCityId, setOrgFilterCityId] = useState<number | null>(null);
  const [orgFilterDistrictId, setOrgFilterDistrictId] = useState<number | null>(null);
  const [orgFilterCategoryId, setOrgFilterCategoryId] = useState<number | null>(null);
  const [orgSortByCommission, setOrgSortByCommission] = useState<string>('');
  const [isMenuPreviewOpen, setIsMenuPreviewOpen] = useState(false);
  const [menuPreviewLang, setMenuPreviewLang] = useState<'tr' | 'en' | 'de'>('tr');
  const [menuDetailService, setMenuDetailService] = useState<ClientStopMenuServiceDto | null>(null);
  const [stopSelectionLimits, setStopSelectionLimits] = useState<Record<number, number>>({});
  const [choicesStopId, setChoicesStopId] = useState<number | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [createClientForm, setCreateClientForm] = useState({ firstName: '', lastName: '', username: '', password: '' });
  const [createClientErrors, setCreateClientErrors] = useState<Partial<Record<string, string>>>({});
  const [showCreateClientPassword, setShowCreateClientPassword] = useState(false);
  const [refreshingTab, setRefreshingTab] = useState<string | null>(null);

  // Receipt dialog
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTemplate, setReceiptTemplate] = useState<ReceiptTemplate>('compact');
  const printRef = useRef<HTMLDivElement>(null);

  const refreshTab = (tab: string) => {
    setRefreshingTab(tab);
    const keys: (string | number)[][] = [];
    if (tab === 'info') {
      keys.push(['agency-tour', tourId, apiLang], ['tour-service-requests', tourId, apiLang]);
    } else if (tab === 'stops') {
      keys.push(['tour-stops', tourId, apiLang], ['organizations-public-all', apiLang]);
    } else if (tab === 'clients') {
      keys.push(['tour-clients', tourId], ['agency-clients-all']);
    } else if (tab === 'choices') {
      keys.push(['tour-stops', tourId, apiLang]);
      if (choicesStopId) {
        keys.push(['agency-stop-choices', choicesStopId, apiLang], ['agency-stop-service-summary', choicesStopId, apiLang]);
      }
    }
    Promise.all(keys.map(k => queryClient.invalidateQueries({ queryKey: k }))).finally(() => {
      setTimeout(() => setRefreshingTab(null), 600);
    });
  };

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
    maxSpendLimit: '',
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
    queryKey: ['agency-tour', tourId, apiLang],
    queryFn: async () => {
      const result = await tourApi.getById(tourId, apiLang);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: !!tourId,
  });

  // Query: Tour stops
  const { data: stops, isLoading: stopsLoading } = useQuery({
    queryKey: ['tour-stops', tourId, apiLang],
    queryFn: async () => {
      const result = await tourStopApi.list(tourId, apiLang);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: !!tourId,
  });

  // Query: Service requests for tour
  const { data: serviceRequests } = useQuery({
    queryKey: ['tour-service-requests', tourId, apiLang],
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

  // Query: Agency clients (for add participant)
  const { data: agencyClients } = useQuery({
    queryKey: ['agency-clients-all'],
    queryFn: async () => {
      const response = await apiClient.getAgencyClients(1, 100);
      return response.data;
    },
    enabled: isAddParticipantOpen,
  });

  const agencyId = agencyResult?.success ? agencyResult.data?.id : undefined;

  // Query: All organizations (for map + stop form)
  const { data: allOrganizations } = useQuery({
    queryKey: ['organizations-public-all', apiLang, agencyId],
    queryFn: async () => {
      const response = await apiClient.getOrganizationsPublic(1, 100, undefined, apiLang, {
        agencyId: agencyId,
      });
      return response.data;
    },
    enabled: !!tourId && !!agencyId,
  });

  // organizations list for both map and stop form
  const organizations = allOrganizations;

  // Query: Stop choices (all customer choices for selected stop)
  const { data: stopChoices, isLoading: choicesLoading } = useQuery({
    queryKey: ['agency-stop-choices', choicesStopId, apiLang],
    queryFn: async () => {
      const response = await apiClient.getAgencyStopChoices(choicesStopId!, apiLang);
      return Array.isArray(response) ? response : (response as any).data ?? [];
    },
    enabled: !!choicesStopId,
  });

  // Query: Stop service summary
  const { data: serviceSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['agency-stop-service-summary', choicesStopId, apiLang],
    queryFn: async () => {
      const response = await apiClient.getAgencyStopServiceSummary(choicesStopId!, apiLang);
      return response;
    },
    enabled: !!choicesStopId,
  });

  // Note: layout endpoint is client-only (/client/tours/stops/{stopId}/layout), not available for agencies

  // Auto-select first stop in choices tab
  useEffect(() => {
    if (stops?.length && !choicesStopId) {
      setChoicesStopId(stops[0].id);
    }
  }, [stops, choicesStopId]);

  // Receipt helpers
  const selectedStop = stops?.find(s => s.id === choicesStopId);
  const choicesOrgName = selectedStop?.organization?.name || '';
  const agencyName = agencyResult?.success ? agencyResult.data?.name : undefined;
  const receiptTourInfo = tour ? {
    tourName: tour.tourName,
    agencyName: agencyName || '',
    startDate: tour.startDate,
    stopStartDate: selectedStop?.scheduledStartTime,
    stopEndDate: selectedStop?.scheduledEndTime,
  } : { tourName: '', startDate: '' };
  const choicesArr = stopChoices || [];

  const handlePrint = useCallback(() => {
    handleReceiptPrint(printRef, receiptTemplate);
  }, [receiptTemplate]);

  const handleExportExcel = useCallback(() => {
    if (!choicesArr.length) return;
    exportReceiptExcel(receiptTourInfo, choicesArr, serviceSummary ?? null, choicesOrgName, t);
  }, [choicesArr, serviceSummary, choicesOrgName, t, receiptTourInfo]);

  // Debounced organization search for stop form
  useEffect(() => {
    const timer = setTimeout(() => setOrgSearchDebounced(orgSearch), 300);
    return () => clearTimeout(timer);
  }, [orgSearch]);

  // Query: Search organizations for stop form
  const { data: searchedOrgs, isLoading: orgSearchLoading } = useQuery({
    queryKey: ['org-search', orgSearchDebounced, orgFilterCityId, orgFilterDistrictId, orgFilterCategoryId, orgSortByCommission, agencyId, apiLang],
    queryFn: async () => {
      const response = await apiClient.getOrganizationsPublic(1, 20, orgSearchDebounced || undefined, apiLang, {
        cityId: orgFilterCityId || undefined,
        districtId: orgFilterDistrictId || undefined,
        categoryId: orgFilterCategoryId || undefined,
        sortByCommission: orgSortByCommission || undefined,
        agencyId: agencyId,
      });
      return response.data || [];
    },
    enabled: isStopFormOpen,
  });

  // Query: Cities for org filter
  const { data: filterCities } = useQuery({
    queryKey: ['filter-cities'],
    queryFn: async () => {
      const response = await apiClient.getCities();
      return response.data || [];
    },
    enabled: isStopFormOpen,
  });

  // Query: Districts for org filter (depends on selected city)
  const { data: filterDistricts } = useQuery({
    queryKey: ['filter-districts', orgFilterCityId],
    queryFn: async () => {
      const response = await apiClient.getDistricts(orgFilterCityId!);
      return response.data || [];
    },
    enabled: isStopFormOpen && !!orgFilterCityId,
  });

  // Query: Organization categories for org filter
  const { data: filterCategories } = useQuery({
    queryKey: ['filter-org-categories'],
    queryFn: async () => {
      const response = await apiClient.getOrganizationCategories();
      return response.data || [];
    },
    enabled: isStopFormOpen,
  });

  // Query: Organization/Stop menu for preview (use stop endpoint when editing existing stop)
  const { data: orgMenuPreview } = useQuery({
    queryKey: editingStop ? ['stop-menu-preview', editingStop.id, menuPreviewLang] : ['org-menu-preview', selectedOrgDetail?.id, menuPreviewLang],
    queryFn: async () => {
      if (editingStop) {
        const response = await apiClient.getStopMenu(editingStop.id, menuPreviewLang);
        return Array.isArray(response) ? response : (response as unknown as { data: ClientStopMenuCategoryDto[] }).data ?? [];
      }
      const response = await apiClient.getOrganizationMenu(selectedOrgDetail!.id, menuPreviewLang);
      return Array.isArray(response) ? response : (response as unknown as { data: ClientStopMenuCategoryDto[] }).data ?? [];
    },
    enabled: isMenuPreviewOpen && (!!editingStop || !!selectedOrgDetail?.id),
  });

  // Auto-populate missing depth-0 categories with default limit of 1 (only once per org)
  const limitsInitializedForOrg = useRef<number | null>(null);
  useEffect(() => {
    if (!orgMenuPreview || orgMenuPreview.length === 0 || !selectedOrgDetail?.id) return;
    if (limitsInitializedForOrg.current === selectedOrgDetail.id) return;
    limitsInitializedForOrg.current = selectedOrgDetail.id;
    setStopSelectionLimits((prev) => {
      const missing = orgMenuPreview.filter((cat) => prev[cat.id] === undefined);
      if (missing.length === 0) return prev;
      const next = { ...prev };
      for (const cat of missing) next[cat.id] = 1;
      return next;
    });
  }, [orgMenuPreview, selectedOrgDetail?.id]);

  // Mutations

  const handleDownloadParticipantsPdf = () => {
    if (!tourClients?.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = tourClients.map((tc: TourClientDto, i: number) => {
      const c = tc.client;
      const name = c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : `#${tc.clientId}`;
      const email = c?.email || '-';
      const username = c?.username || '-';
      const phone = c?.phone ? `+${c.phoneCountryCode || '90'} ${c.phone}` : '-';
      return `<tr>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">${i + 1}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0">${name}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0">${email}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0">${username}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0">${phone}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">${tc.status || '-'}</td>
      </tr>`;
    }).join('');
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t.invitations.clientList}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: #1e293b; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        p { font-size: 13px; color: #64748b; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { padding: 8px 10px; border: 1px solid #cbd5e1; background: #f1f5f9; font-weight: 600; text-align: left; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>${tour?.tourName || ''}</h1>
      <p>${t.invitations.clientList} — ${tourClients.length} ${t.tours.clients.toLowerCase()}</p>
      <table>
        <thead><tr>
          <th style="text-align:center">#</th>
          <th>${t.invitations.columnClient}</th>
          <th>${t.invitations.columnEmail}</th>
          <th>${t.invitations.columnUsername}</th>
          <th>${t.common.phone || 'Telefon'}</th>
          <th style="text-align:center">${t.invitations.columnStatus}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleSendParticipantsWhatsapp = () => {
    if (!tourClients?.length) return;
    const lines = tourClients.map((tc: TourClientDto, i: number) => {
      const c = tc.client;
      const n = c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : `#${tc.clientId}`;
      return `${i + 1}. ${n}`;
    });
    const header = `*${t.invitations.clientList}* — ${tour?.tourName || ''}`;
    const text = encodeURIComponent(`${header}\n\n${lines.join('\n')}`);
    window.open(`https://web.whatsapp.com/send?text=${text}`, '_blank');
  };

  const closeBatchImport = () => {
    setBatchImportOpen(false);
    setBatchFile(null);
    setBatchPreview([]);
  };

  const batchImportMutation = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      const result = await agencyApi.batchImportClients(file, apiLang, tourId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (result) => {
      const msg = t.invitations.batchImportSuccess
        .replace('{successful}', String(result?.successful ?? 0))
        .replace('{totalRows}', String(result?.totalRows ?? 0));
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['tour-clients', tourId] });
      closeBatchImport();
    },
    onError: (err: Error) => {
      toast.error(err.message || t.invitations.batchImportFailed);
    },
  });

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

  const addParticipantMutation = useMutation({
    mutationFn: async ({ clientId, notes }: { clientId: number; notes?: string }) => {
      const result = await tourApi.addParticipant(tourId, clientId, notes);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-clients', tourId] });
      queryClient.invalidateQueries({ queryKey: ['tour-detail', tourId] });
      toast.success(t.tours.participantAdded);
      setIsAddParticipantOpen(false);
      setAddParticipantSearch('');
      setAddParticipantNotes('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createClientMutation = useMutation({
    mutationFn: (data: CreateAgencyClientDto) => agencyApi.createClient(data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.invitations?.clientCreated || 'Misafir oluşturuldu');
        queryClient.invalidateQueries({ queryKey: ['agency-clients'] });
        setIsCreateClientOpen(false);
        setCreateClientForm({ firstName: '', lastName: '', username: '', password: '' });
        setCreateClientErrors({});
        setShowCreateClientPassword(false);
      } else {
        toast.error(result.error || t.invitations?.clientCreateFailed || 'Misafir oluşturulamadı');
      }
    },
    onError: () => {
      toast.error(t.invitations?.clientCreateFailed || 'Misafir oluşturulamadı');
    },
  });

  const updateTourMutation = useMutation({
    mutationFn: async () => {
      const payload: UpdateTourPayload = {
        tourCode: editForm.tourCode,
        tourName: editForm.tourName,
        description: editForm.description || undefined,
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
        maxParticipants: editForm.maxParticipants || undefined,
        minParticipants: editForm.minParticipants || undefined,
      };
      const result = await tourApi.update(
        tourId,
        payload,
        editCoverFile || undefined,
        editGalleryFiles.length > 0 ? editGalleryFiles : undefined,
        apiLang
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

  const addPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const result = await tourApi.addPhoto(tourId, file);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tour', tourId] });
      toast.success(t.tours.photoAdded);
    },
    onError: (err: Error) => {
      toast.error(err.message || t.common.error);
    },
  });

  const createStopMutation = useMutation({
    mutationFn: async () => {
      const limits: SelectionLimit[] = Object.entries(stopSelectionLimits).map(([id, max]) => ({
        id: Number(id),
        type: 'service-category' as const,
        max,
      }));
      const payload: CreateTourStopPayload = {
        tourId,
        organizationId: stopForm.organizationId,
        description: stopForm.description || undefined,
        scheduledStartTime: stopForm.scheduledStartTime || '',
        scheduledEndTime: stopForm.scheduledEndTime || '',
        showPriceToCustomer: stopForm.showPriceToCustomer,
        maxSpendLimit: stopForm.maxSpendLimit !== '' ? Number(stopForm.maxSpendLimit) : null,
        ...(limits.length > 0 ? { selectionLimits: limits } : {}),
      };
      const result = await tourStopApi.create(payload, apiLang);
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
      const limits: SelectionLimit[] = Object.entries(stopSelectionLimits).map(([id, max]) => ({
        id: Number(id),
        type: 'service-category' as const,
        max,
      }));
      const result = await tourStopApi.update(editingStop.id, {
        description: stopForm.description || undefined,
        scheduledStartTime: stopForm.scheduledStartTime || undefined,
        scheduledEndTime: stopForm.scheduledEndTime || undefined,
        showPriceToCustomer: stopForm.showPriceToCustomer,
        maxSpendLimit: stopForm.maxSpendLimit !== '' ? Number(stopForm.maxSpendLimit) : null,
        selectionLimits: limits.length > 0 ? limits : null,
      }, apiLang);
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
      const result = await tourStopApi.delete(id, apiLang);
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

  const submitChoicesMutation = useMutation({
    mutationFn: async (stopId: number) => {
      const result = await tourStopApi.submitChoices(stopId, apiLang);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-stop-choices'] });
      queryClient.invalidateQueries({ queryKey: ['agency-stop-service-summary'] });
      queryClient.invalidateQueries({ queryKey: ['tour-stops', tourId] });
      toast.success(t.tours.submitChoicesSuccess);
    },
    onError: (err: Error) => {
      toast.error(err.message || t.tours.submitChoicesError);
    },
  });

  // Handlers

  const openEditForm = () => {
    if (!tour) return;
    setEditForm({
      tourCode: tour.tourCode,
      tourName: tour.tourName,
      description: tour.description || '',
      startDate: tour.startDate ? toLocalDatetimeString(tour.startDate) : '',
      endDate: tour.endDate ? toLocalDatetimeString(tour.endDate) : '',
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
      maxSpendLimit: '',
    });
    setStopSelectionLimits({});
    limitsInitializedForOrg.current = null;
    setOrgSearch('');
    setSelectedOrgDetail(null);
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
      maxSpendLimit: stop.maxSpendLimit != null ? String(stop.maxSpendLimit) : '',
    });
    // Populate selectionLimits from existing stop data
    if (stop.selectionLimits?.length) {
      const limitsMap: Record<number, number> = {};
      for (const sl of stop.selectionLimits) {
        if (sl.type === 'service-category') limitsMap[sl.id] = sl.max;
      }
      setStopSelectionLimits(limitsMap);
    } else {
      setStopSelectionLimits({});
    }
    // Find org from existing data for edit mode
    const existingOrg = organizations?.find((o) => o.id === stop.organizationId);
    if (existingOrg) {
      setSelectedOrgDetail(existingOrg);
      setOrgSearch(existingOrg.name);
    } else {
      setOrgSearch('');
      setSelectedOrgDetail(null);
    }
    setIsStopFormOpen(true);
  };

  const openCreateStopFromMap = (org: OrganizationPublicDto) => {
    if (tour?.status !== 'draft' && tour?.status !== 'published') return;
    const defaults = getDefaultStopTimes();
    setEditingStop(null);
    setStopForm({
      organizationId: org.id,
      description: '',
      scheduledStartTime: defaults.start,
      scheduledEndTime: defaults.end,
      showPriceToCustomer: false,
      maxSpendLimit: '',
    });
    setStopSelectionLimits({});
    limitsInitializedForOrg.current = null;
    setSelectedOrgDetail(org);
    setOrgSearch(org.name);
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
      maxSpendLimit: '',
    });
    setStopSelectionLimits({});
    limitsInitializedForOrg.current = null;
    setOrgSearch('');
    setSelectedOrgDetail(null);
    setOrgFilterCityId(null);
    setOrgFilterDistrictId(null);
    setOrgFilterCategoryId(null);
    setOrgSortByCommission('');
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
      <Header title={t.tours.detail} organizationStatus={agencyStatus} lang={locale} />

      <div className="flex-1 p-3 md:p-6 overflow-auto">
        {/* Top Info Bar */}
        <div className="space-y-3 mb-4 md:mb-6">
          {/* Row 1: Back + Title + Status */}
          <div className="flex items-start gap-2 md:gap-4">
            <Button variant="outline" size="icon" className="shrink-0 h-8 w-8 md:h-10 md:w-10" onClick={() => router.push('/agency/tours')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-2xl font-bold truncate">{tour.tourName}</h2>
                <TourStatusBadge status={tour.status} />
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5 line-clamp-2">{tour.description}</p>
            </div>
          </div>

          {/* Row 2: Meta info */}
          <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(tour.startDate)} - {formatDate(tour.endDate)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Users className="h-3.5 w-3.5" />
              <span>{tourClients?.length || 0} / {tour.maxParticipants || '-'} {t.tours.people}</span>
            </div>
          </div>

          {/* Row 3: Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="outline" size="sm" onClick={openEditForm} disabled={tour.status !== 'draft' && tour.status !== 'published'}>
                    <Pencil className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">{t.common.edit}</span>
                  </Button>
                </span>
              </TooltipTrigger>
              {tour.status !== 'draft' && tour.status !== 'published' && <TooltipContent>{t.tooltips.tourNotDraftOrPublished}</TooltipContent>}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button size="sm" onClick={() => setStatusAction('publish')} disabled={tour.status !== 'draft'}>
                    <PlayCircle className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">{t.tours.publish}</span>
                  </Button>
                </span>
              </TooltipTrigger>
              {tour.status !== 'draft' && <TooltipContent>{t.tooltips.tourNotDraft}</TooltipContent>}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button size="sm" variant="outline" onClick={() => setStatusAction('complete')} disabled={tour.status !== 'published'}>
                    <CheckCircle className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">{t.tours.complete}</span>
                  </Button>
                </span>
              </TooltipTrigger>
              {tour.status !== 'published' && <TooltipContent>{t.tooltips.tourNotPublished}</TooltipContent>}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button size="sm" variant="destructive" onClick={() => setStatusAction('cancel')} disabled={tour.status !== 'published'}>
                    <Ban className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">{t.tours.cancel}</span>
                  </Button>
                </span>
              </TooltipTrigger>
              {tour.status !== 'published' && <TooltipContent>{t.tooltips.tourNotPublished}</TooltipContent>}
            </Tooltip>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-3 md:space-y-4">
          <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
            <TabsList className="w-max md:w-auto">
              <TabsTrigger value="info" className="text-xs md:text-sm">{t.tours.info}</TabsTrigger>
              <TabsTrigger value="stops" className="text-xs md:text-sm">{t.tours.stops} ({stops?.length || 0})</TabsTrigger>
              <TabsTrigger value="clients" className="text-xs md:text-sm">{t.tours.clients} ({tourClients?.length || 0})</TabsTrigger>
              <TabsTrigger value="choices" className="text-xs md:text-sm">{t.tours.customerChoices}</TabsTrigger>
            </TabsList>
          </div>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-3 md:space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => refreshTab('info')} disabled={refreshingTab === 'info'}>
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshingTab === 'info' ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </div>
            <div className="grid gap-3 md:gap-6 lg:grid-cols-2">
              {/* Tour Details */}
              <Card>
                <CardHeader className="p-3 md:p-6">
                  <CardTitle className="text-sm md:text-lg">{t.tours.info}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0 space-y-3 md:space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <p className="text-xs md:text-sm text-slate-500">{t.tours.tourCode}</p>
                      <p className="font-mono font-medium text-sm md:text-base">{tour.tourCode}</p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-slate-500">{t.tours.status}</p>
                      <TourStatusBadge status={tour.status} />
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <p className="text-xs md:text-sm text-slate-500">{t.tours.startDate}</p>
                      <p className="font-medium text-sm md:text-base">{formatDate(tour.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-slate-500">{t.tours.endDate}</p>
                      <p className="font-medium text-sm md:text-base">{formatDate(tour.endDate)}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <p className="text-xs md:text-sm text-slate-500">{t.tours.minParticipants}</p>
                      <p className="font-medium text-sm md:text-base">{tour.minParticipants || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-slate-500">{t.tours.maxParticipants}</p>
                      <p className="font-medium text-sm md:text-base">{tour.maxParticipants || '-'}</p>
                    </div>
                  </div>
                  {tour.description && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs md:text-sm text-slate-500">{t.tours.tourDescription}</p>
                        <p className="mt-1 text-sm md:text-base">{tour.description}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Cover Image */}
              <Card>
                <CardHeader className="p-3 md:p-6">
                  <CardTitle className="text-sm md:text-lg flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 md:h-5 md:w-5" />
                    {t.tours.coverImage}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  {resolveImageUrl(tour.coverImageUrl) ? (
                    <div className="w-full h-36 md:h-48 rounded-lg overflow-hidden bg-slate-100 cursor-pointer" onClick={() => setLightboxImage(resolveImageUrl(tour.coverImageUrl))}>
                      <img
                        src={resolveImageUrl(tour.coverImageUrl)!}
                        alt={tour.tourName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <EmptyState
                      icon={ImageIcon}
                      title={t.tours.coverImage}
                      description={t.tours.noTours}
                    />
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Gallery */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    {t.tours.gallery}
                    {tour.galleryImages && tour.galleryImages.length > 0 && (
                      <span className="text-sm font-normal text-slate-500">({tour.galleryImages.length})</span>
                    )}
                  </CardTitle>
                  {(tour.status === 'draft' || tour.status === 'published') && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={addPhotoMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t.tours.addPhoto}
                      </Button>
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files) {
                            Array.from(files).forEach((file) => addPhotoMutation.mutate(file));
                          }
                          e.target.value = '';
                        }}
                      />
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {tour.galleryImages && tour.galleryImages.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 justify-center">
                    {tour.galleryImages.map((img) => {
                      const imgSrc = resolveImageUrl(img.imageUrl);
                      if (!imgSrc) return null;
                      return (
                        <div key={img.id} className="relative group flex-shrink-0 w-36 h-28">
                          <div
                            className="w-full h-full rounded-lg overflow-hidden bg-slate-100 cursor-pointer"
                            onClick={() => setLightboxImage(imgSrc)}
                          >
                            <img
                              src={imgSrc}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0} className="absolute top-1 right-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setDeletePhotoId(img.id); }}
                                  disabled={tour.status !== 'draft' && tour.status !== 'published'}
                                  className="bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            </TooltipTrigger>
                            {tour.status !== 'draft' && tour.status !== 'published' && <TooltipContent>{t.tooltips.tourNotDraftOrPublished}</TooltipContent>}
                          </Tooltip>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={ImageIcon}
                    title={t.tours.gallery}
                    description={t.tours.noGalleryPhotos}
                  />
                )}
              </CardContent>
            </Card>

            {/* Registration Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  {t.tours.registrationLinks || 'Kayıt Linkleri'}
                </CardTitle>
                <CardDescription>
                  {t.tours.registrationLinksDesc || 'Misafirlerin tura veya acenteye kayıt olması için paylaşılabilir linkler'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tour Registration Link */}
                {tour.uuid && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.tours.tourRegistrationLink || 'Tur Kayıt Linki'}</Label>
                    <p className="text-xs text-slate-500">{t.tours.tourRegistrationLinkDesc || 'Bu linki paylaştığınızda misafir kayıt olunca otomatik tura eklenir'}</p>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={`${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/agency/login?${agencyResult?.data?.uuid ? `uuid=${agencyResult.data.uuid}&` : ''}tourUuid=${tour.uuid}`}
                        className="text-xs font-mono bg-slate-50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/agency/login?${agencyResult?.data?.uuid ? `uuid=${agencyResult.data.uuid}&` : ''}tourUuid=${tour.uuid}`;
                          navigator.clipboard.writeText(link);
                          toast.success(t.tours.linkCopied || 'Link kopyalandı');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => {
                          const link = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/agency/login?${agencyResult?.data?.uuid ? `uuid=${agencyResult.data.uuid}&` : ''}tourUuid=${tour.uuid}`;
                          const msg = (t.tours.tourRegistrationWhatsappMsg || '').replace('{link}', link);
                          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Agency Registration Link */}
                {agencyResult?.data?.uuid && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.tours.agencyRegistrationLink || 'Acente Kayıt Linki'}</Label>
                    <p className="text-xs text-slate-500">{t.tours.agencyRegistrationLinkDesc || 'Bu linki paylaştığınızda misafir kayıt olunca acentenize bağlanır'}</p>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={`${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/agency/login?uuid=${agencyResult.data.uuid}`}
                        className="text-xs font-mono bg-slate-50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/agency/login?uuid=${agencyResult.data!.uuid}`;
                          navigator.clipboard.writeText(link);
                          toast.success(t.tours.linkCopied || 'Link kopyalandı');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => {
                          const link = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/agency/login?uuid=${agencyResult.data!.uuid}`;
                          const msg = (t.tours.agencyRegistrationWhatsappMsg || '').replace('{link}', link);
                          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stops Tab */}
          <TabsContent value="stops" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => refreshTab('stops')} disabled={refreshingTab === 'stops'}>
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshingTab === 'stops' ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </div>
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
                      {(tour.status === 'draft' || tour.status === 'published')
                        ? (t.tours.clickOrgToAddStop || 'Click a gray marker on the map to add it as a stop')
                        : `${stops?.length || 0} ${t.tours.stops.toLowerCase()}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TourStopsMap
                      stops={stops || []}
                      organizations={allOrganizations || []}
                      highlightedStopId={highlightedStopId}
                      onOrganizationClick={(tour.status === 'draft' || tour.status === 'published') ? openCreateStopFromMap : undefined}
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
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{t.tours.stops}</CardTitle>
                    <CardDescription>
                      {stops?.length || 0} durak
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stopsLoading ? (
                      <LoadingState message={t.common.loading} />
                    ) : !stops?.length ? (
                      <EmptyState
                        icon={Store}
                        title={t.tours.noStops}
                        actionLabel={(tour.status === 'draft' || tour.status === 'published') ? t.tours.addStop : undefined}
                        onAction={(tour.status === 'draft' || tour.status === 'published') ? openCreateStopForm : undefined}
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
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm truncate">
                                  {stop.organization?.name || `Organization #${stop.organizationId}`}
                                </h4>
                                {(() => {
                                  const dotConfig: Record<string, { color: string; label: string }> = {
                                    pending: { color: 'bg-orange-400', label: t.tours.stopStatusPending },
                                    approved: { color: 'bg-green-500', label: t.tours.stopStatusApproved },
                                    rejected: { color: 'bg-red-500', label: t.tours.stopStatusRejected },
                                  };
                                  const status = stop.preReservationStatus;
                                  const cfg = status
                                    ? (dotConfig[status] || { color: 'bg-slate-300', label: status })
                                    : { color: 'bg-slate-300', label: t.tours.stopStatusNoRequest };
                                  return (
                                    <span
                                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.color}`}
                                      title={cfg.label}
                                    />
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span>
                                  {stop.scheduledStartTime ? formatShortDateTime(stop.scheduledStartTime) : '-'}
                                  {' - '}
                                  {stop.scheduledEndTime ? formatShortDateTime(stop.scheduledEndTime) : '-'}
                                </span>
                              </div>
                              {(() => {
                                const statusConfig: Record<string, { color: string; label: string }> = {
                                  pending: { color: 'text-orange-600', label: t.tours.stopStatusPending },
                                  approved: { color: 'text-green-600', label: t.tours.stopStatusApproved },
                                  rejected: { color: 'text-red-600', label: t.tours.stopStatusRejected },
                                };
                                const status = stop.preReservationStatus;
                                const cfg = status
                                  ? (statusConfig[status] || { color: 'text-slate-400', label: status })
                                  : { color: 'text-slate-400', label: t.tours.stopStatusNoRequest };
                                return (
                                  <p className={`text-xs ${cfg.color}`}>
                                    Ön Rezervasyon: {cfg.label}
                                  </p>
                                );
                              })()}
                              <ChoiceDeadlineCountdown
                                tourStopId={stop.id}
                                compact
                                choiceDeadlineTime={stop.choiceDeadlineTime}
                                scheduledEndTime={stop.scheduledEndTime}
                                choiceDeadlineHours={stop.choiceDeadline}
                              />
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      disabled={tour.status !== 'draft' && tour.status !== 'published'}
                                      onClick={(e) => { e.stopPropagation(); openEditStopForm(stop); }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {tour.status !== 'draft' && tour.status !== 'published' && <TooltipContent>{t.tooltips.tourNotDraftOrPublished}</TooltipContent>}
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      disabled={tour.status !== 'draft' && tour.status !== 'published'}
                                      onClick={(e) => { e.stopPropagation(); setDeleteStopTarget(stop); }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {tour.status !== 'draft' && tour.status !== 'published' && <TooltipContent>{t.tooltips.tourNotDraftOrPublished}</TooltipContent>}
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(tour.status === 'draft' || tour.status === 'published') && (stops?.length ?? 0) > 0 && (
                      <Button className="w-full mt-3" onClick={openCreateStopForm}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        {t.tours.addStop}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{t.tours.clients}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => refreshTab('clients')} disabled={refreshingTab === 'clients'}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${refreshingTab === 'clients' ? 'animate-spin' : ''}`} />
                    Yenile
                  </Button>
                  {tourClients && tourClients.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Send className="h-4 w-4" />
                          {t.invitations.sendPdf}
                          <ChevronDown className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[1002]">
                        <DropdownMenuItem onClick={handleDownloadParticipantsPdf}>
                          <Download className="h-4 w-4 mr-2" />
                          {t.invitations.downloadPdf}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleSendParticipantsWhatsapp}>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {t.invitations.sendViaWhatsapp}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setBatchImportOpen(true)} className="gap-1.5">
                    <FileSpreadsheet className="h-4 w-4" />
                    {t.invitations.batchImport}
                  </Button>
                  <Button size="sm" onClick={() => setIsAddParticipantOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-1" />
                    {t.tours.addParticipant}
                  </Button>
                </div>
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
                      const fullName = [tc.client.firstName, tc.client.lastName].filter(Boolean).join(' ');
                      const initials = `${tc.client.firstName?.[0] || ''}${tc.client.lastName?.[0] || ''}`.toUpperCase();
                      const phoneDisplay = tc.client.phone
                        ? `${tc.client.phoneCountryCode || ''} ${tc.client.phone}`.trim()
                        : null;

                      return (
                        <div
                          key={tc.id}
                          className="p-4 border rounded-lg hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            {/* Left: Avatar + Info */}
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              {tc.client.profilePhoto ? (
                                <img
                                  src={tc.client.profilePhoto}
                                  alt={fullName}
                                  className="h-11 w-11 rounded-full object-cover flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                                  onClick={() => setLightboxImage(tc.client.profilePhoto)}
                                />
                              ) : (
                                <div className="h-11 w-11 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                  <span className="text-sm font-semibold text-blue-600">{initials}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="font-semibold text-sm">{fullName}</h4>
                                {/* Contact details */}
                                <div className="mt-1 space-y-0.5">
                                  {tc.client.email && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                      <Mail className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{tc.client.email}</span>
                                    </div>
                                  )}
                                  {phoneDisplay && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                      <Phone className="h-3 w-3 flex-shrink-0" />
                                      <span>{phoneDisplay}</span>
                                    </div>
                                  )}
                                  {tc.createdAt && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                      <CalendarPlus className="h-3 w-3 flex-shrink-0" />
                                      <span>{formatDate(tc.createdAt)}</span>
                                    </div>
                                  )}
                                </div>
                                {tc.notes && (
                                  <p className="mt-1 text-xs text-slate-500 italic">{tc.notes}</p>
                                )}
                              </div>
                            </div>

                            {/* Right: Status + Controls */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
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
                                </SelectContent>
                              </Select>
                              {tc.client?.username && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
                                  onClick={() => setWhatsappTarget({ client: tc.client, name: fullName })}
                                  title={t.invitations.whatsappShare}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Choices Tab */}
          <TabsContent value="choices" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => refreshTab('choices')} disabled={refreshingTab === 'choices'}>
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshingTab === 'choices' ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Stop selector */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{t.tours.stops}</CardTitle>
                </CardHeader>
                <CardContent>
                  {!stops?.length ? (
                    <p className="text-sm text-slate-500">{t.tours.noStops}</p>
                  ) : (
                    <div className="space-y-1">
                      {stops.map((stop, index) => (
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
                                const status = stop.preReservationStatus;
                                const cfg = status
                                  ? (dotConfig[status] || { color: 'bg-slate-300', label: status })
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
                              const statusConfig: Record<string, { color: string; label: string }> = {
                                pending: { color: 'text-orange-600', label: t.tours.stopStatusPending },
                                approved: { color: 'text-green-600', label: t.tours.stopStatusApproved },
                                rejected: { color: 'text-red-600', label: t.tours.stopStatusRejected },
                              };
                              const status = stop.preReservationStatus;
                              const cfg = status
                                ? (statusConfig[status] || { color: 'text-slate-400', label: status })
                                : { color: 'text-slate-400', label: t.tours.stopStatusNoRequest };
                              return (
                                <p className={`text-xs ${cfg.color}`}>
                                  Ön Rezervasyon: {cfg.label}
                                </p>
                              );
                            })()}
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
                                <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">
                                  {cfg.label}
                                </Badge>
                              );
                            })()}
                            {stop.preReservationStatus === 'approved' && stop.choicesStatus !== 'approved' && (
                              <ChoiceDeadlineCountdown
                                tourStopId={stop.id}
                                compact
                                choiceDeadlineTime={stop.choiceDeadlineTime}
                                scheduledEndTime={stop.scheduledEndTime}
                                choiceDeadlineHours={stop.choiceDeadline}
                              />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Choices + Summary */}
              <div className="lg:col-span-2 space-y-4">
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
                        <CardTitle className="text-lg flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
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


                    {/* Customer Choices Detail */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <ClipboardList className="h-5 w-5" />
                            {t.tours.customerChoices}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {choicesLoading ? (
                          <LoadingState message={t.common.loading} />
                        ) : !stopChoices?.length ? (
                          <p className="text-sm text-slate-500 text-center py-4">{t.tours.noChoices}</p>
                        ) : (
                          <div className="space-y-2">
                            {stopChoices.map((choice: AgencyStopChoicesDto, choiceIdx: number) => {
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
                                      {/* Resource choice */}
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

                                      {/* Service choices */}
                                      {choice.serviceChoices && choice.serviceChoices.length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium text-slate-500 mb-1">{t.tours.service}</p>
                                          <div className="space-y-1">
                                            {choice.serviceChoices.map((sc) => (
                                              <div key={sc.id} className="flex items-center justify-between text-sm bg-white rounded p-2 border">
                                                <span>{sc.service?.title || `#${sc.serviceId}`}</span>
                                                <div className="flex items-center gap-3 text-slate-600">
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

                    {/* Submit Choices to Business */}
                    {(() => {
                      const currentStop = stops?.find(s => s.id === choicesStopId);
                      const cs = currentStop?.choicesStatus;
                      const preResApproved = currentStop?.preReservationStatus === 'approved';
                      const canSubmit = preResApproved && (!cs || cs === 'in_progress' || cs === 'revision_requested');

                      const choicesConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
                        submitted: { variant: 'secondary', label: t.tours.choicesStatusSubmitted },
                        approved: { variant: 'default', label: t.tours.choicesStatusApproved },
                        rejected: { variant: 'destructive', label: t.tours.choicesStatusRejected },
                        revision_requested: { variant: 'outline', label: t.tours.choicesStatusRevisionRequested },
                        in_progress: { variant: 'outline', label: t.tours.choicesStatusInProgress },
                      };

                      return (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {cs && choicesConfig[cs] && (
                              <>
                                <span className="text-sm text-slate-500">{t.tours.choicesStatus}:</span>
                                <Badge variant={choicesConfig[cs].variant}>
                                  {choicesConfig[cs].label}
                                </Badge>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {choicesArr.length > 0 && (
                              <Button variant="outline" onClick={() => setReceiptOpen(true)} className="gap-2">
                                <Printer className="h-4 w-4" />
                                {t.guests.printReceipt}
                              </Button>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button
                                    onClick={() => {
                                      if (choicesStopId && confirm(t.tours.submitChoicesConfirm)) {
                                        submitChoicesMutation.mutate(choicesStopId);
                                      }
                                    }}
                                    disabled={!canSubmit || submitChoicesMutation.isPending}
                                    className="gap-2"
                                  >
                                    {submitChoicesMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Send className="h-4 w-4" />
                                    )}
                                    {t.tours.submitChoicesToBusiness}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!canSubmit && <TooltipContent>{t.tooltips.tourNotPublished}</TooltipContent>}
                              {canSubmit && submitChoicesMutation.isPending && <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>}
                            </Tooltip>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.guests.printReceipt}</DialogTitle>
            <DialogDescription>{t.guests.receiptTemplate}</DialogDescription>
          </DialogHeader>

          {/* Template selector */}
          <div className="flex gap-2 mb-4">
            {([
              { key: 'compact' as ReceiptTemplate, label: t.guests.compactReceipt, desc: t.guests.compactReceiptDesc },
              { key: 'detailed' as ReceiptTemplate, label: t.guests.detailedList, desc: t.guests.detailedListDesc },
              { key: 'kitchen' as ReceiptTemplate, label: t.guests.kitchenSummary, desc: t.guests.kitchenSummaryDesc },
            ]).map((tmpl) => (
              <button
                key={tmpl.key}
                type="button"
                onClick={() => setReceiptTemplate(tmpl.key)}
                className={`flex-1 p-3 rounded-lg border text-left transition-colors ${
                  receiptTemplate === tmpl.key
                    ? 'bg-slate-100 border-slate-400 ring-1 ring-slate-400'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <p className="text-sm font-medium">{tmpl.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{tmpl.desc}</p>
              </button>
            ))}
          </div>

          {/* Receipt preview */}
          <div className="border rounded-lg p-4 bg-white overflow-auto max-h-[50vh]" ref={printRef}>
            {choicesArr.length > 0 && (
              <>
                {receiptTemplate === 'compact' && (
                  <CompactReceipt tourInfo={receiptTourInfo} choices={choicesArr} orgName={choicesOrgName} t={t} />
                )}
                {receiptTemplate === 'detailed' && (
                  <DetailedListReceipt tourInfo={receiptTourInfo} choices={choicesArr} orgName={choicesOrgName} t={t} />
                )}
                {receiptTemplate === 'kitchen' && (
                  <KitchenSummaryReceipt tourInfo={receiptTourInfo} choices={choicesArr} orgName={choicesOrgName} t={t} />
                )}
                <ReceiptTableServices choices={choicesArr} t={t} />
                <ReceiptServiceSummary serviceSummary={serviceSummary} t={t} />
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {t.guests.exportExcel}
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              {t.guests.print}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <DateTimeInput
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.tours.endDate}</Label>
                  <DateTimeInput
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button type="submit" disabled={updateTourMutation.isPending}>
                      <Save className="h-4 w-4 mr-1" />
                      {updateTourMutation.isPending ? t.common.loading : t.common.save}
                    </Button>
                  </span>
                </TooltipTrigger>
                {updateTourMutation.isPending && <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>}
              </Tooltip>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stop Form Dialog */}
      <Dialog open={isStopFormOpen} onOpenChange={setIsStopFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStop ? t.tours.editStop : t.tours.addStop}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStopSubmit}>
            <div className="space-y-4 py-4">
              {/* Organization Filters */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">{t.tours.filterByCategory}</Label>
                  <Select
                    value={orgFilterCategoryId ? String(orgFilterCategoryId) : 'all'}
                    onValueChange={(val) => setOrgFilterCategoryId(val === 'all' ? null : Number(val))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.tours.allCategories}</SelectItem>
                      {filterCategories?.map((cat: CategoryDto) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">{t.tours.filterByCity}</Label>
                  <Select
                    value={orgFilterCityId ? String(orgFilterCityId) : 'all'}
                    onValueChange={(val) => {
                      const newCityId = val === 'all' ? null : Number(val);
                      setOrgFilterCityId(newCityId);
                      setOrgFilterDistrictId(null);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.tours.allCities}</SelectItem>
                      {filterCities?.map((city: LocationDto) => (
                        <SelectItem key={city.id} value={String(city.id)}>{city.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">{t.tours.filterByDistrict}</Label>
                  <Select
                    value={orgFilterDistrictId ? String(orgFilterDistrictId) : 'all'}
                    onValueChange={(val) => setOrgFilterDistrictId(val === 'all' ? null : Number(val))}
                    disabled={!orgFilterCityId}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.tours.allDistricts}</SelectItem>
                      {filterDistricts?.map((district: LocationDto) => (
                        <SelectItem key={district.id} value={String(district.id)}>{district.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">{t.tours.sortByCommission}</Label>
                  <Select
                    value={orgSortByCommission || 'none'}
                    onValueChange={(val) => setOrgSortByCommission(val === 'none' ? '' : val)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t.tours.commissionNone}</SelectItem>
                      <SelectItem value="ASC">{t.tours.commissionAsc}</SelectItem>
                      <SelectItem value="DESC">{t.tours.commissionDesc}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Organization Search */}
              <div className="space-y-2">
                <Label>{t.tours.organization} *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={t.customer.searchOrganizations}
                    value={orgSearch}
                    onChange={(e) => {
                      setOrgSearch(e.target.value);
                      if (selectedOrgDetail) {
                        setSelectedOrgDetail(null);
                        setStopForm((prev) => ({ ...prev, organizationId: 0 }));
                        setStopSelectionLimits({});
                        limitsInitializedForOrg.current = null;
                      }
                    }}
                    className="pl-9"
                  />
                  {orgSearchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>

                {/* Search results dropdown */}
                {!selectedOrgDetail && searchedOrgs && searchedOrgs.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto bg-white shadow-sm">
                    {searchedOrgs.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors border-b last:border-b-0"
                        onClick={() => {
                          setStopForm((prev) => ({ ...prev, organizationId: org.id }));
                          setSelectedOrgDetail(org);
                          setOrgSearch(org.name);
                        }}
                      >
                        <Store className="h-4 w-4 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{org.name}</p>
                          {org.address && (
                            <p className="text-xs text-slate-500 truncate max-w-[320px]" title={org.address}>{org.address}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {org.averageRating > 0 && (
                            <div className="flex items-center gap-0.5 text-xs text-amber-600">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {Number(org.averageRating).toFixed(1)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!selectedOrgDetail && orgSearch && !orgSearchLoading && searchedOrgs && searchedOrgs.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-2">{t.common.notFoundDesc}</p>
                )}

                {/* Selected organization detail card */}
                {selectedOrgDetail && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="p-3 space-y-2">
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
                            setStopForm((prev) => ({ ...prev, organizationId: 0 }));
                            setOrgSearch('');
                            setStopSelectionLimits({});
                            limitsInitializedForOrg.current = null;
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                        {selectedOrgDetail.address && (
                          <div className="col-span-2 flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-slate-400" />
                            <span>{selectedOrgDetail.address}</span>
                          </div>
                        )}
                        {selectedOrgDetail.description && (
                          <div className="col-span-2 text-slate-500 line-clamp-2">
                            {selectedOrgDetail.description}
                          </div>
                        )}
                        {selectedOrgDetail.averageRating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span>{Number(selectedOrgDetail.averageRating).toFixed(1)} ({selectedOrgDetail.totalReviews})</span>
                          </div>
                        )}
                        {(selectedOrgDetail as any).agencyCommissionRate != null && (
                          <div className="flex items-center gap-1">
                            <Percent className="h-3 w-3 text-slate-400" />
                            <span>{t.restaurant.agencyCommissionRate}: %{(selectedOrgDetail as any).agencyCommissionRate}</span>
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
                            <span>+{selectedOrgDetail.phoneCountryCode} {selectedOrgDetail.phone}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full mt-1"
                        onClick={() => setIsMenuPreviewOpen(true)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        {t.menu.menuPreview}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.tours.startDate}</Label>
                  <DateTimeInput
                    value={stopForm.scheduledStartTime}
                    min={tour?.startDate ? `${tour.startDate.split('T')[0]}T00:00` : undefined}
                    max={tour?.endDate ? `${tour.endDate.split('T')[0]}T23:59` : undefined}
                    onChange={(e) => setStopForm((prev) => ({ ...prev, scheduledStartTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.tours.endDate}</Label>
                  <DateTimeInput
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
                  placeholder="Misafirlerinizin göreceği durak açıklaması"
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

              <div className="space-y-2">
                <Label>{t.tours.maxSpendLimit}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={stopForm.maxSpendLimit}
                  onChange={(e) => setStopForm((prev) => ({ ...prev, maxSpendLimit: e.target.value }))}
                  placeholder={t.tours.maxSpendLimitPlaceholder}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeStopForm}>
                {t.common.cancel}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button type="submit" disabled={createStopMutation.isPending || updateStopMutation.isPending}>
                      {(createStopMutation.isPending || updateStopMutation.isPending)
                        ? t.common.loading
                        : editingStop ? t.common.update : t.common.create}
                    </Button>
                  </span>
                </TooltipTrigger>
                {(createStopMutation.isPending || updateStopMutation.isPending) && <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>}
              </Tooltip>
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

      {/* Delete Photo Confirm */}
      <ConfirmDialog
        open={!!deletePhotoId}
        onOpenChange={(open) => !open && setDeletePhotoId(null)}
        title={t.common.delete}
        description={t.tours.deletePhotoConfirm}
        confirmLabel={t.common.delete}
        onConfirm={() => {
          if (deletePhotoId) deletePhotoMutation.mutate(deletePhotoId);
          setDeletePhotoId(null);
        }}
        variant="destructive"
      />

      {/* Lightbox Dialog */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-0">
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt=""
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Participant Dialog */}
      <Dialog open={isAddParticipantOpen} onOpenChange={(open) => {
        setIsAddParticipantOpen(open);
        if (!open) { setAddParticipantSearch(''); setAddParticipantNotes(''); }
      }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t.tours.addParticipant}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            {/* Search + New Client Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t.tours.searchClient}
                  value={addParticipantSearch}
                  onChange={(e) => setAddParticipantSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCreateClientOpen(true)}
                className="shrink-0"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Yeni Misafir
              </Button>
            </div>

            {/* Notes */}
            <Textarea
              placeholder={t.tours.notesPlaceholder}
              value={addParticipantNotes}
              onChange={(e) => setAddParticipantNotes(e.target.value)}
              rows={2}
            />

            {/* Client List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {!agencyClients?.length ? (
                <p className="text-sm text-slate-500 text-center py-4">{t.tours.noAgencyClients}</p>
              ) : (
                (() => {
                  const tourClientIds = new Set(tourClients?.map((tc: TourClientDto) => tc.clientId) || []);
                  const filtered = agencyClients.filter((ac: AgencyClientDto) => {
                    const name = [ac.client.firstName, ac.client.lastName, ac.client.username].filter(Boolean).join(' ').toLowerCase();
                    return name.includes(addParticipantSearch.toLowerCase());
                  });
                  if (filtered.length === 0) {
                    return <p className="text-sm text-slate-500 text-center py-4">{t.tours.noAgencyClients}</p>;
                  }
                  return filtered.map((ac: AgencyClientDto) => {
                    const alreadyInTour = tourClientIds.has(ac.clientId);
                    return (
                      <div
                        key={ac.id}
                        className={`flex items-center justify-between p-3 border rounded-lg ${alreadyInTour ? 'opacity-50' : 'hover:bg-slate-50 cursor-pointer'}`}
                        onClick={() => {
                          if (!alreadyInTour && !addParticipantMutation.isPending) {
                            addParticipantMutation.mutate({
                              clientId: ac.clientId,
                              notes: addParticipantNotes || undefined,
                            });
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {ac.client.profilePhoto ? (
                            <img
                              src={ac.client.profilePhoto}
                              alt={[ac.client.firstName, ac.client.lastName].filter(Boolean).join(' ')}
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                              <UserCheck className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{[ac.client.firstName, ac.client.lastName].filter(Boolean).join(' ')}</p>
                            <p className="text-xs text-slate-500">@{ac.client.username}</p>
                          </div>
                        </div>
                        {alreadyInTour ? (
                          <Badge variant="outline" className="text-xs">{t.tours.alreadyInTour}</Badge>
                        ) : (
                          <Plus className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Client Dialog */}
      <Dialog open={isCreateClientOpen} onOpenChange={(open) => {
        setIsCreateClientOpen(open);
        if (!open) {
          setCreateClientForm({ firstName: '', lastName: '', username: '', password: '' });
          setCreateClientErrors({});
          setShowCreateClientPassword(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-blue-600" />
              Yeni Misafir Ekle
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const newErrors: Partial<Record<string, string>> = {};
            if (!createClientForm.firstName.trim()) newErrors.firstName = t.invitations?.firstNameRequired || 'Ad gerekli';
            if (!createClientForm.lastName.trim()) newErrors.lastName = t.invitations?.lastNameRequired || 'Soyad gerekli';
            if (!createClientForm.username.trim()) {
              newErrors.username = t.invitations?.usernameRequired || 'Kullanıcı adı gerekli';
            } else if (createClientForm.username.length < 3) {
              newErrors.username = t.invitations?.usernameMinLength || 'En az 3 karakter';
            }
            if (!createClientForm.password.trim()) {
              newErrors.password = t.invitations?.passwordRequired || 'Şifre gerekli';
            } else if (createClientForm.password.length < 6) {
              newErrors.password = t.invitations?.passwordMinLength || 'En az 6 karakter';
            }
            setCreateClientErrors(newErrors);
            if (Object.keys(newErrors).length === 0) {
              createClientMutation.mutate({
                firstName: createClientForm.firstName.trim(),
                lastName: createClientForm.lastName.trim(),
                username: createClientForm.username.trim(),
                password: createClientForm.password,
              });
            }
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cc-firstName">Ad *</Label>
                <Input
                  id="cc-firstName"
                  value={createClientForm.firstName}
                  onChange={(e) => setCreateClientForm(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Ahmet"
                  className={createClientErrors.firstName ? 'border-red-500' : ''}
                />
                {createClientErrors.firstName && <p className="text-xs text-red-500">{createClientErrors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cc-lastName">Soyad *</Label>
                <Input
                  id="cc-lastName"
                  value={createClientForm.lastName}
                  onChange={(e) => setCreateClientForm(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Yılmaz"
                  className={createClientErrors.lastName ? 'border-red-500' : ''}
                />
                {createClientErrors.lastName && <p className="text-xs text-red-500">{createClientErrors.lastName}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-username">Kullanıcı Adı *</Label>
              <Input
                id="cc-username"
                value={createClientForm.username}
                onChange={(e) => setCreateClientForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="ahmet_yilmaz"
                className={createClientErrors.username ? 'border-red-500' : ''}
              />
              {createClientErrors.username && <p className="text-xs text-red-500">{createClientErrors.username}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-password">Şifre *</Label>
              <div className="relative">
                <Input
                  id="cc-password"
                  type={showCreateClientPassword ? 'text' : 'password'}
                  value={createClientForm.password}
                  onChange={(e) => setCreateClientForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="En az 6 karakter"
                  className={`pr-10 ${createClientErrors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowCreateClientPassword(!showCreateClientPassword)}
                >
                  {showCreateClientPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {createClientErrors.password && <p className="text-xs text-red-500">{createClientErrors.password}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateClientOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={createClientMutation.isPending}>
                {createClientMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Oluştur
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Menu Preview Dialog */}
      <Dialog open={isMenuPreviewOpen} onOpenChange={setIsMenuPreviewOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-transparent border-0 shadow-none [&>button]:hidden">
          <div className="mx-auto w-[375px] bg-stone-50 rounded-[2rem] shadow-2xl border-[6px] border-stone-800 overflow-hidden relative">
            <div className="bg-stone-800 flex items-center justify-center py-1">
              <div className="w-20 h-5 bg-stone-900 rounded-b-xl" />
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="bg-gradient-to-br from-stone-800 to-stone-900 px-5 pt-6 pb-5 text-center">
                <p className="text-[10px] uppercase tracking-[3px] text-stone-400 mb-1">{selectedOrgDetail?.name}</p>
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
                      type="button"
                      onClick={() => setMenuPreviewLang(lang)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        menuPreviewLang === lang
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
                {orgMenuPreview && orgMenuPreview.length > 0 ? (
                  <MenuPreviewCategoryTree
                    categories={orgMenuPreview}
                    depth={0}
                    t={t}
                    onServiceClick={setMenuDetailService}
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
                ) : (
                  <div className="py-16 text-center">
                    <Store className="h-10 w-10 text-stone-300 mx-auto mb-3" />
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

      {/* Menu Preview Service Detail */}
      <ServiceDetailDialog
        service={menuDetailService}
        open={!!menuDetailService}
        onOpenChange={(open) => { if (!open) setMenuDetailService(null); }}
        t={t}
      />
    </div>
  );
}
