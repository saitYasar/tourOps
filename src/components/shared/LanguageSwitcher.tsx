'use client';

import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { localeNames, type Locale } from '@/locales';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const flags: Record<Locale, string> = {
  tr: 'TR',
  en: 'EN',
  de: 'DE',
};

interface LanguageSwitcherProps {
  variant?: 'default' | 'dark';
}

export function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-2 w-full justify-start',
            variant === 'dark' && 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:text-white'
          )}
        >
          <Globe className="h-4 w-4" />
          <span className="font-medium">{flags[locale]}</span>
          <span className={cn(
            'text-xs ml-auto',
            variant === 'dark' ? 'text-slate-400' : 'text-slate-500'
          )}>
            {localeNames[locale]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {(Object.keys(localeNames) as Locale[]).map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc)}
            className={locale === loc ? 'bg-slate-100' : ''}
          >
            <span className="mr-2 font-mono text-sm">{flags[loc]}</span>
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
