'use client';

import Link from 'next/link';
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
  ArrowLeft,
  Clock,
} from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/shared';
import { Button } from '@/components/ui/button';

export default function CustomerLoginPage() {
  const { t } = useLanguage();

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sol Panel - Travel Theme with Photo */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image - Cappadocia Hot Air Balloons */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=1200&q=80)',
          }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-600/80 via-red-500/60 to-amber-500/70" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 text-white w-full">
          {/* Floating Travel Icons */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <Plane className="absolute top-20 right-20 h-10 w-10 text-white/20 animate-float" />
            <Mountain className="absolute bottom-40 left-16 h-8 w-8 text-white/20 animate-float-delayed" />
            <Palmtree className="absolute top-1/3 right-32 h-7 w-7 text-white/15 animate-pulse" />
            <Camera className="absolute bottom-1/4 right-1/4 h-6 w-6 text-white/20 animate-float" />
            <Ship className="absolute top-2/3 left-1/4 h-8 w-8 text-white/15 animate-float-delayed" />
            <Sun className="absolute top-1/4 left-20 h-9 w-9 text-yellow-300/30 animate-pulse" />
            <Tent className="absolute bottom-32 right-16 h-6 w-6 text-white/20 animate-float" />
          </div>

          {/* Logo */}
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

          {/* Main Content */}
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

            {/* Features */}
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

      {/* Sag Panel - Coming Soon */}
      <div className="flex-1 lg:w-1/2 flex flex-col bg-gradient-to-br from-rose-50 via-red-50 to-amber-50">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="w-full max-w-sm">
            {/* Dil Secici */}
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

            {/* Coming Soon Content */}
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-rose-100 to-amber-100 mb-4">
                <Clock className="h-10 w-10 text-red-500" />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                  {t.auth.comingSoon}
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t.auth.comingSoonDesc}
                </p>
              </div>

              {/* Decorative Elements */}
              <div className="flex justify-center gap-3 py-4">
                <div className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-rose-100 to-red-100 border border-red-200">
                <p className="text-xs text-red-700">
                  {t.auth.comingSoonInfo}
                </p>
              </div>

              {/* Back to Main Login */}
              <Link href="/login">
                <Button
                  className="w-full h-11 rounded-xl text-sm font-medium bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 hover:from-rose-600 hover:via-red-600 hover:to-amber-600 text-white shadow-lg shadow-red-500/25"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t.auth.backToMainLogin}
                </Button>
              </Link>

              {/* Inspirational Text */}
              <div className="mt-6 text-center">
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

      {/* CSS Animasyonlar */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 4s ease-in-out infinite;
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
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
