'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  ArrowLeft,
  Camera,
  Save,
  Loader2,
} from 'lucide-react';

import { apiClient, type UpdateClientProfileDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState, ErrorState } from '@/components/shared';
import { toast } from 'sonner';

export default function CustomerProfilePage() {
  const { t, locale } = useLanguage();
  const apiLang = (locale === 'de' ? 'en' : locale) as 'tr' | 'en';
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['client-profile', apiLang],
    queryFn: () => apiClient.getClientProfile(apiLang),
  });

  // Initialize form with profile data
  if (profile && !initialized) {
    setFirstName(profile.firstName || '');
    setLastName(profile.lastName || '');
    setPhoneCountryCode(profile.phoneCountryCode ? String(profile.phoneCountryCode) : '90');
    setPhone(profile.phone || '');
    if (profile.profilePhoto) {
      setPhotoPreview(profile.profilePhoto);
    }
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const data: UpdateClientProfileDto = {};
      if (firstName !== profile?.firstName) data.firstName = firstName;
      if (lastName !== profile?.lastName) data.lastName = lastName;
      if (phoneCountryCode && phoneCountryCode !== String(profile?.phoneCountryCode || '')) {
        data.phoneCountryCode = Number(phoneCountryCode);
      }
      if (phone && phone !== (profile?.phone || '')) {
        data.phone = Number(phone);
      }
      return apiClient.updateClientProfile(data, profilePhoto || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-profile'] });
      setSuccessMsg(t.common.success);
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <LoadingState message={t.common.loading} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <ErrorState message={t.common.errorDescription} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-orange-50 to-amber-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-slate-600"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{t.common.edit}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm text-center">
            {successMsg}
          </div>
        )}

        {updateMutation.isError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">
            {(updateMutation.error as Error)?.message || t.auth.generalError}
          </div>
        )}

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
                <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                  {t.auth.firstName}
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t.auth.firstNamePlaceholder}
                  className="h-11 rounded-xl"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                  {t.auth.lastName}
                </Label>
                <Input
                  id="lastName"
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

              {/* Username (read only) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  {t.auth.username}
                </Label>
                <Input
                  value={profile.username}
                  disabled
                  className="h-11 rounded-xl bg-slate-50"
                />
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
    </div>
  );
}
