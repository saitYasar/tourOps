'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Compass,
  Plane,
  Mountain,
  Palmtree,
  Sun,
  Camera,
  Ship,
  User,
  LogOut,
  Ticket,
  CheckCircle2,
  FileText,
  Bell,
  X,
  Save,
  Loader2,
  Search,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  apiClient,
  getAuthStorageKeys,
  type ClientProfileDto,
  type ClientParticipantTourDto,
  type ClientStopChoicesDto,
  type ClientServiceChoiceDto,
  type ClientTourStopDto,
  type PanelNotificationDto,
  type UpdateClientProfileDto,
  type PaginatedResponse,
} from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSwitcher } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState, ErrorState } from '@/components/shared';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatDate } from '@/lib/dateUtils';
import { toast } from 'sonner';

const customerKeys = getAuthStorageKeys('customer');

export default function CustomerDashboard() {
  const { t, locale } = useLanguage();
  const { logout } = useAuth();
  const apiLang = locale as 'tr' | 'en' | 'de';
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'serviceRequests' | 'profile'>('dashboard');
  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<PanelNotificationDto | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [toursTab, setToursTab] = useState<'active' | 'past'>('active');
  const [activeToursPage, setActiveToursPage] = useState(1);
  const [pastToursPage, setPastToursPage] = useState(1);

  const PAGE_SIZE = 10;
  const notifRef = useRef<HTMLDivElement>(null);

  // Notification - unread count
  const { data: unreadData } = useQuery({
    queryKey: ['client-unread-count'],
    queryFn: () => apiClient.getClientUnreadCount(),
    refetchInterval: 30000,
  });

  // Notification - list (only when dropdown open)
  const { data: notifListData } = useQuery({
    queryKey: ['client-notifications'],
    queryFn: () => apiClient.getClientNotifications(1, 10),
    enabled: notifOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiClient.markClientNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] });
    },
  });

  const clientUnreadCount = (unreadData as { unreadCount?: number })?.unreadCount || 0;
  const clientNotifications: PanelNotificationDto[] =
    (notifListData as { data?: PanelNotificationDto[] })?.data || [];

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  // Client Profile
  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['client-profile', apiLang],
    queryFn: () => apiClient.getClientProfile(apiLang),
  });

  // Tours - total count
  const { data: toursCountData } = useQuery({
    queryKey: ['client-tours-count'],
    queryFn: () => apiClient.getMyToursCount(),
    enabled: !!profile,
  });
  const totalTourCount = (toursCountData as { totalCount?: number })?.totalCount ?? 0;

  // Tours - active
  const { data: activeToursData, isLoading: activeToursLoading } = useQuery({
    queryKey: ['client-my-tours', apiLang, activeToursPage, 'active'],
    queryFn: () => apiClient.getMyTours(activeToursPage, PAGE_SIZE, apiLang, 'active'),
    enabled: !!profile,
  });

  // Tours - past
  const { data: pastToursData, isLoading: pastToursLoading } = useQuery({
    queryKey: ['client-my-tours', apiLang, pastToursPage, 'past'],
    queryFn: () => apiClient.getMyTours(pastToursPage, PAGE_SIZE, apiLang, 'past'),
    enabled: !!profile,
  });

  // Derive tours
  const activeToursResponse = activeToursData as unknown as PaginatedResponse<ClientParticipantTourDto>;
  const activeTours: ClientParticipantTourDto[] = activeToursResponse?.data ?? [];
  const activeToursTotalPages = activeToursResponse?.meta?.totalPages ?? Math.ceil((activeToursResponse?.meta?.total ?? activeTours.length) / PAGE_SIZE);

  const pastToursResponse = pastToursData as unknown as PaginatedResponse<ClientParticipantTourDto>;
  const pastTours: ClientParticipantTourDto[] = pastToursResponse?.data ?? [];
  const pastToursTotalPages = pastToursResponse?.meta?.totalPages ?? Math.ceil((pastToursResponse?.meta?.total ?? pastTours.length) / PAGE_SIZE);

  // All tours for service choices tab
  const allTours = [...activeTours, ...pastTours];

  // Service Choices (loaded from tour stops via /client/tours/stops/{stopId}/choices)
  const [stopChoices, setStopChoices] = useState<{ stop: ClientTourStopDto; tourName: string; choices: ClientStopChoicesDto }[]>([]);
  const [choicesLoading, setChoicesLoading] = useState(false);

  useEffect(() => {
    if (!allTours.length || activeTab !== 'serviceRequests') return;
    let cancelled = false;
    setChoicesLoading(true);
    (async () => {
      const results: { stop: ClientTourStopDto; tourName: string; choices: ClientStopChoicesDto }[] = [];

      // Fetch all tour details in parallel instead of sequentially (N+1 fix)
      const detailResults = await Promise.allSettled(
        allTours.map(tourItem => apiClient.getMyTourDetail(tourItem.tour.id, apiLang))
      );

      // Collect all approved stops with their tour names
      const allStopRequests: { stop: ClientTourStopDto; tourName: string }[] = [];
      detailResults.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;
        const detailData = result.value;
        const detail = (detailData && typeof detailData === 'object' && 'data' in detailData)
          ? (detailData as unknown as { data: { tour: { stops: ClientTourStopDto[] }; } }).data
          : detailData;
        const stops = detail?.tour?.stops || [];
        const approvedStops = stops.filter((s: ClientTourStopDto) => s.preReservationStatus === 'approved');
        const tourName = allTours[index].tour?.tourName || '';
        approvedStops.forEach(stop => allStopRequests.push({ stop, tourName }));
      });

      // Fetch all stop choices in parallel
      const choiceResults = await Promise.allSettled(
        allStopRequests.map(({ stop }) => apiClient.getStopChoices(stop.id, apiLang))
      );

      choiceResults.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;
        const choicesData = result.value;
        const choices: ClientStopChoicesDto = (choicesData && typeof choicesData === 'object' && 'data' in choicesData)
          ? (choicesData as unknown as { data: ClientStopChoicesDto }).data
          : choicesData;
        if (choices?.serviceChoices?.length || choices?.resourceChoice) {
          results.push({ ...allStopRequests[index], choices });
        }
      });

      if (!cancelled) {
        setStopChoices(results);
        setChoicesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [allTours.length, apiLang, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem(customerKeys.token);
    localStorage.removeItem(customerKeys.userData);
    logout();
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <LoadingState message={t.common.loading} />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <ErrorState message={t.common.errorDescription} onRetry={refetchProfile} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-orange-50 to-amber-50 overflow-x-hidden">
      {/* Top Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-r from-sky-500 to-orange-500">
                <Compass className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-800">{t.common.appName}</span>
            </div>

            {/* Nav Tabs */}
            <div className="hidden sm:flex items-center gap-1">
              <NavTab
                active={activeTab === 'dashboard'}
                onClick={() => setActiveTab('dashboard')}
                icon={Compass}
                label={t.nav.dashboard}
              />
              <NavTab
                active={activeTab === 'serviceRequests'}
                onClick={() => setActiveTab('serviceRequests')}
                icon={FileText}
                label={t.customer.serviceRequests}
              />
              <NavTab
                active={activeTab === 'profile'}
                onClick={() => setActiveTab('profile')}
                icon={User}
                label={t.common.profile}
              />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <LanguageSwitcher />
              <div className="relative" ref={notifRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-slate-500 h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => setNotifOpen(!notifOpen)}
                >
                  <Bell className="h-4 w-4" />
                  {clientUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                      {clientUnreadCount > 9 ? '9+' : clientUnreadCount}
                    </span>
                  )}
                </Button>
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border rounded-lg shadow-lg z-50 max-h-80 sm:max-h-96 overflow-y-auto">
                    <div className="p-3 border-b font-medium text-sm text-slate-700">
                      {clientUnreadCount > 0
                        ? `${clientUnreadCount} ${t.notifications.unreadCount}`
                        : t.notifications.noNotificationsShort}
                    </div>
                    {clientNotifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-400">
                        {t.notifications.noNotifications}
                      </div>
                    ) : (
                      clientNotifications.map((n) => (
                        <button
                          key={n.id}
                          className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                          onClick={() => {
                            if (!n.isRead) markReadMutation.mutate(n.id);
                            setSelectedNotif(n);
                            setNotifOpen(false);
                          }}
                        >
                          <div className="flex gap-3">
                            {n.imageUrl && (
                              <img
                                src={n.imageUrl}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm ${!n.isRead ? 'font-semibold' : 'font-medium'} text-slate-900 truncate`}>{n.title}</p>
                              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.body}</p>
                              <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString(locale)}</p>
                            </div>
                            {!n.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLogoutOpen(true)}
                className="text-slate-500 hover:text-red-600 h-8 w-8 sm:h-9 sm:w-9"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <ConfirmDialog
                open={logoutOpen}
                onOpenChange={setLogoutOpen}
                title={t.auth.logout}
                description={t.auth.logoutConfirm}
                confirmLabel={t.auth.logout}
                cancelLabel={t.common.cancel}
                onConfirm={handleLogout}
                variant="destructive"
              />
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="sm:hidden flex border-t border-slate-100">
          <MobileNavTab
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={Compass}
            label={t.nav.dashboard}
          />
          <MobileNavTab
            active={activeTab === 'serviceRequests'}
            onClick={() => setActiveTab('serviceRequests')}
            icon={FileText}
            label={t.customer.serviceRequests}
          />
          <MobileNavTab
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            icon={User}
            label={t.common.profile}
          />
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            profile={profile}
            totalTourCount={totalTourCount}
            activeTours={activeTours}
            pastTours={pastTours}
            activeToursLoading={activeToursLoading}
            pastToursLoading={pastToursLoading}
            t={t}
            toursTab={toursTab}
            onToursTabChange={setToursTab}
            activeToursPage={activeToursPage}
            activeToursTotalPages={activeToursTotalPages}
            onActiveToursPageChange={setActiveToursPage}
            pastToursPage={pastToursPage}
            pastToursTotalPages={pastToursTotalPages}
            onPastToursPageChange={setPastToursPage}
          />
        )}
        {activeTab === 'serviceRequests' && (
          <ServiceChoicesView
            stopChoices={stopChoices}
            loading={choicesLoading}
            t={t}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            t={t}
            apiLang={apiLang}
          />
        )}
      </div>

      {/* Notification Detail Popup */}
      {selectedNotif && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedNotif(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-slate-900">
                {t.notifications.detail}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedNotif(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {selectedNotif.imageUrl && (
              <div className="w-full">
                <img
                  src={selectedNotif.imageUrl}
                  alt=""
                  className="w-full max-h-64 object-cover"
                />
              </div>
            )}
            <div className="p-4 space-y-3">
              <h4 className="text-lg font-bold text-slate-900">{selectedNotif.title}</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedNotif.body}</p>
              <p className="text-xs text-slate-400">
                {new Date(selectedNotif.createdAt).toLocaleString(locale)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Dashboard View
// ============================================
function DashboardView({
  profile,
  totalTourCount,
  activeTours,
  pastTours,
  activeToursLoading,
  pastToursLoading,
  t,
  toursTab,
  onToursTabChange,
  activeToursPage,
  activeToursTotalPages,
  onActiveToursPageChange,
  pastToursPage,
  pastToursTotalPages,
  onPastToursPageChange,
}: {
  profile: ClientProfileDto;
  totalTourCount: number;
  activeTours: ClientParticipantTourDto[];
  pastTours: ClientParticipantTourDto[];
  activeToursLoading: boolean;
  pastToursLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  toursTab: 'active' | 'past';
  onToursTabChange: (tab: 'active' | 'past') => void;
  activeToursPage: number;
  activeToursTotalPages: number;
  onActiveToursPageChange: (page: number) => void;
  pastToursPage: number;
  pastToursTotalPages: number;
  onPastToursPageChange: (page: number) => void;
}) {
  const participantStatusConfig: Record<string, { color: string; label: string }> = {
    confirmed: { color: 'bg-emerald-50 text-emerald-700', label: t.customer.participantConfirmed },
    pending: { color: 'bg-amber-50 text-amber-700', label: t.customer.participantPending },
    cancelled: { color: 'bg-red-50 text-red-700', label: t.customer.participantCancelled },
  };

  const tours = toursTab === 'active' ? activeTours : pastTours;
  const toursLoading = toursTab === 'active' ? activeToursLoading : pastToursLoading;
  const toursPage = toursTab === 'active' ? activeToursPage : pastToursPage;
  const toursTotalPages = toursTab === 'active' ? activeToursTotalPages : pastToursTotalPages;
  const onToursPageChange = toursTab === 'active' ? onActiveToursPageChange : onPastToursPageChange;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredTours = tours.filter((item) => {
    const matchesSearch = !searchQuery || item.tour.tourName.toLowerCase().includes(searchQuery.toLowerCase()) || (item.tour.tourCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="overflow-hidden border-0 shadow-lg relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-600/90 via-orange-500/80 to-amber-500/90" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Plane className="absolute top-4 right-8 h-8 w-8 text-white/20 animate-float" />
          <Mountain className="absolute bottom-4 left-8 h-6 w-6 text-white/15 animate-float-delayed" />
          <Sun className="absolute top-6 left-1/3 h-5 w-5 text-yellow-300/30 animate-pulse" />
        </div>

        <CardContent className="p-4 sm:p-6 relative text-white">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl shrink-0">
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt="" className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg object-cover" />
              ) : (
                <Compass className="h-6 w-6 sm:h-8 sm:w-8" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold truncate">{t.customer.welcome}, {profile.firstName} {profile.lastName}!</h2>
              <p className="text-white/80 text-xs sm:text-sm">{t.customer.readyForAdventure}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-4">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white/20 backdrop-blur-sm rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2">
              <Plane className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm font-medium">{totalTourCount} {t.customer.tourCount}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white/20 backdrop-blur-sm rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2">
              <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm font-medium">{t.customer.enjoyTrip}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tours */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Compass className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-bold text-slate-800">{t.customer.myTours}</h3>
        </div>

        {/* Active / Past Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => onToursTabChange('active')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              toursTab === 'active'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.customer.activeTours}
          </button>
          <button
            type="button"
            onClick={() => onToursTabChange('past')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              toursTab === 'past'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.customer.pastTours}
          </button>
        </div>

        {/* Filters */}
        {tours.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t.customer.searchTours}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-transparent text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] min-w-[160px]"
            >
              <option value="">{t.customer.allStatuses}</option>
              <option value="confirmed">{t.customer.participantConfirmed}</option>
              <option value="pending">{t.customer.participantPending}</option>
              <option value="cancelled">{t.customer.participantCancelled}</option>
            </select>
          </div>
        )}

        {toursLoading ? (
          <LoadingState message={t.common.loading} />
        ) : !tours.length ? (
          <Card className="bg-white border-dashed border-2 border-orange-200">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="flex justify-center gap-2 mb-4">
                  {[Plane, Mountain, Palmtree, Ship, Camera].map((Icon, i) => (
                    <div key={i} className="p-2 bg-orange-100 rounded-lg">
                      <Icon className="h-5 w-5 text-orange-500" />
                    </div>
                  ))}
                </div>
                <h4 className="text-lg font-semibold text-slate-700 mb-2">{t.customer.noTours}</h4>
                <p className="text-slate-500 text-sm">{t.customer.noToursDesc}</p>
              </div>
            </CardContent>
          </Card>
        ) : !filteredTours.length ? (
          <Card className="bg-white border-dashed border-2 border-slate-200">
            <CardContent className="p-8">
              <p className="text-center text-slate-500 text-sm">{t.customer.noTours}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredTours.map((item, index) => {
              const tour = item.tour;
              const statusCfg = participantStatusConfig[item.status] || participantStatusConfig.pending;
              const isConfirmed = item.status === 'confirmed';

              const cardContent = (
                <Card className={`overflow-hidden border-0 shadow-md transition-all bg-white flex flex-row ${isConfirmed ? 'hover:shadow-lg cursor-pointer' : 'opacity-75 cursor-not-allowed'}`}>
                  {tour.coverImageUrl ? (
                    <div className="w-28 sm:w-40 shrink-0 bg-slate-100 overflow-hidden">
                      <img src={tour.coverImageUrl} alt={tour.tourName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-2 shrink-0 bg-gradient-to-b ${
                      ['from-sky-400 to-blue-500', 'from-orange-400 to-amber-500', 'from-emerald-400 to-teal-500', 'from-rose-400 to-pink-500'][index % 4]
                    }`} />
                  )}
                  <CardContent className="p-3 sm:p-4 flex-1 flex flex-col min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
                      <h4 className="font-bold text-slate-800 text-sm sm:text-base min-w-0 truncate">{tour.tourName}</h4>
                      <span
                        className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap shrink-0 ${statusCfg.color} ${!isConfirmed ? 'cursor-help' : ''}`}
                        title={!isConfirmed ? t.customer.participantNotConfirmedTooltip : ''}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 mb-2 sm:mb-3">{tour.description || '\u00A0'}</p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs mt-auto">
                      {tour.tourCode && (
                        <span className="flex items-center gap-1 bg-violet-50 text-violet-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                          <Ticket className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {tour.tourCode}
                        </span>
                      )}
                      {tour.startDate && (
                        <span className="flex items-center gap-1 bg-sky-50 text-sky-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                          <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {formatDate(tour.startDate)}
                        </span>
                      )}
                      <span className="flex items-center gap-1 bg-slate-50 text-slate-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                        <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {tour.currentParticipants}/{tour.maxParticipants}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );

              return isConfirmed ? (
                <Link key={item.participantId} href={`/customer/tours/${tour.id}`}>
                  {cardContent}
                </Link>
              ) : (
                <div key={item.participantId}>
                  {cardContent}
                </div>
              );
            })}
          </div>
        )}

        {/* Tours Pagination */}
        {toursTotalPages > 1 && (
          <Pagination
            page={toursPage}
            totalPages={toursTotalPages}
            onPageChange={onToursPageChange}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// Service Choices View
// ============================================
function ServiceChoicesView({
  stopChoices,
  loading,
  t,
}: {
  stopChoices: { stop: ClientTourStopDto; tourName: string; choices: ClientStopChoicesDto }[];
  loading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  if (loading) return <LoadingState message={t.common.loading} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-bold text-slate-800">{t.customer.serviceRequests}</h3>
      </div>

      {!stopChoices.length ? (
        <Card className="bg-white border-dashed border-2 border-orange-200">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-orange-300 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-slate-700 mb-2">{t.customer.noServiceRequests}</h4>
            <p className="text-slate-500 text-sm">{t.customer.noServiceRequestsDesc}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {stopChoices.map(({ stop, tourName, choices }) => (
            <Card key={stop.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="p-1.5 sm:p-2 rounded-lg text-emerald-600 bg-emerald-50 shrink-0">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm sm:text-base truncate">{stop.organization?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{tourName}</p>
                    {stop.scheduledStartTime && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(stop.scheduledStartTime).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {stop.scheduledEndTime && <> - {new Date(stop.scheduledEndTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</>}
                      </p>
                    )}
                  </div>
                </div>
                {choices.serviceChoices && choices.serviceChoices.length > 0 && (
                  <div className="space-y-1.5 pl-8 sm:pl-12 mt-2">
                    {choices.serviceChoices.map((sc: ClientServiceChoiceDto) => (
                      <div key={sc.id} className="flex items-center justify-between text-xs sm:text-sm gap-2">
                        <span className="text-slate-700 min-w-0 truncate">{sc.service?.title || `#${sc.serviceId}`}</span>
                        <span className="font-medium text-slate-800 shrink-0">{sc.quantity}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Profile View
// ============================================
function ProfileView({
  profile,
  t,
  apiLang,
}: {
  profile: ClientProfileDto;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  apiLang: 'tr' | 'en' | 'de';
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [lastName, setLastName] = useState(profile.lastName || '');
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    profile.phoneCountryCode ? String(profile.phoneCountryCode) : '90'
  );
  const [phone, setPhone] = useState(profile.phone || '');
  const [gender, setGender] = useState<'m' | 'f'>(profile.gender === 'f' ? 'f' : 'm');
  const [username, setUsername] = useState(profile.username || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile.profilePhoto || null);

  const validateForm = (): string | null => {
    if (username.length < 3 || username.length > 50) {
      return t.invitations.usernameMinLength;
    }
    if (password && (password.length < 6 || password.length > 100)) {
      return t.invitations.passwordMinLength;
    }
    return null;
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const validationError = validateForm();
      if (validationError) {
        throw new Error(validationError);
      }
      const data: UpdateClientProfileDto = {};
      if (firstName !== profile.firstName) data.firstName = firstName;
      if (lastName !== profile.lastName) data.lastName = lastName;
      if (phoneCountryCode && phoneCountryCode !== String(profile.phoneCountryCode || '')) {
        data.phoneCountryCode = Number(phoneCountryCode);
      }
      if (phone && phone !== (profile.phone || '')) {
        data.phone = Number(phone);
      }
      if (gender !== (profile.gender || 'm')) {
        data.gender = gender;
      }
      if (username !== profile.username) {
        data.username = username;
      }
      if (password) {
        data.password = password;
      }
      return apiClient.updateClientProfile(data, profilePhoto || undefined, apiLang);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-profile'] });
      setPassword('');
      toast.success(t.customer.profileUpdated);
    },
    onError: (error: Error) => {
      toast.error(error.message || t.auth.generalError);
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        toast.error(t.common.fileTooLarge);
        e.target.value = '';
        return;
      }
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-bold text-slate-800">{t.common.profile}</h3>
      </div>

      <Card className="bg-white border-0 shadow-md">
        <CardContent className="p-6">
          {/* Profile Photo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-sky-400 to-orange-400 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile.firstName.charAt(0) + profile.lastName.charAt(0)
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Camera className="h-4 w-4 text-slate-600" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
            className="space-y-4"
          >
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="profileFirstName" className="text-sm font-medium text-slate-700">
                {t.auth.firstName}
              </Label>
              <Input
                id="profileFirstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t.auth.firstNamePlaceholder}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="profileLastName" className="text-sm font-medium text-slate-700">
                {t.auth.lastName}
              </Label>
              <Input
                id="profileLastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t.auth.lastNamePlaceholder}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                {t.common.phone}
              </Label>
              <div className="flex gap-2">
                <div className="w-16 sm:w-24">
                  <Input
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="90"
                    className="h-11 rounded-xl text-center"
                    maxLength={4}
                  />
                </div>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="5551234567"
                  className="h-11 rounded-xl flex-1"
                  maxLength={15}
                />
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                {t.common.gender}
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGender('m')}
                  className={`flex-1 h-11 rounded-xl border-2 font-medium transition-all ${
                    gender === 'm'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {t.common.male}
                </button>
                <button
                  type="button"
                  onClick={() => setGender('f')}
                  className={`flex-1 h-11 rounded-xl border-2 font-medium transition-all ${
                    gender === 'f'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {t.common.female}
                </button>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="profileUsername" className="text-sm font-medium text-slate-700">
                {t.auth.username}
              </Label>
              <Input
                id="profileUsername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.auth.username}
                className="h-11 rounded-xl"
                minLength={3}
                maxLength={50}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="profilePassword" className="text-sm font-medium text-slate-700">
                {t.auth.password}
              </Label>
              <div className="relative">
                <Input
                  id="profilePassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="h-11 rounded-xl pr-10"
                  minLength={6}
                  maxLength={100}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-slate-400 hover:text-slate-600 z-10"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Email (read only) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                {t.auth.email}
              </Label>
              <Input
                value={profile.email || '-'}
                disabled
                className="h-11 rounded-xl bg-slate-50"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-sky-500 to-orange-500 hover:from-sky-600 hover:to-orange-600 text-white mt-6"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.common.loading}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t.common.save}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function NavTab({ active, onClick, icon: Icon, label, badge }: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-gradient-to-r from-sky-500 to-orange-500 text-white shadow-md'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {badge && badge > 0 && (
        <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
          active ? 'bg-white/20' : 'bg-amber-100 text-amber-700'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function MobileNavTab({ active, onClick, icon: Icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 text-[10px] leading-tight transition-all ${
        active ? 'text-orange-600 border-b-2 border-orange-500' : 'text-slate-500'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate w-full text-center">{label}</span>
    </button>
  );
}

function Pagination({ page, totalPages, onPageChange, t }: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(1)}
        disabled={page <= 1}
        className="h-8 w-8"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="text-xs"
      >
        {t.common.back}
      </Button>
      <span className="text-sm text-slate-600 mx-1">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="text-xs"
      >
        {t.common.next}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(totalPages)}
        disabled={page >= totalPages}
        className="h-8 w-8"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
