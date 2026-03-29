'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ComboboxOption {
  value: string;
  label: string;
  group?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  groupBy?: boolean;
  side?: 'top' | 'bottom';
  onSearchChange?: (search: string) => void;
  loading?: boolean;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Seçiniz...',
  searchPlaceholder = 'Ara...',
  emptyText = 'Sonuç bulunamadı',
  disabled = false,
  className,
  groupBy = false,
  side = 'bottom',
  onSearchChange,
  loading = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = React.useMemo(() => {
    // Skip client-side filtering when server-side search is active
    if (onSearchChange) return options;
    if (!search.trim()) return options;
    const query = search.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.group && opt.group.toLowerCase().includes(query))
    );
  }, [options, search, onSearchChange]);

  // Group options by group field
  const groupedOptions = React.useMemo(() => {
    if (!groupBy) return { '': filteredOptions };
    return filteredOptions.reduce((acc, opt) => {
      const group = opt.group || '';
      if (!acc[group]) acc[group] = [];
      acc[group].push(opt);
      return acc;
    }, {} as Record<string, ComboboxOption[]>);
  }, [filteredOptions, groupBy]);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (optValue: string) => {
    onValueChange(optValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full justify-between font-normal"
      >
        <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className={cn(
          "absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg",
          side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
        )}>
          {/* Search Input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => { setSearch(e.target.value); onSearchChange?.(e.target.value); }}
                className="pl-9 pr-8 h-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-80 overflow-y-auto p-1">
            {loading ? (
              <div className="py-6 text-center text-sm text-slate-400">...</div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">{emptyText}</div>
            ) : groupBy ? (
              Object.entries(groupedOptions).map(([group, opts]) => (
                <div key={group}>
                  {group && (
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 sticky top-0">
                      {group}
                    </div>
                  )}
                  {opts.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-slate-100',
                        value === opt.value && 'bg-slate-100'
                      )}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4',
                          value === opt.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-slate-100',
                    value === opt.value && 'bg-slate-100'
                  )}
                >
                  <Check
                    className={cn('h-4 w-4', value === opt.value ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="truncate">{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
