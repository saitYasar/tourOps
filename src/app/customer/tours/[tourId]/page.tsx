'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Star,
  Ticket,
  Building2,
  Image as ImageIcon,
  Check,
  Minus,
  Plus,
  Armchair,
  UtensilsCrossed,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';

import { getCurrencySymbol } from '@/lib/utils';
import {
  apiClient,
  type ClientTourStopDto,
  type ClientStopMenuCategoryDto,
  type ClientStopMenuServiceDto,
  type ResourceDto,
  type ClientStopChoicesDto,
  type ClientServiceChoiceDto,
  type ClientProfileDto,
} from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingState, ErrorState, LanguageSwitcher, ChoiceDeadlineCountdown, ServiceDetailDialog } from '@/components/shared';
import { formatDate, formatShortDateTime } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { CustomerVenueSelector } from '@/components/customer/CustomerVenueSelector';
import { StopVenuePreview } from '@/components/customer/StopVenuePreview';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// ============================================
// Types
// ============================================
interface SelectedTableInfo {
  resourceId: number;
  floorName: string;
  roomName: string;
  tableName: string;
}

type MenuSelections = Record<number, number>; // serviceId -> quantity

export default function CustomerTourDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const apiLang = locale as 'tr' | 'en' | 'de';
  const tourId = Number(params.tourId);

  const queryClient = useQueryClient();

  // Table selection dialog
  const [tableStopId, setTableStopId] = useState<number | null>(null);
  // 3D model → 2D selector navigation bridge
  const [navigateToTableId, setNavigateToTableId] = useState<number | null>(null);
  // Menu selection dialog
  const [menuStopId, setMenuStopId] = useState<number | null>(null);
  // Service detail popup
  const [detailService, setDetailService] = useState<ClientStopMenuServiceDto | null>(null);

  // Persisted selections across stops (synced from backend)
  const [selectedTables, setSelectedTables] = useState<Record<number, SelectedTableInfo>>({});
  const [selectedMenuItems, setSelectedMenuItems] = useState<Record<number, MenuSelections>>({});
  // Track backend serviceChoice IDs: stopId -> { serviceId -> serviceChoiceId }
  const [serviceChoiceIds, setServiceChoiceIds] = useState<Record<number, Record<number, number>>>({});
  // Notes per menu item: stopId -> { serviceId -> note }
  const [menuNotes, setMenuNotes] = useState<Record<number, Record<number, string>>>({});
  // Debounce timers for note API calls
  const noteTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Children cache for layout hierarchy (floor -> rooms, room -> tables, table -> chairs)
  const [childrenCache, setChildrenCache] = useState<Record<number, ResourceDto[]>>({});
  const [loadingChildren, setLoadingChildren] = useState(false);

  // Saving state
  const [savingTable, setSavingTable] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);

  // Pending chair for confirm dialog (replaces window.confirm)
  const [pendingChair, setPendingChair] = useState<ResourceDto | null>(null);

  // Tour detail
  const {
    data: detail,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['client-tour-detail', tourId, apiLang],
    queryFn: () => apiClient.getMyTourDetail(tourId, apiLang),
    enabled: !!tourId,
  });

  // Stop menu
  const { data: menuData, isLoading: menuLoading, error: menuError } = useQuery({
    queryKey: ['client-stop-menu', menuStopId, apiLang],
    queryFn: () => apiClient.getStopMenu(menuStopId!, apiLang),
    enabled: !!menuStopId,
    retry: false,
  });

  // Stop layout for table selection
  const { data: layoutData, isLoading: layoutLoading, error: layoutError } = useQuery({
    queryKey: ['client-stop-layout', tableStopId, apiLang],
    queryFn: () => apiClient.getStopLayout(tableStopId!, undefined, apiLang),
    enabled: !!tableStopId,
    retry: false,
  });

  // Client profile (for identifying own seat)
  const { data: clientProfileData } = useQuery({
    queryKey: ['client-profile', apiLang],
    queryFn: () => apiClient.getClientProfile(apiLang),
  });
  const clientProfile: ClientProfileDto | undefined = clientProfileData
    ? (typeof clientProfileData === 'object' && 'data' in clientProfileData
      ? (clientProfileData as unknown as { data: ClientProfileDto }).data
      : clientProfileData as ClientProfileDto)
    : undefined;

  // Load existing choices for a stop
  const loadStopChoices = useCallback(async (stopId: number) => {
    try {
      const choicesData = await apiClient.getStopChoices(stopId, apiLang);
      const choices: ClientStopChoicesDto = (choicesData && typeof choicesData === 'object' && 'data' in choicesData)
        ? (choicesData as unknown as { data: ClientStopChoicesDto }).data
        : choicesData;

      // Sync resource choice
      if (choices?.resourceChoice) {
        const rc = choices.resourceChoice;
        // API returns an array of resource hierarchy items
        if (Array.isArray(rc) && rc.length > 0) {
          const findByType = (type: string) => rc.find((item: { resourceTypeCode: string }) => item.resourceTypeCode === type);
          const floor = findByType('floor');
          const room = findByType('room');
          const table = findByType('table');
          const seat = findByType('seat');
          setSelectedTables(prev => ({
            ...prev,
            [stopId]: {
              resourceId: 0,
              floorName: floor?.resourceName || '',
              roomName: room?.resourceName || '',
              tableName: seat ? `${table?.resourceName || ''} - ${seat.resourceName}` : (table?.resourceName || ''),
            },
          }));
        } else if (!Array.isArray(rc)) {
          // Legacy single object format
          setSelectedTables(prev => ({
            ...prev,
            [stopId]: {
              resourceId: rc.resourceId,
              floorName: '',
              roomName: '',
              tableName: rc.resource?.name || `#${rc.resourceId}`,
            },
          }));
        }
      }

      // Sync service choices
      if (choices?.serviceChoices && choices.serviceChoices.length > 0) {
        const menuItems: MenuSelections = {};
        const choiceIdMap: Record<number, number> = {};
        const noteMap: Record<number, string> = {};
        for (const sc of choices.serviceChoices) {
          const svcId = sc.serviceId || sc.service?.id;
          if (!svcId) continue;
          menuItems[svcId] = sc.quantity;
          choiceIdMap[svcId] = sc.id;
          if (sc.note) noteMap[svcId] = sc.note;
        }
        setSelectedMenuItems(prev => ({ ...prev, [stopId]: menuItems }));
        setServiceChoiceIds(prev => ({ ...prev, [stopId]: choiceIdMap }));
        if (Object.keys(noteMap).length > 0) {
          setMenuNotes(prev => ({ ...prev, [stopId]: noteMap }));
        }
      }
    } catch {
      // Choices may not exist yet, that's ok
    }
  }, [apiLang]);

  // Fetch children for a resource via layout API with parentId
  const fetchChildren = useCallback(async (parentId: number, force = false) => {
    if (!force && childrenCache[parentId]) return;
    if (!tableStopId) return;
    setLoadingChildren(true);
    try {
      const result = await apiClient.getStopLayout(tableStopId, parentId, apiLang);
      const children = Array.isArray(result) ? result : (result as unknown as { data?: ResourceDto[] })?.data ?? [];
      const childArray = Array.isArray(children) ? children : [];
      setChildrenCache(prev => ({ ...prev, [parentId]: childArray }));
    } catch {
      setChildrenCache(prev => ({ ...prev, [parentId]: [] }));
    } finally {
      setLoadingChildren(false);
    }
  }, [childrenCache, tableStopId, apiLang]);

  // Load choices for all approved stops on mount
  useEffect(() => {
    if (!detail?.tour?.stops) return;
    const approvedStops = detail.tour.stops.filter(s => s.preReservationStatus === 'approved');
    for (const stop of approvedStops) {
      loadStopChoices(stop.id);
    }
  }, [detail, loadStopChoices]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <LoadingState message={t.common.loading} />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <ErrorState message={t.tours.notFoundDesc} onRetry={refetch} />
      </div>
    );
  }

  const tour = detail.tour;
  const participantStatus = detail.participantStatus;

  const participantStatusConfig: Record<string, { color: string; label: string }> = {
    confirmed: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: t.customer.participantConfirmed },
    pending: { color: 'bg-amber-50 text-amber-700 border-amber-200', label: t.customer.participantPending },
    cancelled: { color: 'bg-red-50 text-red-700 border-red-200', label: t.customer.participantCancelled },
  };

  const preResStatusConfig: Record<string, { color: string; label: string }> = {
    approved: { color: 'bg-emerald-50 text-emerald-700', label: t.customer.preReservationApproved },
    pending: { color: 'bg-amber-50 text-amber-700', label: t.customer.preReservationPending },
    rejected: { color: 'bg-red-50 text-red-700', label: t.customer.preReservationRejected },
  };

  const pStatusCfg = participantStatusConfig[participantStatus] || participantStatusConfig.pending;

  // Menu data can be directly the array or wrapped in ApiResponse
  const menuCategories: ClientStopMenuCategoryDto[] = Array.isArray(menuData)
    ? menuData
    : (menuData as unknown as { data?: ClientStopMenuCategoryDto[] })?.data ?? [];

  // Layout data
  const layoutResources: ResourceDto[] = Array.isArray(layoutData)
    ? layoutData
    : (layoutData as unknown as { data?: ResourceDto[] })?.data ?? [];

  // Parse layout tree: floors are top-level from API
  const floors = layoutResources.filter(r => !r.parentId);

  // Open table dialog
  const openTableDialog = (stopId: number) => {
    setTableStopId(stopId);
    setChildrenCache({});
  };

  // Close table dialog
  const closeTableDialog = () => {
    setTableStopId(null);
    setPendingChair(null);
    setNavigateToTableId(null);
  };

  // Trace parent hierarchy for a chair through childrenCache
  const findParentNames = (chairId: number): { floorName: string; roomName: string; tableName: string } => {
    for (const floor of floors) {
      const rooms = childrenCache[floor.id] ?? [];
      for (const room of rooms) {
        const tables = childrenCache[room.id] ?? [];
        for (const table of tables) {
          const chairs = childrenCache[table.id] ?? [];
          if (chairs.some(c => c.id === chairId)) {
            return { floorName: floor.name, roomName: room.name, tableName: `${table.name}` };
          }
        }
      }
    }
    return { floorName: '', roomName: '', tableName: '' };
  };

  // Select a chair - save to backend, then auto-open menu
  const handleSelectChair = async (chair: ResourceDto, skipConfirm = false) => {
    if (!tableStopId) return;
    const currentStopId = tableStopId;

    // If user already has a seat and clicks a different empty seat, ask for confirmation
    const hasExisting = !!selectedTables[currentStopId];
    if (hasExisting && !skipConfirm && selectedTables[currentStopId]?.resourceId !== chair.id) {
      setPendingChair(chair);
      return;
    }

    const parentNames = findParentNames(chair.id);
    setSavingTable(true);
    try {
      if (hasExisting) {
        await apiClient.updateResourceChoice(currentStopId, { resourceId: chair.id });
      } else {
        await apiClient.createResourceChoice(currentStopId, { resourceId: chair.id });
      }
      setSelectedTables(prev => ({
        ...prev,
        [currentStopId]: {
          resourceId: chair.id,
          floorName: parentNames.floorName,
          roomName: parentNames.roomName,
          tableName: `${parentNames.tableName} - ${chair.name}`,
        },
      }));
      closeTableDialog();
      // Open menu dialog after table dialog fully unmounts to avoid portal conflicts
      requestAnimationFrame(() => {
        setMenuStopId(currentStopId);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.customer.tableSaveError);
    } finally {
      setSavingTable(false);
    }
  };

  // Menu item quantity helpers
  const getItemQty = (stopId: number, serviceId: number) =>
    selectedMenuItems[stopId]?.[serviceId] ?? 0;

  const setItemQty = async (stopId: number, serviceId: number, qty: number) => {
    // Check maxSpendLimit before increasing quantity
    const currentQty = selectedMenuItems[stopId]?.[serviceId] ?? 0;
    if (qty > currentQty) {
      const stop = tour?.stops?.find(s => s.id === stopId);
      const limit = stop?.maxSpendLimit != null ? Number(stop.maxSpendLimit) : 0;
      if (limit > 0) {
        const currentTotal = getMenuTotal(stopId, menuCategories);
        // Find the service price
        let svcPrice = 0;
        const findPrice = (cats: ClientStopMenuCategoryDto[]) => {
          for (const cat of cats) {
            for (const svc of cat.services || []) {
              if (svc.id === serviceId) { svcPrice = Number(svc.basePrice); return; }
            }
            if (cat.child_service_categories) findPrice(cat.child_service_categories);
          }
        };
        findPrice(menuCategories);
        const addedAmount = (qty - currentQty) * svcPrice;
        if (currentTotal + addedAmount > limit) {
          const firstCurrency = menuCategories.flatMap(c => c.services).find(s => s?.currency)?.currency;
          const currSymbol = getCurrencySymbol(firstCurrency);
          toast.error(t.customer.spendLimitExceeded);
          return;
        }
      }
    }

    const existingChoiceId = serviceChoiceIds[stopId]?.[serviceId];

    if (existingChoiceId) {
      // Update existing choice (quantity 0 = remove)
      try {
        const result = await apiClient.updateServiceChoice(existingChoiceId, { quantity: Math.max(0, qty) });
        setSelectedMenuItems(prev => {
          const stopItems = { ...(prev[stopId] || {}) };
          if (qty <= 0) {
            delete stopItems[serviceId];
          } else {
            stopItems[serviceId] = qty;
          }
          return { ...prev, [stopId]: stopItems };
        });
        if (qty <= 0) {
          setServiceChoiceIds(prev => {
            const stopChoices = { ...(prev[stopId] || {}) };
            delete stopChoices[serviceId];
            return { ...prev, [stopId]: stopChoices };
          });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.customer.menuUpdateError);
      }
    } else if (qty > 0) {
      // Create new choice
      try {
        const note = menuNotes[stopId]?.[serviceId];
        const result = await apiClient.createServiceChoice(stopId, { serviceId, ...(note ? { note } : {}) });
        setSelectedMenuItems(prev => {
          const stopItems = { ...(prev[stopId] || {}) };
          stopItems[serviceId] = qty;
          return { ...prev, [stopId]: stopItems };
        });
        // Store the returned choice ID
        if (result && typeof result === 'object') {
          const choiceData = ('data' in result) ? (result as unknown as { data: ClientServiceChoiceDto }).data : result as ClientServiceChoiceDto;
          if (choiceData?.id) {
            setServiceChoiceIds(prev => ({
              ...prev,
              [stopId]: { ...(prev[stopId] || {}), [serviceId]: choiceData.id },
            }));
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.customer.menuSaveError);
      }
    }
  };

  // Note helpers
  const getItemNote = (stopId: number, serviceId: number) =>
    menuNotes[stopId]?.[serviceId] ?? '';

  const setItemNote = (stopId: number, serviceId: number, note: string) => {
    // Update local state immediately
    setMenuNotes(prev => ({
      ...prev,
      [stopId]: { ...(prev[stopId] || {}), [serviceId]: note },
    }));
    // Debounce the API call — wait until user stops typing
    const timerKey = `${stopId}_${serviceId}`;
    if (noteTimersRef.current[timerKey]) {
      clearTimeout(noteTimersRef.current[timerKey]);
    }
    noteTimersRef.current[timerKey] = setTimeout(async () => {
      delete noteTimersRef.current[timerKey];
      const choiceId = serviceChoiceIds[stopId]?.[serviceId];
      if (choiceId) {
        try {
          await apiClient.updateServiceChoice(choiceId, { note });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t.customer.noteSaveError);
        }
      }
    }, 800);
  };

  // Calculate total price for a stop's menu selections
  const getMenuTotal = (stopId: number, categories: ClientStopMenuCategoryDto[]): number => {
    const items = selectedMenuItems[stopId];
    if (!items) return 0;
    let total = 0;
    const walkCategories = (cats: ClientStopMenuCategoryDto[]) => {
      for (const cat of cats) {
        for (const svc of cat.services || []) {
          const qty = items[svc.id] || 0;
          if (qty > 0) total += qty * Number(svc.basePrice);
        }
        if (cat.child_service_categories) walkCategories(cat.child_service_categories);
      }
    };
    walkCategories(categories);
    return total;
  };

  const menuTotalItemCount = (stopId: number) => {
    const items = selectedMenuItems[stopId];
    if (!items) return 0;
    return Object.values(items).reduce((sum, qty) => sum + qty, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-orange-50 to-amber-50">
      {/* Top bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-2 sm:px-6">
          <div className="flex items-center gap-1.5 sm:gap-3 h-12 sm:h-14">
            <Button variant="ghost" size="icon" onClick={() => router.push('/customer')} className="shrink-0 h-8 w-8 sm:h-10 sm:w-10">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-slate-800 truncate">{tour.tourName}</h1>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
                <Calendar className="h-3 w-3 shrink-0" />
                <span className="truncate">{formatDate(tour.startDate)} - {formatDate(tour.endDate)}</span>
              </div>
            </div>
            <div className="shrink-0">
              <LanguageSwitcher />
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 text-[10px] sm:text-xs ${pStatusCfg.color} ${participantStatus !== 'confirmed' ? 'cursor-help' : ''}`}
              title={participantStatus !== 'confirmed' ? t.customer.participantNotConfirmedTooltip : ''}
            >
              {pStatusCfg.label}
            </Badge>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Cover Image */}
        {tour.coverImageUrl && (
          <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-lg h-36 sm:h-64">
            <img src={tour.coverImageUrl} alt={tour.tourName} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Tour Info */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-3 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              <h3 className="text-base sm:text-lg font-bold text-slate-800">{t.customer.tourInfo}</h3>
            </div>

            {tour.description && (
              <p className="text-xs sm:text-sm text-slate-600">{tour.description}</p>
            )}

            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-sm">
              {tour.tourCode && (
                <InfoBadge icon={Ticket} label={t.customer.tourCode} value={tour.tourCode} />
              )}
              <InfoBadge
                icon={Users}
                label={t.customer.participants}
                value={`${tour.currentParticipants}/${tour.maxParticipants}`}
              />
              <InfoBadge
                icon={Calendar}
                label={t.tours.startDate}
                value={formatDate(tour.startDate)}
              />
              <InfoBadge
                icon={Calendar}
                label={t.tours.endDate}
                value={formatDate(tour.endDate)}
              />
              {tour.agency && (
                <InfoBadge icon={Building2} label={t.customer.agency} value={tour.agency.name} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stops */}
        <div>
          {/* Filter out rejected pre-reservations — only show pending & approved */}
          {(() => {
            const visibleStops = (tour.stops || []).filter(
              (s: ClientTourStopDto) => s.preReservationStatus !== 'rejected'
            );
            return (
              <>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-bold text-slate-800">{t.customer.stops}</h3>
            <span className="text-sm text-slate-500">({visibleStops.length})</span>
          </div>

          {visibleStops.length === 0 ? (
            <Card className="bg-white border-dashed border-2 border-orange-200">
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 text-orange-300 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-slate-700 mb-2">{t.customer.noStops}</h4>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {visibleStops.map((stop: ClientTourStopDto) => {
                const org = stop.organization;
                const preResCfg = stop.preReservationStatus
                  ? preResStatusConfig[stop.preReservationStatus] || preResStatusConfig.pending
                  : null;
                const isApproved = stop.preReservationStatus === 'approved';
                const choicesApproved = stop.choicesStatus === 'approved';
                const tableInfo = selectedTables[stop.id];
                const menuItemCount = menuTotalItemCount(stop.id);

                return (
                  <Card key={stop.id} className="border-0 shadow-sm hover:shadow-md transition-all bg-white">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex gap-2 sm:gap-3">
                        {/* Org photo */}
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden bg-slate-100 shrink-0">
                          {org.coverImageUrl ? (
                            <img src={org.coverImageUrl} alt={org.name} className="w-full h-full object-cover" />
                          ) : org.photos?.[0] ? (
                            <img src={org.photos[0].imageUrl || ''} alt={org.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-slate-800">{org.name}</h4>
                              {org.category && (
                                <span className="text-xs text-slate-500">{org.category.name}</span>
                              )}
                            </div>
                            {preResCfg && (
                              <Badge variant="outline" className={`text-xs shrink-0 ${preResCfg.color}`}>
                                {preResCfg.label}
                              </Badge>
                            )}
                          </div>

                          {/* Time */}
                          {(stop.scheduledStartTime || stop.scheduledEndTime) && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                              <Clock className="h-3 w-3" />
                              {stop.scheduledStartTime && formatShortDateTime(stop.scheduledStartTime)}
                              {stop.scheduledStartTime && stop.scheduledEndTime && ' - '}
                              {stop.scheduledEndTime && formatShortDateTime(stop.scheduledEndTime)}
                            </div>
                          )}

                          {/* Choice Deadline Countdown */}
                          <div className="mt-1">
                            <ChoiceDeadlineCountdown
                              tourStopId={stop.id}
                              compact
                              scheduledEndTime={stop.scheduledEndTime}
                              choiceDeadlineHours={stop.choiceDeadline}
                            />
                          </div>

                          {/* Rating */}
                          {org.totalReviews > 0 && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                              {org.averageRating} ({org.totalReviews})
                            </div>
                          )}

                          {/* Description */}
                          {stop.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{stop.description}</p>
                          )}

                          {/* Selected table indicator */}
                          {tableInfo && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1.5 font-medium">
                              <Check className="h-3 w-3" />
                              {[tableInfo.floorName, tableInfo.roomName, tableInfo.tableName].filter(Boolean).join(' · ')}
                            </div>
                          )}

                          {/* Selected menu items indicator */}
                          {menuItemCount > 0 && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1 font-medium">
                              <Check className="h-3 w-3" />
                              {t.customer.selectedItems}: {menuItemCount} {t.customer.quantity}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mt-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={`text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 ${isApproved && participantStatus === 'confirmed'
                                      ? 'text-orange-600 border-orange-200 hover:bg-orange-50'
                                      : 'text-slate-400 border-slate-200 cursor-not-allowed'
                                    }`}
                                    onClick={() => isApproved && participantStatus === 'confirmed' && openTableDialog(stop.id)}
                                    disabled={!isApproved || participantStatus !== 'confirmed'}
                                  >
                                    <Armchair className="h-3 w-3 mr-1 shrink-0" />
                                    <span className="truncate">{tableInfo ? (choicesApproved ? t.customer.viewSeat : t.customer.changeTable) : t.customer.selectSeat}</span>
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {(!isApproved || participantStatus !== 'confirmed') && (
                                <TooltipContent>
                                  {!isApproved ? t.tooltips.stopNotApproved : t.tooltips.notConfirmed}
                                </TooltipContent>
                              )}
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={`text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 ${isApproved && tableInfo && participantStatus === 'confirmed'
                                      ? 'text-orange-600 border-orange-200 hover:bg-orange-50'
                                      : 'text-slate-400 border-slate-200 cursor-not-allowed'
                                    }`}
                                    onClick={() => isApproved && tableInfo && participantStatus === 'confirmed' && setMenuStopId(stop.id)}
                                    disabled={!isApproved || !tableInfo || participantStatus !== 'confirmed'}
                                  >
                                    <UtensilsCrossed className="h-3 w-3 mr-1 shrink-0" />
                                    <span className="truncate">{choicesApproved ? t.customer.viewMenuAction : t.customer.selectMenuAction}</span>
                                    {menuItemCount > 0 && (
                                      <span className="ml-1 bg-orange-100 text-orange-700 rounded-full px-1.5 text-[10px] font-bold shrink-0">
                                        {menuItemCount}
                                      </span>
                                    )}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {(!isApproved || !tableInfo || participantStatus !== 'confirmed') && (
                                <TooltipContent>
                                  {!isApproved ? t.tooltips.stopNotApproved : !tableInfo ? t.tooltips.selectTableFirst : t.tooltips.notConfirmed}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
              </>
            );
          })()}
        </div>

        {/* Gallery */}
        {tour.photos && tour.photos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-bold text-slate-800">{t.customer.gallery}</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {tour.photos.map((photo, i) => (
                <div key={photo.id || i} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={photo.imageUrl || ''}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* Table Selection Dialog */}
      {/* ============================================ */}
      <Dialog open={!!tableStopId} onOpenChange={() => closeTableDialog()}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] w-[95vw] sm:w-auto flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Armchair className="h-5 w-5 text-orange-500" />
              {t.customer.selectSeat}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            {layoutLoading ? (
              <LoadingState message={t.common.loading} />
            ) : layoutError ? (
              <div className="text-center py-8">
                <p className="text-red-500">{(layoutError as Error).message}</p>
              </div>
            ) : floors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">{t.customer.noLayout}</p>
              </div>
            ) : (
              <>
              <StopVenuePreview
                stopId={tableStopId!}
                floors={floors}
                childrenCache={childrenCache}
                onTableSelect={(tableResourceId) => {
                  setNavigateToTableId(tableResourceId);
                  // Scroll to 2D selector after 3D collapses
                  setTimeout(() => {
                    document.getElementById('venue-selector')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 200);
                }}
              />
              <div id="venue-selector" />
              <CustomerVenueSelector
                floors={floors}
                childrenCache={childrenCache}
                loadingChildren={loadingChildren}
                fetchChildren={fetchChildren}
                onSelectChair={handleSelectChair}
                savingTable={savingTable}
                existingResourceId={tableStopId ? selectedTables[tableStopId]?.resourceId : undefined}
                pendingChairId={pendingChair?.id}
                currentClientId={clientProfile?.id}
                navigateToTableId={navigateToTableId}
                readOnly={tableStopId ? tour?.stops?.find(s => s.id === tableStopId)?.choicesStatus === 'approved' : false}
              />
              </>
            )}
          </div>

          {/* Seat change confirmation - inline within dialog */}
          {pendingChair && (
            <div className="flex-shrink-0 border-t bg-amber-50 rounded-b-lg -mx-6 -mb-6 px-6 py-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">{t.customer.seatChangeTitle}</p>
              <p className="text-sm text-amber-700 mb-3">{t.customer.confirmSeatChange}</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setPendingChair(null)}>
                  {t.common.cancel}
                </Button>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => {
                  if (pendingChair) {
                    const chair = pendingChair;
                    setPendingChair(null);
                    handleSelectChair(chair, true);
                  }
                }}>
                  {t.common.confirm}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* Menu Selection Dialog */}
      {/* ============================================ */}
      <Dialog open={!!menuStopId} onOpenChange={(open) => { if (!open && !detailService) setMenuStopId(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[95vh] sm:max-h-[85vh] min-h-[60vh] sm:min-h-[50vh] w-[95vw] sm:w-auto flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-orange-500" />
              {tour.stops?.find(s => s.id === menuStopId)?.choicesStatus === 'approved' ? t.customer.viewMenuAction : t.customer.selectMenuAction}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            {menuLoading ? (
              <LoadingState message={t.common.loading} />
            ) : menuError ? (
              <div className="text-center py-8">
                <p className="text-red-500">{(menuError as Error).message}</p>
              </div>
            ) : menuCategories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">{t.customer.noMenu}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {menuCategories.map((cat) => (
                  <InteractiveMenuCategory
                    key={cat.id}
                    category={cat}
                    t={t}
                    showPrice={tour.stops?.find(s => s.id === menuStopId)?.showPriceToCustomer ?? true}
                    stopId={menuStopId!}
                    getItemQty={getItemQty}
                    setItemQty={setItemQty}
                    getItemNote={getItemNote}
                    setItemNote={setItemNote}
                    onServiceClick={setDetailService}
                    readOnly={tour.stops?.find(s => s.id === menuStopId)?.choicesStatus === 'approved'}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom bar with total */}
          {menuStopId && menuCategories.length > 0 && (
            <MenuBottomBar
              stopId={menuStopId}
              categories={menuCategories}
              showPrice={tour.stops?.find(s => s.id === menuStopId)?.showPriceToCustomer ?? true}
              maxSpendLimit={tour.stops?.find(s => s.id === menuStopId)?.maxSpendLimit}
              readOnly={tour.stops?.find(s => s.id === menuStopId)?.choicesStatus === 'approved'}
              getMenuTotal={getMenuTotal}
              menuTotalItemCount={menuTotalItemCount}
              t={t}
              onSave={() => setMenuStopId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Service Detail Popup */}
      <ServiceDetailDialog
        service={detailService}
        open={!!detailService}
        onOpenChange={(open) => { if (!open) setDetailService(null); }}
        showPrice={menuStopId ? (tour?.stops?.find(s => s.id === menuStopId)?.showPriceToCustomer ?? true) : true}
        t={t}
      />

    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function InfoBadge({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-slate-50 rounded-lg">
      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs text-slate-500">{label}</p>
        <p className="font-medium text-slate-800 text-xs sm:text-sm truncate">{value}</p>
      </div>
    </div>
  );
}

function InteractiveMenuCategory({
  category,
  t,
  depth = 0,
  showPrice,
  stopId,
  getItemQty,
  setItemQty,
  getItemNote,
  setItemNote,
  onServiceClick,
  readOnly = false,
}: {
  category: ClientStopMenuCategoryDto;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  depth?: number;
  showPrice: boolean;
  stopId: number;
  getItemQty: (stopId: number, serviceId: number) => number;
  setItemQty: (stopId: number, serviceId: number, qty: number) => void;
  getItemNote: (stopId: number, serviceId: number) => string;
  setItemNote: (stopId: number, serviceId: number, note: string) => void;
  onServiceClick?: (svc: ClientStopMenuServiceDto) => void;
  readOnly?: boolean;
}) {
  const priceLabel = (type: string) => {
    if (type === 'fixed') return '';
    if (type === 'per_person') return `/ ${t.menu?.perPerson ?? 'kişi'}`;
    if (type === 'per_hour') return `/ ${t.menu?.perHour ?? 'saat'}`;
    if (type === 'per_day') return `/ ${t.menu?.perDay ?? 'gün'}`;
    return '';
  };

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      {/* Category header — matches restaurant preview */}
      {(category.services?.length > 0 || category.child_service_categories?.length > 0) && (
        depth === 0 ? (
          <div
            className="bg-gradient-to-r from-stone-800 to-stone-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl mb-3 cursor-pointer flex items-center justify-between"
            onClick={() => setCollapsed(prev => !prev)}
          >
            <h3 className="text-base sm:text-lg font-bold text-white">{category.name}</h3>
            <ChevronDown className={`h-4 w-4 text-white transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          </div>
        ) : (
          <div
            className="px-4 py-2 mb-2 cursor-pointer flex items-center justify-between"
            onClick={() => setCollapsed(prev => !prev)}
          >
            <h4 className="text-sm font-semibold text-stone-600 border-b border-stone-200 pb-1 flex-1">{category.name}</h4>
            <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          </div>
        )
      )}

      {/* Services — restaurant preview style with +/- controls */}
      {!collapsed && category.services && category.services.length > 0 && (
        <div className="space-y-1 mb-3">
          {category.services.map((svc) => {
            const qty = getItemQty(stopId, svc.id);
            const note = getItemNote(stopId, svc.id);
            return (
              <div key={svc.id} className={`rounded-lg transition-colors cursor-pointer ${qty > 0 ? 'bg-orange-50/80 ring-1 ring-orange-200' : 'hover:bg-white/60'}`} onClick={() => onServiceClick?.(svc)}>
                <div className="flex gap-2 sm:gap-3 p-2">
                  <div className="flex-shrink-0">
                    {svc.imageUrl ? (
                      <img src={svc.imageUrl} alt={svc.title} className="w-10 h-10 sm:w-14 sm:h-14 rounded-md object-cover shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-md bg-stone-100 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-stone-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-800 leading-tight">{svc.title}</p>
                        {svc.subTitle && (
                          <p className="text-xs text-stone-500 mt-0.5 leading-tight">{svc.subTitle}</p>
                        )}
                      </div>
                      {showPrice && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-emerald-700">{Number(svc.basePrice).toFixed(2)} {getCurrencySymbol(svc.currency)}</p>
                          {svc.priceType !== 'fixed' && (
                            <p className="text-[10px] text-stone-400">{priceLabel(svc.priceType)}</p>
                          )}
                        </div>
                      )}
                    </div>
                    {svc.description && (
                      <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-snug">{svc.description}</p>
                    )}
                    {svc.contentsDescription && (
                      <div className="mt-1.5 p-1.5 bg-amber-50/60 rounded border border-amber-100">
                        <p className="text-[10px] font-medium text-amber-700 mb-0.5">{t.menu?.serviceContentsDescription ?? 'İçindekiler & Hizmet Açıklaması'}</p>
                        <p className="text-[11px] text-stone-500 leading-snug whitespace-pre-line">{svc.contentsDescription}</p>
                      </div>
                    )}
                    {/* Note indicator when collapsed */}
                    {qty > 0 && note && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 mt-1">
                        <MessageSquare className="h-3 w-3" />
                        {note.length > 30 ? note.slice(0, 30) + '...' : note}
                      </span>
                    )}
                  </div>
                  {/* Quantity controls */}
                  {readOnly ? (
                    qty > 0 && (
                      <div className="shrink-0 self-center">
                        <span className="text-xs sm:text-sm font-bold text-orange-600">{qty}x</span>
                      </div>
                    )
                  ) : (
                    <div className="shrink-0 flex items-center gap-0.5 sm:gap-1 self-center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0}>
                            <button
                              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-stone-300 flex items-center justify-center hover:bg-stone-100 disabled:opacity-30 transition-colors"
                              onClick={() => setItemQty(stopId, svc.id, qty - 1)}
                              disabled={qty === 0}
                            >
                              <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </button>
                          </span>
                        </TooltipTrigger>
                        {qty === 0 && (
                          <TooltipContent>
                            {t.tooltips.quantityZero}
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <span className={`w-5 sm:w-6 text-center text-xs sm:text-sm font-bold ${qty > 0 ? 'text-orange-600' : 'text-stone-400'}`}>
                        {qty}
                      </span>
                      <button
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-orange-300 bg-orange-50 flex items-center justify-center hover:bg-orange-100 transition-colors"
                        onClick={() => setItemQty(stopId, svc.id, qty + 1)}
                      >
                        <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-600" />
                      </button>
                    </div>
                  )}
                </div>
                {/* Note input — visible when item is selected */}
                {qty > 0 && (
                  <div className="px-2 pb-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start gap-2 ml-0 sm:ml-[68px]">
                      <MessageSquare className="h-3.5 w-3.5 text-stone-400 mt-1.5 shrink-0" />
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => !readOnly && setItemNote(stopId, svc.id, e.target.value)}
                        readOnly={readOnly}
                        placeholder={t.customer?.notePlaceholder ?? 'Bu ürün için özel istekler...'}
                        className={`flex-1 text-xs bg-white/80 border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-orange-300 focus:border-orange-300 ${readOnly ? 'cursor-default opacity-60' : ''}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Child categories */}
      {!collapsed && category.child_service_categories && category.child_service_categories.length > 0 && (
        <div className="space-y-3">
          {category.child_service_categories.map((child) => (
            <InteractiveMenuCategory
              key={child.id}
              category={child}
              t={t}
              depth={depth + 1}
              showPrice={showPrice}
              stopId={stopId}
              getItemQty={getItemQty}
              setItemQty={setItemQty}
              getItemNote={getItemNote}
              setItemNote={setItemNote}
              onServiceClick={onServiceClick}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuBottomBar({
  stopId,
  categories,
  showPrice,
  maxSpendLimit,
  readOnly = false,
  getMenuTotal,
  menuTotalItemCount,
  t,
  onSave,
}: {
  stopId: number;
  categories: ClientStopMenuCategoryDto[];
  showPrice: boolean;
  maxSpendLimit?: number | null;
  readOnly?: boolean;
  getMenuTotal: (stopId: number, categories: ClientStopMenuCategoryDto[]) => number;
  menuTotalItemCount: (stopId: number) => number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  onSave: () => void;
}) {
  const totalItems = menuTotalItemCount(stopId);
  const totalPrice = getMenuTotal(stopId, categories);

  // Extract currency from first available service
  const firstCurrency = categories.flatMap(c => c.services).find(s => s?.currency)?.currency;
  const currSymbol = getCurrencySymbol(firstCurrency);

  const limitNum = maxSpendLimit != null ? Number(maxSpendLimit) : 0;
  const hasLimit = limitNum > 0;
  const overLimit = hasLimit && totalPrice > limitNum;

  if (totalItems === 0 && !hasLimit) return null;

  return (
    <div className="flex-shrink-0 border-t border-slate-200 pt-3 mt-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">
            {totalItems} {t.customer.quantity}
          </p>
          {showPrice && (
            <p className={`text-lg font-bold ${overLimit ? 'text-red-600' : 'text-orange-600'}`}>
              {t.customer.total}: {currSymbol}{totalPrice.toFixed(2)}
            </p>
          )}
        </div>
        {readOnly ? (
          <Button variant="outline" onClick={onSave}>
            {t.common.close}
          </Button>
        ) : (
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={onSave}
          >
            <Check className="h-4 w-4 mr-1" />
            {t.customer.saveSelection}
          </Button>
        )}
      </div>
    </div>
  );
}
