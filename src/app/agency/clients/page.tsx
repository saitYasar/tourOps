'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, User, Search, Users, Eye, EyeOff, Navigation, Calendar, Hash, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { agencyApi, tourApi, type AgencyClientDto, type CreateAgencyClientDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { LoadingState, EmptyState, ErrorState, ConfirmDialog } from '@/components/shared';

interface ClientFormData {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}

const initialFormData: ClientFormData = {
  firstName: '',
  lastName: '',
  username: '',
  password: '',
};

export default function AgencyClientsPage() {
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgencyClientDto | null>(null);
  const [addToTourTarget, setAddToTourTarget] = useState<AgencyClientDto | null>(null);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [tourSearch, setTourSearch] = useState('');
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Fetch agency data for status badge
  const { data: agencyResult } = useQuery({
    queryKey: ['my-agency'],
    queryFn: () => agencyApi.getMyAgency(),
  });
  const agencyStatus = agencyResult?.success ? agencyResult.data?.status : undefined;

  const {
    data: clientsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['agency-clients'],
    queryFn: () => agencyApi.getClients(1, 100),
  });

  const clients = clientsData?.success ? clientsData.data?.data || [] : [];

  // Fetch tours and their participants to map clientId -> tour names
  const { data: toursData } = useQuery({
    queryKey: ['agency-tours-for-clients'],
    queryFn: async () => {
      const toursResult = await tourApi.list(1, 100);
      if (!toursResult.success || !toursResult.data) return new Map<number, string[]>();

      const map = new Map<number, string[]>();
      const participantResults = await Promise.allSettled(
        toursResult.data.map(async (tour) => {
          const res = await tourApi.getClients(tour.id);
          return { tourName: tour.tourName, clients: res.success ? res.data || [] : [] };
        })
      );

      for (const result of participantResults) {
        if (result.status === 'fulfilled') {
          const { tourName, clients: tourClients } = result.value;
          for (const tc of tourClients) {
            const existing = map.get(tc.clientId) || [];
            if (!existing.includes(tourName)) {
              existing.push(tourName);
            }
            map.set(tc.clientId, existing);
          }
        }
      }
      return map;
    },
  });

  const clientTourMap = toursData || new Map<number, string[]>();

  const createMutation = useMutation({
    mutationFn: (data: CreateAgencyClientDto) => agencyApi.createClient(data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.invitations.clientCreated);
        queryClient.invalidateQueries({ queryKey: ['agency-clients'] });
        closeForm();
      } else {
        toast.error(result.error || t.invitations.clientCreateFailed);
      }
    },
    onError: () => {
      toast.error(t.invitations.clientCreateFailed);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (clientId: number) => agencyApi.deleteClient(clientId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.invitations.clientDeleted);
        queryClient.invalidateQueries({ queryKey: ['agency-clients'] });
        setDeleteTarget(null);
      } else {
        toast.error(result.error || t.invitations.clientDeleteFailed);
      }
    },
    onError: () => {
      toast.error(t.invitations.clientDeleteFailed);
    },
  });

  // Fetch tours list for "Add to Tour" dialog
  const { data: toursList } = useQuery({
    queryKey: ['agency-tours-list'],
    queryFn: async () => {
      const result = await tourApi.list(1, 100);
      return result.success ? result.data || [] : [];
    },
  });

  const addToTourMutation = useMutation({
    mutationFn: ({ tourId, clientId }: { tourId: number; clientId: number }) =>
      tourApi.addParticipant(tourId, clientId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Müşteri tura başarıyla eklendi');
        queryClient.invalidateQueries({ queryKey: ['agency-tours-for-clients'] });
        setAddToTourTarget(null);
        setSelectedTourId(null);
      } else {
        toast.error(result.error || 'Tura ekleme başarısız');
      }
    },
    onError: () => {
      toast.error('Tura ekleme başarısız');
    },
  });

  const closeForm = () => {
    setIsFormOpen(false);
    setFormData(initialFormData);
    setErrors({});
    setShowPassword(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ClientFormData, string>> = {};

    if (!formData.firstName.trim()) newErrors.firstName = t.invitations.firstNameRequired;
    if (!formData.lastName.trim()) newErrors.lastName = t.invitations.lastNameRequired;
    if (!formData.username.trim()) {
      newErrors.username = t.invitations.usernameRequired;
    } else if (formData.username.length < 3) {
      newErrors.username = t.invitations.usernameMinLength;
    }
    if (!formData.password.trim()) {
      newErrors.password = t.invitations.passwordRequired;
    } else if (formData.password.length < 6) {
      newErrors.password = t.invitations.passwordMinLength;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    createMutation.mutate({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      username: formData.username.trim(),
      password: formData.password,
    });
  };

  const filteredClients = clients.filter((client: AgencyClientDto) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const c = client.client;
    return (
      (c?.firstName || '').toLowerCase().includes(q) ||
      (c?.lastName || '').toLowerCase().includes(q) ||
      (c?.username || '').toLowerCase().includes(q) ||
      (c?.email && c.email.toLowerCase().includes(q))
    );
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const f = firstName?.charAt(0) || '';
    const l = lastName?.charAt(0) || '';
    return (f + l || '?').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t.agency.clients} description={t.agency.clientsDesc} organizationStatus={agencyStatus} lang={locale} />
        <div className="flex-1 p-6">
          <LoadingState message={t.agency.agencyLoading} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t.agency.clients} description={t.agency.clientsDesc} organizationStatus={agencyStatus} lang={locale} />
        <div className="flex-1 p-6">
          <ErrorState message={t.agency.agencyLoadError} onRetry={refetch} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={t.agency.clients} description={t.agency.clientsDesc} organizationStatus={agencyStatus} lang={locale} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Müşteri Listesi</CardTitle>
                    <CardDescription>{clients.length} müşteri kayıtlı</CardDescription>
                  </div>
                </div>
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Müşteri
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              {clients.length > 0 && (
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Müşteri ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}

              {clients.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Henüz müşteri yok"
                  description="Yeni müşteri ekleyerek başlayın"
                  actionLabel="Yeni Müşteri"
                  onAction={() => setIsFormOpen(true)}
                />
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Search className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>Aramanızla eşleşen müşteri bulunamadı</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-xs text-slate-500 uppercase">
                        <th className="pb-3 font-medium">Müşteri</th>
                        <th className="pb-3 font-medium">Kullanıcı Adı</th>
                        <th className="pb-3 font-medium">Durum</th>
                        <th className="pb-3 font-medium">Tur</th>
                        <th className="pb-3 font-medium">Kayıt Tarihi</th>
                        <th className="pb-3 font-medium text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredClients.map((client: AgencyClientDto) => (
                        <tr key={client.id}>
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                                {getInitials(client.client?.firstName, client.client?.lastName)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {client.client?.firstName || ''} {client.client?.lastName || ''}
                                </p>
                                {client.client?.email && (
                                  <p className="text-xs text-slate-500 truncate">{client.client.email}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <code className="text-sm bg-slate-100 px-2 py-0.5 rounded">{client.client?.username}</code>
                          </td>
                          <td className="py-3">
                            {client.active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                {t.agency.clientActive}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                {t.agency.clientInactive}
                              </span>
                            )}
                          </td>
                          <td className="py-3 max-w-[200px]">
                            {(() => {
                              const tours = clientTourMap.get(client.clientId);
                              if (!tours || tours.length === 0) {
                                return <span className="text-xs text-slate-400">-</span>;
                              }
                              return (
                                <div className="flex flex-wrap gap-1">
                                  {tours.map((name, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3">
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {new Date(client.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                      disabled={!!(clientTourMap.get(client.clientId)?.length)}
                                      onClick={() => {
                                        setAddToTourTarget(client);
                                        setSelectedTourId(null);
                                      }}
                                      title="Tura Ekle"
                                    >
                                      <UserPlus className="h-4 w-4 mr-1" />
                                      <span className="text-xs">Tura Ekle</span>
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {!!(clientTourMap.get(client.clientId)?.length) && <TooltipContent>{t.tooltips.clientHasTours}</TooltipContent>}
                              </Tooltip>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeleteTarget(client)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Client Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Yeni Müşteri
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Ahmet"
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Yılmaz"
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="ahmet_yilmaz"
                className={errors.username ? 'border-red-500' : ''}
              />
              {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="En az 6 karakter"
                  className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                İptal
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? (
                        <>
                          <span className="animate-spin mr-2">&#9696;</span>
                          Oluşturuluyor...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Oluştur
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {createMutation.isPending && <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>}
              </Tooltip>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t.agency.deleteClient}
        description={
          deleteTarget
            ? `"${deleteTarget.client?.firstName || ''} ${deleteTarget.client?.lastName || ''}" müşterisini silmek istediğinize emin misiniz?`
            : ''
        }
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        variant="destructive"
      />

      {/* Add to Tour Dialog */}
      <Dialog open={!!addToTourTarget} onOpenChange={(open) => { if (!open) { setAddToTourTarget(null); setSelectedTourId(null); setTourSearch(''); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              Tura Ekle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                {getInitials(addToTourTarget?.client?.firstName, addToTourTarget?.client?.lastName)}
              </div>
              <div>
                <p className="font-medium text-sm">{addToTourTarget?.client?.firstName} {addToTourTarget?.client?.lastName}</p>
                <p className="text-xs text-slate-500">Hangi tura eklemek istiyorsunuz?</p>
              </div>
            </div>

            {/* Tour search */}
            {toursList && toursList.length > 3 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Tur ara..."
                  value={tourSearch}
                  onChange={(e) => setTourSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            )}

            {!toursList || toursList.length === 0 ? (
              <div className="text-center py-6">
                <Navigation className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-400">Henüz tur bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1 -mr-1">
                {toursList
                  .filter((tour) => !tourSearch || tour.tourName.toLowerCase().includes(tourSearch.toLowerCase()) || tour.tourCode.toLowerCase().includes(tourSearch.toLowerCase()))
                  .map((tour) => {
                    const isSelected = selectedTourId === tour.id;
                    const statusColors: Record<string, string> = {
                      draft: 'bg-yellow-100 text-yellow-700',
                      published: 'bg-green-100 text-green-700',
                      cancelled: 'bg-red-100 text-red-700',
                      completed: 'bg-slate-100 text-slate-700',
                    };
                    const statusLabels: Record<string, string> = {
                      draft: 'Taslak',
                      published: 'Yayında',
                      cancelled: 'İptal',
                      completed: 'Tamamlandı',
                    };
                    return (
                      <button
                        key={tour.id}
                        type="button"
                        onClick={() => setSelectedTourId(tour.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-transparent bg-white hover:bg-slate-50 shadow-sm ring-1 ring-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{tour.tourName}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {tour.tourCode}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(tour.startDate).toLocaleDateString('tr-TR')} - {new Date(tour.endDate).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${statusColors[tour.status] || 'bg-slate-100 text-slate-600'}`}>
                            {statusLabels[tour.status] || tour.status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setAddToTourTarget(null); setSelectedTourId(null); setTourSearch(''); }}>
              İptal
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    disabled={!selectedTourId || addToTourMutation.isPending}
                    onClick={() => {
                      if (selectedTourId && addToTourTarget) {
                        addToTourMutation.mutate({ tourId: selectedTourId, clientId: addToTourTarget.clientId });
                      }
                    }}
                  >
                    {addToTourMutation.isPending ? (
                      <>
                        <span className="animate-spin mr-2">&#9696;</span>
                        Ekleniyor...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Onayla
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {(!selectedTourId || addToTourMutation.isPending) && (
                <TooltipContent>{!selectedTourId ? t.tooltips.selectTourFirst : t.tooltips.formSubmitting}</TooltipContent>
              )}
            </Tooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
