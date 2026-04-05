'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

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

  const adjust = (field: 'hour' | 'minute', delta: number) => {
    if (!datePart) return;
    if (field === 'hour') {
      const newH = (hour + delta + 24) % 24;
      emit(datePart, newH, minute);
    } else {
      let newM = minute + delta;
      let newH = hour;
      if (newM >= 60) { newM = 0; newH = (newH + 1) % 24; }
      if (newM < 0) { newM = 59; newH = (newH - 1 + 24) % 24; }
      emit(datePart, newH, newM);
    }
  };

  const inputBaseClass =
    'border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

  return (
    <div className={cn('flex items-center gap-2', className)} id={id}>
      {/* Date part — native date picker */}
      <input
        type="date"
        value={datePart}
        onChange={handleDateChange}
        min={min ? min.split('T')[0] : undefined}
        max={max ? max.split('T')[0] : undefined}
        className={cn(inputBaseClass, 'flex-1 min-w-0')}
      />

      {/* Hour spinner */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjust('hour', 1)}
          className="flex items-center justify-center h-6 w-10 rounded-t-md border border-b-0 border-input bg-muted/50 hover:bg-accent active:bg-accent/70 transition-colors"
        >
          <ChevronUp className="size-4" />
        </button>
        <div className="flex items-center justify-center h-9 w-10 border border-input bg-transparent text-center font-mono text-sm font-medium">
          {String(hour).padStart(2, '0')}
        </div>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjust('hour', -1)}
          className="flex items-center justify-center h-6 w-10 rounded-b-md border border-t-0 border-input bg-muted/50 hover:bg-accent active:bg-accent/70 transition-colors"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      <span className="text-lg font-bold select-none">:</span>

      {/* Minute spinner */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjust('minute', 1)}
          className="flex items-center justify-center h-6 w-10 rounded-t-md border border-b-0 border-input bg-muted/50 hover:bg-accent active:bg-accent/70 transition-colors"
        >
          <ChevronUp className="size-4" />
        </button>
        <div className="flex items-center justify-center h-9 w-10 border border-input bg-transparent text-center font-mono text-sm font-medium">
          {String(minute).padStart(2, '0')}
        </div>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjust('minute', -1)}
          className="flex items-center justify-center h-6 w-10 rounded-b-md border border-t-0 border-input bg-muted/50 hover:bg-accent active:bg-accent/70 transition-colors"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>
    </div>
  );
}
