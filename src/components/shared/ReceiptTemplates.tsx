'use client';

import React from 'react';
import XLSX from 'xlsx-js-style';
import { formatDate, formatShortDateTime } from '@/lib/dateUtils';
import type { AgencyStopChoicesDto, AgencyStopServiceSummaryDto, ClientResourceChoiceItemDto } from '@/lib/api';
import { getCurrencySymbol } from '@/lib/utils';
import type { useLanguage } from '@/contexts/LanguageContext';

// ============================================
// Types
// ============================================
export type ReceiptTemplate = 'compact' | 'detailed' | 'kitchen';

export interface ReceiptTourInfo {
  tourName?: string;
  agencyName?: string;
  startDate?: string;
  stopStartDate?: string;
  stopEndDate?: string;
}

type T = ReturnType<typeof useLanguage>['t'];

// ============================================
// Constants
// ============================================
export const COMBINATION_COLORS = [
  '#FF6666', '#FFEE44', '#66CC66', '#66AAFF', '#FF9933',
  '#CC66CC', '#33CCCC', '#FF88AA', '#AADD44', '#BB99FF',
  '#FFAAAA', '#DDFF77', '#88CCFF', '#FFBB66', '#DD99DD',
  '#88EEEE', '#FFCCCC', '#EEFF99', '#AADDFF', '#FFD499',
];

// ============================================
// Helpers
// ============================================
export function getResourceLabel(choice: AgencyStopChoicesDto): string {
  if (!choice.resourceChoice) return '';
  if (Array.isArray(choice.resourceChoice)) {
    const seat = choice.resourceChoice.find((item: ClientResourceChoiceItemDto) => item.resourceTypeCode === 'seat');
    if (seat) return seat.resourceName;
    const last = choice.resourceChoice[choice.resourceChoice.length - 1];
    return last?.resourceName || '';
  }
  return choice.resourceChoice.resource?.name || '';
}

/** Extract numeric seat value from resource label for sorting (e.g. "Masa 1-3" → 3, "5" → 5) */
function getSeatSortKey(choice: AgencyStopChoicesDto): number {
  const label = getResourceLabel(choice);
  if (!label) return Number.MAX_SAFE_INTEGER;
  // Try to extract the last number in the label (e.g. "Masa 1-3" → 3, "12" → 12)
  const matches = label.match(/(\d+)/g);
  if (matches && matches.length > 0) {
    return parseInt(matches[matches.length - 1], 10);
  }
  return Number.MAX_SAFE_INTEGER;
}

/** Sort choices by seat number (lowest first) */
function sortChoicesBySeat(choices: AgencyStopChoicesDto[]): AgencyStopChoicesDto[] {
  return [...choices].sort((a, b) => getSeatSortKey(a) - getSeatSortKey(b));
}

/** Extract short table label: "Masa-1" / "masa 1" / "Masa-1" → "1", otherwise return full label */
function getShortTableLabel(choice: AgencyStopChoicesDto): string {
  if (!choice.resourceChoice || !Array.isArray(choice.resourceChoice)) return '';
  const table = choice.resourceChoice.find((item: ClientResourceChoiceItemDto) => item.resourceTypeCode === 'table');
  if (!table) return '';
  const name = table.resourceName || '';
  const match = name.match(/^masa[\s\-_]*(\d+)$/i);
  return match ? match[1] : name;
}

// ============================================
// Compact Receipt (80mm thermal)
// ============================================
export function CompactReceipt({
  tourInfo,
  choices,
  orgName,
  t,
}: {
  tourInfo: ReceiptTourInfo;
  choices: AgencyStopChoicesDto[];
  orgName: string;
  t: T;
}) {
  return (
    <div className="font-mono text-xs" style={{ width: '80mm' }}>
      <div className="text-center border-b border-dashed pb-2 mb-2">
        <p className="font-bold text-sm">{orgName}</p>
        {tourInfo.agencyName && <p className="font-semibold">{tourInfo.agencyName}</p>}
        <p>{tourInfo.tourName}</p>
        <p>{formatShortDateTime(tourInfo.stopStartDate || tourInfo.startDate)} - {formatShortDateTime(tourInfo.stopEndDate)}</p>
        <p className="text-[10px] mt-1">{t.guests.printedAt}: {new Date().toLocaleString()}</p>
      </div>
      {sortChoicesBySeat(choices).map((choice, idx) => {
        const clientName = choice.client
          ? `${choice.client.firstName || ''} ${choice.client.lastName || ''}`.trim()
          : choice.clientName || `#${choice.clientId}`;
        const resourceLabel = choice.resourceChoice
          ? Array.isArray(choice.resourceChoice)
            ? choice.resourceChoice.map((item: ClientResourceChoiceItemDto) => `${item.resourceTypeName}: ${item.resourceName}`).join(' · ')
            : (choice.resourceChoice.resource?.name || '')
          : '';
        return (
          <div key={`${choice.clientId}-${idx}`} className="border-b border-dashed py-1.5">
            <p className="font-bold">{clientName}</p>
            {resourceLabel && <p className="text-[10px]">{resourceLabel}</p>}
            {choice.serviceChoices?.map((sc) => (
              <div key={sc.id} className="flex justify-between">
                <span>{sc.service?.title || `#${sc.serviceId}`}</span>
                {sc.service?.basePrice != null && (
                  <span>{sc.quantity} x {Number(sc.service.basePrice).toFixed(2)} {getCurrencySymbol(sc.service?.currency)}</span>
                )}
              </div>
            ))}
            {choice.serviceChoices?.filter((sc) => sc.note).map((sc) => (
              <p key={`note-${sc.id}`} className="text-[10px] italic">* {sc.note}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Detailed List Receipt (A4 landscape table)
// ============================================
export function DetailedListReceipt({
  tourInfo,
  choices,
  orgName,
  t,
}: {
  tourInfo: ReceiptTourInfo;
  choices: AgencyStopChoicesDto[];
  orgName: string;
  t: T;
}) {
  const sortedChoices = sortChoicesBySeat(choices);

  const categoryOrderMap = new Map<string, number>();
  for (const choice of sortedChoices) {
    for (const sc of choice.serviceChoices || []) {
      const catName = sc.service?.serviceCategoryName || t.guests.uncategorized;
      if (!categoryOrderMap.has(catName)) categoryOrderMap.set(catName, categoryOrderMap.size);
    }
  }
  const categoryNames = Array.from(categoryOrderMap.keys());

  const rows = sortedChoices.map((choice, idx) => {
    const firstName = (choice.client?.firstName || '').toUpperCase();
    const lastName = (choice.client?.lastName || '').toUpperCase();
    const tableLabel = getShortTableLabel(choice);
    const categoryMap = new Map<string, string>();
    const categoryTitles = new Map<string, string[]>();
    const notes: string[] = [];
    for (const sc of choice.serviceChoices || []) {
      const catName = sc.service?.serviceCategoryName || t.guests.uncategorized;
      const title = (sc.service?.title || `#${sc.serviceId}`).toUpperCase();
      const label = sc.quantity > 1 ? `${sc.quantity} ${title}` : title;
      const existing = categoryMap.get(catName);
      categoryMap.set(catName, existing ? `${existing}, ${label}` : label);
      const titles = categoryTitles.get(catName) || [];
      titles.push(title);
      categoryTitles.set(catName, titles);
      if (sc.note) notes.push(`${sc.service?.title || `#${sc.serviceId}`}: ${sc.note}`);
    }
    return { idx: idx + 1, firstName, lastName, tableLabel, categoryMap, categoryTitles, notes };
  });

  const globalFoodColorMap = new Map<string, string>();
  let globalColorIdx = 0;
  for (const choice of sortedChoices) {
    for (const sc of choice.serviceChoices || []) {
      const title = (sc.service?.title || `#${sc.serviceId}`).toUpperCase();
      if (!globalFoodColorMap.has(title)) {
        globalFoodColorMap.set(title, COMBINATION_COLORS[globalColorIdx % COMBINATION_COLORS.length]);
        globalColorIdx++;
      }
    }
  }

  const serviceSeatMap = new Map<string, { seats: string[]; color: string }>();
  for (const choice of sortedChoices) {
    const seatLabel = getResourceLabel(choice);
    for (const sc of choice.serviceChoices || []) {
      const title = (sc.service?.title || `#${sc.serviceId}`).toUpperCase();
      if (!serviceSeatMap.has(title)) {
        serviceSeatMap.set(title, { seats: [], color: globalFoodColorMap.get(title) || '#e2e8f0' });
      }
      const entry = serviceSeatMap.get(title)!;
      const label = seatLabel || `#${choice.clientId}`;
      if (!entry.seats.includes(label)) entry.seats.push(label);
    }
  }

  return (
    <div style={{ fontSize: '0.875rem', maxWidth: '297mm' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontWeight: 'bold', fontSize: '1.25rem', margin: '0 0 4px 0' }}>{orgName}</h2>
        {tourInfo.agencyName && <p style={{ margin: '2px 0', fontWeight: 600 }}>{tourInfo.agencyName}</p>}
        <p style={{ margin: '2px 0' }}>{tourInfo.tourName} — {formatShortDateTime(tourInfo.stopStartDate || tourInfo.startDate)} - {formatShortDateTime(tourInfo.stopEndDate)}</p>
        <p style={{ margin: '2px 0', fontSize: '0.75rem', color: '#64748b' }}>{t.guests.printedAt}: {new Date().toLocaleString()}</p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'center', backgroundColor: '#e2e8f0', minWidth: 36, fontWeight: 'bold' }}>{t.guests.rowNo}</th>
            <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'center', backgroundColor: '#e2e8f0', minWidth: 36, fontWeight: 'bold' }}>{t.guests.tableNo}</th>
            <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'left', backgroundColor: '#e2e8f0', minWidth: 80, fontWeight: 'bold' }}>{t.guests.lastName}</th>
            <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'left', backgroundColor: '#e2e8f0', minWidth: 80, fontWeight: 'bold' }}>{t.guests.firstName}</th>
            {categoryNames.map((cat) => (
              <th key={cat} style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'center', backgroundColor: '#e2e8f0', minWidth: 70, fontWeight: 'bold' }}>
                {cat.toUpperCase()}
              </th>
            ))}
            <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'left', backgroundColor: '#e2e8f0', minWidth: 80, fontWeight: 'bold' }}>{t.guests.note.toUpperCase()}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.idx}>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'center' }}>{row.idx}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'center', fontWeight: 500 }}>{row.tableLabel}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: 600 }}>{row.lastName}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>{row.firstName}</td>
              {categoryNames.map((cat) => {
                const value = row.categoryMap.get(cat) || '';
                const titles = row.categoryTitles.get(cat) || [];
                const uniqueTitles = [...new Set(titles)];
                const colors = uniqueTitles.map((tt) => globalFoodColorMap.get(tt)).filter(Boolean) as string[];
                let bgStyle: React.CSSProperties = {};
                if (colors.length === 1) {
                  bgStyle = { backgroundColor: colors[0] };
                } else if (colors.length >= 2) {
                  const stops = colors.map((c, i) => {
                    const start = (i / colors.length) * 100;
                    const end = ((i + 1) / colors.length) * 100;
                    return `${c} ${start}%, ${c} ${end}%`;
                  }).join(', ');
                  bgStyle = { background: `linear-gradient(to bottom, ${stops})` };
                }
                return (
                  <td key={cat} style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'center', fontWeight: value ? 500 : undefined, ...bgStyle }}>
                    {value}
                  </td>
                );
              })}
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontSize: '0.7rem', fontStyle: 'italic', color: '#64748b' }}>
                {row.notes.join('; ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {serviceSeatMap.size > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          {Array.from(serviceSeatMap.entries()).map(([title, { seats, color }]) => (
            <div
              key={title}
              style={{
                display: 'flex', alignItems: 'baseline', gap: '8px',
                padding: '6px 10px', marginBottom: '4px',
                borderLeft: `4px solid ${color}`, backgroundColor: `${color}22`,
                borderRadius: '0 4px 4px 0', fontSize: '0.8rem',
              }}
            >
              <span style={{ fontWeight: 'bold', minWidth: 'fit-content' }}>{title}</span>
              <span style={{ color: '#64748b' }}>{t.guests.serviceSeats}:</span>
              <span style={{ fontWeight: 500 }}>{seats.join(', ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Kitchen Summary Receipt
// ============================================
export function KitchenSummaryReceipt({
  tourInfo,
  choices,
  orgName,
  t,
}: {
  tourInfo: ReceiptTourInfo;
  choices: AgencyStopChoicesDto[];
  orgName: string;
  t: T;
}) {
  const serviceMap = new Map<string, { name: string; totalQty: number; entries: { seat: string; name: string; qty: number; note?: string }[] }>();
  const serviceOrder: string[] = [];

  for (const choice of choices) {
    const clientName = [choice.client?.firstName, choice.client?.lastName].filter(Boolean).join(' ').toUpperCase();
    const seatLabel = getResourceLabel(choice);
    for (const sc of choice.serviceChoices || []) {
      const title = sc.service?.title || `#${sc.serviceId}`;
      const key = title.toUpperCase();
      if (!serviceMap.has(key)) {
        serviceMap.set(key, { name: key, totalQty: 0, entries: [] });
        serviceOrder.push(key);
      }
      const svc = serviceMap.get(key)!;
      svc.totalQty += sc.quantity;
      svc.entries.push({
        seat: seatLabel,
        name: clientName || `#${choice.clientId}`,
        qty: sc.quantity,
        note: sc.note || undefined,
      });
    }
  }

  return (
    <div className="text-sm" style={{ maxWidth: '210mm' }}>
      <div className="text-center mb-4">
        <h2 className="font-bold text-lg">{orgName}</h2>
        {tourInfo.agencyName && <p className="font-semibold">{tourInfo.agencyName}</p>}
        <p>{tourInfo.tourName} — {formatShortDateTime(tourInfo.stopStartDate || tourInfo.startDate)} - {formatShortDateTime(tourInfo.stopEndDate)}</p>
        <p className="text-xs text-slate-500">{t.guests.printedAt}: {new Date().toLocaleString()}</p>
      </div>
      {!serviceOrder.length ? (
        <p className="text-center text-slate-500 py-8">{t.guests.noChoices}</p>
      ) : (
        <div className="space-y-4">
          {serviceOrder.map((key) => {
            const svc = serviceMap.get(key)!;
            return (
              <div key={key} className="border border-slate-300 rounded">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-300">
                  <span className="font-bold">{svc.name}</span>
                  <span className="font-bold text-lg">{svc.totalQty}</span>
                </div>
                <div className="px-3 py-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b">
                        <th className="text-left py-1 font-medium">{t.guests.tableSeat}</th>
                        <th className="text-left py-1 font-medium">{t.guests.customer}</th>
                        <th className="text-center py-1 font-medium">{t.guests.quantity}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {svc.entries.map((e, i) => (
                        <React.Fragment key={i}>
                          <tr className="border-b border-slate-100 last:border-b-0">
                            <td className="py-1 font-medium text-slate-700">{e.seat || '—'}</td>
                            <td className="py-1 text-slate-600">{e.name}</td>
                            <td className="py-1 text-center text-slate-600">{e.qty}</td>
                          </tr>
                          {e.note && (
                            <tr>
                              <td colSpan={3} className="pb-1 pl-4">
                                <span className="inline-block text-xs italic bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                  {t.guests.note}: {e.note}
                                </span>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// Table-Based Services (grouped by table)
// ============================================

/** Build a table label from resource choices (floor + room + table) */
function getTableLabel(choice: AgencyStopChoicesDto): string {
  if (!choice.resourceChoice || !Array.isArray(choice.resourceChoice)) return '';
  const parts: string[] = [];
  for (const item of choice.resourceChoice as ClientResourceChoiceItemDto[]) {
    if (item.resourceTypeCode === 'floor' || item.resourceTypeCode === 'room' || item.resourceTypeCode === 'table') {
      parts.push(`${item.resourceTypeName}: ${item.resourceName}`);
    }
  }
  return parts.join(' · ');
}

export function ReceiptTableServices({
  choices,
  t,
}: {
  choices: AgencyStopChoicesDto[];
  t: T;
}) {
  // Group services by table label, aggregating quantities
  const tableMap = new Map<string, Map<string, number>>();
  for (const choice of choices) {
    const tableLabel = getTableLabel(choice);
    if (!tableLabel) continue;
    if (!tableMap.has(tableLabel)) tableMap.set(tableLabel, new Map());
    const serviceMap = tableMap.get(tableLabel)!;
    for (const sc of choice.serviceChoices || []) {
      const title = sc.service?.title || `#${sc.serviceId}`;
      serviceMap.set(title, (serviceMap.get(title) || 0) + (sc.quantity || 1));
    }
  }

  if (tableMap.size === 0) return null;

  return (
    <div style={{ marginTop: '1.5rem', borderTop: '2px solid #334155', paddingTop: '1rem' }}>
      <h3 style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.5rem' }}>{t.guests.tableBasedServices}</h3>
      {Array.from(tableMap.entries())
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .map(([tableLabel, serviceMap]) => (
        <div key={tableLabel} style={{ marginBottom: '0.75rem', padding: '8px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>{tableLabel}</p>
          {Array.from(serviceMap.entries()).map(([title, qty]) => (
            <p key={title} style={{ fontSize: '0.8rem', margin: '2px 0', paddingLeft: '8px' }}>
              {title} x{qty}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================
// Service Summary (for print output)
// ============================================
export function ReceiptServiceSummary({
  serviceSummary,
  t,
}: {
  serviceSummary: AgencyStopServiceSummaryDto | null | undefined;
  t: T;
}) {
  if (!serviceSummary?.services?.length) return null;

  const currSymbol = getCurrencySymbol(serviceSummary.currency || serviceSummary.services[0]?.currency);
  const systemCommissionRate = (serviceSummary as Record<string, unknown>).systemCommissionRate;
  const systemCommissionAmount = (serviceSummary as Record<string, unknown>).systemCommissionAmount;

  return (
    <div style={{ marginTop: '1.5rem', borderTop: '2px solid #334155', paddingTop: '1rem' }}>
      <h3 style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.5rem' }}>{t.guests.serviceSummary}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'left', backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>{t.guests.service}</th>
            <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'center', backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>{t.guests.quantity}</th>
            <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'right', backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>{t.tours.unitPrice}</th>
            <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'right', backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>{t.tours.totalPrice}</th>
          </tr>
        </thead>
        <tbody>
          {serviceSummary.services.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>{item.serviceName || item.service?.title || ''}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'center' }}>{item.totalQuantity}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right' }}>{Number(item.unitPrice).toFixed(2)} {currSymbol}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', fontWeight: 500 }}>{Number(item.totalPrice).toFixed(2)} {currSymbol}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #333' }}>
            <td colSpan={3} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{t.tours.grandTotal}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '1rem' }}>{Number(serviceSummary.grandTotal).toFixed(2)} {currSymbol}</td>
          </tr>
          {serviceSummary.commissionRate != null && serviceSummary.commissionAmount != null && (
            <tr>
              <td colSpan={3} style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500, color: '#ea580c' }}>
                {t.tours.agencyCommission} %{serviceSummary.commissionRate}
              </td>
              <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: '#ea580c' }}>{Number(serviceSummary.commissionAmount).toFixed(2)} {currSymbol}</td>
            </tr>
          )}
          {systemCommissionRate != null && systemCommissionAmount != null && (
            <tr>
              <td colSpan={3} style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500, color: '#7c3aed' }}>
                {t.tours.systemCommission} %{String(systemCommissionRate)}
              </td>
              <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: '#7c3aed' }}>{Number(systemCommissionAmount as number).toFixed(2)} {currSymbol}</td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}

// ============================================
// Print Handler
// ============================================
export function handleReceiptPrint(printRef: React.RefObject<HTMLDivElement | null>, receiptTemplate: ReceiptTemplate) {
  if (!printRef.current) return;
  const content = printRef.current.innerHTML;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const isDetailed = receiptTemplate === 'detailed';
  const isKitchen = receiptTemplate === 'kitchen';

  const baseStyles = `
    body { margin: 0; padding: 16px; font-family: ${isDetailed || isKitchen ? 'Arial, Helvetica, sans-serif' : 'monospace'}; }
    .border-b { border-bottom: 1px solid #ccc; }
    .border-b-2 { border-bottom: 2px solid #333; }
    .border-dashed { border-bottom-style: dashed; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .font-medium { font-weight: 500; }
    .italic { font-style: italic; }
    .text-lg { font-size: 1.125rem; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mt-1 { margin-top: 0.25rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .pb-2 { padding-bottom: 0.5rem; }
    .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
    .w-full { width: 100%; }
    .text-slate-400 { color: #94a3b8; }
    .text-slate-500 { color: #64748b; }
    .text-slate-600 { color: #475569; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .inline-block { display: inline-block; }
    .bg-yellow-100 { background-color: #fef9c3; }
    .text-yellow-800 { color: #854d0e; }
    .rounded { border-radius: 0.25rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
    .pb-1 { padding-bottom: 0.25rem; }
    .pl-4 { padding-left: 1rem; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .items-center { align-items: center; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  `;

  const detailedStyles = `@page { size: landscape; margin: 10mm; } table { border-collapse: collapse; width: 100%; } th, td { padding: 4px 8px; } th { background-color: #f1f5f9; font-weight: bold; } tr:nth-child(even) { background-color: #fafafa; }`;
  const compactStyles = `table { border-collapse: collapse; width: 100%; } th, td { padding: 4px 8px; text-align: left; }`;
  const kitchenStyles = `@page { margin: 10mm; } .border { border: 1px solid #cbd5e1; } .rounded { border-radius: 0.25rem; } .bg-slate-100 { background-color: #f1f5f9; } .border-slate-300 { border-color: #cbd5e1; }`;

  const templateStyles = isDetailed ? detailedStyles : isKitchen ? kitchenStyles : compactStyles;

  printWindow.document.write(`<html><head><title>Receipt</title><style>${baseStyles}${templateStyles}</style></head><body>${content}</body></html>`);
  printWindow.document.close();
  printWindow.print();
}

// ============================================
// Excel Export
// ============================================
export function exportReceiptExcel(
  tourInfo: ReceiptTourInfo,
  choices: AgencyStopChoicesDto[],
  serviceSummary: AgencyStopServiceSummaryDto | null,
  orgName: string,
  t: T,
) {
  if (!choices.length) return;
  const sortedChoices = sortChoicesBySeat(choices);
  const tourName = tourInfo.tourName || '';
  const tourDate = `${formatShortDateTime(tourInfo.stopStartDate || tourInfo.startDate)} - ${formatShortDateTime(tourInfo.stopEndDate)}`;
  const wb = XLSX.utils.book_new();

  const toArgb = (hex: string) => hex.replace('#', '');

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '334155' } },
    alignment: { horizontal: 'center' as const },
    border: {
      top: { style: 'thin' as const, color: { rgb: '999999' } },
      bottom: { style: 'thin' as const, color: { rgb: '999999' } },
      left: { style: 'thin' as const, color: { rgb: '999999' } },
      right: { style: 'thin' as const, color: { rgb: '999999' } },
    },
  };

  const cellBorder = {
    top: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
    bottom: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
    left: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
    right: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
  };

  // Global food color map
  const globalFoodColorMap = new Map<string, string>();
  let colorIdx = 0;
  for (const choice of sortedChoices) {
    for (const sc of choice.serviceChoices || []) {
      const title = (sc.service?.title || `#${sc.serviceId}`).toUpperCase();
      if (!globalFoodColorMap.has(title)) {
        globalFoodColorMap.set(title, COMBINATION_COLORS[colorIdx % COMBINATION_COLORS.length]);
        colorIdx++;
      }
    }
  }

  // --- Sheet 1: Detaylı Liste ---
  const categoryOrderMap = new Map<string, number>();
  for (const choice of sortedChoices) {
    for (const sc of choice.serviceChoices || []) {
      const catName = sc.service?.serviceCategoryName || t.guests.uncategorized;
      if (!categoryOrderMap.has(catName)) categoryOrderMap.set(catName, categoryOrderMap.size);
    }
  }
  const categoryNames = Array.from(categoryOrderMap.keys());
  const detailHeaders = [t.guests.rowNo, t.guests.tableNo, t.guests.lastName, t.guests.firstName, ...categoryNames, t.guests.note];

  type CellInfo = { v: string | number; colors?: string[] };
  const detailData: CellInfo[][] = [];
  sortedChoices.forEach((choice, idx) => {
    const row: CellInfo[] = [
      { v: idx + 1 },
      { v: getShortTableLabel(choice) },
      { v: (choice.client?.lastName || '').toUpperCase() },
      { v: (choice.client?.firstName || '').toUpperCase() },
    ];
    const notes: string[] = [];
    const catValues = new Map<string, { label: string; titles: string[] }>();
    for (const sc of choice.serviceChoices || []) {
      const catName = sc.service?.serviceCategoryName || t.guests.uncategorized;
      const title = (sc.service?.title || `#${sc.serviceId}`).toUpperCase();
      const label = sc.quantity > 1 ? `${sc.quantity} ${title}` : title;
      if (!catValues.has(catName)) catValues.set(catName, { label: '', titles: [] });
      const cv = catValues.get(catName)!;
      cv.label = cv.label ? `${cv.label}, ${label}` : label;
      cv.titles.push(title);
      if (sc.note) notes.push(`${sc.service?.title || `#${sc.serviceId}`}: ${sc.note}`);
    }
    for (const cat of categoryNames) {
      const cv = catValues.get(cat);
      if (cv && cv.titles.length > 0) {
        const uniqueTitles = [...new Set(cv.titles)];
        const colors = uniqueTitles.map((tt) => globalFoodColorMap.get(tt)).filter(Boolean) as string[];
        row.push({ v: cv.label, colors });
      } else {
        row.push({ v: '' });
      }
    }
    row.push({ v: notes.join('; ') });
    detailData.push(row);
  });

  const ws1 = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailData.map((r) => r.map((c) => c.v))]);
  for (let c = 0; c < detailHeaders.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws1[addr]) ws1[addr].s = headerStyle;
  }
  for (let r = 0; r < detailData.length; r++) {
    for (let c = 0; c < detailData[r].length; c++) {
      const addr = XLSX.utils.encode_cell({ r: r + 1, c });
      if (!ws1[addr]) continue;
      const cellColors = detailData[r][c].colors;
      const bgColor = cellColors && cellColors.length === 1 ? cellColors[0] : undefined;
      ws1[addr].s = {
        border: cellBorder,
        alignment: c <= 1 ? { horizontal: 'center' as const } : undefined,
        font: { bold: c === 2 },
        ...(bgColor ? { fill: { fgColor: { rgb: toArgb(bgColor) } } } : {}),
      };
    }
  }
  ws1['!cols'] = detailHeaders.map((_, i) => ({ wch: i === 0 ? 6 : i === 1 ? 8 : i === detailHeaders.length - 1 ? 30 : 18 }));
  XLSX.utils.book_append_sheet(wb, ws1, t.guests.detailedList);

  // --- Sheet 2: Mutfak Özeti ---
  const kitchenHeaders = [t.guests.service, t.guests.tableSeat, t.guests.customer, t.guests.quantity, t.guests.note];
  const kitchenAoa: (string | number)[][] = [kitchenHeaders];
  const kitchenRowStyles: { isHeader: boolean; color?: string }[] = [];

  const svcMap = new Map<string, { totalQty: number; color: string; entries: { seat: string; name: string; qty: number; note?: string }[] }>();
  const svcOrder: string[] = [];
  for (const choice of sortedChoices) {
    const clientName = [choice.client?.firstName, choice.client?.lastName].filter(Boolean).join(' ').toUpperCase();
    const seatLabel = getResourceLabel(choice);
    for (const sc of choice.serviceChoices || []) {
      const title = (sc.service?.title || `#${sc.serviceId}`).toUpperCase();
      if (!svcMap.has(title)) {
        svcMap.set(title, { totalQty: 0, color: globalFoodColorMap.get(title) || 'E2E8F0', entries: [] });
        svcOrder.push(title);
      }
      const svc = svcMap.get(title)!;
      svc.totalQty += sc.quantity;
      svc.entries.push({ seat: seatLabel, name: clientName || `#${choice.clientId}`, qty: sc.quantity, note: sc.note || undefined });
    }
  }
  for (const title of svcOrder) {
    const svc = svcMap.get(title)!;
    kitchenAoa.push([title, '', '', svc.totalQty, '']);
    kitchenRowStyles.push({ isHeader: true, color: svc.color });
    for (const e of svc.entries) {
      kitchenAoa.push(['', e.seat || '—', e.name, e.qty, e.note || '']);
      kitchenRowStyles.push({ isHeader: false });
    }
  }

  const ws2 = XLSX.utils.aoa_to_sheet(kitchenAoa);
  for (let c = 0; c < kitchenHeaders.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws2[addr]) ws2[addr].s = headerStyle;
  }
  for (let r = 0; r < kitchenRowStyles.length; r++) {
    const info = kitchenRowStyles[r];
    for (let c = 0; c < kitchenHeaders.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: r + 1, c });
      if (!ws2[addr]) ws2[addr] = { t: 's', v: '' };
      if (info.isHeader) {
        ws2[addr].s = {
          font: { bold: true, sz: 11 },
          fill: { fgColor: { rgb: toArgb(info.color || '#E2E8F0') } },
          border: cellBorder,
        };
      } else {
        ws2[addr].s = {
          border: cellBorder,
          alignment: c === 3 ? { horizontal: 'center' as const } : undefined,
          font: c === 4 ? { italic: true, color: { rgb: '92400E' } } : undefined,
          ...(c === 4 && ws2[addr].v ? { fill: { fgColor: { rgb: 'FEF9C3' } } } : {}),
        };
      }
    }
  }
  ws2['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 8 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws2, t.guests.kitchenSummary);

  // --- Sheet 3: Hizmet Özeti ---
  if (serviceSummary?.services?.length) {
    const summaryHeaders = [t.guests.service, t.guests.quantity, t.tours.unitPrice, t.tours.totalPrice];
    const summaryAoa: (string | number)[][] = [summaryHeaders];
    for (const item of serviceSummary.services) {
      summaryAoa.push([item.serviceName || item.service?.title || '', item.totalQuantity, Number(item.unitPrice), Number(item.totalPrice)]);
    }
    summaryAoa.push([t.tours.grandTotal, '', '', Number(serviceSummary.grandTotal)]);

    // Commission rows
    if (serviceSummary.commissionRate != null && serviceSummary.commissionAmount != null) {
      summaryAoa.push([`${t.tours.agencyCommission} %${serviceSummary.commissionRate}`, '', '', Number(serviceSummary.commissionAmount)]);
    }
    const sysRate = (serviceSummary as Record<string, unknown>).systemCommissionRate;
    const sysAmount = (serviceSummary as Record<string, unknown>).systemCommissionAmount;
    if (sysRate != null && sysAmount != null) {
      summaryAoa.push([`${t.tours.systemCommission} %${sysRate}`, '', '', Number(sysAmount as number)]);
    }

    const ws3 = XLSX.utils.aoa_to_sheet(summaryAoa);
    for (let c = 0; c < summaryHeaders.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (ws3[addr]) ws3[addr].s = headerStyle;
    }
    // Grand total row index (services count + 1 header)
    const grandTotalRowIdx = serviceSummary.services.length + 1;
    for (let c = 0; c < summaryHeaders.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: grandTotalRowIdx, c });
      if (!ws3[addr]) ws3[addr] = { t: 's', v: '' };
      ws3[addr].s = {
        font: { bold: true, sz: 12 },
        border: { top: { style: 'medium' as const, color: { rgb: '333333' } }, bottom: { style: 'medium' as const, color: { rgb: '333333' } } },
      };
    }
    // Agency commission row style
    if (serviceSummary.commissionRate != null && serviceSummary.commissionAmount != null) {
      const acRowIdx = grandTotalRowIdx + 1;
      for (let c = 0; c < summaryHeaders.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: acRowIdx, c });
        if (!ws3[addr]) ws3[addr] = { t: 's', v: '' };
        ws3[addr].s = {
          font: { bold: true, color: { rgb: 'EA580C' } },
          alignment: c === 3 ? { horizontal: 'right' as const } : undefined,
          border: cellBorder,
        };
      }
    }
    // System commission row style
    if (sysRate != null && sysAmount != null) {
      const scRowIdx = grandTotalRowIdx + (serviceSummary.commissionRate != null ? 2 : 1);
      for (let c = 0; c < summaryHeaders.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: scRowIdx, c });
        if (!ws3[addr]) ws3[addr] = { t: 's', v: '' };
        ws3[addr].s = {
          font: { bold: true, color: { rgb: '7C3AED' } },
          alignment: c === 3 ? { horizontal: 'right' as const } : undefined,
          border: cellBorder,
        };
      }
    }
    for (let r = 1; r < grandTotalRowIdx; r++) {
      for (let c = 0; c < summaryHeaders.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws3[addr]) ws3[addr].s = { border: cellBorder, alignment: c >= 2 ? { horizontal: 'right' as const } : undefined };
      }
    }
    ws3['!cols'] = [{ wch: 25 }, { wch: 8 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws3, t.guests.serviceSummary);
  }

  const fileName = `${orgName} - ${tourName} - ${tourDate}.xlsx`.replace(/[/\\?%*:|"<>]/g, '-');
  XLSX.writeFile(wb, fileName);
}
