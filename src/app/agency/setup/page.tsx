'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Phone,
  Mail,
  FileText,
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  Crop,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { agencyApi, verifyVKN, type AgencyRegisterDto, type AgencyRegisterResponseDto } from '@/lib/api';
import { taxOffices } from '@/lib/taxoffice';
import { formatPhoneNumber, cleanPhoneNumber } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState, SprinterLoading } from '@/components/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { ImageCropper } from '@/components/shared/ImageCropper';

// Steps
type Step = 'basic' | 'legal' | 'photos';

type FormData = {
  name: string;
  email: string;
  phoneCountryCode: number;
  phone: number;
  description?: string;
  legalName: string;
  taxNumber: number;
  taxOffice: string;
};

const countryCodes = [
  { code: 90, name: 'TR', flag: '🇹🇷' },
  { code: 1, name: 'US', flag: '🇺🇸' },
  { code: 44, name: 'UK', flag: '🇬🇧' },
  { code: 49, name: 'DE', flag: '🇩🇪' },
];

export default function AgencySetupPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { updateSessionFromRegistration } = useAuth();
  const queryClient = useQueryClient();

  const steps = useMemo<{ id: Step; title: string; description: string }[]>(() => [
    { id: 'basic', title: t.agency.basicInfo, description: t.agency.basicInfoDesc },
    { id: 'legal', title: t.agency.legalInfo, description: t.agency.legalInfoDesc },
    { id: 'photos', title: t.agency.photosStep, description: t.agency.photosStepDesc },
  ], [t]);

  const agencySchema = useMemo(() => z.object({
    name: z.string().min(3, t.agency.agencyNameMinError),
    email: z.string().email('Geçerli bir e-posta giriniz'),
    phoneCountryCode: z.number().min(1, 'Ülke kodu seçiniz'),
    phone: z.number().min(1000000, 'Geçerli bir telefon numarası giriniz'),
    description: z.string().optional(),
    legalName: z.string().min(5, 'Ticari ünvan en az 5 karakter olmalı'),
    taxNumber: z.number().min(1000000000, 'Vergi numarası en az 10 haneli olmalı').max(99999999999, 'Vergi numarası en fazla 11 haneli olmalı'),
    taxOffice: z.string().min(3, 'Vergi dairesi en az 3 karakter olmalı'),
  }), [t]);

  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [phoneCountryCodeDisplay, setPhoneCountryCodeDisplay] = useState('90');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  // Crop states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState<string>('');
  const [cropperType, setCropperType] = useState<'cover' | 'gallery'>('cover');

  // VKN verification states
  const [taxNumberDisplay, setTaxNumberDisplay] = useState('');
  const [vknStatus, setVknStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [vknCompanyName, setVknCompanyName] = useState<string>('');
  const [vknError, setVknError] = useState<string>('');
  const [lastVerifiedVkn, setLastVerifiedVkn] = useState<string>('');

  // Check if user already has an agency
  const { data: existingAgencyResult, isLoading: checkingExistingAgency } = useQuery({
    queryKey: ['my-agency-check'],
    queryFn: () => agencyApi.getMyAgency(),
  });

  // Redirect to dashboard if user already has an agency
  useEffect(() => {
    if (!checkingExistingAgency && existingAgencyResult?.success && existingAgencyResult.data) {
      router.replace('/agency');
    }
  }, [checkingExistingAgency, existingAgencyResult, router]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(agencySchema),
    defaultValues: {
      phoneCountryCode: 90,
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: { formData: AgencyRegisterDto; coverImage?: File; galleryImages?: File[] }) =>
      agencyApi.register(data.formData, data.coverImage, data.galleryImages),
    onSuccess: (result) => {
      if (result.success && result.data) {
        const responseData = result.data as AgencyRegisterResponseDto;

        // Update session with new user data (token is already saved by apiClient)
        if (responseData.user) {
          updateSessionFromRegistration(responseData.user, 'agency');
        }

        toast.success(t.agency.agencyCreated);
        queryClient.invalidateQueries({ queryKey: ['my-agency'] });
        router.push('/agency');
      } else {
        toast.error(result.error || t.agency.agencyCreateFailed);
      }
    },
    onError: () => {
      toast.error(t.agency.agencyCreateError);
    },
  });

  // Handle cover image - open cropper
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropperImage(reader.result as string);
        setCropperType('cover');
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Handle gallery images - open cropper for each
  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (galleryImages.length >= 5) {
      toast.error('En fazla 5 galeri fotoğrafı yükleyebilirsiniz');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCropperImage(reader.result as string);
      setCropperType('gallery');
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle crop complete
  const handleCropComplete = (croppedBlob: Blob) => {
    if (cropperType === 'cover') {
      const file = new File([croppedBlob], 'cover.jpg', { type: 'image/jpeg' });
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(croppedBlob);
    } else {
      const file = new File([croppedBlob], `gallery-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setGalleryImages((prev) => [...prev, file]);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(croppedBlob);
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // VKN verification handler
  const handleVknVerify = async (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setVknStatus('idle');
      setVknCompanyName('');
      setVknError('');
      return;
    }
    if (cleaned === lastVerifiedVkn) return;

    setVknStatus('loading');
    setVknCompanyName('');
    setVknError('');

    const result = await verifyVKN(cleaned);

    if (result.valid) {
      setVknStatus('valid');
      setVknCompanyName(result.companyName || '');
      setLastVerifiedVkn(cleaned);
    } else {
      setVknStatus('invalid');
      setVknError(result.error || 'Vergi numarası doğrulanamadı');
      setLastVerifiedVkn('');
    }
  };

  // Step validation
  const validateStep = async (step: Step): Promise<boolean> => {
    const stepFields: Record<Step, (keyof FormData)[]> = {
      basic: ['name', 'email', 'phoneCountryCode', 'phone'],
      legal: ['legalName', 'taxNumber', 'taxOffice'],
      photos: [],
    };

    const fieldsToValidate = stepFields[step];
    if (fieldsToValidate.length === 0) return true;
    return await trigger(fieldsToValidate);
  };

  const goToNextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (!isValid) return;

    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  // Final submit
  const handleFinalSubmit = async () => {
    const isValid = await trigger();
    if (!isValid) {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    const data = watch();

    registerMutation.mutate({
      formData: data as FormData,
      coverImage: coverImage || undefined,
      galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
    });
  };

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  // Show loading while checking for existing agency
  if (checkingExistingAgency || (existingAgencyResult?.success && existingAgencyResult.data)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState message={existingAgencyResult?.success ? 'Yönlendiriliyor...' : 'Kontrol ediliyor...'} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <MapPin className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.agency.createYourAgency}</h1>
          <p className="text-slate-500 mt-2">Lütfen acente bilgilerinizi eksiksiz doldurun</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  index <= currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-1 mx-2 ${
                    index < currentStepIndex ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStepIndex].title}</CardTitle>
            <CardDescription>{steps[currentStepIndex].description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
            >
              {/* Step 1: Basic Info */}
              {currentStep === 'basic' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t.agency.agencyNameLabel}</Label>
                    <Input
                      id="name"
                      placeholder="Örn: Galaxy Travel"
                      {...register('name')}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="acente@email.com"
                        className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                        {...register('email')}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon *</Label>
                    <div className="flex gap-2">
                      <Select
                        value={phoneCountryCodeDisplay}
                        onValueChange={(v) => {
                          setPhoneCountryCodeDisplay(v);
                          setValue('phoneCountryCode', parseInt(v));
                        }}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="+90" />
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map((cc) => (
                            <SelectItem key={cc.code} value={cc.code.toString()}>
                              {cc.flag} +{cc.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="phone"
                          type="tel"
                          inputMode="numeric"
                          placeholder="5XX XXX XX XX"
                          value={phoneDisplay}
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            setPhoneDisplay(formatted);
                            const digits = cleanPhoneNumber(e.target.value);
                            setValue('phone', digits.length > 0 ? parseInt(digits) : 0);
                          }}
                          className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                        />
                      </div>
                    </div>
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Textarea
                      id="description"
                      placeholder={t.agency.agencyDescPlaceholder}
                      rows={3}
                      {...register('description')}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Legal */}
              {currentStep === 'legal' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="legalName">Resmi Ünvan *</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="legalName"
                        placeholder="Örn: Galaxy Turizm A.Ş."
                        className={`pl-10 ${errors.legalName ? 'border-red-500' : ''}`}
                        {...register('legalName')}
                      />
                    </div>
                    {errors.legalName && <p className="text-xs text-red-500">{errors.legalName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxNumber">Vergi Numarası *</Label>
                    <div className="relative">
                      <Input
                        id="taxNumber"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={11}
                        placeholder="1234567890"
                        className={`pr-10 ${errors.taxNumber ? 'border-red-500' : vknStatus === 'valid' ? 'border-green-500' : vknStatus === 'invalid' ? 'border-red-500' : ''}`}
                        value={taxNumberDisplay}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                          setTaxNumberDisplay(cleaned);
                          setValue('taxNumber', cleaned.length > 0 ? parseInt(cleaned) : 0);
                          if (cleaned !== lastVerifiedVkn) {
                            setVknStatus('idle');
                            setVknCompanyName('');
                            setVknError('');
                          }
                          if (cleaned.length >= 10 && cleaned.length <= 11) {
                            handleVknVerify(cleaned);
                          }
                        }}
                        onBlur={() => {
                          if (taxNumberDisplay.length >= 10) {
                            handleVknVerify(taxNumberDisplay);
                          }
                        }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {vknStatus === 'loading' && (
                          <SprinterLoading size="xs" />
                        )}
                        {vknStatus === 'valid' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {vknStatus === 'invalid' && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {errors.taxNumber && <p className="text-xs text-red-500">{errors.taxNumber.message}</p>}
                    {vknStatus === 'valid' && vknCompanyName && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {vknCompanyName}
                      </p>
                    )}
                    {vknStatus === 'invalid' && vknError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {vknError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxOffice">Vergi Dairesi *</Label>
                    <Combobox
                      options={taxOffices.map(to => ({
                        value: to.name,
                        label: to.name,
                        group: to.city,
                      }))}
                      value={watch('taxOffice')}
                      onValueChange={(value) => setValue('taxOffice', value)}
                      placeholder="Vergi dairesi seçiniz"
                      searchPlaceholder="Vergi dairesi ara..."
                      emptyText="Vergi dairesi bulunamadı"
                      groupBy={true}
                      className={errors.taxOffice ? '[&>button]:border-red-500' : ''}
                    />
                    {errors.taxOffice && <p className="text-xs text-red-500">{errors.taxOffice.message}</p>}
                  </div>
                </div>
              )}

              {/* Step 3: Photos */}
              {currentStep === 'photos' && (
                <div className="space-y-6">
                  {/* Cover Image */}
                  <div className="space-y-2">
                    <Label>Kapak Fotoğrafı</Label>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-4">
                      {coverPreview ? (
                        <div className="relative">
                          <img
                            src={coverPreview}
                            alt="Cover"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <div className="absolute top-2 right-2 flex gap-1">
                            <label className="p-1.5 bg-white/90 text-slate-700 rounded-full cursor-pointer hover:bg-white shadow-sm">
                              <Crop className="h-4 w-4" />
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleCoverImageChange}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setCoverImage(null);
                                setCoverPreview(null);
                              }}
                              className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-48 cursor-pointer hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <Upload className="h-6 w-6 text-slate-400" />
                            <Crop className="h-5 w-5 text-slate-400" />
                          </div>
                          <span className="text-sm text-slate-500">Kapak fotoğrafı yükleyin</span>
                          <span className="text-xs text-slate-400 mt-1">Yükleme sonrası kırpabilirsiniz</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleCoverImageChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Gallery Images */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Galeri Fotoğrafları</Label>
                      <span className="text-xs text-slate-400">{galleryImages.length}/5</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {galleryPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(index)}
                            className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {galleryImages.length < 5 && (
                        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-1">
                            <Upload className="h-4 w-4 text-slate-400" />
                            <Crop className="h-4 w-4 text-slate-400" />
                          </div>
                          <span className="text-xs text-slate-400 mt-1">Ekle</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleGalleryImagesChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                {currentStepIndex > 0 ? (
                  <Button type="button" variant="outline" onClick={goToPreviousStep}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {t.common.back}
                  </Button>
                ) : (
                  <div />
                )}

                {currentStepIndex < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={goToNextStep}
                    disabled={currentStep === 'legal' && vknStatus !== 'valid'}
                  >
                    {currentStep === 'legal' && vknStatus === 'loading' ? (
                      <>
                        <SprinterLoading size="xs" className="mr-2" />
                        Doğrulanıyor...
                      </>
                    ) : (
                      <>
                        {t.common.next}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleFinalSubmit} disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? (
                      <>
                        <SprinterLoading size="xs" className="mr-2" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2" />
                        {t.agency.createAgency}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Image Cropper Dialog */}
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImage}
        onCropComplete={handleCropComplete}
        aspectRatio={cropperType === 'cover' ? 16 / 9 : 1}
        title={cropperType === 'cover' ? 'Kapak Fotoğrafını Kırp' : 'Galeri Fotoğrafını Kırp'}
        cropShape="rect"
      />
    </div>
  );
}
