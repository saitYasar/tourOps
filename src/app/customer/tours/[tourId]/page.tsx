'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Store,
  Calendar,
  Clock,
  Armchair,
  UtensilsCrossed,
  Plus,
  Minus,
  Save,
  CheckCircle,
  Building2,
  DoorOpen,
  MessageSquare,
  Info,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  tourApi,
  preReservationApi,
  restaurantApi,
  venueApi,
  menuApi,
  customerSelectionApi,
} from '@/lib/mockApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Restaurant, Table, Floor, Room, MenuCategory, MenuItem, OrderItem, CustomerSelection } from '@/types';
import { formatDate } from '@/lib/dateUtils';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { LoadingState, EmptyState, ErrorState, RequestStatusBadge } from '@/components/shared';
import { VenueSelector3D } from '@/components/customer/VenueSelector3D';
import { AnimatedMenu } from '@/components/customer/AnimatedMenu';

interface SelectionState {
  floorId: string | null;
  roomId: string | null;
  tableId: string | null;
  items: OrderItem[];
}

export default function CustomerTourDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const tourId = params.tourId as string;
  const customerId = user?.customerId || '';

  const [activeRestaurant, setActiveRestaurant] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState>({
    floorId: null,
    roomId: null,
    tableId: null,
    items: [],
  });

  // Menu item detail modal state
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [itemNote, setItemNote] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [excludeIngredients, setExcludeIngredients] = useState<string[]>([]);

  // Query: Tur detayi
  const {
    data: tour,
    isLoading: tourLoading,
    error: tourError,
  } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => tourApi.getById(tourId),
  });

  // Query: Tura ait on rezervasyon istekleri (onaylilar)
  const { data: tourRequests } = useQuery({
    queryKey: ['tourRequests', tourId],
    queryFn: () => preReservationApi.listByTour(tourId),
  });

  // Query: Tum restoranlar
  const { data: allRestaurants } = useQuery({
    queryKey: ['restaurants'],
    queryFn: restaurantApi.list,
  });

  // Onaylanan restoranlari filtrele
  const approvedRestaurants = useMemo(() => {
    if (!tourRequests || !allRestaurants) return [];
    const approvedIds = tourRequests
      .filter((r) => r.status === 'Approved')
      .map((r) => r.restaurantId);
    return allRestaurants.filter((r) => approvedIds.includes(r.id));
  }, [tourRequests, allRestaurants]);

  // Query: Aktif restoranin katlari
  const { data: floors } = useQuery({
    queryKey: ['floors', activeRestaurant],
    queryFn: () => venueApi.listFloors(activeRestaurant || ''),
    enabled: !!activeRestaurant,
  });

  // Query: Seçilen katın odaları
  const { data: rooms } = useQuery({
    queryKey: ['rooms', selection.floorId],
    queryFn: () => venueApi.listRooms(selection.floorId || ''),
    enabled: !!selection.floorId,
  });

  // Query: Seçilen odanın masaları
  const { data: tables } = useQuery({
    queryKey: ['tables', selection.roomId],
    queryFn: () => venueApi.listTables(selection.roomId || ''),
    enabled: !!selection.roomId,
  });

  // Query: Aktif restoranın kategorileri
  const { data: categories } = useQuery({
    queryKey: ['menuCategories', activeRestaurant],
    queryFn: () => menuApi.listCategories(activeRestaurant || ''),
    enabled: !!activeRestaurant,
  });

  // Query: Aktif restoranın ürünleri
  const { data: menuItems } = useQuery({
    queryKey: ['menuItems', activeRestaurant],
    queryFn: () => menuApi.listItemsByRestaurant(activeRestaurant || ''),
    enabled: !!activeRestaurant,
  });

  // Query: Mevcut secimler
  const { data: existingSelections } = useQuery({
    queryKey: ['customerSelections', tourId, customerId],
    queryFn: () => customerSelectionApi.listByTourAndCustomer(tourId, customerId),
    enabled: !!customerId,
  });

  // Mutation: Secimi kaydet
  const saveSelectionMutation = useMutation({
    mutationFn: (data: Omit<CustomerSelection, 'id' | 'createdAt' | 'updatedAt'>) =>
      customerSelectionApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerSelections', tourId, customerId] });
      toast.success(t.customer.saved);
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

  const getRequestForRestaurant = (restaurantId: string) => {
    return tourRequests?.find((r) => r.restaurantId === restaurantId);
  };

  const getExistingSelection = (restaurantId: string) => {
    return existingSelections?.find((s) => s.restaurantId === restaurantId);
  };

  const handleSelectRestaurant = (restaurantId: string) => {
    const existingSelection = getExistingSelection(restaurantId);
    setActiveRestaurant(restaurantId);
    setSelection({
      floorId: null,
      roomId: null,
      tableId: existingSelection?.tableId || null,
      items: existingSelection?.items || [],
    });
  };

  const handleSelectFloor = (floorId: string) => {
    setSelection((prev) => ({
      ...prev,
      floorId: prev.floorId === floorId ? null : floorId,
      roomId: null,
      tableId: null,
    }));
  };

  const handleSelectRoom = (roomId: string) => {
    setSelection((prev) => ({
      ...prev,
      roomId: prev.roomId === roomId ? null : roomId,
      tableId: null,
    }));
  };

  const handleSelectTable = (tableId: string) => {
    setSelection((prev) => ({
      ...prev,
      tableId: prev.tableId === tableId ? null : tableId,
    }));
  };

  const handleOpenItemDetail = (item: MenuItem) => {
    const existingItem = selection.items.find((i) => i.menuItemId === item.id);
    setSelectedMenuItem(item);
    setItemQuantity(existingItem?.quantity || 1);
    setItemNote(existingItem?.note || '');
    setExcludeIngredients(existingItem?.excludeIngredients || []);
  };

  const handleCloseItemDetail = () => {
    setSelectedMenuItem(null);
    setItemNote('');
    setItemQuantity(1);
    setExcludeIngredients([]);
  };

  const toggleExcludeIngredient = (ingredient: string) => {
    setExcludeIngredients(prev =>
      prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  const handleAddItemFromDetail = () => {
    if (!selectedMenuItem) return;

    setSelection((prev) => {
      const existingIndex = prev.items.findIndex((i) => i.menuItemId === selectedMenuItem.id);
      if (existingIndex >= 0) {
        // Update existing item
        const newItems = [...prev.items];
        newItems[existingIndex] = {
          menuItemId: selectedMenuItem.id,
          quantity: itemQuantity,
          note: itemNote || undefined,
          excludeIngredients: excludeIngredients.length > 0 ? excludeIngredients : undefined,
        };
        return { ...prev, items: newItems };
      }
      // Add new item
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            menuItemId: selectedMenuItem.id,
            quantity: itemQuantity,
            note: itemNote || undefined,
            excludeIngredients: excludeIngredients.length > 0 ? excludeIngredients : undefined,
          },
        ],
      };
    });

    handleCloseItemDetail();
  };

  const handleRemoveItemFromDetail = () => {
    if (!selectedMenuItem) return;

    setSelection((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.menuItemId !== selectedMenuItem.id),
    }));

    handleCloseItemDetail();
  };

  const handleAddItem = (menuItemId: string) => {
    setSelection((prev) => {
      const existing = prev.items.find((i) => i.menuItemId === menuItemId);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return {
        ...prev,
        items: [...prev.items, { menuItemId, quantity: 1 }],
      };
    });
  };

  const handleRemoveItem = (menuItemId: string) => {
    setSelection((prev) => {
      const existing = prev.items.find((i) => i.menuItemId === menuItemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return {
          ...prev,
          items: prev.items.filter((i) => i.menuItemId !== menuItemId),
        };
      }
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i
        ),
      };
    });
  };

  const getItemQuantity = (menuItemId: string) => {
    return selection.items.find((i) => i.menuItemId === menuItemId)?.quantity || 0;
  };

  const getItemNote = (menuItemId: string) => {
    return selection.items.find((i) => i.menuItemId === menuItemId)?.note || '';
  };

  const getItemExcludeIngredients = (menuItemId: string) => {
    return selection.items.find((i) => i.menuItemId === menuItemId)?.excludeIngredients || [];
  };

  const getItemById = (menuItemId: string) => {
    return menuItems?.find((i) => i.id === menuItemId);
  };

  const calculateTotal = () => {
    return selection.items.reduce((total, item) => {
      const menuItem = getItemById(item.menuItemId);
      return total + (menuItem?.price || 0) * item.quantity;
    }, 0);
  };

  const handleSaveSelection = () => {
    if (!activeRestaurant) return;

    saveSelectionMutation.mutate({
      tourId,
      customerId,
      restaurantId: activeRestaurant,
      tableId: selection.tableId || undefined,
      items: selection.items,
    });
  };

  const getItemsForCategory = (categoryId: string) => {
    return menuItems?.filter((i) => i.categoryId === categoryId && i.isActive) || [];
  };

  // Helper to get floor/room names
  const getFloorName = (floorId: string | null) => {
    return floors?.find((f) => f.id === floorId)?.name || '';
  };

  const getRoomName = (roomId: string | null) => {
    return rooms?.find((r) => r.id === roomId)?.name || '';
  };

  const getTableInfo = (tableId: string | null) => {
    return tables?.find((t) => t.id === tableId);
  };

  if (tourLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t.tours.title} />
        <div className="flex-1 p-6">
          <LoadingState message={t.common.loading} />
        </div>
      </div>
    );
  }

  if (tourError || !tour) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t.tours.title} />
        <div className="flex-1 p-6">
          <ErrorState
            title={t.tours.notFound}
            onRetry={() => router.push('/customer')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={tour.name} description={t.customer.selectTableAndMenu} />

      <div className="flex-1 p-6 overflow-auto">
        {/* Ust Bilgi */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.push('/customer')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{tour.name}</h2>
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(tour.startDate)} - {formatDate(tour.endDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Restoran Listesi ve Secim Alani */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sol: Restoran Listesi */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.tours.restaurants}</CardTitle>
                <CardDescription>
                  {t.requests.approved}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!approvedRestaurants.length ? (
                  <EmptyState
                    icon={Store}
                    title={t.common.noData}
                    description={t.requests.noRequests}
                  />
                ) : (
                  <div className="space-y-2">
                    {approvedRestaurants.map((restaurant) => {
                      const request = getRequestForRestaurant(restaurant.id);
                      const existingSel = getExistingSelection(restaurant.id);
                      const isActive = activeRestaurant === restaurant.id;

                      return (
                        <div
                          key={restaurant.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isActive
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={() => handleSelectRestaurant(restaurant.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{restaurant.name}</h4>
                              {request && (
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                  <Clock className="h-3 w-3" />
                                  {request.timeStart} - {request.timeEnd}
                                </div>
                              )}
                            </div>
                            {existingSel && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sag: Secim Alani */}
          <div className="lg:col-span-2">
            {!activeRestaurant ? (
              <Card>
                <CardContent className="py-12">
                  <EmptyState
                    icon={Store}
                    title={t.restaurant.selectRestaurant}
                    description={t.customer.selectTableAndMenu}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-lg">
                      {allRestaurants?.find((r) => r.id === activeRestaurant)?.name}
                    </CardTitle>
                    <CardDescription>{t.customer.selectTableAndMenu}</CardDescription>
                  </div>
                  <Button
                    onClick={handleSaveSelection}
                    disabled={saveSelectionMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveSelectionMutation.isPending ? t.common.loading : t.common.save}
                  </Button>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="tables">
                    <TabsList className="mb-4">
                      <TabsTrigger value="tables">
                        <Armchair className="h-4 w-4 mr-2" />
                        {t.customer.selectTable}
                      </TabsTrigger>
                      <TabsTrigger value="menu">
                        <UtensilsCrossed className="h-4 w-4 mr-2" />
                        {t.customer.selectMenu}
                      </TabsTrigger>
                      <TabsTrigger value="summary">
                        {t.customer.summary} ({selection.items.reduce((sum, i) => sum + i.quantity, 0)})
                      </TabsTrigger>
                    </TabsList>

                    {/* Masa Secimi - 3D Animasyonlu */}
                    <TabsContent value="tables">
                      <VenueSelector3D
                        floors={floors || []}
                        rooms={rooms || []}
                        tables={tables || []}
                        selectedFloorId={selection.floorId}
                        selectedRoomId={selection.roomId}
                        selectedTableId={selection.tableId}
                        onSelectFloor={handleSelectFloor}
                        onSelectRoom={handleSelectRoom}
                        onSelectTable={handleSelectTable}
                        translations={{
                          selectFloor: t.customer.selectFloor,
                          selectRoom: t.customer.selectRoom,
                          selectTable: t.customer.selectTable,
                          noFloors: t.venue.noFloors,
                          noRooms: t.venue.noRooms,
                          noTables: t.venue.noTables,
                          persons: t.venue.persons,
                        }}
                      />

                      {/* Seçilen masa bilgisi */}
                      {selection.tableId && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl shadow-sm animate-fade-in">
                          <p className="text-sm text-emerald-700 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                            <span className="font-semibold">
                              {getFloorName(selection.floorId)} → {getRoomName(selection.roomId)} → {getTableInfo(selection.tableId)?.name}
                            </span>
                            <span className="text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full text-xs">
                              {getTableInfo(selection.tableId)?.capacity} {t.venue.persons}
                            </span>
                          </p>
                        </div>
                      )}

                      <style jsx>{`
                        @keyframes fade-in {
                          0% { opacity: 0; transform: translateY(10px); }
                          100% { opacity: 1; transform: translateY(0); }
                        }
                        .animate-fade-in {
                          animation: fade-in 0.4s ease-out;
                        }
                      `}</style>
                    </TabsContent>

                    {/* Menu - Animasyonlu */}
                    <TabsContent value="menu">
                      <AnimatedMenu
                        categories={categories || []}
                        menuItems={menuItems || []}
                        selectedItems={selection.items}
                        onAddItem={handleAddItem}
                        onRemoveItem={handleRemoveItem}
                        onOpenItemDetail={handleOpenItemDetail}
                        getItemQuantity={getItemQuantity}
                        getItemNote={getItemNote}
                        getItemExcludeIngredients={getItemExcludeIngredients}
                        translations={{
                          noCategories: t.menu.noCategories,
                        }}
                      />
                    </TabsContent>

                    {/* Ozet */}
                    <TabsContent value="summary">
                      <div className="space-y-4">
                        {/* Seçilen Masa */}
                        <div>
                          <h4 className="font-medium mb-2">{t.customer.selectedTable}</h4>
                          {selection.tableId ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {getFloorName(selection.floorId)} &gt; {getRoomName(selection.roomId)} &gt; {getTableInfo(selection.tableId)?.name}
                              </Badge>
                              <span className="text-sm text-slate-500">
                                ({getTableInfo(selection.tableId)?.capacity} {t.venue.persons})
                              </span>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">{t.customer.noTableSelected}</p>
                          )}
                        </div>

                        <Separator />

                        {/* Seçilen Ürünler */}
                        <div>
                          <h4 className="font-medium mb-2">{t.customer.selectedItems}</h4>
                          {selection.items.length === 0 ? (
                            <p className="text-sm text-slate-500">{t.customer.noItemsSelected}</p>
                          ) : (
                            <div className="space-y-2">
                              {selection.items.map((item) => {
                                const menuItem = getItemById(item.menuItemId);
                                if (!menuItem) return null;
                                return (
                                  <div
                                    key={item.menuItemId}
                                    className="py-2 border-b"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{item.quantity}x</span>
                                        <span>{menuItem.name}</span>
                                      </div>
                                      <span className="font-medium">
                                        {(menuItem.price * item.quantity).toFixed(2)} TL
                                      </span>
                                    </div>
                                    {item.excludeIngredients && item.excludeIngredients.length > 0 && (
                                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1 ml-6">
                                        <X className="h-3 w-3" />
                                        Çıkarılacak: {item.excludeIngredients.join(', ')}
                                      </p>
                                    )}
                                    {item.note && (
                                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-1 ml-6">
                                        <MessageSquare className="h-3 w-3" />
                                        {item.note}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Toplam */}
                        <div className="flex items-center justify-between text-lg font-bold">
                          <span>{t.customer.total}</span>
                          <span>{calculateTotal().toFixed(2)} TL</span>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Menu Item Detail Modal */}
      <Dialog open={!!selectedMenuItem} onOpenChange={() => handleCloseItemDetail()}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{selectedMenuItem?.name}</DialogTitle>
            <DialogDescription>{t.customer.itemDetails}</DialogDescription>
          </DialogHeader>

          {selectedMenuItem && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {/* Image */}
              {selectedMenuItem.photoUrl && (
                <div className="w-full h-40 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={selectedMenuItem.photoUrl}
                    alt={selectedMenuItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="font-medium text-sm text-slate-600 mb-1">{t.menu.itemDescription}</h4>
                <p className="text-sm">
                  {selectedMenuItem.description || t.customer.noDescription}
                </p>
              </div>

              {/* Ingredients - İçindekiler */}
              {selectedMenuItem.ingredients && selectedMenuItem.ingredients.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-slate-600 mb-2">
                    🥗 İçindekiler
                    <span className="text-xs text-slate-400 ml-2">(Çıkarılmasını istediğinize tıklayın)</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMenuItem.ingredients.map((ingredient) => {
                      const isExcluded = excludeIngredients.includes(ingredient);
                      return (
                        <button
                          key={ingredient}
                          type="button"
                          onClick={() => toggleExcludeIngredient(ingredient)}
                          className={`
                            px-3 py-1.5 rounded-full text-sm font-medium transition-all
                            ${isExcluded
                              ? 'bg-red-100 text-red-700 border-2 border-red-300 line-through'
                              : 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:border-red-300 hover:bg-red-50'
                            }
                          `}
                        >
                          {isExcluded && <span className="mr-1">✕</span>}
                          {ingredient}
                        </button>
                      );
                    })}
                  </div>
                  {excludeIngredients.length > 0 && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {excludeIngredients.length} malzeme çıkarılacak
                    </p>
                  )}
                </div>
              )}

              {/* Price */}
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.menu.price}</span>
                <span className="text-lg font-bold text-primary">
                  {selectedMenuItem.price.toFixed(2)} TL
                </span>
              </div>

              <Separator />

              {/* Quantity */}
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.requests.headcount}</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium text-lg">{itemQuantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setItemQuantity(itemQuantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="font-medium text-sm text-slate-600 mb-2 block">
                  {t.customer.addNote}
                </label>
                <Textarea
                  placeholder={t.customer.notePlaceholder}
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Total for this item */}
              <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                <span className="font-medium">{t.customer.total}</span>
                <span className="text-lg font-bold">
                  {(selectedMenuItem.price * itemQuantity).toFixed(2)} TL
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0 flex-shrink-0 pt-4 border-t">
            {getItemQuantity(selectedMenuItem?.id || '') > 0 && (
              <Button variant="destructive" onClick={handleRemoveItemFromDetail}>
                <X className="h-4 w-4 mr-2" />
                {t.common.delete}
              </Button>
            )}
            <Button onClick={handleAddItemFromDetail}>
              <Plus className="h-4 w-4 mr-2" />
              {getItemQuantity(selectedMenuItem?.id || '') > 0 ? t.common.update : t.common.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
