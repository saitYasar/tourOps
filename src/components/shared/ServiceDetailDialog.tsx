'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/utils';
import type { ClientStopMenuServiceDto } from '@/lib/api';

interface ServiceDetailDialogProps {
  service: ClientStopMenuServiceDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showPrice?: boolean;
  t: {
    menu?: {
      basePrice?: string;
      perPerson?: string;
      perHour?: string;
      perDay?: string;
      serviceContentsDescription?: string;
      itemDetails?: string;
    };
    [key: string]: unknown;
  };
}

export function ServiceDetailDialog({ service, open, onOpenChange, showPrice = true, t }: ServiceDetailDialogProps) {
  const [imageExpanded, setImageExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Reset image state when closing
  useEffect(() => {
    if (!open) setImageExpanded(false);
  }, [open]);

  // ESC key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (imageExpanded) {
        setImageExpanded(false);
      } else {
        onOpenChange(false);
      }
    }
  }, [imageExpanded, onOpenChange]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [open, handleKeyDown]);

  if (!mounted || !open || !service) return null;

  const priceLabel = (type: string) => {
    if (type === 'fixed') return '';
    if (type === 'per_person') return `/ ${t.menu?.perPerson ?? 'kişi'}`;
    if (type === 'per_hour') return `/ ${t.menu?.perHour ?? 'saat'}`;
    if (type === 'per_day') return `/ ${t.menu?.perDay ?? 'gün'}`;
    return '';
  };

  return createPortal(
    <>
      {/* Detail overlay */}
      {!imageExpanded && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
          style={{ pointerEvents: 'auto' }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange(false)} />

          {/* Content card */}
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 text-white" />
            </button>

            {/* Image */}
            {service.imageUrl ? (
              <button
                type="button"
                className="w-full aspect-[16/10] relative overflow-hidden cursor-zoom-in group rounded-t-2xl"
                onClick={() => setImageExpanded(true)}
              >
                <img
                  src={service.imageUrl}
                  alt={service.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-4 w-4 text-white" />
                </div>
              </button>
            ) : (
              <div className="w-full aspect-[16/10] bg-stone-100 flex items-center justify-center rounded-t-2xl">
                <ImageIcon className="h-16 w-16 text-stone-300" />
              </div>
            )}

            {/* Content */}
            <div className="px-5 pb-5 pt-4 space-y-3">
              {/* Title + Price */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-stone-900">{service.title}</h3>
                  {service.subTitle && (
                    <p className="text-sm text-stone-500 mt-0.5">{service.subTitle}</p>
                  )}
                </div>
                {showPrice && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-emerald-700">
                      {Number(service.basePrice).toFixed(2)} {getCurrencySymbol(service.currency)}
                    </p>
                    {service.priceType !== 'fixed' && (
                      <p className="text-xs text-stone-400">{priceLabel(service.priceType)}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              {service.description && (
                <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{service.description}</p>
              )}

              {/* Contents Description */}
              {service.contentsDescription && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 mb-1">
                    {t.menu?.serviceContentsDescription ?? 'İçindekiler & Hizmet Açıklaması'}
                  </p>
                  <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                    {service.contentsDescription}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Overlay */}
      {imageExpanded && service.imageUrl && (
        <div
          className="fixed inset-0 z-[2100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          style={{ pointerEvents: 'auto' }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setImageExpanded(false); }}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); setImageExpanded(false); }}
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <img
            src={service.imageUrl}
            alt={service.title}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>,
    document.body,
  );
}
