'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MapPin,
  Building2,
  Globe,
  Star,
  CheckCircle2,
  ArrowLeft,
  Mail,
  AlertCircle,
  LogIn,
  UserPlus,
  Home,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Translations } from '@/locales';
import { LanguageSwitcher, SprinterLoading } from '@/components/shared';
import { formatPhoneNumber, cleanPhoneNumber } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Error types
type ErrorType = 'already_exists' | 'already_founder' | 'invalid_otp' | 'general';

interface ErrorState {
  type: ErrorType;
  message: string;
}

// Parse error message
const parseError = (errorMessage: string, t: Translations): ErrorState => {
  const lowerError = errorMessage.toLowerCase();

  if (lowerError.includes('already exists') ||
      lowerError.includes('zaten kayıtlı') ||
      lowerError.includes('already registered')) {
    return {
      type: 'already_exists',
      message: t.auth.alreadyExistsMsg,
    };
  }

  if (lowerError.includes('already founder') ||
      lowerError.includes('başka bir işletmenin kurucusu') ||
      lowerError.includes('founder of another')) {
    return {
      type: 'already_founder',
      message: t.auth.alreadyFounderMsg,
    };
  }

  if (lowerError.includes('not associated with any agency') ||
      lowerError.includes('herhangi bir acentede mevcut değil') ||
      lowerError.includes('not associated')) {
    return {
      type: 'already_exists',
      message: t.auth.notAssociatedWithAgencyMsg || 'Bu e-posta adresi kayıtlı ancak herhangi bir acenteye bağlı değil. Lütfen giriş yapın.',
    };
  }

  if (lowerError.includes('invalid otp') ||
      lowerError.includes('geçersiz kod') ||
      lowerError.includes('otp')) {
    return {
      type: 'invalid_otp',
      message: t.auth.otpError,
    };
  }

  return {
    type: 'general',
    message: errorMessage,
  };
};

// Phone country codes
const countryCodes = [
  { code: '+90', country: 'TR', flag: '🇹🇷' },
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+31', country: 'NL', flag: '🇳🇱' },
  { code: '+39', country: 'IT', flag: '🇮🇹' },
  { code: '+34', country: 'ES', flag: '🇪🇸' },
];

// Rol renk ve tema ayarları
const roleThemes = {
  agency: {
    gradient: 'from-blue-600 via-blue-700 to-indigo-800',
    lightGradient: 'from-blue-50 to-indigo-50',
    primary: 'bg-blue-600 hover:bg-blue-700',
    primaryText: 'text-blue-600',
    accent: 'bg-blue-100',
    accentText: 'text-blue-700',
    ring: 'ring-blue-500',
    border: 'border-blue-200',
    icon: MapPin,
  },
  organization: {
    gradient: 'from-emerald-600 via-green-700 to-teal-800',
    lightGradient: 'from-emerald-50 to-teal-50',
    primary: 'bg-emerald-600 hover:bg-emerald-700',
    primaryText: 'text-emerald-600',
    accent: 'bg-emerald-100',
    accentText: 'text-emerald-700',
    ring: 'ring-emerald-500',
    border: 'border-emerald-200',
    icon: Building2,
  },
};

type RegisterableRole = 'agency' | 'organization';
type Step = 'form' | 'otp';

// Main page wrapper with Suspense for useSearchParams
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
          <SprinterLoading message="" size="lg" />
        </div>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const { startRegistration, verifyOtp, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  // Get type and email from URL params
  const typeFromUrl = searchParams.get('type') as RegisterableRole | null;
  const emailFromUrl = searchParams.get('email') || '';
  const initialRole: RegisterableRole = (typeFromUrl && ['agency', 'organization'].includes(typeFromUrl)) ? typeFromUrl : 'agency';

  const [error, setError] = useState<ErrorState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [registrationType, setRegistrationType] = useState<'organization' | 'agency'>(initialRole);
  const [otp, setOtp] = useState('');
  const [selectedRole, setSelectedRole] = useState<RegisterableRole>(initialRole);

  // Schema for OTP-based registration
  const registerSchema = z.object({
    firstName: z.string().min(2, t.auth.nameMin),
    lastName: z.string().min(2, t.auth.nameMin),
    email: z.string().email(t.auth.invalidEmail),
    phone: z.string().refine((val) => val.replace(/\D/g, '').length >= 10, t.auth.phoneMin),
    phoneCountryCode: z.string().min(1, t.auth.countryCodeRequired),
  });

  type RegisterFormData = z.infer<typeof registerSchema>;

  const roleLabels: Record<RegisterableRole, string> = {
    agency: t.roles.agency,
    organization: t.roles.restaurant,
  };

  const roleDescriptions: Record<RegisterableRole, string> = {
    agency: t.roles.agencyDesc,
    organization: t.roles.restaurantDesc,
  };

  const [phoneCountryCode, setPhoneCountryCode] = useState('+90');
  const [phoneDisplay, setPhoneDisplay] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: emailFromUrl,
      phoneCountryCode: '+90',
    },
  });


  // Handle OTP-based registration
  const onSubmitForm = async (data: RegisterFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const type = selectedRole;
      setRegistrationType(type);
      setRegistrationEmail(data.email);

      const result = await startRegistration({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: cleanPhoneNumber(data.phone),
        phoneCountryCode: data.phoneCountryCode,
      }, type);

      if (result.success) {
        setStep('otp');
      } else {
        setError(parseError(result.error || t.auth.registerError, t));
      }
    } catch (err) {
      setError(parseError((err as Error).message || t.auth.registerError, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP verification
  const onVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError({ type: 'invalid_otp', message: t.auth.otpInvalid });
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await verifyOtp(registrationEmail, otp, registrationType);

      if (!result.success) {
        setError(parseError(result.error || t.auth.otpWrongCode, t));
      }
    } catch (err) {
      setError(parseError((err as Error).message || t.auth.verificationError, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const theme = roleThemes[selectedRole];
  const ThemeIcon = theme.icon;

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${theme.lightGradient}`}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
          <SprinterLoading message={t.common.loading} size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sol Panel - Dinamik Gradient */}
      <div
        className={`hidden lg:flex lg:w-1/2 flex-col justify-between p-8 xl:p-12 text-white relative overflow-hidden transition-all duration-700 ease-in-out bg-gradient-to-br ${theme.gradient}`}
      >
        {/* Dekoratif Elementler */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full transition-all duration-1000 scale-100" />
          <div className="absolute top-1/3 -left-16 w-48 h-48 bg-white/5 rounded-full transition-all duration-1000 delay-100 scale-100" />
          <div className="absolute bottom-20 right-10 w-32 h-32 bg-white/10 rounded-full transition-all duration-1000 delay-200" />
        </div>

        {/* İçerik */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 mb-2 hover:opacity-80 transition-opacity">
            <div className="p-2 rounded-xl bg-white/20 transition-transform duration-500">
              <ThemeIcon className="h-6 w-6" />
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight">{t.common.appName}</h1>
          </Link>
          <p className="text-white/70 mt-2 text-sm xl:text-base">{t.common.appDescription}</p>
        </div>

        {/* Rol Açıklaması */}
        <div className="relative z-10 space-y-6">
          <div className="transform transition-all duration-500">
            <h2 className="text-2xl xl:text-3xl font-bold mb-3">
              {roleLabels[selectedRole]} {t.auth.registration}
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              {roleDescriptions[selectedRole]}
            </p>
          </div>

          {/* Özellik Listesi */}
          <div className="space-y-3 mt-6">
            {selectedRole === 'agency' && (
              <>
                <FeatureItem icon={Globe} text={t.roles.agencyFeature1} />
                <FeatureItem icon={MapPin} text={t.roles.agencyFeature2} />
                <FeatureItem icon={Building2} text={t.roles.agencyFeature3} />
              </>
            )}
            {selectedRole === 'organization' && (
              <>
                <FeatureItem icon={Building2} text={t.roles.restaurantFeature1} />
                <FeatureItem icon={Building2} text={t.roles.restaurantFeature2} />
                <FeatureItem icon={Star} text={t.roles.restaurantFeature3} />
              </>
            )}
          </div>
        </div>

        <p className="text-white/50 text-sm relative z-10">
          &copy; 2026 HerHafta. {t.auth.allRightsReserved}
        </p>
      </div>

      {/* Sağ Panel - Register Form */}
      <div className={`flex-1 lg:w-1/2 flex flex-col transition-colors duration-500 bg-gradient-to-br ${theme.lightGradient}`}>
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Anasayfa + Dil Seçici */}
            <div className="flex items-center justify-between mb-4">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">{t.common.home}</span>
              </Link>
              <LanguageSwitcher />
            </div>

            {/* Mobil Logo */}
            <div className="lg:hidden text-center mb-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${theme.accent} mb-3`}>
                <ThemeIcon className={`h-5 w-5 ${theme.accentText}`} />
                <span className={`font-bold ${theme.accentText}`}>{t.common.appName}</span>
              </div>
            </div>

            {step === 'otp' ? (
              // OTP Verification Step
              <div className="space-y-6">
                <button
                  onClick={() => {
                    setStep('form');
                    setOtp('');
                    setError(null);
                  }}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{t.auth.goBack}</span>
                </button>

                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${theme.accent} mb-4`}>
                    <Mail className={`h-8 w-8 ${theme.accentText}`} />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t.auth.otpTitle}</h2>
                  <p className="text-slate-500 mt-2 text-sm">
                    <span className="font-medium text-slate-700">{registrationEmail}</span>
                    <br />{t.auth.otpSentTo}
                  </p>
                </div>

                {error && (
                  <RegisterErrorMessage error={error} t={t} selectedRole={selectedRole} />
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-slate-700 text-sm">{t.auth.otpLabel}</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && otp.length === 6 && !isSubmitting) onVerifyOtp(); }}
                      className="h-14 text-center text-2xl tracking-[0.5em] font-mono rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                      autoFocus
                    />
                  </div>

                  <Button
                    onClick={onVerifyOtp}
                    className={`w-full h-11 rounded-xl text-sm font-medium ${theme.primary} text-white`}
                    disabled={isSubmitting || otp.length !== 6}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <SprinterLoading size="xs" className="mr-2" />
                        {t.auth.verifying}
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {t.auth.register}
                      </span>
                    )}
                  </Button>

                  <p className="text-xs text-slate-500 text-center">
                    {t.auth.codeNotReceived}{' '}
                    <button
                      onClick={() => handleSubmit(onSubmitForm)()}
                      className={`${theme.primaryText} hover:underline font-medium`}
                      disabled={isSubmitting}
                    >
                      {t.auth.resend}
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              // Registration Form Step
              <>
                {/* Rol Seçim Tabları */}
                <div className="bg-white rounded-2xl p-1.5 shadow-sm mb-6">
                  <div className="grid grid-cols-2 gap-1">
                    {(['agency', 'organization'] as RegisterableRole[]).map((role) => {
                      const roleTheme = roleThemes[role];
                      const RoleIcon = roleTheme.icon;
                      const isSelected = selectedRole === role;

                      return (
                        <button
                          key={role}
                          onClick={() => setSelectedRole(role)}
                          className={`relative flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-300 ${
                            isSelected
                              ? `${roleTheme.primary} text-white shadow-lg scale-[1.02]`
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <RoleIcon className={`h-5 w-5 transition-transform duration-300 ${
                            isSelected ? 'scale-110' : ''
                          }`} />
                          <span className="text-xs font-medium">{roleLabels[role]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Başlık */}
                <div className="text-center mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.auth.registerTitle}
                  </h2>
                  <p className="text-slate-500 mt-1 text-sm">{t.auth.registerSubtitle}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
                  {error && (
                    <RegisterErrorMessage error={error} t={t} selectedRole={selectedRole} />
                  )}

                  {/* Ad Soyad */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-slate-700 text-sm">{t.auth.firstName}</Label>
                      <Input
                        id="firstName"
                        placeholder={t.auth.firstNamePlaceholder}
                        className="h-11 rounded-xl border-slate-200"
                        {...register('firstName')}
                      />
                      {errors.firstName && (
                        <p className="text-xs text-red-500">{errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-slate-700 text-sm">{t.auth.lastName}</Label>
                      <Input
                        id="lastName"
                        placeholder={t.auth.lastNamePlaceholder}
                        className="h-11 rounded-xl border-slate-200"
                        {...register('lastName')}
                      />
                      {errors.lastName && (
                        <p className="text-xs text-red-500">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-slate-700 text-sm">{t.auth.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@gmail.com"
                      className="h-11 rounded-xl border-slate-200"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Telefon */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-slate-700 text-sm">{t.auth.phoneLabel}</Label>
                    <div className="flex gap-2">
                      <Select
                        value={phoneCountryCode}
                        onValueChange={(value) => {
                          setPhoneCountryCode(value);
                          setValue('phoneCountryCode', value);
                        }}
                      >
                        <SelectTrigger className="w-[100px] h-11 rounded-xl border-slate-200">
                          <SelectValue placeholder="+90" />
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map((cc) => (
                            <SelectItem key={cc.code} value={cc.code}>
                              <span className="flex items-center gap-1.5">
                                <span>{cc.flag}</span>
                                <span>{cc.code}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="5XX XXX XX XX"
                        className="flex-1 h-11 rounded-xl border-slate-200"
                        value={phoneDisplay}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          setPhoneDisplay(formatted);
                          setValue('phone', formatted, { shouldValidate: false });
                        }}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-xs text-red-500">{errors.phone.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className={`w-full h-11 rounded-xl text-sm font-medium transition-all duration-300 ${theme.primary} text-white`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <SprinterLoading size="xs" className="mr-2" />
                        {t.auth.sending}
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t.auth.sendOtp}
                      </span>
                    )}
                  </Button>

                  <p className="text-sm text-slate-500 text-center">
                    {t.auth.hasAccount}{' '}
                    <Link href={`/login?type=${selectedRole}`} className={`${theme.primaryText} hover:underline font-semibold`}>
                      {t.auth.login}
                    </Link>
                  </p>
                </form>

                {/* Info */}
                <div className={`mt-6 p-4 rounded-xl ${theme.accent} border ${theme.border} transition-all duration-300`}>
                  <p className={`text-xs ${theme.accentText}`}>
                    {t.auth.otpInfo}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Feature Item Bileşeni
function FeatureItem({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 text-white/90">
      <div className="p-1.5 bg-white/20 rounded-lg">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm">{text}</span>
    </div>
  );
}

// Error Message Component for Register
function RegisterErrorMessage({ error, t, selectedRole }: { error: ErrorState; t: Translations; selectedRole: RegisterableRole }) {
  // Already exists - suggest login
  if (error.type === 'already_exists') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl animate-shake">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 font-medium mb-2">
              {t.auth.alreadyExistsTitle}
            </p>
            <p className="text-xs text-amber-700 mb-3">
              {error.message}
            </p>
            <Link
              href={`/login?type=${selectedRole}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              {t.auth.login}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Already founder
  if (error.type === 'already_founder') {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl animate-shake">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-800 font-medium mb-2">
              {t.auth.alreadyFounderTitle}
            </p>
            <p className="text-xs text-blue-700">
              {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default error
  return (
    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl animate-shake">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{error.message}</span>
      </div>
    </div>
  );
}
