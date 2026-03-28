'use client';

import { type ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar, SidebarContent } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SprinterLoading } from '@/components/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

// Sidebar gosterilmeyecek sayfalar
const noSidebarPaths = ['/', '/login', '/register', '/agency/login', '/agency/setup', '/restaurant/setup', '/customer'];

export function MainLayout({ children }: MainLayoutProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const showSidebar = !noSidebarPaths.some(p => pathname === p || pathname.startsWith(p + '/')) && isAuthenticated;

  if (isLoading) {
    // Login/register sayfalarinda loading skeleton gosterme
    if (noSidebarPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
      return <>{children}</>;
    }

    return (
      <div className="flex min-h-screen">
        <div className="hidden md:block w-64 bg-slate-900">
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

  const isCustomer = user?.role === 'customer';
  const sidebarBg = isCustomer
    ? 'bg-gradient-to-b from-sky-900 via-orange-900 to-amber-900'
    : 'bg-slate-900';

  // Normal sayfalar - sidebar ile
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile header + content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" showCloseButton={false} className={cn("p-0 w-72 text-white border-none", sidebarBg)}>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-lg font-bold">{t.common.appName}</span>
        </div>

        <main className="flex-1 bg-slate-50 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
