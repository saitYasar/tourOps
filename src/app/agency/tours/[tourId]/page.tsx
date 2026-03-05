'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  Save,
  Undo,
  Trash2,
  Send,
  Store,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  Check,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

import { tourApi, regionApi, restaurantApi, preReservationApi } from '@/lib/mockApi';
import type { LatLng, Restaurant, PreReservationRequest } from '@/types';
import { formatDate } from '@/lib/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';

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
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { LoadingState, EmptyState, ErrorState, TourStatusBadge, RequestStatusBadge, RestaurantMap } from '@/components/shared';

// Map is loaded client-side only (to avoid SSR errors)
const RouteMap = dynamic(
  () => import('@/components/agency/RouteMap').then((mod) => mod.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Loading map...</p>
      </div>
    ),
  }
);

interface ReservationFormData {
  headcount: number;
  date: string;
  timeStart: string;
  timeEnd: string;
  note: string;
}

const initialReservationForm: ReservationFormData = {
  headcount: 20,
  date: '',
  timeStart: '12:00',
  timeEnd: '14:00',
  note: '',
};

export default function TourDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const tourId = params.tourId as string;

  const [isDrawMode, setIsDrawMode] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<LatLng[]>([]);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [reservationForm, setReservationForm] = useState<ReservationFormData>(initialReservationForm);
  const [selectedRestaurants, setSelectedRestaurants] = useState<Set<string>>(new Set());
  const [highlightedRestaurant, setHighlightedRestaurant] = useState<string | null>(null);

  // Query: Tur detayi
  const {
    data: tour,
    isLoading: tourLoading,
    error: tourError,
  } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => tourApi.getById(tourId),
  });

  // Query: Bolge
  const { data: region } = useQuery({
    queryKey: ['region', tour?.regionId],
    queryFn: () => regionApi.getById(tour?.regionId || ''),
    enabled: !!tour?.regionId,
  });

  // Query: Rota yakinindaki restoranlar
  const { data: nearbyRestaurants } = useQuery({
    queryKey: ['nearbyRestaurants', tour?.route],
    queryFn: () => restaurantApi.findNearRoute(tour?.route || []),
    enabled: !!tour?.route && tour.route.length > 0,
  });

  // Query: Tura ait on rezervasyon istekleri
  const { data: tourRequests } = useQuery({
    queryKey: ['tourRequests', tourId],
    queryFn: () => preReservationApi.listByTour(tourId),
  });

  // Mutation: Update route
  const updateRouteMutation = useMutation({
    mutationFn: (route: LatLng[]) => tourApi.updateRoute(tourId, route),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      queryClient.invalidateQueries({ queryKey: ['nearbyRestaurants'] });
      toast.success(t.tours.routeSaved);
      setIsDrawMode(false);
      setPendingRoute([]);
    },
    onError: () => {
      toast.error(t.tours.routeError);
    },
  });

  // Mutation: Create pre-reservation request (multiple)
  const createReservationMutation = useMutation({
    mutationFn: async (restaurantIds: string[]) => {
      const promises = restaurantIds.map((restaurantId) =>
        preReservationApi.create({
          tourId,
          restaurantId,
          headcount: reservationForm.headcount,
          date: reservationForm.date,
          timeStart: reservationForm.timeStart,
          timeEnd: reservationForm.timeEnd,
          note: reservationForm.note,
          status: 'Pending',
        })
      );
      return Promise.all(promises);
    },
    onSuccess: (_, restaurantIds) => {
      queryClient.invalidateQueries({ queryKey: ['tourRequests', tourId] });
      toast.success(`${restaurantIds.length} ${t.requests.sent}`);
      setIsReservationOpen(false);
      setReservationForm(initialReservationForm);
      setSelectedRestaurants(new Set());
    },
    onError: () => {
      toast.error(t.requests.sendError);
    },
  });

  const handleRouteChange = useCallback((newRoute: LatLng[]) => {
    setPendingRoute(newRoute);
  }, []);

  const handleStartDrawing = () => {
    setPendingRoute(tour?.route || []);
    setIsDrawMode(true);
  };

  const handleSaveRoute = () => {
    updateRouteMutation.mutate(pendingRoute);
  };

  const handleUndoLastPoint = () => {
    if (pendingRoute.length > 0) {
      setPendingRoute(pendingRoute.slice(0, -1));
    }
  };

  const handleClearRoute = () => {
    setPendingRoute([]);
  };

  const handleCancelDrawing = () => {
    setIsDrawMode(false);
    setPendingRoute([]);
  };

  // Restoran secim fonksiyonlari
  const toggleRestaurantSelection = (restaurantId: string) => {
    setSelectedRestaurants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(restaurantId)) {
        newSet.delete(restaurantId);
      } else {
        newSet.add(restaurantId);
      }
      return newSet;
    });
  };

  const selectAllRestaurants = () => {
    const availableIds = nearbyRestaurants
      ?.filter((r) => !hasExistingRequest(r.id))
      .map((r) => r.id) || [];
    setSelectedRestaurants(new Set(availableIds));
  };

  const clearSelection = () => {
    setSelectedRestaurants(new Set());
  };

  const openReservationForm = () => {
    if (selectedRestaurants.size === 0) {
      toast.error(t.tours.selectRestaurantFirst || 'Please select at least one restaurant');
      return;
    }
    setReservationForm({
      ...initialReservationForm,
      headcount: tour?.capacity || 20,
      date: tour?.startDate || '',
    });
    setIsReservationOpen(true);
  };

  const handleSubmitReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationForm.date || !reservationForm.timeStart || !reservationForm.timeEnd) {
      toast.error(t.requests.dateTimeRequired);
      return;
    }

    const restaurantIds = Array.from(selectedRestaurants);
    createReservationMutation.mutate(restaurantIds);
  };

  // Secili restoranlar listesi
  const selectedRestaurantsList = useMemo(() => {
    return nearbyRestaurants?.filter((r) => selectedRestaurants.has(r.id)) || [];
  }, [nearbyRestaurants, selectedRestaurants]);

  const getRestaurantName = (restaurantId: string) => {
    return nearbyRestaurants?.find((r) => r.id === restaurantId)?.name || '-';
  };

  const hasExistingRequest = (restaurantId: string) => {
    return tourRequests?.some((r) => r.restaurantId === restaurantId);
  };

  const displayRoute = isDrawMode ? pendingRoute : (tour?.route || []);

  if (tourLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t.tours.detail} />
        <div className="flex-1 p-6">
          <LoadingState message={t.tours.loadingTour} />
        </div>
      </div>
    );
  }

  if (tourError || !tour) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t.tours.detail} />
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
      <Header title={tour.name} description={region?.name || t.tours.loadingRegion} />

      <div className="flex-1 p-6 overflow-auto">
        {/* Ust Bilgi Karti */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.push('/agency/tours')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{tour.name}</h2>
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
              <span>{tour.capacity} {t.tours.people}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="route" className="space-y-4">
          <TabsList>
            <TabsTrigger value="route">{t.tours.routeAndMap}</TabsTrigger>
            <TabsTrigger value="restaurants">{t.tours.restaurants} ({nearbyRestaurants?.length || 0})</TabsTrigger>
            <TabsTrigger value="requests">{t.tours.requests} ({tourRequests?.length || 0})</TabsTrigger>
          </TabsList>

          {/* Route Tab */}
          <TabsContent value="route" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">{t.tours.tourRoute}</CardTitle>
                  <CardDescription>
                    {isDrawMode
                      ? t.tours.clickToAddRoute
                      : t.tours.editRouteDesc}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isDrawMode ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleUndoLastPoint} disabled={pendingRoute.length === 0}>
                        <Undo className="h-4 w-4 mr-1" />
                        {t.tours.undo}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleClearRoute}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t.tours.clear}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCancelDrawing}>
                        {t.common.cancel}
                      </Button>
                      <Button size="sm" onClick={handleSaveRoute} disabled={updateRouteMutation.isPending}>
                        <Save className="h-4 w-4 mr-1" />
                        {updateRouteMutation.isPending ? t.tours.saving : t.common.save}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleStartDrawing}>
                      <MapPin className="h-4 w-4 mr-2" />
                      {t.tours.drawRoute}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] rounded-lg overflow-hidden border">
                  <RouteMap
                    route={displayRoute}
                    onRouteChange={handleRouteChange}
                    isDrawMode={isDrawMode}
                    restaurantMarkers={
                      nearbyRestaurants?.map((r) => ({
                        id: r.id,
                        location: r.location,
                        name: r.name,
                      })) || []
                    }
                    onRestaurantClick={(id) => {
                      if (!isDrawMode && !hasExistingRequest(id)) {
                        toggleRestaurantSelection(id);
                        setHighlightedRestaurant(id);
                      }
                    }}
                  />
                </div>
                {displayRoute.length > 0 && (
                  <p className="text-sm text-slate-500 mt-2">
                    {t.tours.routePoints.replace('{count}', String(displayRoute.length))}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restaurants Tab */}
          <TabsContent value="restaurants" className="space-y-4">
            {!tour.route || tour.route.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <EmptyState
                    icon={MapPin}
                    title={t.tours.routeNotFound}
                    description={t.tours.routeNotFoundDesc}
                  />
                </CardContent>
              </Card>
            ) : !nearbyRestaurants?.length ? (
              <Card>
                <CardContent className="py-12">
                  <EmptyState
                    icon={Store}
                    title={t.tours.noRestaurantsOnRoute}
                    description={t.tours.noRestaurantsOnRouteDesc}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Sol: Harita */}
                <div className="lg:col-span-2 space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        {t.tours.nearbyRestaurants}
                      </CardTitle>
                      <CardDescription>
                        {t.tours.selectOnMap}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RestaurantMap
                        restaurants={nearbyRestaurants}
                        selectedRestaurantId={highlightedRestaurant}
                        onRestaurantSelect={(restaurant) => {
                          if (!hasExistingRequest(restaurant.id)) {
                            toggleRestaurantSelection(restaurant.id);
                          }
                          setHighlightedRestaurant(restaurant.id);
                        }}
                        route={tour.route}
                        showRoute={true}
                        height="350px"
                      />
                    </CardContent>
                  </Card>

                  {/* Restoran Listesi */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{t.tours.restaurants}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={selectAllRestaurants}>
                            <CheckSquare className="h-4 w-4 mr-1" />
                            {t.common.all}
                          </Button>
                          <Button variant="outline" size="sm" onClick={clearSelection}>
                            <X className="h-4 w-4 mr-1" />
                            {t.tours.clear}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {nearbyRestaurants.map((restaurant) => {
                          const hasRequest = hasExistingRequest(restaurant.id);
                          const request = tourRequests?.find((r) => r.restaurantId === restaurant.id);
                          const isSelected = selectedRestaurants.has(restaurant.id);
                          const isHighlighted = highlightedRestaurant === restaurant.id;

                          return (
                            <div
                              key={restaurant.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                hasRequest
                                  ? 'bg-slate-50 opacity-60'
                                  : isSelected
                                  ? 'bg-blue-50 border-blue-300'
                                  : isHighlighted
                                  ? 'bg-slate-100 border-slate-300'
                                  : 'hover:bg-slate-50 cursor-pointer'
                              }`}
                              onClick={() => {
                                if (!hasRequest) {
                                  toggleRestaurantSelection(restaurant.id);
                                }
                                setHighlightedRestaurant(restaurant.id);
                              }}
                              onMouseEnter={() => setHighlightedRestaurant(restaurant.id)}
                              onMouseLeave={() => setHighlightedRestaurant(null)}
                            >
                              {/* Checkbox */}
                              <div className="flex-shrink-0">
                                {hasRequest ? (
                                  <Check className="h-5 w-5 text-green-500" />
                                ) : isSelected ? (
                                  <CheckSquare className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <Square className="h-5 w-5 text-slate-300" />
                                )}
                              </div>

                              {/* Photo */}
                              <div className="w-12 h-12 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden">
                                {restaurant.photoUrl ? (
                                  <img
                                    src={restaurant.photoUrl}
                                    alt={restaurant.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <Store className="h-5 w-5 text-slate-300" />
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm truncate">{restaurant.name}</h4>
                                  {hasRequest && request && (
                                    <RequestStatusBadge status={request.status} />
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 truncate">{restaurant.address}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sag: Secim Paneli */}
                <div className="space-y-4">
                  <Card className="sticky top-6">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Send className="h-5 w-5 text-emerald-600" />
                        {t.requests.preReservation}
                      </CardTitle>
                      <CardDescription>
                        {selectedRestaurants.size > 0
                          ? `${selectedRestaurants.size} ${t.tours.restaurants.toLowerCase()} ${t.menu.active.toLowerCase()}`
                          : t.tours.selectOnMap}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Secili Restoranlar */}
                      {selectedRestaurantsList.length > 0 ? (
                        <div className="space-y-3">
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {selectedRestaurantsList.map((restaurant) => (
                              <div
                                key={restaurant.id}
                                className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg"
                              >
                                <div className="w-8 h-8 flex-shrink-0 bg-slate-100 rounded overflow-hidden">
                                  {restaurant.photoUrl ? (
                                    <img
                                      src={restaurant.photoUrl}
                                      alt={restaurant.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center h-full">
                                      <Store className="h-4 w-4 text-slate-300" />
                                    </div>
                                  )}
                                </div>
                                <span className="flex-1 text-sm font-medium truncate">
                                  {restaurant.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleRestaurantSelection(restaurant.id)}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <Separator />

                          <Button
                            className="w-full"
                            onClick={openReservationForm}
                            disabled={selectedRestaurants.size === 0}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {t.tours.sendRequest} ({selectedRestaurants.size})
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">{t.tours.selectOnMap}</p>
                          <p className="text-xs mt-1 text-slate-400">
                            {t.tours.nearbyRestaurantsDesc}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.requests.preReservationRequests}</CardTitle>
                <CardDescription>
                  {t.requests.forThisTour}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!tourRequests?.length ? (
                  <EmptyState
                    icon={Send}
                    title={t.requests.noRequestsForTour}
                    description={t.requests.noRequestsForTourDesc}
                  />
                ) : (
                  <div className="space-y-3">
                    {tourRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Store className="h-8 w-8 text-slate-400" />
                          <div>
                            <h4 className="font-medium">{getRestaurantName(request.restaurantId)}</h4>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(request.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {request.timeStart} - {request.timeEnd}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {request.headcount} {t.tours.people}
                              </span>
                            </div>
                          </div>
                        </div>
                        <RequestStatusBadge status={request.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reservation Dialog - Multiple Restaurants */}
      <Dialog open={isReservationOpen} onOpenChange={setIsReservationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.requests.preReservation}</DialogTitle>
            <DialogDescription>
              {selectedRestaurants.size} {t.tours.restaurants.toLowerCase()}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReservation}>
            <div className="space-y-4 py-4">
              {/* Secili Restoranlar Listesi */}
              <div className="space-y-2">
                <Label>{t.tours.restaurants} ({selectedRestaurants.size})</Label>
                <div className="max-h-[120px] overflow-y-auto space-y-1 p-2 bg-slate-50 rounded-lg">
                  {selectedRestaurantsList.map((restaurant) => (
                    <div key={restaurant.id} className="flex items-center gap-2 text-sm">
                      <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span className="truncate">{restaurant.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="res-date">{t.requests.date} *</Label>
                  <Input
                    id="res-date"
                    type="date"
                    value={reservationForm.date}
                    onChange={(e) =>
                      setReservationForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="res-headcount">{t.requests.headcount}</Label>
                  <Input
                    id="res-headcount"
                    type="number"
                    min={1}
                    value={reservationForm.headcount || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setReservationForm((prev) => ({
                        ...prev,
                        headcount: parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="res-timeStart">{t.requests.timeStart} *</Label>
                  <Input
                    id="res-timeStart"
                    type="time"
                    value={reservationForm.timeStart}
                    onChange={(e) =>
                      setReservationForm((prev) => ({ ...prev, timeStart: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="res-timeEnd">{t.requests.timeEnd} *</Label>
                  <Input
                    id="res-timeEnd"
                    type="time"
                    value={reservationForm.timeEnd}
                    onChange={(e) =>
                      setReservationForm((prev) => ({ ...prev, timeEnd: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="res-note">{t.requests.noteOptional}</Label>
                <Textarea
                  id="res-note"
                  value={reservationForm.note}
                  onChange={(e) =>
                    setReservationForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  placeholder={t.requests.notePlaceholder}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsReservationOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={createReservationMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {createReservationMutation.isPending
                  ? t.requests.sending
                  : `${t.tours.sendRequest} (${selectedRestaurants.size})`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
