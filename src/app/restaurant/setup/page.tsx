'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAutoSelect } from '@/hooks/useAutoSelect';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Building2, MapPin, Phone, Mail, FileText, Upload, X, ChevronRight, ChevronLeft, Crop, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { organizationApi, locationApi, verifyVKN, type OrganizationRegisterDto, type OrganizationRegisterResponseDto } from '@/lib/api';
import { taxOffices, searchTaxOffices } from '@/lib/taxoffice';
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

// Dynamic import for map component (client-side only)
const LocationPicker = dynamic(
  () => import('@/components/shared/LocationPicker').then((mod) => mod.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] bg-slate-100 rounded-lg flex items-center justify-center">
        <SprinterLoading size="xs" />
      </div>
    ),
  }
);

// Steps
type Step = 'basic' | 'location' | 'legal' | 'photos';

type FormData = {
  name: string;
  categoryId: number;
  email: string;
  phoneCountryCode: number;
  phone: number;
  description?: string;
  address: string;
  countryId: number;
  cityId: number;
  districtId: number;
  lat?: number;
  lng?: number;
  legalName: string;
  taxNumber: number;
  taxOffice: string;
  agencyCommissionRate?: number;
  currency?: 'TRY' | 'EUR' | 'USD';
};

const countryCodes = [
  { code: 90, name: 'TR', flag: '🇹🇷' },
  { code: 1, name: 'US', flag: '🇺🇸' },
  { code: 44, name: 'UK', flag: '🇬🇧' },
  { code: 49, name: 'DE', flag: '🇩🇪' },
];

// Turkish city coordinates for map panning
const turkishCityCoordinates: Record<string, { lat: number; lng: number }> = {
  'İstanbul': { lat: 41.0082, lng: 28.9784 },
  'Ankara': { lat: 39.9334, lng: 32.8597 },
  'İzmir': { lat: 38.4237, lng: 27.1428 },
  'Antalya': { lat: 36.8969, lng: 30.7133 },
  'Bursa': { lat: 40.1826, lng: 29.0665 },
  'Adana': { lat: 36.9914, lng: 35.3308 },
  'Konya': { lat: 37.8713, lng: 32.4846 },
  'Gaziantep': { lat: 37.0662, lng: 37.3833 },
  'Mersin': { lat: 36.8121, lng: 34.6415 },
  'Kayseri': { lat: 38.7312, lng: 35.4787 },
  'Eskişehir': { lat: 39.7767, lng: 30.5206 },
  'Diyarbakır': { lat: 37.9144, lng: 40.2306 },
  'Samsun': { lat: 41.2867, lng: 36.33 },
  'Denizli': { lat: 37.7765, lng: 29.0864 },
  'Şanlıurfa': { lat: 37.1591, lng: 38.7969 },
  'Malatya': { lat: 38.3554, lng: 38.3335 },
  'Trabzon': { lat: 41.0027, lng: 39.7168 },
  'Erzurum': { lat: 39.9043, lng: 41.2679 },
  'Van': { lat: 38.4891, lng: 43.4089 },
  'Muğla': { lat: 37.2153, lng: 28.3636 },
  'Aydın': { lat: 37.8444, lng: 27.8458 },
  'Manisa': { lat: 38.6191, lng: 27.4289 },
  'Balıkesir': { lat: 39.6484, lng: 27.8826 },
  'Kocaeli': { lat: 40.8533, lng: 29.8815 },
  'Sakarya': { lat: 40.7569, lng: 30.3781 },
  'Tekirdağ': { lat: 40.9833, lng: 27.5167 },
  'Hatay': { lat: 36.4018, lng: 36.3498 },
  'Kahramanmaraş': { lat: 37.5858, lng: 36.9371 },
  'Afyonkarahisar': { lat: 38.7507, lng: 30.5567 },
  'Sivas': { lat: 39.7477, lng: 37.0179 },
};

export default function OrganizationSetupPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { updateSessionFromRegistration } = useAuth();

  const steps: { id: Step; title: string; description: string }[] = useMemo(() => [
    { id: 'basic', title: t.restaurant.basicInfo, description: t.restaurant.basicInfoDesc },
    { id: 'location', title: t.restaurant.locationStep, description: t.restaurant.locationStepDesc },
    { id: 'legal', title: t.restaurant.legalInfo, description: t.restaurant.legalInfoDesc },
    { id: 'photos', title: t.restaurant.photosStep, description: t.restaurant.photosStepDesc },
  ], [t]);

  const organizationSchema = useMemo(() => z.object({
    name: z.string().min(2, t.restaurant.orgNameMinError),
    categoryId: z.number({ required_error: t.common.required, invalid_type_error: t.common.required }).min(1, t.common.required),
    email: z.string().email(t.auth.invalidEmail),
    phoneCountryCode: z.number({ required_error: t.common.required, invalid_type_error: t.common.required }).min(1, t.common.required),
    phone: z.number({ required_error: t.common.required, invalid_type_error: t.common.required }).min(1000000, t.common.required),
    description: z.string().optional(),
    address: z.string().min(5, t.common.required),
    countryId: z.number({ required_error: t.common.required, invalid_type_error: t.common.required }).min(1, t.common.required),
    cityId: z.number({ required_error: t.common.required, invalid_type_error: t.common.required }).min(1, t.common.required),
    districtId: z.number({ required_error: t.common.required, invalid_type_error: t.common.required }).min(1, t.common.required),
    lat: z.number().optional(),
    lng: z.number().optional(),
    legalName: z.string().min(2, t.common.required),
    taxNumber: z.number({ required_error: t.common.required, invalid_type_error: t.common.required }).min(1000000000, t.common.required).max(99999999999, t.common.required),
    taxOffice: z.string().min(2, t.common.required),
    agencyCommissionRate: z.number().min(0).max(100, t.restaurant.agencyCommissionRateMax).optional(),
  }), [t]);

  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [phoneCountryCodeDisplay, setPhoneCountryCodeDisplay] = useState('90');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; zoom?: number }>({ lat: 41.0082, lng: 28.9784 });

  // Crop states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState<string>('');
  const [cropperType, setCropperType] = useState<'cover' | 'gallery'>('cover');
  const [pendingGalleryFile, setPendingGalleryFile] = useState<File | null>(null);

  // VKN verification states
  const [taxNumberDisplay, setTaxNumberDisplay] = useState('');
  const [vknStatus, setVknStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [vknCompanyName, setVknCompanyName] = useState<string>('');
  const [vknError, setVknError] = useState<string>('');
  const [lastVerifiedVkn, setLastVerifiedVkn] = useState<string>('');

  // Check if user already has an organization
  const { data: existingOrgResult, isLoading: checkingExistingOrg } = useQuery({
    queryKey: ['my-organization-check'],
    queryFn: () => organizationApi.getMyOrganization(),
  });

  // Redirect to dashboard if user already has an organization
  useEffect(() => {
    if (!checkingExistingOrg && existingOrgResult?.success && existingOrgResult.data) {
      // User already has an organization, redirect to dashboard
      router.replace('/restaurant');
    }
  }, [checkingExistingOrg, existingOrgResult, router]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      phoneCountryCode: 90,
    },
  });

  const selectedCountryId = watch('countryId');
  const selectedCityId = watch('cityId');

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['organization-categories'],
    queryFn: () => organizationApi.getCategories(),
  });

  // Fetch countries
  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: () => locationApi.getCountries(),
  });

  // Fetch cities based on selected country
  const { data: citiesData, isLoading: citiesLoading } = useQuery({
    queryKey: ['cities', selectedCountryId],
    queryFn: () => locationApi.getCities(selectedCountryId),
    enabled: !!selectedCountryId,
  });

  // Fetch districts based on selected city
  const { data: districtsData, isLoading: districtsLoading } = useQuery({
    queryKey: ['districts', selectedCityId],
    queryFn: () => locationApi.getDistricts(selectedCityId),
    enabled: !!selectedCityId,
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: { formData: OrganizationRegisterDto; coverImage?: File; galleryImages?: File[] }) =>
      organizationApi.register(data.formData, data.coverImage, data.galleryImages),
    onSuccess: (result) => {
      if (result.success && result.data) {
        const responseData = result.data as OrganizationRegisterResponseDto;

        // Update session with new user data (token is already saved by apiClient)
        if (responseData.user) {
          updateSessionFromRegistration(responseData.user, 'organization');
        }

        toast.success(t.restaurant.orgCreated);
        router.push('/restaurant');
      } else {
        toast.error(result.error || t.restaurant.orgCreateFailed);
      }
    },
    onError: () => {
      toast.error(t.restaurant.orgCreateError);
    },
  });

  const categories = categoriesData?.success ? categoriesData.data?.data || [] : [];
  const countries = countriesData?.success ? countriesData.data?.data || [] : [];
  const cities = citiesData?.success ? citiesData.data?.data || [] : [];
  const districts = districtsData?.success ? districtsData.data?.data || [] : [];

  // Auto-select: Tek secenek varsa otomatik sec
  useAutoSelect(categories, watch('categoryId'), (cat) => {
    setValue('categoryId', cat.id);
  });

  useAutoSelect(countries, watch('countryId'), (country) => {
    setValue('countryId', country.id);
    setValue('cityId', 0);
    setValue('districtId', 0);
  });

  useAutoSelect(cities, watch('cityId'), (city) => {
    setValue('cityId', city.id);
    setValue('districtId', 0);
    // Pan map to selected city
    const normalizedName = city.name.trim();
    const cityCoords = turkishCityCoordinates[normalizedName];
    if (cityCoords) {
      setMapCenter({ ...cityCoords, zoom: 11 });
    }
  });

  useAutoSelect(districts, watch('districtId'), async (district) => {
    setValue('districtId', district.id);
    // Pan map to selected district
    const selectedCity = cities.find(c => c.id === selectedCityId);
    if (selectedCity) {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(district.name + ', ' + selectedCity.name + ', Türkiye')}`);
        const data = await res.json();
        if (data?.[0]) {
          setMapCenter({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), zoom: 14 });
        }
      } catch { /* ignore */ }
    }
  });

  // Get selected city name for filtering tax offices
  const selectedCityName = cities.find(c => c.id === selectedCityId)?.name;

  // Filter tax offices by selected city (if city is selected)
  const filteredTaxOffices = useMemo(() => {
    if (selectedCityName) {
      const cityTaxOffices = taxOffices.filter(t => t.city === selectedCityName);
      // If city has tax offices, show only those; otherwise show all
      if (cityTaxOffices.length > 0) {
        return cityTaxOffices;
      }
    }
    return taxOffices;
  }, [selectedCityName]);

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
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  // Handle gallery images - open cropper for each
  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (galleryImages.length >= 5) {
      toast.error(t.common.error);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCropperImage(reader.result as string);
      setCropperType('gallery');
      setPendingGalleryFile(file);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  // Handle crop complete
  const handleCropComplete = (croppedBlob: Blob) => {
    if (cropperType === 'cover') {
      // Convert blob to file
      const file = new File([croppedBlob], 'cover.jpg', { type: 'image/jpeg' });
      setCoverImage(file);
      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(croppedBlob);
    } else {
      // Gallery image
      const file = new File([croppedBlob], `gallery-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setGalleryImages((prev) => [...prev, file]);
      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(croppedBlob);
    }
    setPendingGalleryFile(null);
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
      setVknError(result.error || t.common.error);
      setLastVerifiedVkn('');
    }
  };

  // Step validation
  const validateStep = async (step: Step): Promise<boolean> => {
    const stepFields: Record<Step, (keyof FormData)[]> = {
      basic: ['name', 'categoryId', 'email', 'phoneCountryCode', 'phone'],
      location: ['address', 'countryId', 'cityId', 'districtId'],
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

  // Manuel submit - form submit kullanmıyoruz
  const handleFinalSubmit = async () => {
    // Tüm alanları validate et
    const isValid = await trigger();
    if (!isValid) {
      toast.error(t.common.required);
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

  // Show loading while checking for existing organization
  if (checkingExistingOrg || (existingOrgResult?.success && existingOrgResult.data)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState message={t.common.loading} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.restaurant.createYourOrg}</h1>
          <p className="text-slate-500 mt-2">{t.restaurant.editOrgInfoDesc}</p>
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
                // Prevent Enter from submitting the form
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
            >
              {/* Step 1: Basic Info */}
              {currentStep === 'basic' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t.restaurant.orgNameLabel}</Label>
                    <Input
                      id="name"
                      placeholder={t.restaurant.orgNamePlaceholder}
                      {...register('name')}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoryId">{t.admin.categoryLabel} *</Label>
                    <Select
                      value={watch('categoryId') ? String(watch('categoryId')) : ''}
                      onValueChange={(v) => setValue('categoryId', parseInt(v))}
                      disabled={categoriesLoading}
                    >
                      <SelectTrigger className={errors.categoryId ? 'border-red-500' : ''}>
                        <SelectValue placeholder={t.admin.categoryLabel} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t.admin.emailLabel} *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="isletme@email.com"
                        className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                        {...register('email')}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t.common.phone} *</Label>
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
                    <Label htmlFor="description">{t.admin.descriptionLabel}</Label>
                    <Textarea
                      id="description"
                      placeholder={t.restaurant.orgDescPlaceholder}
                      rows={3}
                      {...register('description')}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Location */}
              {currentStep === 'location' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="countryId">{t.admin.countryLabel} *</Label>
                    <Select
                      value={watch('countryId') ? String(watch('countryId')) : ''}
                      onValueChange={(v) => {
                        setValue('countryId', parseInt(v));
                        setValue('cityId', 0);
                        setValue('districtId', 0);
                      }}
                      disabled={countriesLoading}
                    >
                      <SelectTrigger className={errors.countryId ? 'border-red-500' : ''}>
                        <SelectValue placeholder={t.admin.countryLabel} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.id} value={country.id.toString()}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.countryId && <p className="text-xs text-red-500">{errors.countryId.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cityId">{t.admin.cityLabel} *</Label>
                      <Select
                        value={watch('cityId') ? String(watch('cityId')) : ''}
                        onValueChange={async (v) => {
                          setValue('cityId', parseInt(v));
                          setValue('districtId', 0);
                          // Pan map to selected city
                          const selectedCity = cities.find(c => c.id.toString() === v);
                          if (selectedCity) {
                            const normalizedName = selectedCity.name.trim();
                            const cityCoords = turkishCityCoordinates[normalizedName];
                            if (cityCoords) {
                              setMapCenter({ ...cityCoords, zoom: 11 });
                            } else {
                              try {
                                const res = await fetch(`/api/geocode?q=${encodeURIComponent(selectedCity.name + ', Türkiye')}`);
                                const data = await res.json();
                                if (data?.[0]) {
                                  setMapCenter({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), zoom: 11 });
                                }
                              } catch { /* ignore */ }
                            }
                          }
                        }}
                        disabled={!selectedCountryId || citiesLoading}
                      >
                        <SelectTrigger className={errors.cityId ? 'border-red-500' : ''}>
                          <SelectValue placeholder={t.admin.cityLabel} />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((city) => (
                            <SelectItem key={city.id} value={city.id.toString()}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.cityId && <p className="text-xs text-red-500">{errors.cityId.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="districtId">{t.admin.districtLabel} *</Label>
                      <Select
                        value={watch('districtId') ? String(watch('districtId')) : ''}
                        onValueChange={async (v) => {
                          setValue('districtId', parseInt(v));
                          // Pan map to selected district
                          const selectedDistrict = districts.find(d => d.id.toString() === v);
                          const selectedCity = cities.find(c => c.id === selectedCityId);
                          if (selectedDistrict && selectedCity) {
                            try {
                              const res = await fetch(`/api/geocode?q=${encodeURIComponent(selectedDistrict.name + ', ' + selectedCity.name + ', Türkiye')}`);
                              const data = await res.json();
                              if (data?.[0]) {
                                setMapCenter({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), zoom: 14 });
                              }
                            } catch { /* ignore */ }
                          }
                        }}
                        disabled={!selectedCityId || districtsLoading}
                      >
                        <SelectTrigger className={errors.districtId ? 'border-red-500' : ''}>
                          <SelectValue placeholder={t.admin.districtLabel} />
                        </SelectTrigger>
                        <SelectContent>
                          {districts.map((district) => (
                            <SelectItem key={district.id} value={district.id.toString()}>
                              {district.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.districtId && <p className="text-xs text-red-500">{errors.districtId.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">{t.admin.addressLabel} *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Textarea
                        id="address"
                        placeholder={t.admin.addressLabel}
                        className={`pl-10 ${errors.address ? 'border-red-500' : ''}`}
                        rows={2}
                        {...register('address')}
                      />
                    </div>
                    {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
                  </div>

                  {/* Map Location Picker */}
                  <div className="space-y-2">
                    <Label>{t.admin.locationLabel}</Label>
                    <LocationPicker
                      initialLat={watch('lat') || 41.0082}
                      initialLng={watch('lng') || 28.9784}
                      centerLat={mapCenter.lat}
                      centerLng={mapCenter.lng}
                      centerZoom={mapCenter.zoom}
                      onLocationChange={(lat, lng) => {
                        setValue('lat', lat);
                        setValue('lng', lng);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Legal */}
              {currentStep === 'legal' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="legalName">{t.admin.legalName} *</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="legalName"
                        placeholder={t.admin.legalName}
                        className={`pl-10 ${errors.legalName ? 'border-red-500' : ''}`}
                        {...register('legalName')}
                      />
                    </div>
                    {errors.legalName && <p className="text-xs text-red-500">{errors.legalName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxNumber">{t.admin.taxNumber} *</Label>
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
                          // Reset verification if value changed
                          if (cleaned !== lastVerifiedVkn) {
                            setVknStatus('idle');
                            setVknCompanyName('');
                            setVknError('');
                          }
                          // Auto-verify when 10 or 11 digits entered
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
                    <Label htmlFor="taxOffice">{t.admin.taxOffice} *</Label>
                    <Combobox
                      options={filteredTaxOffices.map(t => ({
                        value: t.name,
                        label: t.name,
                        group: t.city
                      }))}
                      value={watch('taxOffice')}
                      onValueChange={(value) => setValue('taxOffice', value)}
                      placeholder={t.admin.taxOffice}
                      searchPlaceholder={t.common.search}
                      emptyText={t.common.noData}
                      groupBy={!selectedCityName}
                      className={errors.taxOffice ? '[&>button]:border-red-500' : ''}
                    />
                    {errors.taxOffice && <p className="text-xs text-red-500">{errors.taxOffice.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agencyCommissionRate">{t.restaurant.agencyCommissionRate}</Label>
                    <p className="text-xs text-slate-500">{t.restaurant.agencyCommissionRateDesc}</p>
                    <div className="relative">
                      <Input
                        id="agencyCommissionRate"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        placeholder={t.restaurant.agencyCommissionRatePlaceholder}
                        className={`pr-8 ${errors.agencyCommissionRate ? 'border-red-500' : ''}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          setValue('agencyCommissionRate', val ? Number(val) : undefined);
                        }}
                        value={watch('agencyCommissionRate') ?? ''}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                    </div>
                    {errors.agencyCommissionRate && <p className="text-xs text-red-500">{errors.agencyCommissionRate.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>{t.restaurant.currency}</Label>
                    <p className="text-xs text-slate-500">{t.restaurant.currencyDesc}</p>
                    <Select
                      value={watch('currency') || 'TRY'}
                      onValueChange={(val) => setValue('currency', val as 'TRY' | 'EUR' | 'USD')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRY">TRY (₺)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 4: Photos */}
              {currentStep === 'photos' && (
                <div className="space-y-6">
                  {/* Cover Image */}
                  <div className="space-y-2">
                    <Label>{t.tours.coverImage}</Label>
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
                          <span className="text-sm text-slate-500">{t.menu.uploadImage}</span>
                          <span className="text-xs text-slate-400 mt-1">{t.tours.coverImage}</span>
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
                      <Label>{t.tours.gallery}</Label>
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
                          <span className="text-xs text-slate-400 mt-1">{t.venue.addNew}</span>
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
                        {t.auth.verifying}
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
                        {t.common.loading}
                      </>
                    ) : (
                      <>
                        <Building2 className="h-4 w-4 mr-2" />
                        {t.restaurant.createOrg}
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
        title={cropperType === 'cover' ? t.tours.coverImage : t.tours.gallery}
        cropShape="rect"
      />
    </div>
  );
}
