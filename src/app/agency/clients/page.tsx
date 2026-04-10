'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, User, Search, Users, Eye, EyeOff, Navigation, Calendar, Hash, UserPlus, FileSpreadsheet, Upload, X, MessageCircle, Download, FileText, Send, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { agencyApi, tourApi, type AgencyClientDto, type CreateAgencyClientDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { locales, type Locale } from '@/locales';

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
import { LoadingState, EmptyState, ErrorState, ConfirmDialog, AdminPagination } from '@/components/shared';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface ClientFormData {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  gender: 'm' | 'f';
}

const initialFormData: ClientFormData = {
  firstName: '',
  lastName: '',
  username: '',
  password: '',
  gender: 'm',
};

export default function AgencyClientsPage() {
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [filterTourId, setFilterTourId] = useState<number | undefined>(undefined);
  const [filterTourSearch, setFilterTourSearch] = useState('');
  const [filterTourSearchDebounced, setFilterTourSearchDebounced] = useState('');
  const [filterTourDropdownOpen, setFilterTourDropdownOpen] = useState(false);
  const [filterTourName, setFilterTourName] = useState('');
  const filterTourRef = useRef<HTMLDivElement>(null);
  const [whatsappTarget, setWhatsappTarget] = useState<AgencyClientDto | null>(null);
  const [whatsappLang, setWhatsappLang] = useState<Locale>('tr');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgencyClientDto | null>(null);
  const [addToTourTarget, setAddToTourTarget] = useState<AgencyClientDto | null>(null);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [tourSearch, setTourSearch] = useState('');
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchTourId, setBatchTourId] = useState<number | null>(null);
  const [batchTourSearch, setBatchTourSearch] = useState('');
  const [batchTourSearchDebounced, setBatchTourSearchDebounced] = useState('');
  const [batchSelectedTourName, setBatchSelectedTourName] = useState('');
  const batchFileRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<{ url: string; name: string } | null>(null);

  // Fetch agency data for status badge
  const { data: agencyResult } = useQuery({
    queryKey: ['my-agency'],
    queryFn: () => agencyApi.getMyAgency(),
  });
  const agencyStatus = agencyResult?.success ? agencyResult.data?.status : undefined;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Debounce tour filter search
  useEffect(() => {
    const timer = setTimeout(() => setFilterTourSearchDebounced(filterTourSearch), 300);
    return () => clearTimeout(timer);
  }, [filterTourSearch]);

  // Close tour filter dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterTourRef.current && !filterTourRef.current.contains(e.target as Node)) {
        setFilterTourDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search tours for filter dropdown
  const { data: filterTourResults } = useQuery({
    queryKey: ['filter-tour-search', filterTourSearchDebounced],
    queryFn: async () => {
      const result = await tourApi.list(1, 20, locale as 'tr' | 'en' | 'de', filterTourSearchDebounced || undefined);
      return result.success ? result.data || [] : [];
    },
    enabled: filterTourDropdownOpen,
  });

  const {
    data: clientsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['agency-clients', page, limit, searchDebounced, filterTourId],
    queryFn: () => agencyApi.getClients(page, limit, searchDebounced || undefined, filterTourId),
  });

  const clients = clientsData?.success ? clientsData.data?.data || [] : [];
  const meta = clientsData?.success ? clientsData.data?.meta : undefined;

  // Fetch tours and use embedded participants to map clientId -> tour names
  const { data: toursData } = useQuery({
    queryKey: ['agency-tours-for-clients'],
    queryFn: async () => {
      const toursResult = await tourApi.list(1, 100);
      if (!toursResult.success || !toursResult.data) return new Map<number, string[]>();

      const map = new Map<number, string[]>();
      for (const tour of toursResult.data) {
        const participants = (tour as any).participants || [];
        for (const p of participants) {
          const existing = map.get(p.clientId) || [];
          if (!existing.includes(tour.tourName)) {
            existing.push(tour.tourName);
          }
          map.set(p.clientId, existing);
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

  // Debounce batch tour search
  useEffect(() => {
    const timer = setTimeout(() => setBatchTourSearchDebounced(batchTourSearch), 300);
    return () => clearTimeout(timer);
  }, [batchTourSearch]);

  // Search tours for batch import dialog
  const { data: batchTourResults, isFetching: batchToursLoading } = useQuery({
    queryKey: ['batch-tour-search', batchTourSearchDebounced],
    queryFn: async () => {
      const result = await tourApi.list(1, 20, locale as 'tr' | 'en' | 'de', batchTourSearchDebounced || undefined);
      return result.success ? result.data || [] : [];
    },
    enabled: isBatchOpen,
  });

  const addToTourMutation = useMutation({
    mutationFn: ({ tourId, clientId }: { tourId: number; clientId: number }) =>
      tourApi.addParticipant(tourId, clientId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.invitations.clientAddedToTour);
        queryClient.invalidateQueries({ queryKey: ['agency-tours-for-clients'] });
        setAddToTourTarget(null);
        setSelectedTourId(null);
      } else {
        toast.error(result.error || t.invitations.addToTourFailed);
      }
    },
    onError: () => {
      toast.error(t.invitations.addToTourFailed);
    },
  });

  const batchImportMutation = useMutation({
    mutationFn: ({ file, tourId }: { file: File; tourId?: number }) =>
      agencyApi.batchImportClients(file, locale as 'tr' | 'en' | 'de', tourId || undefined),
    onSuccess: (result) => {
      if (result.success) {
        const data = result.data;
        const msg = t.invitations.batchImportSuccess
          .replace('{successful}', String(data?.successful ?? 0))
          .replace('{totalRows}', String(data?.totalRows ?? 0));
        toast.success(msg);
        queryClient.invalidateQueries({ queryKey: ['agency-clients'] });
        queryClient.invalidateQueries({ queryKey: ['agency-tours-for-clients'] });
        closeBatchDialog();
      } else {
        toast.error(result.error || t.invitations.batchImportFailed);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || t.invitations.batchImportFailed);
    },
  });

  const closeBatchDialog = () => {
    setIsBatchOpen(false);
    setBatchFile(null);
    setBatchTourId(null);
    setBatchTourSearch('');
    setBatchTourSearchDebounced('');
    setBatchSelectedTourName('');
  };

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
      gender: formData.gender,
    });
  };

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const f = firstName?.charAt(0) || '';
    const l = lastName?.charAt(0) || '';
    return (f + l || '?').toUpperCase();
  };

  const handleDownloadPdf = () => {
    if (!clients.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = clients.map((client: AgencyClientDto, i: number) => {
      const tours = clientTourMap.get(client.clientId);
      const tourStr = tours?.join(', ') || '-';
      const status = client.active ? t.agency.clientActive : t.agency.clientInactive;
      const date = new Date(client.createdAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale === 'de' ? 'de-DE' : 'en-US');
      return `<tr>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">${i + 1}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0">${client.client?.firstName || ''} ${client.client?.lastName || ''}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0">${client.client?.email || '-'}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0">${client.client?.username || '-'}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">${status}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0">${tourStr}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">${date}</td>
      </tr>`;
    }).join('');

    const totalLabel = t.invitations.clientsRegistered.replace('{count}', String(meta?.totalCount ?? meta?.total ?? clients.length));

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t.invitations.clientList}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: #1e293b; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        p { font-size: 13px; color: #64748b; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { padding: 8px 10px; border: 1px solid #cbd5e1; background: #f1f5f9; font-weight: 600; text-align: left; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>${t.invitations.clientList}</h1>
      <p>${totalLabel}${filterTourName ? ' — ' + filterTourName : ''}</p>
      <table>
        <thead><tr>
          <th style="text-align:center">#</th>
          <th>${t.invitations.columnClient}</th>
          <th>${t.invitations.columnEmail}</th>
          <th>${t.invitations.columnUsername}</th>
          <th style="text-align:center">${t.invitations.columnStatus}</th>
          <th>${t.invitations.columnTour}</th>
          <th style="text-align:center">${t.invitations.columnDate}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleSendPdfWhatsapp = () => {
    if (!clients.length) return;
    const lines = clients.map((client: AgencyClientDto, i: number) => {
      const name = `${client.client?.firstName || ''} ${client.client?.lastName || ''}`.trim();
      return `${i + 1}. ${name}`;
    });
    const header = `*${t.invitations.clientList}*${filterTourName ? ` — ${filterTourName}` : ''}`;
    const text = encodeURIComponent(`${header}\n\n${lines.join('\n')}`);
    window.open(`https://web.whatsapp.com/send?text=${text}`, '_blank');
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

      <div className="flex-1 p-3 md:p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          <Card>
            <CardHeader className="p-3 md:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg">
                    <Users className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm md:text-base">{t.invitations.clientList}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">{t.invitations.clientsRegistered.replace('{count}', String(meta?.totalCount ?? meta?.total ?? clients.length))}</CardDescription>
                  </div>
                </div>
                {/* Mobile: only + button */}
                <Button size="sm" onClick={() => setIsFormOpen(true)} className="md:hidden">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {/* Action buttons - wrap on mobile */}
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={clients.length === 0}>
                      <Send className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">{t.invitations.sendPdf}</span>
                      <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadPdf}>
                      <Download className="h-4 w-4 mr-2" />
                      {t.invitations.downloadPdf}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSendPdfWhatsapp}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {t.invitations.sendViaWhatsapp}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={() => setIsBatchOpen(true)}>
                  <FileSpreadsheet className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">{t.invitations.batchImport}</span>
                </Button>
                <Button size="sm" onClick={() => setIsFormOpen(true)} className="hidden md:inline-flex">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.invitations.newClient}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {/* Search & Tour Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={t.invitations.searchClients}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="relative w-full sm:w-72" ref={filterTourRef}>
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={t.invitations.filterByTour}
                    value={filterTourDropdownOpen ? filterTourSearch : filterTourName}
                    onChange={(e) => {
                      setFilterTourSearch(e.target.value);
                      if (!filterTourDropdownOpen) setFilterTourDropdownOpen(true);
                    }}
                    onFocus={() => setFilterTourDropdownOpen(true)}
                    className="pl-9 pr-8"
                  />
                  {filterTourId && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterTourId(undefined);
                        setFilterTourName('');
                        setFilterTourSearch('');
                        setPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {filterTourDropdownOpen && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {!filterTourResults || filterTourResults.length === 0 ? (
                        <div className="p-3 text-sm text-slate-400 text-center">{t.invitations.noTourFound}</div>
                      ) : (
                        filterTourResults.map((tour) => (
                          <button
                            key={tour.id}
                            type="button"
                            onClick={() => {
                              setFilterTourId(tour.id);
                              setFilterTourName(tour.tourName);
                              setFilterTourSearch('');
                              setFilterTourDropdownOpen(false);
                              setPage(1);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between gap-2 ${
                              filterTourId === tour.id ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">{tour.tourName}</p>
                              <p className="text-xs text-slate-400">{tour.tourCode}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {clients.length === 0 && !searchDebounced && !filterTourId ? (
                <EmptyState
                  icon={Users}
                  title={t.invitations.noClientsYet}
                  description={t.invitations.noClientsYetDesc}
                  actionLabel={t.invitations.newClient}
                  onAction={() => setIsFormOpen(true)}
                />
              ) : clients.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Search className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>{t.invitations.noSearchResult}</p>
                </div>
              ) : (
                <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-xs text-slate-500 uppercase">
                        <th className="pb-3 font-medium">{t.invitations.columnClient}</th>
                        <th className="pb-3 font-medium">{t.invitations.columnEmail}</th>
                        <th className="pb-3 font-medium">{t.invitations.columnUsername}</th>
                        <th className="pb-3 font-medium">{t.invitations.columnStatus}</th>
                        <th className="pb-3 font-medium">{t.invitations.columnTour}</th>
                        <th className="pb-3 font-medium w-[90px]">{t.invitations.columnDate}</th>
                        <th className="pb-3 font-medium text-right w-[100px]">{t.invitations.columnActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {clients.map((client: AgencyClientDto) => (
                        <tr key={client.id}>
                          <td className="py-3 max-w-[200px]">
                            <div className="flex items-center gap-3">
                              {client.client?.profilePhoto ? (
                                <img
                                  src={client.client.profilePhoto}
                                  alt={[client.client?.firstName, client.client?.lastName].filter(Boolean).join(' ')}
                                  className="w-9 h-9 rounded-full object-cover flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                                  onClick={() => setPhotoPreview({
                                    url: client.client.profilePhoto!,
                                    name: [client.client?.firstName, client.client?.lastName].filter(Boolean).join(' '),
                                  })}
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                                  {getInitials(client.client?.firstName, client.client?.lastName)}
                                </div>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="font-medium text-sm truncate min-w-0 cursor-default">
                                    {[client.client?.firstName, client.client?.lastName].filter(Boolean).join(' ')}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">{[client.client?.firstName, client.client?.lastName].filter(Boolean).join(' ')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          <td className="py-3 max-w-[160px]">
                            {client.client?.email ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm text-slate-600 block truncate cursor-default">{client.client.email}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">{client.client.email}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 max-w-[150px]">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <code className="text-sm bg-slate-100 px-2 py-0.5 rounded inline-block max-w-full truncate cursor-default">{client.client?.username}</code>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">{client.client?.username}</p>
                              </TooltipContent>
                            </Tooltip>
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
                          <td className="py-3 max-w-[240px]">
                            {(() => {
                              const tours = clientTourMap.get(client.clientId);
                              if (!tours || tours.length === 0) {
                                return <span className="text-xs text-slate-400">-</span>;
                              }
                              return (
                                <div className="flex flex-wrap gap-1">
                                  {tours.map((name, i) => (
                                    <Tooltip key={i}>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 max-w-[200px] truncate cursor-default">
                                          {name}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <p className="text-xs">{name}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3">
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {new Date(client.createdAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale === 'de' ? 'de-DE' : 'en-US')}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
                                onClick={() => setWhatsappTarget(client)}
                                title={t.invitations.whatsappShare}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                onClick={() => {
                                  setAddToTourTarget(client);
                                  setSelectedTourId(null);
                                }}
                                title={t.invitations.addToTour}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                <span className="text-xs">{t.invitations.addToTour}</span>
                              </Button>
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
                {meta && (
                  <AdminPagination
                    page={page}
                    limit={limit}
                    total={meta.totalCount ?? meta.total}
                    totalPages={meta.totalPages}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                  />
                )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* WhatsApp Share Dialog */}
      <Dialog open={!!whatsappTarget} onOpenChange={(open) => { if (!open) { setWhatsappTarget(null); setWhatsappLang('tr'); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              {t.invitations.whatsappShare}
            </DialogTitle>
          </DialogHeader>
          {whatsappTarget && (() => {
            const fullName = `${whatsappTarget.client?.firstName || ''} ${whatsappTarget.client?.lastName || ''}`.trim();
            const username = whatsappTarget.client?.username || '';
            const wpT = locales[whatsappLang];
            const message = wpT.invitations.whatsappMessage
              .replace('{fullName}', fullName)
              .replace('{username}', username);
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {(['tr', 'en', 'de'] as Locale[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setWhatsappLang(lang)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        whatsappLang === lang
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {lang === 'tr' ? 'Türkçe' : lang === 'en' ? 'English' : 'Deutsch'}
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

      {/* Create Client Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              {t.invitations.newClient}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t.invitations.labelFirstName}</Label>
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
                <Label htmlFor="lastName">{t.invitations.labelLastName}</Label>
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
              <Label htmlFor="username">{t.invitations.labelUsername}</Label>
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
              <Label>{t.common.gender}</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, gender: 'm' }))}
                  className={`flex-1 h-9 rounded-md border text-sm font-medium transition-all ${
                    formData.gender === 'm'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {t.common.male}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, gender: 'f' }))}
                  className={`flex-1 h-9 rounded-md border text-sm font-medium transition-all ${
                    formData.gender === 'f'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {t.common.female}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.invitations.labelPassword}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={t.invitations.passwordMinLength}
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
                {t.common.cancel}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? (
                        <>
                          <span className="animate-spin mr-2">&#9696;</span>
                          {t.common.loading}
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          {t.common.create}
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
            ? t.invitations.deleteClientConfirm.replace('{name}', `${deleteTarget.client?.firstName || ''} ${deleteTarget.client?.lastName || ''}`.trim())
            : ''
        }
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        variant="destructive"
      />

      {/* Batch Import Dialog */}
      <Dialog open={isBatchOpen} onOpenChange={(open) => !open && closeBatchDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              {t.invitations.batchImportTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* File Select */}
            <div className="space-y-2">
              <Label>{t.invitations.selectExcelFile}</Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                onClick={() => batchFileRef.current?.click()}
              >
                {batchFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">{batchFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setBatchFile(null); }}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500">{t.invitations.selectExcelFile}</p>
                  </div>
                )}
              </div>
              <input
                ref={batchFileRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setBatchFile(file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Excel Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t.invitations.excelTemplate}</Label>
                <button
                  type="button"
                  onClick={() => {
                    const XLSX = require('xlsx-js-style');
                    const tourTitle = batchSelectedTourName || 'TUR ADI';
                    const data = [
                      [tourTitle, '', '', ''],
                      [t.invitations.excelRowNo, t.invitations.excelLastName, t.invitations.excelFirstName, t.invitations.excelGender],
                      [1, 'HILLEBRAND', 'INGE', 'MRS'],
                      [2, 'SUPPAN-DANIA', 'BETTINA', 'MRS'],
                      [3, 'SCHNEIDER', 'KARIN', 'MR'],
                    ];
                    const ws = XLSX.utils.aoa_to_sheet(data);
                    ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 12 }];
                    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
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
                    <tr className="bg-blue-50 border-b">
                      <th colSpan={4} className="px-3 py-1.5 text-left font-semibold text-blue-700 italic">23-27 MART 2026 İSTANBUL TURU</th>
                    </tr>
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

            {/* Optional Tour Select */}
            <div className="space-y-2">
              <Label>{t.invitations.assignToTour}</Label>
              {batchTourId ? (
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <Navigation className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-blue-800 truncate flex-1">{batchSelectedTourName}</span>
                  <button
                    type="button"
                    onClick={() => { setBatchTourId(null); setBatchSelectedTourName(''); setBatchTourSearch(''); }}
                    className="text-blue-400 hover:text-red-500 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder={t.invitations.noTourSelected}
                      value={batchTourSearch}
                      onChange={(e) => setBatchTourSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {isBatchOpen && (
                    <div className="max-h-[180px] overflow-y-auto space-y-1 border rounded-lg p-1">
                      {batchToursLoading ? (
                        <div className="text-center py-4 text-xs text-slate-400">
                          <span className="animate-spin inline-block mr-1">&#9696;</span>
                        </div>
                      ) : !batchTourResults || batchTourResults.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400">
                          {batchTourSearch ? t.common.noData : ''}
                        </div>
                      ) : (
                        batchTourResults.map((tour) => (
                          <button
                            key={tour.id}
                            type="button"
                            onClick={() => {
                              setBatchTourId(tour.id);
                              setBatchSelectedTourName(`${tour.tourName} (${tour.tourCode})`);
                              setBatchTourSearch('');
                            }}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-sm"
                          >
                            <span className="font-medium">{tour.tourName}</span>
                            <span className="text-slate-400 ml-1.5">({tour.tourCode})</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeBatchDialog}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={!batchFile || batchImportMutation.isPending}
              onClick={() => {
                if (batchFile) {
                  batchImportMutation.mutate({ file: batchFile, tourId: batchTourId || undefined });
                }
              }}
            >
              {batchImportMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">&#9696;</span>
                  {t.invitations.startImport}...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t.invitations.startImport}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Tour Dialog */}
      <Dialog open={!!addToTourTarget} onOpenChange={(open) => { if (!open) { setAddToTourTarget(null); setSelectedTourId(null); setTourSearch(''); } }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              {t.invitations.addToTour}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                {getInitials(addToTourTarget?.client?.firstName, addToTourTarget?.client?.lastName)}
              </div>
              <div>
                <p className="font-medium text-sm">{addToTourTarget?.client?.firstName} {addToTourTarget?.client?.lastName}</p>
                <p className="text-xs text-slate-500">{t.invitations.whichTour}</p>
              </div>
            </div>

            {/* Tour search */}
            {toursList && toursList.length > 3 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t.invitations.searchTour}
                  value={tourSearch}
                  onChange={(e) => setTourSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            )}

            {!toursList || toursList.length === 0 ? (
              <div className="text-center py-6">
                <Navigation className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-400">{t.invitations.noToursYet}</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[40vh] sm:max-h-[280px] overflow-y-auto pr-1 -mr-1">
                {toursList
                  .filter((tour) => !tourSearch || tour.tourName.toLowerCase().includes(tourSearch.toLowerCase()) || tour.tourCode.toLowerCase().includes(tourSearch.toLowerCase()))
                  .map((tour) => {
                    const isSelected = selectedTourId === tour.id;
                    const clientTours = addToTourTarget ? (clientTourMap.get(addToTourTarget.clientId) || []) : [];
                    const isAlreadyInTour = clientTours.includes(tour.tourName);
                    const statusColors: Record<string, string> = {
                      draft: 'bg-yellow-100 text-yellow-700',
                      published: 'bg-green-100 text-green-700',
                      cancelled: 'bg-red-100 text-red-700',
                      completed: 'bg-slate-100 text-slate-700',
                    };
                    const statusLabels: Record<string, string> = {
                      draft: t.invitations.statusDraft,
                      published: t.invitations.statusPublished,
                      cancelled: t.invitations.statusCancelled,
                      completed: t.invitations.statusCompleted,
                    };
                    return (
                      <button
                        key={tour.id}
                        type="button"
                        disabled={isAlreadyInTour}
                        onClick={() => !isAlreadyInTour && setSelectedTourId(tour.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          isAlreadyInTour
                            ? 'border-transparent bg-slate-100 opacity-60 cursor-not-allowed ring-1 ring-slate-200'
                            : isSelected
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
                                {new Date(tour.startDate).toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale === 'de' ? 'de-DE' : 'en-US')} - {new Date(tour.endDate).toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale === 'de' ? 'de-DE' : 'en-US')}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[tour.status] || 'bg-slate-100 text-slate-600'}`}>
                              {statusLabels[tour.status] || tour.status}
                            </span>
                            {isAlreadyInTour && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-500">
                                {t.invitations.alreadyAdded}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setAddToTourTarget(null); setSelectedTourId(null); setTourSearch(''); }}>
              {t.common.cancel}
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
                        {t.invitations.adding}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t.common.confirm}
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
      {/* Photo Preview Popup */}
      {photoPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPhotoPreview(null)}
        >
          <div
            className="bg-white rounded-xl p-2 shadow-2xl max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photoPreview.url}
              alt={photoPreview.name}
              className="w-64 h-64 rounded-lg object-cover"
            />
            <p className="text-center text-sm font-medium mt-2 mb-1">{photoPreview.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
