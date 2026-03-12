'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Route, MapPin, Users, User, Clock, Pencil, Phone, Mail, FileText, Hash, ImageIcon, Upload, Code2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { agencyApi, tourApi } from '@/lib/api';
import { formatPhoneNumber, cleanPhoneNumber } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { LoadingState, SprinterLoading, ImageCropper } from '@/components/shared';

export default function AgencyDashboard() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const apiLang = (locale === 'de' ? 'en' : locale) as 'tr' | 'en';
  const router = useRouter();
  const queryClient = useQueryClient();

  // Dialog states
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  // Info edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhoneCountryCode, setEditPhoneCountryCode] = useState(90);
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Cover image edit state
  const [editCoverImage, setEditCoverImage] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Query: Agency details
  const { data: agencyResult, isLoading: agencyLoading } = useQuery({
    queryKey: ['my-agency'],
    queryFn: () => agencyApi.getMyAgency(),
  });

  const agency = agencyResult?.success ? agencyResult.data : null;
  const shouldRedirectToSetup = !agencyLoading && !agency && agencyResult?.error?.includes('bulunamadı');

  // Query: Tours
  const { data: toursResult, isLoading: toursLoading } = useQuery({
    queryKey: ['agency-tours', apiLang],
    queryFn: () => tourApi.list(1, 100, apiLang),
  });

  const tours = toursResult?.success ? toursResult.data || [] : [];
  const publishedTours = tours.filter((t) => t.status === 'published').length;
  const draftTours = tours.filter((t) => t.status === 'draft').length;

  // Query: Team members
  const { data: teamResult } = useQuery({
    queryKey: ['agency-team-members'],
    queryFn: () => agencyApi.getTeamMembers(),
  });
  const teamCount = teamResult?.success ? teamResult.data?.length || 0 : 0;

  // Query: Clients
  const { data: clientsResult } = useQuery({
    queryKey: ['agency-clients'],
    queryFn: () => agencyApi.getClients(1, 1),
  });

  const isLoading = agencyLoading || toursLoading;

  // Update info mutation
  const updateInfoMutation = useMutation({
    mutationFn: () => agencyApi.updateMyAgency({
      name: editName,
      description: editDescription,
      phone: parseInt(cleanPhoneNumber(editPhone)) || undefined,
      phoneCountryCode: editPhoneCountryCode,
      address: editAddress,
    }, editCoverImage || undefined),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.agency.agencyUpdated);
        queryClient.invalidateQueries({ queryKey: ['my-agency'] });
        setIsInfoDialogOpen(false);
      } else {
        toast.error(result.error || t.common.error);
      }
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

  // Open info edit dialog
  const handleOpenInfoDialog = () => {
    if (agency) {
      setEditName(agency.name || '');
      setEditDescription(agency.description || '');
      setEditPhone(agency.phone ? formatPhoneNumber(String(agency.phone)) : '');
      setEditPhoneCountryCode(agency.phoneCountryCode || 90);
      setEditEmail(agency.email || '');
      setEditAddress(agency.address || '');
      setEditCoverImage(null);
      setEditCoverPreview(null);
    }
    setIsInfoDialogOpen(true);
  };

  // Cover image handlers
  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t.common.error);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t.common.error);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCoverCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'cover.jpg', { type: 'image/jpeg' });
    setEditCoverImage(file);
    setEditCoverPreview(URL.createObjectURL(croppedBlob));
  };

  const handleSaveInfo = () => {
    if (!editName.trim()) {
      toast.error(t.agency.agencyNameRequired);
      return;
    }
    updateInfoMutation.mutate();
  };

  // Redirect to setup if no agency
  useEffect(() => {
    if (shouldRedirectToSetup) {
      router.push('/agency/setup');
    }
  }, [shouldRedirectToSetup, router]);

  // Show loading
  if (isLoading || shouldRedirectToSetup) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t.roles.agencyPanel} />
        <div className="flex-1 p-6">
          <LoadingState message={shouldRedirectToSetup ? 'Yönlendiriliyor...' : t.common.loading} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={agency?.name || t.roles.agencyPanel}
        description={t.roles.agencyDesc}
        organizationStatus={agency?.status}
        lang={locale}
      />

      <div className="flex-1 p-6 overflow-auto">
        {/* Ozet Kartlari */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.nav.tours}</CardTitle>
              <Route className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tours.length}</div>
              <p className="text-xs text-muted-foreground">{publishedTours} yayinda, {draftTours} taslak</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.nav.team}</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamCount}</div>
              <p className="text-xs text-muted-foreground">Ekip uyesi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.nav.clients}</CardTitle>
              <User className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientsResult?.success ? (clientsResult.data as any)?.meta?.total || 0 : 0}</div>
              <p className="text-xs text-muted-foreground">Kayıtlı müşteri</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.agency.agencyStatus}</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {agency?.status === 'active' ? t.agency.statusActive : agency?.status === 'pending' ? t.agency.statusPending : t.agency.statusSuspended}
              </div>
              <p className="text-xs text-muted-foreground">{t.agency.agencyStatus}</p>
            </CardContent>
          </Card>
        </div>

        {/* Acente Bilgileri */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-blue-600" />
                {t.agency.agencyInfo}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInfoDialog}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                {t.common.edit}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Kapak Fotografi */}
            {agency?.coverImageUrl && (
              <div className="mb-6 rounded-lg overflow-hidden">
                <img
                  src={agency.coverImageUrl}
                  alt="Kapak Fotografi"
                  className="w-full h-48 md:h-56 object-cover"
                />
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Acente Adi */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">{t.agency.agencyName}</p>
                <p className="text-lg font-semibold text-slate-900">{agency?.name || '-'}</p>
              </div>

              {/* Telefon */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">Telefon</p>
                <p className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {agency?.phone ? `+${agency.phoneCountryCode} ${agency.phone}` : '-'}
                </p>
              </div>

              {/* E-posta */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">E-posta</p>
                <p className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {agency?.email || '-'}
                </p>
              </div>

              {/* Resmi Unvan */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">Resmi Unvan</p>
                <p className="text-base font-medium text-slate-900">{agency?.legalName || '-'}</p>
              </div>

              {/* Vergi Dairesi */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">Vergi Dairesi</p>
                <p className="text-base font-medium text-slate-900">{agency?.taxOffice || '-'}</p>
              </div>

              {/* Vergi No */}
              <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">Vergi Numarasi</p>
                <p className="text-base font-medium text-slate-900 font-mono">{agency?.taxNumber || '-'}</p>
              </div>

              {/* Adres */}
              <div className="space-y-1 md:col-span-2">
                <p className="text-sm text-slate-500 font-medium">Adres</p>
                <p className="text-base text-slate-900 flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-1 shrink-0" />
                  {agency?.address || '-'}
                </p>
              </div>

              {/* Aciklama */}
              {agency?.description && (
                <div className="space-y-1 lg:col-span-3 md:col-span-2">
                  <p className="text-sm text-slate-500 font-medium">Aciklama</p>
                  <p className="text-base text-slate-700 bg-slate-50 p-3 rounded-lg">{agency.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hızlı Erişim */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Hızlı Erişim</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/agency/tours">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Route className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t.nav.tours}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {tours.length} tur
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Turlarinizi olusturun ve yonetin
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/agency/team">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t.nav.team}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {teamCount} uye
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Ekip uyelerinizi davet edin ve yonetin
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* Info Edit Dialog */}
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              {t.agency.editAgencyInfo}
            </DialogTitle>
            <DialogDescription>
              {t.agency.editAgencyInfoDesc}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveInfo(); }}>
          <div className="space-y-4 py-4">
            {/* Kapak Fotografi */}
            <div className="space-y-2">
              <Label>Kapak Fotografi</Label>
              <div
                className="relative w-full h-40 rounded-lg overflow-hidden border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors cursor-pointer group"
                onClick={() => coverInputRef.current?.click()}
              >
                {editCoverPreview || agency?.coverImageUrl ? (
                  <>
                    <img
                      src={editCoverPreview || agency!.coverImageUrl!}
                      alt="Kapak Fotografi"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-white text-sm font-medium flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Degistir
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <span className="text-sm">Kapak fotografi yukle (16:9)</span>
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCoverFileChange}
              />
            </div>

            {/* Acente Adi */}
            <div className="space-y-2">
              <Label htmlFor="editName">{t.agency.agencyNameLabel}</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t.agency.agencyNamePlaceholder}
              />
            </div>

            {/* E-posta */}
            <div className="space-y-2">
              <Label htmlFor="editEmail">E-posta</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="info@acente.com"
              />
            </div>

            {/* Telefon */}
            <div className="space-y-2">
              <Label htmlFor="editPhone">Telefon</Label>
              <div className="flex gap-2">
                <Select
                  value={editPhoneCountryCode.toString()}
                  onValueChange={(v) => setEditPhoneCountryCode(parseInt(v))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">+90</SelectItem>
                    <SelectItem value="1">+1</SelectItem>
                    <SelectItem value="44">+44</SelectItem>
                    <SelectItem value="49">+49</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="editPhone"
                  type="tel"
                  inputMode="numeric"
                  value={editPhone}
                  onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
                  placeholder="5XX XXX XX XX"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Adres */}
            <div className="space-y-2">
              <Label htmlFor="editAddress">Adres</Label>
              <Textarea
                id="editAddress"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Acik adres"
                rows={2}
              />
            </div>

            {/* Aciklama */}
            <div className="space-y-2">
              <Label htmlFor="editDescription">Aciklama</Label>
              <Textarea
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t.agency.agencyDescPlaceholder}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInfoDialogOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={updateInfoMutation.isPending}
            >
              {updateInfoMutation.isPending ? (
                <>
                  <SprinterLoading size="xs" className="mr-2" />
                  Kaydediliyor...
                </>
              ) : (
                t.common.save
              )}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cover Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImageSrc}
        onCropComplete={handleCoverCropComplete}
        aspectRatio={16 / 9}
        title="Kapak Fotografini Kirp"
        cropShape="rect"
      />
    </div>
  );
}
