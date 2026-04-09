'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Editable numeric spinner used for hour / minute fields.
 * Keeps a local draft while focused so the user can freely type.
 */
function NumericSpinner({
  value,
  maxValue,
  onCommit,
  onAdjust,
}: {
  value: number;
  maxValue: number;
  onCommit: (n: number) => void;
  onAdjust: (delta: number) => void;
}) {
  const formatted = String(value).padStart(2, '0');
  const [draft, setDraft] = React.useState(formatted);
  const [editing, setEditing] = React.useState(false);

  // Sync draft when value changes externally (arrows, parent)
  React.useEffect(() => {
    if (!editing) setDraft(String(value).padStart(2, '0'));
  }, [value, editing]);

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        tabIndex={-1}
        onClick={() => onAdjust(1)}
        className="flex items-center justify-center h-6 w-10 rounded-t-md border border-b-0 border-input bg-muted/50 hover:bg-accent active:bg-accent/70 transition-colors"
      >
        <ChevronUp className="size-4" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={editing ? draft : formatted}
        onFocus={(e) => {
          setEditing(true);
          setDraft(formatted);
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
          setDraft(raw);
        }}
        onBlur={() => {
          setEditing(false);
          const n = draft === '' ? 0 : Math.min(parseInt(draft, 10), maxValue);
          setDraft(String(n).padStart(2, '0'));
          onCommit(n);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="flex items-center justify-center h-9 w-10 border border-input bg-transparent text-center font-mono text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => onAdjust(-1)}
        className="flex items-center justify-center h-6 w-10 rounded-b-md border border-t-0 border-input bg-muted/50 hover:bg-accent active:bg-accent/70 transition-colors"
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  );
}

/**
 * DateTimeInput — replaces native datetime-local with a date input + button-based time picker.
 * Value format: "YYYY-MM-DDTHH:MM" (same as datetime-local).
 */
export function DateTimeInput({
  value,
  onChange,
  min,
  max,
  className,
  id,
}: {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  min?: string;
  max?: string;
  className?: string;
  id?: string;
}) {
  const datePart = value ? value.split('T')[0] : '';
  const timePart = value ? value.split('T')[1] || '' : '';
  const hour = timePart ? parseInt(timePart.split(':')[0], 10) : 0;
  const minute = timePart ? parseInt(timePart.split(':')[1], 10) : 0;

  const emit = (d: string, h: number, m: number) => {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    onChange({ target: { value: d ? `${d}T${hh}:${mm}` : '' } });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    emit(e.target.value, hour, minute);
  };

  const adjustHour = (delta: number) => {
    if (!datePart) return;
    const newH = (hour + delta + 24) % 24;
    emit(datePart, newH, minute);
  };

  const adjustMinute = (delta: number) => {
    if (!datePart) return;
    let newM = minute + delta;
    let newH = hour;
    if (newM >= 60) { newM = 0; newH = (newH + 1) % 24; }
    if (newM < 0) { newM = 59; newH = (newH - 1 + 24) % 24; }
    emit(datePart, newH, newM);
  };

  const inputBaseClass =
    'border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

  return (
    <div className={cn('flex flex-col gap-2', className)} id={id}>
      {/* Date part — native date picker, force 4-digit year display */}
      <input
        type="date"
        value={datePart}
        onChange={handleDateChange}
        min={min ? min.split('T')[0] : '2000-01-01'}
        max={max ? max.split('T')[0] : '2099-12-31'}
        className={cn(inputBaseClass)}
      />

      {/* Time part */}
      <div className="flex items-center gap-2">
        {/* Hour spinner */}
        <NumericSpinner
          value={hour}
          maxValue={23}
          onCommit={(h) => emit(datePart, h, minute)}
          onAdjust={adjustHour}
        />

        <span className="text-lg font-bold select-none">:</span>

        {/* Minute spinner */}
        <NumericSpinner
          value={minute}
          maxValue={59}
          onCommit={(m) => emit(datePart, hour, m)}
          onAdjust={adjustMinute}
        />
      </div>
    </div>
  );
}
