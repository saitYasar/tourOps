'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Calendar,
  MapPin,
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
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  RefreshCw,
  Ban,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  apiClient,
  type ClientProfileDto,
  type ClientReservationDto,
  type ServiceRequestDto,
} from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/shared';

const AUTH_TOKEN_KEY = 'tourops_access_token';
const AUTH_USER_DATA_KEY = 'tourops_user_data';

export default function CustomerDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reservations' | 'serviceRequests' | 'profile'>('dashboard');

  // Client Profile
  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['client-profile'],
    queryFn: () => apiClient.getClientProfile(),
  });

  // Reservations
  const { data: reservationsData, isLoading: reservationsLoading } = useQuery({
    queryKey: ['client-reservations', profile?.id],
    queryFn: () => apiClient.getClientReservations(String(profile!.id), 1, 50),
    enabled: !!profile?.id,
  });

  // Tours for this agency
  const { data: toursData, isLoading: toursLoading } = useQuery({
    queryKey: ['client-tours', profile?.agencyId],
    queryFn: () => apiClient.getClientTours(profile!.agencyId, 1, 50),
    enabled: !!profile?.agencyId,
  });

  // Service Requests
  const { data: serviceRequestsData, isLoading: serviceRequestsLoading } = useQuery({
    queryKey: ['client-service-requests', profile?.id],
    queryFn: () => apiClient.getServiceRequestsByClient(profile!.id, 1, 50),
    enabled: !!profile?.id,
  });

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_DATA_KEY);
    apiClient.logout();
    router.replace('/agency/login');
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

  const reservations = (reservationsData as unknown as { data?: ClientReservationDto[] })?.data ??
                       (Array.isArray(reservationsData) ? reservationsData : []);
  const tours = (toursData as unknown as { data?: unknown[] })?.data ??
                (Array.isArray(toursData) ? toursData : []);
  const serviceRequests = (serviceRequestsData as unknown as { data?: ServiceRequestDto[] })?.data ??
                          (Array.isArray(serviceRequestsData) ? serviceRequestsData : []);

  const pendingReservations = reservations.filter((r: ClientReservationDto) => r.status === 'pending');
  const approvedReservations = reservations.filter((r: ClientReservationDto) => r.status === 'approved');

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-orange-50 to-amber-50">
      {/* Top Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
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
                active={activeTab === 'reservations'}
                onClick={() => setActiveTab('reservations')}
                icon={Ticket}
                label={t.requests.title}
                badge={pendingReservations.length || undefined}
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

            {/* Right side */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="sm:hidden flex border-t border-slate-100 overflow-x-auto">
          <MobileNavTab
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={Compass}
            label={t.nav.dashboard}
          />
          <MobileNavTab
            active={activeTab === 'reservations'}
            onClick={() => setActiveTab('reservations')}
            icon={Ticket}
            label={t.requests.title}
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            profile={profile}
            tours={tours}
            reservations={reservations}
            toursLoading={toursLoading}
            t={t}
          />
        )}
        {activeTab === 'reservations' && (
          <ReservationsView
            reservations={reservations}
            loading={reservationsLoading}
            t={t}
          />
        )}
        {activeTab === 'serviceRequests' && (
          <ServiceRequestsView
            serviceRequests={serviceRequests}
            loading={serviceRequestsLoading}
            queryClient={queryClient}
            profileId={profile.id}
            t={t}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileView profile={profile} t={t} />
        )}
      </div>

    </div>
  );
}

// ============================================
// Dashboard View
// ============================================
function DashboardView({
  profile,
  tours,
  reservations,
  toursLoading,
  t,
}: {
  profile: ClientProfileDto;
  tours: unknown[];
  reservations: ClientReservationDto[];
  toursLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const approvedCount = reservations.filter(r => r.status === 'approved').length;

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

        <CardContent className="p-6 relative text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt="" className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <Compass className="h-8 w-8" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t.customer.welcome}, {profile.firstName}!</h2>
              <p className="text-white/80 text-sm">{t.customer.readyForAdventure}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Plane className="h-4 w-4" />
              <span className="text-sm font-medium">{tours.length} {t.customer.tourCount}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Ticket className="h-4 w-4" />
              <span className="text-sm font-medium">{reservations.length} {t.requests.title}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Camera className="h-4 w-4" />
              <span className="text-sm font-medium">{t.customer.enjoyTrip}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Compass}
          label={t.customer.activeTours}
          value={tours.length}
          color="sky"
        />
        <StatCard
          icon={Clock}
          label={t.requests.pending}
          value={pendingCount}
          color="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label={t.requests.approved}
          value={approvedCount}
          color="emerald"
        />
        <StatCard
          icon={Ticket}
          label={t.requests.title}
          value={reservations.length}
          color="violet"
        />
      </div>

      {/* Tours */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Compass className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-bold text-slate-800">{t.customer.myTours}</h3>
        </div>

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
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(tours as { id: number; name: string; description?: string; startDate?: string; endDate?: string; status?: string }[]).map((tour, index) => (
              <Card key={tour.id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all bg-white">
                <div className={`h-2 bg-gradient-to-r ${
                  ['from-sky-400 to-blue-500', 'from-orange-400 to-amber-500', 'from-emerald-400 to-teal-500', 'from-rose-400 to-pink-500'][index % 4]
                }`} />
                <CardContent className="p-4">
                  <h4 className="font-bold text-slate-800 mb-2">{tour.name}</h4>
                  {tour.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{tour.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {tour.startDate && (
                      <span className="flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-1 rounded-full">
                        <Calendar className="h-3 w-3" />
                        {new Date(tour.startDate).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                    {tour.status && (
                      <span className={`px-2 py-1 rounded-full ${
                        tour.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                        tour.status === 'draft' ? 'bg-slate-50 text-slate-600' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {tour.status}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Reservations View
// ============================================
function ReservationsView({
  reservations,
  loading,
  t,
}: {
  reservations: ClientReservationDto[];
  loading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  if (loading) return <LoadingState message={t.common.loading} />;

  const statusConfig = {
    pending: { icon: Clock, color: 'text-amber-600 bg-amber-50', label: t.requests.pending },
    approved: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', label: t.requests.approved },
    rejected: { icon: XCircle, color: 'text-red-600 bg-red-50', label: t.requests.rejected },
    completed: { icon: CheckCircle2, color: 'text-blue-600 bg-blue-50', label: t.tours.completed },
    cancelled: { icon: AlertCircle, color: 'text-slate-600 bg-slate-50', label: t.tours.cancelled },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Ticket className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-bold text-slate-800">{t.requests.title}</h3>
      </div>

      {!reservations.length ? (
        <Card className="bg-white border-dashed border-2 border-orange-200">
          <CardContent className="p-8 text-center">
            <Ticket className="h-12 w-12 text-orange-300 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-slate-700 mb-2">{t.requests.noRequests}</h4>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reservations.map((reservation) => {
            const config = statusConfig[reservation.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            return (
              <Card key={reservation.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {t.requests.preReservation} #{String(reservation.id).slice(0, 8)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(reservation.reservationDate).toLocaleDateString('tr-TR')}
                          <span className="text-slate-300">|</span>
                          <User className="h-3 w-3" />
                          {reservation.numberOfParticipants} {t.tours.people}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  {reservation.specialRequests && (
                    <p className="text-xs text-slate-500 mt-2 pl-12">{reservation.specialRequests}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// Service Requests View
// ============================================
function ServiceRequestsView({
  serviceRequests,
  loading,
  queryClient: qc,
  profileId,
  t,
}: {
  serviceRequests: ServiceRequestDto[];
  loading: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
  profileId: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const cancelMutation = useMutation({
    mutationFn: (id: number) => apiClient.cancelServiceRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-service-requests'] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => apiClient.retryServiceRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-service-requests'] });
    },
  });

  if (loading) return <LoadingState message={t.common.loading} />;

  const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    pending: { icon: Clock, color: 'text-amber-600 bg-amber-50', label: t.requests.pending },
    approved: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', label: t.requests.approved },
    rejected: { icon: XCircle, color: 'text-red-600 bg-red-50', label: t.requests.rejected },
    completed: { icon: CheckCircle2, color: 'text-blue-600 bg-blue-50', label: t.common.success },
    cancelled: { icon: Ban, color: 'text-slate-600 bg-slate-50', label: t.common.cancel },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-bold text-slate-800">{t.customer.serviceRequests}</h3>
      </div>

      {!serviceRequests.length ? (
        <Card className="bg-white border-dashed border-2 border-orange-200">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-orange-300 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-slate-700 mb-2">{t.customer.noServiceRequests}</h4>
            <p className="text-slate-500 text-sm">{t.customer.noServiceRequestsDesc}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {serviceRequests.map((sr) => {
            const config = statusConfig[sr.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            return (
              <Card key={sr.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {sr.requestType === 'pre_reservation' ? t.customer.preReservation : t.customer.serviceSelection} #{sr.id}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(sr.requestedDate).toLocaleDateString('tr-TR')}
                          {sr.serviceDeliveryDate && (
                            <>
                              <span className="text-slate-300">|</span>
                              <Clock className="h-3 w-3" />
                              {new Date(sr.serviceDeliveryDate).toLocaleDateString('tr-TR')}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                  {sr.rejectionReason && (
                    <p className="text-xs text-red-500 mt-2 pl-12">{sr.rejectionReason}</p>
                  )}
                  {/* Actions */}
                  {(sr.status === 'pending' || sr.status === 'rejected') && (
                    <div className="flex gap-2 mt-3 pl-12">
                      {sr.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => cancelMutation.mutate(sr.id)}
                          disabled={cancelMutation.isPending}
                        >
                          {cancelMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Ban className="h-3 w-3 mr-1" />}
                          {t.customer.cancelRequest}
                        </Button>
                      )}
                      {sr.status === 'rejected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-sky-600 border-sky-200 hover:bg-sky-50"
                          onClick={() => retryMutation.mutate(sr.id)}
                          disabled={retryMutation.isPending}
                        >
                          {retryMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                          {t.customer.retryRequest}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
}: {
  profile: ClientProfileDto;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-bold text-slate-800">{t.common.profile}</h3>
      </div>

      <Card className="bg-white border-0 shadow-md">
        <CardContent className="p-6">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-sky-400 to-orange-400 flex items-center justify-center text-white text-2xl font-bold">
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                profile.firstName.charAt(0) + profile.lastName.charAt(0)
              )}
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-800">{profile.firstName} {profile.lastName}</h4>
              <p className="text-sm text-slate-500">@{profile.username}</p>
            </div>
          </div>

          {/* Info Rows */}
          <div className="space-y-4">
            <ProfileRow label={t.auth.firstName} value={profile.firstName} />
            <ProfileRow label={t.auth.lastName} value={profile.lastName} />
            <ProfileRow label={t.auth.username} value={profile.username} />
            <ProfileRow label={t.auth.email} value={profile.email || '-'} />
            <ProfileRow label={t.common.phone} value={
              profile.phone ? `+${profile.phoneCountryCode || ''} ${profile.phone}` : '-'
            } />
            <ProfileRow label={t.admin.lastLogin} value={
              profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString('tr-TR') : '-'
            } />
            <ProfileRow label={t.customer.statusLabel} value={profile.active ? t.customer.statusActiveLabel : t.customer.statusInactiveLabel} />
          </div>

          {/* Profile Edit - Link to dedicated page */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <Link href="/customer/profile">
              <Button className="w-full bg-gradient-to-r from-sky-500 to-orange-500 hover:from-sky-600 hover:to-orange-600 text-white">
                <User className="h-4 w-4 mr-2" />
                {t.common.edit}
              </Button>
            </Link>
          </div>
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
  icon: React.ElementType;
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
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-all ${
        active ? 'text-orange-600 border-b-2 border-orange-500' : 'text-slate-500'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    sky: 'from-sky-400 to-sky-500 text-sky-700 bg-sky-50',
    amber: 'from-amber-400 to-amber-500 text-amber-700 bg-amber-50',
    emerald: 'from-emerald-400 to-emerald-500 text-emerald-700 bg-emerald-50',
    violet: 'from-violet-400 to-violet-500 text-violet-700 bg-violet-50',
  };
  const colors = colorMap[color] || colorMap.sky;

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardContent className="p-4">
        <div className={`p-2 rounded-lg ${colors.split(' ').slice(2).join(' ')} w-fit mb-2`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
