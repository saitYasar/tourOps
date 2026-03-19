'use client';

import { Suspense, useState } from 'react';
import {
  Compass,
  Sparkles,
  MapPin,
  Plane,
  Camera,
  Mountain,
  Palmtree,
  Sun,
  Ship,
  Tent,
  User,
  Lock,
  LogIn,
  Eye,
  EyeOff,
  Mail,
  Loader2,
  UserPlus,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { realAuthApi, apiClient, getAuthStorageKeys } from '@/lib/api';

type PageMode = 'login' | 'register';
type LoginMethod = 'username' | 'email';
type OtpStep = 'form' | 'otp';

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-red-50 to-amber-50">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    }>
      <CustomerLoginContent />
    </Suspense>
  );
}

function CustomerLoginContent() {
  const { t } = useLanguage();

  const [mode, setMode] = useState<PageMode>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('username');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Username/password
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Email OTP
  const [otpStep, setOtpStep] = useState<OtpStep>('form');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // Register
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const switchMode = (newMode: PageMode) => {
    setMode(newMode);
    setError('');
    setOtpStep('form');
    setOtp('');
  };

  const switchLoginMethod = (method: LoginMethod) => {
    setLoginMethod(method);
    setError('');
    setOtpStep('form');
    setOtp('');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSuccess = (data: any, isNewUser = false) => {
    const customerKeys = getAuthStorageKeys('customer');
    // Ensure token is stored under customer key
    const accessToken = apiClient.getAccessToken();
    if (accessToken) {
      localStorage.setItem(customerKeys.token, accessToken);
    }
    if (data.user) {
      localStorage.setItem(customerKeys.userData, JSON.stringify({
        ...data.user,
        userType: 'customer',
        isNewUser,
      }));
    }
    window.location.href = '/customer';
  };

  // Username + password login
  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) return;

    setIsLoading(true);
    try {
      const result = await realAuthApi.clientLogin(username.trim(), password);
      if (result.success && result.data) {
        handleSuccess(result.data);
      } else {
        setError(result.error || t.auth.invalidCredentials);
      }
    } catch {
      setError(t.auth.generalError);
    } finally {
      setIsLoading(false);
    }
  };

  // Email OTP login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const result = await realAuthApi.clientLoginRegister(email.trim());
      if (result.success) {
        setOtpStep('otp');
      } else {
        setError(result.error || t.auth.generalError);
      }
    } catch {
      setError(t.auth.generalError);
    } finally {
      setIsLoading(false);
    }
  };

  // Register - send OTP
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !firstName.trim() || !lastName.trim()) return;

    setIsLoading(true);
    try {
      const result = await realAuthApi.clientLoginRegister(
        email.trim(),
        firstName.trim(),
        lastName.trim(),
      );
      if (result.success) {
        setOtpStep('otp');
      } else {
        setError(result.error || t.auth.generalError);
      }
    } catch {
      setError(t.auth.generalError);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setError('');
    setIsLoading(true);

    try {
      const result = await realAuthApi.clientLoginRegisterVerify(email.trim(), otp);
      if (result.success && result.data) {
        handleSuccess(result.data, mode === 'register');
      } else {
        setError(result.error || t.auth.generalError);
      }
    } catch {
      setError(t.auth.generalError);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setError('');
    setIsLoading(true);
    try {
      const args: [string, string?, string?] = [email.trim()];
      if (mode === 'register') {
        args.push(firstName.trim(), lastName.trim());
      }
      const result = await realAuthApi.clientLoginRegister(...args);
      if (!result.success) {
        setError(result.error || t.auth.generalError);
      }
    } catch {
      setError(t.auth.generalError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sol Panel - Travel Theme */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=1200&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-rose-600/80 via-red-500/60 to-amber-500/70" />

        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 text-white w-full">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <Plane className="absolute top-20 right-20 h-10 w-10 text-white/20 animate-float" />
            <Mountain className="absolute bottom-40 left-16 h-8 w-8 text-white/20 animate-float-delayed" />
            <Palmtree className="absolute top-1/3 right-32 h-7 w-7 text-white/15 animate-pulse" />
            <Camera className="absolute bottom-1/4 right-1/4 h-6 w-6 text-white/20 animate-float" />
            <Ship className="absolute top-2/3 left-1/4 h-8 w-8 text-white/15 animate-float-delayed" />
            <Sun className="absolute top-1/4 left-20 h-9 w-9 text-yellow-300/30 animate-pulse" />
            <Tent className="absolute bottom-32 right-16 h-6 w-6 text-white/20 animate-float" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                <Compass className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl xl:text-4xl font-bold tracking-tight">{t.common.appName}</h1>
                <p className="text-white/80 text-sm">{t.auth.discoverLiveRemember}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            <div>
              <h2 className="text-3xl xl:text-4xl font-bold mb-4 leading-tight">
                {t.auth.dreamVacation}<br />
                <span className="text-amber-200">{t.auth.awaitsYou}</span>
              </h2>
              <p className="text-white/90 text-lg leading-relaxed max-w-md">
                {t.auth.customerLoginDesc}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <FeatureCard icon={MapPin} title={t.auth.destinations} />
              <FeatureCard icon={Camera} title={t.auth.uniqueExperiences} />
              <FeatureCard icon={Palmtree} title={t.auth.premiumVenues} />
              <FeatureCard icon={Sparkles} title={t.auth.specialOffers} />
            </div>
          </div>

          <p className="text-white/50 text-sm relative z-10">
            &copy; 2026 TourOps. {t.auth.allRightsReserved}
          </p>
        </div>
      </div>

      {/* Sağ Panel - Login Form */}
      <div className="flex-1 lg:w-1/2 flex flex-col bg-gradient-to-br from-rose-50 via-red-50 to-amber-50">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="w-full max-w-sm">
            {/* Dil Seçici */}
            <div className="flex justify-end mb-4">
              <LanguageSwitcher />
            </div>

            {/* Mobil Logo */}
            <div className="lg:hidden text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-red-500 text-white mb-3">
                <Compass className="h-5 w-5" />
                <span className="font-bold">{t.common.appName}</span>
              </div>
              <p className="text-slate-500 text-sm">{t.auth.discoverLiveRemember}</p>
            </div>

            {/* Giriş / Kayıt Tabs */}
            <div className="bg-white rounded-2xl p-1.5 shadow-sm mb-6">
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => switchMode('login')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  {t.auth.login}
                </button>
                <button
                  onClick={() => switchMode('register')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    mode === 'register'
                      ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  {t.auth.clientRegister}
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {/* OTP Verification Step */}
              {otpStep === 'otp' ? (
                <OtpVerifySection
                  email={email}
                  otp={otp}
                  setOtp={setOtp}
                  error={error}
                  isLoading={isLoading}
                  onVerify={handleVerifyOtp}
                  onResend={handleResendOtp}
                  onBack={() => { setOtpStep('form'); setOtp(''); setError(''); }}
                  t={t}
                  buttonLabel={mode === 'register' ? t.auth.clientRegister : t.auth.login}
                />
              ) : mode === 'login' ? (
                /* ===== GİRİŞ ===== */
                <>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-rose-100 to-amber-100 mb-3">
                      <LogIn className="h-7 w-7 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{t.auth.clientLoginTitle}</h2>
                    <p className="text-slate-500 text-sm">{t.auth.clientLoginSubtitle}</p>
                  </div>

                  {/* Login method toggle */}
                  <div className="flex rounded-xl bg-slate-100 p-1">
                    <button
                      onClick={() => switchLoginMethod('username')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        loginMethod === 'username'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      {t.auth.loginWithCredentials}
                    </button>
                    <button
                      onClick={() => switchLoginMethod('email')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        loginMethod === 'email'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {t.auth.loginWithEmail}
                    </button>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">
                      {error}
                    </div>
                  )}

                  {loginMethod === 'username' ? (
                    <form onSubmit={handleUsernameLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                          {t.auth.username}
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={t.auth.enterUsername}
                            className="pl-10 h-11 rounded-xl border-slate-200 focus:border-red-400 focus:ring-red-400"
                            disabled={isLoading}
                            autoComplete="username"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                          {t.auth.password}
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t.auth.enterPassword}
                            className="pl-10 pr-10 h-11 rounded-xl border-slate-200 focus:border-red-400 focus:ring-red-400"
                            disabled={isLoading}
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-11 rounded-xl text-sm font-medium bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 hover:from-rose-600 hover:via-red-600 hover:to-amber-600 text-white shadow-lg shadow-red-500/25"
                        disabled={isLoading || !username.trim() || !password.trim()}
                      >
                        {isLoading ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            {t.auth.loggingIn}
                          </>
                        ) : (
                          <>
                            <LogIn className="h-4 w-4 mr-2" />
                            {t.auth.loginAsClient}
                          </>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="login-email" className="text-sm font-medium text-slate-700">
                          {t.auth.email}
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ornek@gmail.com"
                            className="pl-10 h-11 rounded-xl border-slate-200 focus:border-red-400 focus:ring-red-400"
                            disabled={isLoading}
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-11 rounded-xl text-sm font-medium bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 hover:from-rose-600 hover:via-red-600 hover:to-amber-600 text-white shadow-lg shadow-red-500/25"
                        disabled={isLoading || !email.trim()}
                      >
                        {isLoading ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            {t.auth.sending}
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            {t.auth.sendOtp}
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </>
              ) : (
                /* ===== KAYIT ===== */
                <>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-rose-100 to-amber-100 mb-3">
                      <UserPlus className="h-7 w-7 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{t.auth.clientRegisterTitle}</h2>
                    <p className="text-slate-500 text-sm">{t.auth.clientRegisterSubtitle}</p>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                          {t.auth.firstName}
                        </Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder={t.auth.firstNamePlaceholder}
                          className="h-11 rounded-xl border-slate-200 focus:border-red-400 focus:ring-red-400"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                          {t.auth.lastName}
                        </Label>
                        <Input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder={t.auth.lastNamePlaceholder}
                          className="h-11 rounded-xl border-slate-200 focus:border-red-400 focus:ring-red-400"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-email" className="text-sm font-medium text-slate-700">
                        {t.auth.email}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="reg-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ornek@gmail.com"
                          className="pl-10 h-11 rounded-xl border-slate-200 focus:border-red-400 focus:ring-red-400"
                          disabled={isLoading}
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl text-sm font-medium bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 hover:from-rose-600 hover:via-red-600 hover:to-amber-600 text-white shadow-lg shadow-red-500/25"
                      disabled={isLoading || !email.trim() || !firstName.trim() || !lastName.trim()}
                    >
                      {isLoading ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          {t.auth.registering}
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          {t.auth.clientRegister}
                        </>
                      )}
                    </Button>
                  </form>
                </>
              )}

              {/* Info Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-rose-100 to-red-100 border border-red-200">
                <p className="text-xs text-red-700">
                  {mode === 'register' ? t.auth.clientRegisterDesc : (loginMethod === 'email' ? t.auth.otpInfo : t.auth.clientLoginDesc)}
                </p>
              </div>

              {/* Inspirational Text */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                  <Mountain className="h-4 w-4" />
                  <span>{t.auth.adventureAwaits}</span>
                  <Palmtree className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// OTP Doğrulama Bölümü
function OtpVerifySection({
  email,
  otp,
  setOtp,
  error,
  isLoading,
  onVerify,
  onResend,
  onBack,
  t,
  buttonLabel,
}: {
  email: string;
  otp: string;
  setOtp: (v: string) => void;
  error: string;
  isLoading: boolean;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  buttonLabel: string;
}) {
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t.auth.goBack}</span>
      </button>

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-rose-100 to-amber-100 mb-3">
          <Mail className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{t.auth.otpTitle}</h2>
        <p className="text-slate-500 mt-2 text-sm">
          <span className="font-medium text-slate-700">{email}</span>
          <br />{t.auth.otpSentTo}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">
          {error}
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
            onKeyDown={(e) => { if (e.key === 'Enter' && otp.length === 6 && !isLoading) onVerify(); }}
            className="h-14 text-center text-2xl tracking-[0.5em] font-mono rounded-xl border-slate-200 focus:border-red-400 focus:ring-red-400"
            autoFocus
          />
        </div>

        <Button
          onClick={onVerify}
          className="w-full h-11 rounded-xl text-sm font-medium bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 hover:from-rose-600 hover:via-red-600 hover:to-amber-600 text-white shadow-lg shadow-red-500/25"
          disabled={isLoading || otp.length !== 6}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              {t.auth.verifying}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {buttonLabel}
            </>
          )}
        </Button>

        <p className="text-xs text-slate-500 text-center">
          {t.auth.codeNotReceived}{' '}
          <button
            onClick={onResend}
            className="text-red-500 hover:underline font-medium"
            disabled={isLoading}
          >
            {t.auth.resend}
          </button>
        </p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl">
      <div className="p-2 bg-white/20 rounded-lg">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
}
