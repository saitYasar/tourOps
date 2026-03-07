'use client';

import { Bell, Search, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type OrganizationStatus = 'pending' | 'active' | 'suspended';

const statusConfig: Record<OrganizationStatus, { label: Record<string, string>; icon: typeof CheckCircle; className: string }> = {
  active: {
    label: { tr: 'Aktif', en: 'Active', de: 'Aktiv' },
    icon: CheckCircle,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  pending: {
    label: { tr: 'Beklemede', en: 'Pending', de: 'Ausstehend' },
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  suspended: {
    label: { tr: 'Askıda', en: 'Suspended', de: 'Gesperrt' },
    icon: AlertTriangle,
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

interface HeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  organizationStatus?: string;
  lang?: string;
}

export function Header({ title, description, children, organizationStatus, lang = 'tr' }: HeaderProps) {
  const status = organizationStatus as OrganizationStatus | undefined;
  const config = status ? statusConfig[status] : null;

  return (
    <header className="h-16 border-b bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500">{description}</p>
          )}
        </div>
        {config && (() => {
          const Icon = config.icon;
          return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${config.className}`}>
              <Icon className="h-3 w-3" />
              {config.label[lang] || config.label.en}
            </span>
          );
        })()}
      </div>

      <div className="flex items-center gap-4">
        {children}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Ara..."
            className="w-64 pl-9"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </Button>
      </div>
    </header>
  );
}
