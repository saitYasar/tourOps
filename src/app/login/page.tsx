'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MapPin,
  Building2,
  Globe,
  Star,
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Loader2,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Translations } from '@/locales';
import { LanguageSwitcher, SprinterLoading } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Error types for better handling
type ErrorType = 'not_found' | 'no_organization' | 'invalid_otp' | 'general';

interface ErrorState {
  type: ErrorType;
  message: string;
}

// Rol renk ve tema ayarlari
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

type LoginRole = 'agency' | 'organization';
type Step = 'email' | 'otp';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
          <SprinterLoading message="Yükleniyor..." size="lg" />
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const { startLogin, verifyOtp, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get type from URL params first
  const typeFromUrl = searchParams.get('type') as LoginRole | null;
  const initialRole: LoginRole = (typeFromUrl && ['agency', 'organization'].includes(typeFromUrl)) ? typeFromUrl : 'agency';

  const [error, setError] = useState<ErrorState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<LoginRole>(initialRole);
  const [step, setStep] = useState<Step>('email');
  const [loginEmail, setLoginEmail] = useState('');
  const [otp, setOtp] = useState('');

  // Parse error message and determine type
  const parseError = (errorMessage: string): ErrorState => {
    const lowerError = errorMessage.toLowerCase();

    // Organization veya Agency'de kayıtlı değil
    if (lowerError.includes('not associated with any organization') ||
        lowerError.includes('herhangi bir işletmede mevcut değil') ||
        lowerError.includes('not associated with any agency') ||
        lowerError.includes('herhangi bir acentede mevcut değil')) {
      return {
        type: 'no_organization',
        message: t.auth.accountNotFoundMsg,
      };
    }

    if (lowerError.includes('user not found') ||
        lowerError.includes('kullanıcı bulunamadı') ||
        lowerError.includes('kayıtlı değil')) {
      return {
        type: 'not_found',
        message: t.auth.userNotFoundMsg,
      };
    }

    if (lowerError.includes('invalid otp') ||
        lowerError.includes('geçersiz kod') ||
        lowerError.includes('otp') ||
        lowerError.includes('doğrulama kodu')) {
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

  const emailSchema = z.object({
    email: z.string().email(t.auth.invalidEmail),
  });

  type EmailFormData = z.infer<typeof emailSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  // Send OTP
  const onSubmitEmail = async (data: EmailFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const type = selectedRole;
      setLoginEmail(data.email);

      const result = await startLogin(data.email, type);

      if (result.success) {
        setStep('otp');
      } else {
        setError(parseError(result.error || t.auth.loginError));
      }
    } catch (err) {
      setError(parseError((err as Error).message || t.auth.loginError));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify OTP
  const onVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError({ type: 'invalid_otp', message: t.auth.otpInvalid });
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const type = selectedRole;
      const result = await verifyOtp(loginEmail, otp, type);

      if (!result.success) {
        setError(parseError(result.error || t.auth.otpWrongCode));
      }
    } catch (err) {
      setError(parseError((err as Error).message || t.auth.verificationError));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const onResendOtp = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const type = selectedRole;
      const result = await startLogin(loginEmail, type);

      if (!result.success) {
        setError(parseError(result.error || t.auth.resendFailed));
      }
    } catch (err) {
      setError(parseError((err as Error).message || t.auth.resendFailed));
    } finally {
      setIsSubmitting(false);
    }
  };

  const theme = roleThemes[selectedRole];
  const ThemeIcon = theme.icon;

  const roleLabels: Record<LoginRole, string> = {
    agency: t.roles.agency,
    organization: t.roles.restaurant,
  };

  const roleDescriptions: Record<LoginRole, string> = {
    agency: t.roles.agencyDesc,
    organization: t.roles.restaurantDesc,
  };

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

        {/* Icerik */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-white/20 transition-transform duration-500">
              <ThemeIcon className="h-6 w-6" />
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight">{t.common.appName}</h1>
          </div>
          <p className="text-white/70 mt-2 text-sm xl:text-base">{t.common.appDescription}</p>
        </div>

        {/* Rol Aciklamasi */}
        <div className="relative z-10 space-y-6">
          <div className="transform transition-all duration-500">
            <h2 className="text-2xl xl:text-3xl font-bold mb-3">
              {roleLabels[selectedRole]}
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              {roleDescriptions[selectedRole]}
            </p>
          </div>

          {/* Ozellik Listesi */}
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
          &copy; 2026 TourOps. All rights reserved.
        </p>
      </div>

      {/* Sag Panel - Login Form */}
      <div className={`flex-1 lg:w-1/2 flex flex-col transition-colors duration-500 bg-gradient-to-br ${theme.lightGradient}`}>
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="w-full max-w-sm">
            {/* Dil Secici */}
            <div className="flex justify-end mb-4">
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
                    setStep('email');
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
                    <span className="font-medium text-slate-700">{loginEmail}</span>
                    <br />{t.auth.otpSentTo}
                  </p>
                </div>

                {error && (
                  <ErrorMessage error={error} selectedRole={selectedRole} t={t} email={loginEmail} />
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
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.auth.verifying}
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {t.auth.login}
                      </span>
                    )}
                  </Button>

                  <p className="text-xs text-slate-500 text-center">
                    {t.auth.codeNotReceived}{' '}
                    <button
                      onClick={onResendOtp}
                      className={`${theme.primaryText} hover:underline font-medium`}
                      disabled={isSubmitting}
                    >
                      {t.auth.resend}
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              // Email Input Step
              <>
                {/* Rol Secim Tablari */}
                <div className="bg-white rounded-2xl p-1.5 shadow-sm mb-6">
                  <div className="grid grid-cols-2 gap-1">
                    {(['agency', 'organization'] as LoginRole[]).map((role) => {
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

                {/* Baslik */}
                <div className="text-center mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.auth.loginTitle}
                  </h2>
                  <p className="text-slate-500 mt-1 text-sm">{t.auth.enterEmail}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmitEmail)} className="space-y-4">
                  {error && (
                    <ErrorMessage error={error} selectedRole={selectedRole} t={t} email={loginEmail} />
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-slate-700 text-sm">{t.auth.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@gmail.com"
                      className={`h-12 rounded-xl border-slate-200 focus:${theme.ring} focus:border-transparent transition-all duration-300 text-base`}
                      autoFocus
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className={`w-full h-11 rounded-xl text-sm font-medium transition-all duration-300 ${theme.primary} text-white`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.auth.sending}
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        {t.auth.sendOtp}
                      </span>
                    )}
                  </Button>

                  <p className="text-sm text-slate-500 text-center">
                    {t.auth.noAccount}{' '}
                    <Link href={`/register?type=${selectedRole}${loginEmail ? `&email=${encodeURIComponent(loginEmail)}` : ''}`} className={`${theme.primaryText} hover:underline font-semibold`}>
                      {t.auth.register}
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

// Feature Item Bileseni
function FeatureItem({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
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

// Error Message Component
function ErrorMessage({
  error,
  selectedRole,
  t,
  email,
}: {
  error: ErrorState;
  selectedRole: LoginRole;
  t: Translations;
  email?: string;
}) {
  const theme = roleThemes[selectedRole];

  // Special handling for "no organization" error
  if (error.type === 'no_organization') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl animate-shake">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 font-medium mb-2">
              {t.auth.accountNotFound}
            </p>
            <p className="text-xs text-amber-700 mb-3">
              {error.message}
            </p>
            <Link
              href={`/register?type=${selectedRole}${email ? `&email=${encodeURIComponent(email)}` : ''}`}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white ${theme.primary} rounded-lg transition-colors`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              {t.auth.createAccount}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Special handling for "not found" error
  if (error.type === 'not_found') {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl animate-shake">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-800 font-medium mb-2">
              {t.auth.userNotFound}
            </p>
            <p className="text-xs text-blue-700 mb-3">
              {error.message}
            </p>
            <Link
              href={`/register?type=${selectedRole}${email ? `&email=${encodeURIComponent(email)}` : ''}`}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white ${theme.primary} rounded-lg transition-colors`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              {t.auth.register}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default error display
  return (
    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl animate-shake">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{error.message}</span>
      </div>
    </div>
  );
}
