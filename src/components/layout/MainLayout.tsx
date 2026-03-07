'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SprinterLoading } from '@/components/shared';
import { Skeleton } from '@/components/ui/skeleton';

interface MainLayoutProps {
  children: ReactNode;
}

// Sidebar gosterilmeyecek sayfalar
const noSidebarPaths = ['/', '/login', '/register', '/agency/login', '/agency/setup', '/restaurant/setup', '/customer'];

export function MainLayout({ children }: MainLayoutProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();

  const showSidebar = !noSidebarPaths.some(p => pathname === p || pathname.startsWith(p + '/')) && isAuthenticated;

  if (isLoading) {
    // Login/register sayfalarinda loading skeleton gosterme
    if (noSidebarPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
      return <>{children}</>;
    }

    return (
      <div className="flex min-h-screen">
        <div className="w-64 bg-slate-900">
          <div className="p-4">
            <Skeleton className="h-8 w-32 bg-slate-700" />
            <Skeleton className="h-4 w-24 bg-slate-700 mt-2" />
          </div>
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-slate-800" />
            ))}
          </div>
        </div>
        <main className="flex-1 bg-slate-50 flex items-center justify-center">
          <SprinterLoading message={t.common.loading} size="lg" />
        </main>
      </div>
    );
  }

  // Login/Register sayfalari - sidebar yok
  if (!showSidebar) {
    return <>{children}</>;
  }

  // Normal sayfalar - sidebar ile
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-slate-50 overflow-auto">{children}</main>
    </div>
  );
}
