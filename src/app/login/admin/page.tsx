'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Shield,
  Lock,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

import { adminApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Step = 'email' | 'otp';

const makeEmailSchema = (invalidEmailMsg: string) => z.object({
  email: z.string().email(invalidEmailMsg),
});

type EmailFormData = { email: string };

export default function AdminLoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [loginEmail, setLoginEmail] = useState('');
  const [otp, setOtp] = useState('');

  const emailSchema = makeEmailSchema(t.auth.invalidEmail);

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
      setLoginEmail(data.email);
      const result = await adminApi.login(data.email);

      if (result.success) {
        setStep('otp');
      } else {
        setError(result.error || t.auth.otpSendFailed);
      }
    } catch (err) {
      setError((err as Error).message || t.auth.generalError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify OTP
  const onVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError(t.auth.otpInvalid);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await adminApi.verifyOtp(loginEmail, otp);

      if (result.success && result.data) {
        // Save user data to localStorage
        localStorage.setItem('tourops_user_data', JSON.stringify({
          ...result.data.user,
          userType: 'admin',
        }));

        // Force page reload to update AuthContext state
        window.location.href = '/admin';
        return; // Don't update state after navigation
      } else {
        setError(result.error || t.auth.otpWrongCode);
        setIsSubmitting(false);
      }
    } catch (err) {
      setError((err as Error).message || t.auth.verificationError);
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const onResendOtp = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await adminApi.login(loginEmail);
      if (!result.success) {
        setError(result.error || t.auth.resendFailed);
      }
    } catch (err) {
      setError((err as Error).message || t.auth.resendFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sol Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
        {/* Dekoratif */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute top-1/3 -left-16 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute bottom-20 right-10 w-32 h-32 bg-white/5 rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-white/20">
              <Shield className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{t.common.appName}</h1>
          </div>
          <p className="text-white/70 mt-2">{t.auth.adminPanel}</p>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold">{t.auth.adminLogin}</h2>
          <p className="text-white/80 text-lg leading-relaxed">
            {t.admin.description}
          </p>

          <div className="space-y-3 mt-6">
            <div className="flex items-center gap-3 text-white/90">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Shield className="h-4 w-4" />
              </div>
              <span className="text-sm">{t.auth.businessApproval}</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Lock className="h-4 w-4" />
              </div>
              <span className="text-sm">{t.auth.userRoleManagement}</span>
            </div>
          </div>
        </div>

        <p className="text-white/50 text-sm relative z-10">
          &copy; 2026 TourOps. All rights reserved.
        </p>
      </div>

      {/* Sağ Panel - Form */}
      <div className="flex-1 lg:w-1/2 flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex-1 flex items-center justify-center p-6 lg:p-8">
          <div className="w-full max-w-sm">
            {/* Dil Seçici */}
            <div className="flex justify-end mb-4">
              <LanguageSwitcher />
            </div>

            {/* Mobil Logo */}
            <div className="lg:hidden text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-200 mb-3">
                <Shield className="h-5 w-5 text-slate-700" />
                <span className="font-bold text-slate-700">Admin</span>
              </div>
            </div>

            {step === 'otp' ? (
              // OTP Step
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
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-200 mb-4">
                    <Mail className="h-8 w-8 text-slate-700" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{t.auth.otpTitle}</h2>
                  <p className="text-slate-500 mt-2 text-sm">
                    <span className="font-medium text-slate-700">{loginEmail}</span>
                    <br />{t.auth.otpSentTo}
                  </p>
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  </div>
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
                      className="h-14 text-center text-2xl tracking-[0.5em] font-mono rounded-xl"
                      autoFocus
                    />
                  </div>

                  <Button
                    onClick={onVerifyOtp}
                    className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-900 text-white"
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
                      className="text-slate-800 hover:underline font-medium"
                      disabled={isSubmitting}
                    >
                      {t.auth.resend}
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              // Email Step
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-200 mb-4">
                    <Shield className="h-8 w-8 text-slate-700" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{t.auth.adminLogin}</h2>
                  <p className="text-slate-500 mt-1 text-sm">{t.auth.adminEmailPlaceholder}</p>
                </div>

                <form onSubmit={handleSubmit(onSubmitEmail)} className="space-y-4">
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-slate-700 text-sm">{t.auth.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      className="h-12 rounded-xl"
                      autoFocus
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-900 text-white"
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
                </form>

                <div className="mt-6 p-4 rounded-xl bg-slate-200 border border-slate-300">
                  <p className="text-xs text-slate-600">
                    {t.auth.adminOnlyInfo}
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
