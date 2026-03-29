'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Route,
  Building2,
  Briefcase,
  ClipboardList,
  UtensilsCrossed,
  LayoutGrid,
  LogOut,
  User,
  Users,
  UsersRound,
  Calendar,
  Compass,
  Plane,
  Image,
  Code2,
  LifeBuoy,
  Bell,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/types';

interface NavItem {
  labelKey: keyof ReturnType<typeof useLanguage>['t']['nav'];
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const agencyNavItems: NavItem[] = [
  { labelKey: 'dashboard', href: '/agency', icon: LayoutGrid },
  { labelKey: 'tours', href: '/agency/tours', icon: Route },
  { labelKey: 'team', href: '/agency/team', icon: Users },
  { labelKey: 'clients', href: '/agency/clients', icon: User },
  { labelKey: 'photos', href: '/agency/photos', icon: Image },
  { labelKey: 'externalApi', href: '/agency/external-api', icon: Code2 },
  { labelKey: 'support', href: '/agency/support', icon: LifeBuoy },
];

const restaurantNavItems: NavItem[] = [
  { labelKey: 'dashboard', href: '/restaurant', icon: LayoutGrid },
  { labelKey: 'requests', href: '/restaurant/requests', icon: ClipboardList },
  { labelKey: 'guests', href: '/restaurant/guests', icon: UsersRound },
  { labelKey: 'venue', href: '/restaurant/venue', icon: Building2 },
  { labelKey: 'menu', href: '/restaurant/menu', icon: UtensilsCrossed },
  { labelKey: 'photos', href: '/restaurant/photos', icon: Image },
  { labelKey: 'team', href: '/restaurant/team', icon: Users },
  { labelKey: 'support', href: '/restaurant/support', icon: LifeBuoy },
];

const customerNavItems: NavItem[] = [
  { labelKey: 'dashboard', href: '/customer', icon: Compass },
];

interface AdminNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavItems: AdminNavItem[] = [
  { label: 'dashboard', href: '/admin', icon: LayoutGrid },
  { label: 'users', href: '/admin/users', icon: Users },
  { label: 'tours', href: '/admin/tours', icon: Calendar },
  { label: 'tourStops', href: '/admin/requests', icon: ClipboardList },
  { label: 'restaurants', href: '/admin/restaurants', icon: Building2 },
  { label: 'agencies', href: '/admin/agencies', icon: Briefcase },
  { label: 'notifications', href: '/admin/notifications', icon: Bell },
  { label: 'commissions', href: '/admin/commissions', icon: Percent },
];

const roleBadgeColors: Record<UserRole, string> = {
  agency: 'bg-blue-600',
  restaurant: 'bg-green-600',
  customer: 'bg-gradient-to-r from-sky-500 to-orange-500',
  admin: 'bg-red-600',
};

// Customer-specific sidebar theme
const customerSidebarTheme = {
  bg: 'bg-gradient-to-b from-sky-900 via-orange-900 to-amber-900',
  border: 'border-orange-700',
  hover: 'hover:bg-orange-800/50',
  active: 'bg-gradient-to-r from-sky-600 to-orange-600',
};

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const navItems =
    user.role === 'agency'
      ? agencyNavItems
      : user.role === 'restaurant'
      ? restaurantNavItems
      : user.role === 'admin'
      ? [] // Admin uses its own nav rendering
      : customerNavItems;

  const roleLabels: Record<UserRole, string> = {
    agency: t.roles.agencyPanel,
    restaurant: t.roles.restaurantPanel,
    customer: t.roles.customerPanel,
    admin: t.roles.adminPanel,
  };

  const isCustomer = user.role === 'customer';

  const adminLabels: Record<string, string> = {
    dashboard: t.admin.dashboard,
    users: t.admin.users,
    tours: t.admin.tours,
    restaurants: t.admin.restaurants,
    agencies: t.admin.agencies,
    tourStops: t.admin.tourStops,
    notifications: t.admin.notifications,
    commissions: t.admin.commissions,
  };

  return (
    <>
      <div className={cn("p-4 border-b", isCustomer ? customerSidebarTheme.border : "border-slate-700")}>
        {isCustomer ? (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Plane className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t.common.appName}</h1>
              <p className="text-sm text-orange-200">Keşfet, Yaşa, Hatırla</p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">{t.common.appName}</h1>
            <p className="text-sm text-slate-400 mt-1">{t.common.appDescription}</p>
          </>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {user.role === 'admin' ? (
          // Admin navigation
          adminNavItems.map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-red-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {adminLabels[item.label]}
              </Link>
            );
          })
        ) : isCustomer ? (
          // Customer navigation - travel themed
          navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? customerSidebarTheme.active + ' text-white shadow-lg'
                    : 'text-orange-100 ' + customerSidebarTheme.hover + ' hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {t.nav[item.labelKey]}
              </Link>
            );
          })
        ) : (
          // Other roles navigation
          navItems.map((item) => {
            const isDashboard = item.labelKey === 'dashboard';
            const isActive = isDashboard ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {t.nav[item.labelKey]}
              </Link>
            );
          })
        )}
      </nav>

      <div className={cn("p-4 border-t", isCustomer ? customerSidebarTheme.border : "border-slate-700")}>
        {/* Dil Secici */}
        <div className="mb-4">
          <LanguageSwitcher variant="dark" />
        </div>

        {/* Kullanici Bilgisi */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center",
            isCustomer ? "bg-orange-700/50" : "bg-slate-700"
          )}>
            {isCustomer ? (
              <Compass className="h-5 w-5 text-orange-200" />
            ) : (
              <User className="h-5 w-5 text-slate-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className={cn("text-xs truncate", isCustomer ? "text-orange-300" : "text-slate-400")}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Rol Badge - Hidden for customers, show travel badge instead */}
        <div className="mb-4">
          {isCustomer ? (
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-sky-600/50 to-orange-600/50 text-sm">
              <Plane className="h-4 w-4 text-orange-200" />
              <span className="text-orange-100">Seyahat Portalı</span>
            </div>
          ) : (
            <Badge className={cn('w-full justify-center py-1', roleBadgeColors[user.role])}>
              {roleLabels[user.role]}
            </Badge>
          )}
        </div>

        {/* Cikis Butonu */}
        <Button
          variant="outline"
          className={cn(
            "w-full",
            isCustomer
              ? "bg-orange-800/50 border-orange-600 text-white hover:bg-orange-700 hover:text-white"
              : "bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:text-white"
          )}
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t.auth.logout}
        </Button>
      </div>
    </>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  return (
    <aside className={cn(
      "hidden md:flex w-64 text-white h-screen sticky top-0 flex-col",
      isCustomer ? customerSidebarTheme.bg : "bg-slate-900"
    )}>
      <SidebarContent />
    </aside>
  );
}
