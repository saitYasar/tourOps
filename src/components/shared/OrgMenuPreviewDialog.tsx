'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Image as ImageIcon, Store } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { apiClient } from '@/lib/api';
import type { ClientStopMenuCategoryDto, ClientStopMenuServiceDto } from '@/lib/api';
import { getCurrencySymbol } from '@/lib/utils';
import { ServiceDetailDialog } from './ServiceDetailDialog';
import { useLanguage } from '@/contexts/LanguageContext';

function ServiceList({ services, t, onServiceClick }: { services: ClientStopMenuServiceDto[]; t: ReturnType<typeof useLanguage>['t']; onServiceClick?: (svc: ClientStopMenuServiceDto) => void }) {
  if (!services.length) return null;
  const priceLabel = (type: string) => {
    if (type === 'per_person') return `/ ${t.menu.perPerson}`;
    if (type === 'per_hour') return `/ ${t.menu.perHour}`;
    if (type === 'per_day') return `/ ${t.menu.perDay}`;
    return '';
  };
  return (
    <div className="space-y-1">
      {services.map((s) => (
        <div key={s.id} className="flex gap-3 p-2 rounded-lg hover:bg-white/60 transition-colors cursor-pointer" onClick={() => onServiceClick?.(s)}>
          {s.imageUrl ? (
            <img src={s.imageUrl} alt={s.title} className="w-14 h-14 rounded-md object-cover flex-shrink-0 shadow-sm" />
          ) : (
            <div className="w-14 h-14 rounded-md bg-stone-100 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-5 w-5 text-stone-300" />
            </div>
          )}
          <div className="flex-1 min-w-0 py-0.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-stone-800 leading-tight truncate" title={s.title}>{s.title}</p>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-emerald-700">{Number(s.basePrice).toFixed(2)} {getCurrencySymbol(s.currency)}</p>
                {s.priceType !== 'fixed' && <p className="text-[10px] text-stone-400">{priceLabel(s.priceType)}</p>}
              </div>
            </div>
            {s.description && <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-snug">{s.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryItem({ cat, depth, t, onServiceClick }: { cat: ClientStopMenuCategoryDto; depth: number; t: ReturnType<typeof useLanguage>['t']; onServiceClick?: (svc: ClientStopMenuServiceDto) => void }) {
  const [open, setOpen] = useState(depth === 0);
  const hasServices = cat.services?.length > 0;
  const hasChildren = cat.child_service_categories?.length > 0;
  if (!hasServices && !hasChildren) return null;
  return (
    <div>
      {depth === 0 ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="w-full bg-gradient-to-r from-stone-800 to-stone-700 px-4 py-3 rounded-xl mb-3 flex items-center justify-between cursor-pointer">
          <h3 className="text-lg font-bold text-white">{cat.name}</h3>
          <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen((v) => !v)} className="w-full px-4 py-2 mb-2 flex items-center justify-between cursor-pointer">
          <h4 className="text-sm font-semibold text-stone-600 border-b border-stone-200 pb-1 flex-1 text-left">{cat.name}</h4>
          <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform ml-2 ${open ? '' : '-rotate-90'}`} />
        </button>
      )}
      {open && (
        <>
          {hasServices && <ServiceList services={cat.services} t={t} onServiceClick={onServiceClick} />}
          {hasChildren && <CategoryTree categories={cat.child_service_categories} depth={depth + 1} t={t} onServiceClick={onServiceClick} />}
        </>
      )}
    </div>
  );
}

function CategoryTree({ categories, depth, t, onServiceClick }: { categories: ClientStopMenuCategoryDto[]; depth: number; t: ReturnType<typeof useLanguage>['t']; onServiceClick?: (svc: ClientStopMenuServiceDto) => void }) {
  return (
    <>
      {categories.map((cat) => (
        <CategoryItem key={cat.id} cat={cat} depth={depth} t={t} onServiceClick={onServiceClick} />
      ))}
    </>
  );
}

interface OrgMenuPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number | null | undefined;
  organizationName?: string;
}

export function OrgMenuPreviewDialog({ open, onOpenChange, organizationId, organizationName }: OrgMenuPreviewDialogProps) {
  const { t } = useLanguage();
  const [previewLang, setPreviewLang] = useState<'tr' | 'en' | 'de'>('tr');
  const [detailService, setDetailService] = useState<ClientStopMenuServiceDto | null>(null);

  const { data: menuData } = useQuery({
    queryKey: ['org-menu-preview', organizationId, previewLang],
    queryFn: async () => {
      const response = await apiClient.getOrganizationMenu(organizationId!, previewLang);
      return Array.isArray(response) ? response : (response as unknown as { data: ClientStopMenuCategoryDto[] }).data ?? [];
    },
    enabled: open && !!organizationId,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-transparent border-0 shadow-none [&>button]:hidden">
          <div className="mx-auto w-[375px] bg-stone-50 rounded-[2rem] shadow-2xl border-[6px] border-stone-800 overflow-hidden relative">
            <div className="bg-stone-800 flex items-center justify-center py-1">
              <div className="w-20 h-5 bg-stone-900 rounded-b-xl" />
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="bg-gradient-to-br from-stone-800 to-stone-900 px-5 pt-6 pb-5 text-center">
                <p className="text-[10px] uppercase tracking-[3px] text-stone-400 mb-1">{organizationName}</p>
                <h2 className="text-xl font-bold text-white">{t.menu.menuPreview}</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-8 h-px bg-amber-500" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <div className="w-8 h-px bg-amber-500" />
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {(['tr', 'en', 'de'] as const).map((lng) => (
                    <button
                      key={lng}
                      type="button"
                      onClick={() => setPreviewLang(lng)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        previewLang === lng
                          ? 'bg-amber-500 text-white'
                          : 'bg-white/10 text-stone-400 hover:bg-white/20'
                      }`}
                    >
                      {lng.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-4 py-4 space-y-5">
                {menuData && menuData.length > 0 ? (
                  <CategoryTree categories={menuData} depth={0} t={t} onServiceClick={setDetailService} />
                ) : (
                  <div className="py-16 text-center">
                    <Store className="h-10 w-10 text-stone-300 mx-auto mb-3" />
                    <p className="text-sm text-stone-400">{t.menu.noCategories}</p>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 text-center border-t border-stone-200 bg-white">
                <p className="text-[10px] text-stone-400">Powered by HerHafta</p>
              </div>
            </div>
            <div className="bg-stone-800 flex justify-center py-2">
              <div className="w-28 h-1 bg-stone-600 rounded-full" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ServiceDetailDialog
        service={detailService}
        open={!!detailService}
        onOpenChange={(o) => { if (!o) setDetailService(null); }}
        t={t}
      />
    </>
  );
}
