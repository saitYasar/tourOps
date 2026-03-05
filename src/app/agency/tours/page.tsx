'use client';

import { useState, useMemo } from 'react';
import { useAutoSelect } from '@/hooks/useAutoSelect';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Route, Search, Eye, Users, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

import { tourApi, regionApi, restaurantApi } from '@/lib/mockApi';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Tour, TourStatus, Restaurant } from '@/types';

// Map is loaded client-side only
const RestaurantMap = dynamic(
  () => import('@/components/shared/RestaurantMap').then((mod) => mod.RestaurantMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[250px] bg-slate-100 flex items-center justify-center rounded-lg">
        <p className="text-slate-500">Loading map...</p>
      </div>
    ),
  }
);

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
  name: string;
  description: string;
  regionId: string;
  startDate: string;
  endDate: string;
  capacity: number;
  status: TourStatus;
  photoUrl: string;
}

const initialFormData: TourFormData = {
  name: '',
  description: '',
  regionId: '',
  startDate: '',
  endDate: '',
  capacity: 20,
  status: 'Draft',
  photoUrl: '',
};

export default function ToursPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TourStatus | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
  const [formData, setFormData] = useState<TourFormData>(initialFormData);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Query: Turlari getir
  const {
    data: tours,
    isLoading: toursLoading,
    error: toursError,
    refetch,
  } = useQuery({
    queryKey: ['tours'],
    queryFn: tourApi.list,
  });

  // Query: Bolgeleri getir
  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: regionApi.list,
  });

  // Query: Tum restoranlari getir
  const { data: allRestaurants } = useQuery({
    queryKey: ['restaurants'],
    queryFn: restaurantApi.list,
  });

  // Auto-select: Tek bolge varsa otomatik sec
  useAutoSelect(
    regions,
    formData.regionId,
    (region) => {
      setFormData((prev) => ({ ...prev, regionId: region.id }));
      setSelectedRestaurant(null);
    },
    { enabled: isFormOpen }
  );

  // Seçilen bölgedeki restoranlar
  const restaurantsInRegion = useMemo(() => {
    if (!formData.regionId || !allRestaurants) return [];
    return allRestaurants.filter((r) => r.regionId === formData.regionId);
  }, [formData.regionId, allRestaurants]);

  // Harita merkezi için bölge koordinatları
  const mapCenter = useMemo(() => {
    if (restaurantsInRegion.length > 0) {
      // Restoranların ortalamasını al
      const avgLat = restaurantsInRegion.reduce((sum, r) => sum + r.location.lat, 0) / restaurantsInRegion.length;
      const avgLng = restaurantsInRegion.reduce((sum, r) => sum + r.location.lng, 0) / restaurantsInRegion.length;
      return { lat: avgLat, lng: avgLng };
    }
    return undefined;
  }, [restaurantsInRegion]);

  // Mutation: Tur oluştur
  const createMutation = useMutation({
    mutationFn: tourApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success(t.tours.created);
      closeForm();
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

  // Mutation: Tur güncelle
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tour> }) =>
      tourApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success(t.tours.updated);
      closeForm();
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

  // Mutation: Tur sil
  const deleteMutation = useMutation({
    mutationFn: tourApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success(t.tours.deleted);
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

  const openCreateForm = () => {
    setEditingTour(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const openEditForm = (tour: Tour) => {
    setEditingTour(tour);
    setFormData({
      name: tour.name,
      description: tour.description || '',
      regionId: tour.regionId,
      startDate: tour.startDate,
      endDate: tour.endDate,
      capacity: tour.capacity,
      status: tour.status,
      photoUrl: tour.photoUrl || '',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTour(null);
    setFormData(initialFormData);
    setSelectedRestaurant(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(t.common.required);
      return;
    }
    if (!formData.regionId) {
      toast.error(t.common.required);
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error(t.common.required);
      return;
    }

    const tourData = {
      ...formData,
      route: editingTour?.route || [],
      stops: editingTour?.stops || [],
    };

    if (editingTour) {
      updateMutation.mutate({ id: editingTour.id, data: tourData });
    } else {
      createMutation.mutate(tourData);
    }
  };

  const getRegionName = (regionId: string) => {
    return regions?.find((r) => r.id === regionId)?.name || '-';
  };

  const filteredTours = tours?.filter((tour) => {
    const matchesSearch = tour.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tour.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header title={t.tours.title} description={t.tours.description} />

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
                  <SelectItem value="Draft">{t.tours.draft}</SelectItem>
                  <SelectItem value="Published">{t.tours.published}</SelectItem>
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
            ) : !filteredTours?.length ? (
              <EmptyState
                icon={Route}
                title={t.tours.notFound}
                description={
                  search || statusFilter !== 'all'
                    ? t.regions.notFoundDesc
                    : t.tours.noTours
                }
                actionLabel={!search && statusFilter === 'all' ? t.tours.new : undefined}
                onAction={!search && statusFilter === 'all' ? openCreateForm : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.tours.name}</TableHead>
                    <TableHead>{t.tours.region}</TableHead>
                    <TableHead>{t.tours.startDate} - {t.tours.endDate}</TableHead>
                    <TableHead>{t.tours.capacity}</TableHead>
                    <TableHead>{t.tours.status}</TableHead>
                    <TableHead className="text-right">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTours.map((tour) => (
                    <TableRow key={tour.id}>
                      <TableCell className="font-medium">{tour.name}</TableCell>
                      <TableCell>{getRegionName(tour.regionId)}</TableCell>
                      <TableCell>
                        {formatDate(tour.startDate)} - {formatDate(tour.endDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-slate-400" />
                          {tour.capacity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TourStatusBadge status={tour.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/agency/tours/${tour.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(tour)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(tour)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTour ? t.tours.edit : t.tours.new}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
              {/* Sol: Form alanlari */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t.tours.name} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={t.tours.name}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regionId">{t.tours.region} *</Label>
                  <Select
                    value={formData.regionId}
                    onValueChange={(v) => {
                      setFormData((prev) => ({ ...prev, regionId: v }));
                      setSelectedRestaurant(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.tours.selectRegion} />
                    </SelectTrigger>
                    <SelectContent>
                      {regions?.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Label htmlFor="capacity">{t.tours.capacity}</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min={1}
                      value={formData.capacity || ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          capacity: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">{t.tours.status}</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, status: v as TourStatus }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">{t.tours.draft}</SelectItem>
                        <SelectItem value="Published">{t.tours.published}</SelectItem>
                      </SelectContent>
                    </Select>
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

                <div className="space-y-2">
                  <Label htmlFor="photoUrl">Tur Fotoğrafı URL</Label>
                  <Input
                    id="photoUrl"
                    value={formData.photoUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, photoUrl: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                  {formData.photoUrl && (
                    <div className="mt-2 w-full h-32 rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={formData.photoUrl}
                        alt="Tur önizleme"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sag: Harita ve restoran listesi */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t.tours.restaurants} ({restaurantsInRegion.length})
                  </Label>
                  {formData.regionId ? (
                    <>
                      <RestaurantMap
                        restaurants={restaurantsInRegion}
                        selectedRestaurantId={selectedRestaurant?.id || null}
                        onRestaurantSelect={setSelectedRestaurant}
                        center={mapCenter}
                        zoom={12}
                        height="250px"
                      />
                      {restaurantsInRegion.length > 0 ? (
                        <div className="text-xs text-slate-500 mt-1">
                          {t.tours.selectOnMap}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 mt-1">
                          {t.tours.noRestaurantsOnRouteDesc}
                        </div>
                      )}
                      {/* Secili restoran detayi */}
                      {selectedRestaurant && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg border">
                          <div className="flex items-start gap-3">
                            {selectedRestaurant.photoUrl && (
                              <img
                                src={selectedRestaurant.photoUrl}
                                alt={selectedRestaurant.name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm">{selectedRestaurant.name}</h4>
                              <p className="text-xs text-slate-500 truncate">{selectedRestaurant.address}</p>
                              {selectedRestaurant.phone && (
                                <p className="text-xs text-slate-500">{selectedRestaurant.phone}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-[250px] bg-slate-100 flex items-center justify-center rounded-lg border-2 border-dashed">
                      <div className="text-center text-slate-500">
                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t.tours.selectRegion}</p>
                      </div>
                    </div>
                  )}
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
        description={`"${deleteTarget?.name}" ${t.tours.deleteConfirm}`}
        confirmLabel={t.common.delete}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        variant="destructive"
      />
    </div>
  );
}
