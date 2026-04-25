'use client';

import React, { useState } from 'react';
import { ChevronDown, ImageIcon, MessageSquare, Minus, Plus } from 'lucide-react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getCurrencySymbol } from '@/lib/utils';
import type { ClientStopMenuCategoryDto, ClientStopMenuServiceDto } from '@/lib/api';
import { Image as LucideImage } from 'lucide-react';

export function InteractiveMenuCategory({
  category,
  t,
  depth = 0,
  showPrice,
  stopId,
  getItemQty,
  setItemQty,
  getItemNote,
  setItemNote,
  onServiceClick,
  readOnly = false,
  getInitialQty,
  categoryMax,
  isCategoryLimitReached = false,
}: {
  category: ClientStopMenuCategoryDto;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  depth?: number;
  showPrice: boolean;
  stopId: number;
  getItemQty: (stopId: number, serviceId: number) => number;
  setItemQty: (stopId: number, serviceId: number, qty: number) => void;
  getItemNote: (stopId: number, serviceId: number) => string;
  setItemNote: (stopId: number, serviceId: number, note: string) => void;
  onServiceClick?: (svc: ClientStopMenuServiceDto) => void;
  readOnly?: boolean;
  getInitialQty?: (stopId: number, serviceId: number) => number;
  categoryMax?: number | null;
  isCategoryLimitReached?: boolean;
}) {
  const priceLabel = (type: string) => {
    if (type === 'fixed') return '';
    if (type === 'per_person') return `/ ${t.menu?.perPerson ?? 'kişi'}`;
    if (type === 'per_hour') return `/ ${t.menu?.perHour ?? 'saat'}`;
    if (type === 'per_day') return `/ ${t.menu?.perDay ?? 'gün'}`;
    return '';
  };

  const [collapsed, setCollapsed] = useState(false);

  const countCatQty = (cat: ClientStopMenuCategoryDto): number => {
    let total = 0;
    for (const svc of cat.services || []) total += getItemQty(stopId, svc.id);
    for (const child of cat.child_service_categories || []) total += countCatQty(child);
    return total;
  };
  const effectiveMax = depth === 0 ? category.max : categoryMax;
  const rootCatTotal = depth === 0 ? countCatQty(category) : 0;
  const limitReached = depth === 0
    ? (effectiveMax != null && rootCatTotal >= effectiveMax)
    : isCategoryLimitReached;

  return (
    <div>
      {(category.services?.length > 0 || category.child_service_categories?.length > 0) && (
        depth === 0 ? (
          <div
            className="bg-gradient-to-r from-stone-800 to-stone-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl mb-3 cursor-pointer flex items-center justify-between"
            onClick={() => setCollapsed(prev => !prev)}
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-white">{category.name}</h3>
              {effectiveMax != null && (
                <p className={`text-[11px] mt-0.5 ${limitReached ? 'text-red-300' : 'text-white/50'}`}>
                  {countCatQty(category)}/{effectiveMax}
                </p>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-white transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          </div>
        ) : (
          <div
            className="px-4 py-2 mb-2 cursor-pointer flex items-center justify-between"
            onClick={() => setCollapsed(prev => !prev)}
          >
            <h4 className="text-sm font-semibold text-stone-600 border-b border-stone-200 pb-1 flex-1">{category.name}</h4>
            <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          </div>
        )
      )}

      {!collapsed && depth === 0 && limitReached && (
        <div className="mx-1 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600 font-medium">{t.customer.categoryLimitReached}</p>
        </div>
      )}

      {!collapsed && category.services && category.services.length > 0 && (
        <div className="space-y-1 mb-3">
          {category.services.map((svc) => {
            const qty = getItemQty(stopId, svc.id);
            const note = getItemNote(stopId, svc.id);
            const initQty = getInitialQty?.(stopId, svc.id) ?? 0;
            const maxAvailable = svc.remainingStock != null ? svc.remainingStock + initQty : null;
            const isOutOfStock = maxAvailable === 0;
            const isStockLimitReached = maxAvailable != null && qty >= maxAvailable;
            return (
              <div key={svc.id} className={`rounded-lg transition-colors ${isOutOfStock && qty === 0 ? 'opacity-50' : 'cursor-pointer'} ${qty > 0 ? 'bg-orange-50/80 ring-1 ring-orange-200' : 'hover:bg-white/60'}`} onClick={() => !isOutOfStock && onServiceClick?.(svc)}>
                <div className="flex gap-2 sm:gap-3 p-2">
                  <div className="flex-shrink-0 relative">
                    {svc.imageUrl ? (
                      <img src={svc.imageUrl} alt={svc.title} className="w-10 h-10 sm:w-14 sm:h-14 rounded-md object-cover shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-md bg-stone-100 flex items-center justify-center">
                        <LucideImage className="h-4 w-4 sm:h-5 sm:w-5 text-stone-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-800 leading-tight">{svc.title}</p>
                        {isOutOfStock && qty === 0 && (
                          <p className="text-[11px] font-medium text-red-500 mt-0.5">{svc.dailyStock === 0 ? t.menu.stockOut : t.customer.stockDepleted}</p>
                        )}
                        {isStockLimitReached && qty > 0 && (
                          <p className="text-[11px] font-medium text-red-500 mt-0.5">{t.customer.stockLimitReached}</p>
                        )}
                        {svc.subTitle && !isOutOfStock && (
                          <p className="text-xs text-stone-500 mt-0.5 leading-tight">{svc.subTitle}</p>
                        )}
                      </div>
                      {showPrice && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-emerald-700">{Number(svc.basePrice).toFixed(2)} {getCurrencySymbol(svc.currency)}</p>
                          {svc.priceType !== 'fixed' && (
                            <p className="text-[10px] text-stone-400">{priceLabel(svc.priceType)}</p>
                          )}
                        </div>
                      )}
                    </div>
                    {svc.description && (
                      <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-snug">{svc.description}</p>
                    )}
                    {svc.contentsDescription && (
                      <div className="mt-1.5 p-1.5 bg-amber-50/60 rounded border border-amber-100">
                        <p className="text-[10px] font-medium text-amber-700 mb-0.5">{t.menu?.serviceContentsDescription ?? 'İçindekiler & Hizmet Açıklaması'}</p>
                        <p className="text-[11px] text-stone-500 leading-snug whitespace-pre-line">{svc.contentsDescription}</p>
                      </div>
                    )}
                    {qty > 0 && note && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 mt-1">
                        <MessageSquare className="h-3 w-3" />
                        {note.length > 30 ? note.slice(0, 30) + '...' : note}
                      </span>
                    )}
                  </div>
                  {readOnly ? (
                    qty > 0 && (
                      <div className="shrink-0 self-center">
                        <span className="text-xs sm:text-sm font-bold text-orange-600">{qty}x</span>
                      </div>
                    )
                  ) : (
                    <div className="shrink-0 flex items-center gap-1 sm:gap-1.5 self-center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0}>
                            <button
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-stone-600 text-white flex items-center justify-center shadow-md hover:bg-stone-700 hover:shadow-lg active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:shadow-md transition-all duration-150"
                              onClick={() => setItemQty(stopId, svc.id, qty - 1)}
                              disabled={qty === 0}
                            >
                              <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
                            </button>
                          </span>
                        </TooltipTrigger>
                        {qty === 0 && (
                          <TooltipContent>
                            {t.tooltips.quantityZero}
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <span className={`w-6 sm:w-7 text-center text-sm sm:text-base font-bold ${qty > 0 ? 'text-orange-600' : 'text-stone-400'}`}>
                        {qty}
                      </span>
                      <button
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md hover:bg-orange-600 hover:shadow-lg active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md transition-all duration-150"
                        onClick={() => setItemQty(stopId, svc.id, qty + 1)}
                        disabled={isOutOfStock || isStockLimitReached || limitReached}
                      >
                        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>
                    </div>
                  )}
                </div>
                {qty > 0 && (
                  <div className="px-2 pb-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start gap-2 ml-0 sm:ml-[68px]">
                      <MessageSquare className="h-3.5 w-3.5 text-stone-400 mt-1.5 shrink-0" />
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => !readOnly && setItemNote(stopId, svc.id, e.target.value)}
                        readOnly={readOnly}
                        placeholder={t.customer?.notePlaceholder ?? 'Bu ürün için özel istekler...'}
                        className={`flex-1 text-xs bg-white/80 border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-orange-300 focus:border-orange-300 ${readOnly ? 'cursor-default opacity-60' : ''}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!collapsed && category.child_service_categories && category.child_service_categories.length > 0 && (
        <div className="space-y-3">
          {category.child_service_categories.map((child) => (
            <InteractiveMenuCategory
              key={child.id}
              category={child}
              t={t}
              depth={depth + 1}
              showPrice={showPrice}
              stopId={stopId}
              getItemQty={getItemQty}
              setItemQty={setItemQty}
              getItemNote={getItemNote}
              setItemNote={setItemNote}
              onServiceClick={onServiceClick}
              readOnly={readOnly}
              getInitialQty={getInitialQty}
              categoryMax={effectiveMax}
              isCategoryLimitReached={limitReached}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MenuBottomBar({
  stopId,
  categories,
  showPrice,
  maxSpendLimit,
  readOnly = false,
  getMenuTotal,
  menuTotalItemCount,
  t,
  onSave,
}: {
  stopId: number;
  categories: ClientStopMenuCategoryDto[];
  showPrice: boolean;
  maxSpendLimit?: number | null;
  readOnly?: boolean;
  getMenuTotal: (stopId: number, categories: ClientStopMenuCategoryDto[]) => number;
  menuTotalItemCount: (stopId: number) => number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  onSave: () => void;
}) {
  const totalItems = menuTotalItemCount(stopId);
  const totalPrice = getMenuTotal(stopId, categories);

  const firstCurrency = categories.flatMap(c => c.services).find(s => s?.currency)?.currency;
  const currSymbol = getCurrencySymbol(firstCurrency);

  const limitNum = maxSpendLimit != null ? Number(maxSpendLimit) : 0;
  const hasLimit = limitNum > 0;
  const overLimit = hasLimit && totalPrice > limitNum;

  if (totalItems === 0 && !hasLimit) return null;

  return (
    <div className="flex-shrink-0 border-t border-slate-200 pt-3 mt-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">
            {totalItems} {t.customer.quantity}
          </p>
          {showPrice && (
            <p className={`text-lg font-bold ${overLimit ? 'text-red-600' : 'text-orange-600'}`}>
              {t.customer.total}: {currSymbol}{totalPrice.toFixed(2)}
            </p>
          )}
        </div>
        {readOnly ? (
          <Button variant="outline" onClick={onSave}>
            {t.common.close}
          </Button>
        ) : (
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={onSave}
          >
            <Check className="h-4 w-4 mr-1" />
            {t.customer.saveSelection}
          </Button>
        )}
      </div>
    </div>
  );
}
