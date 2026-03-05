'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled = false,
}: SliderProps) {
  const percentage = ((value[0] - min) / (max - min)) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseFloat(e.target.value)]);
  };

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative h-2 w-full rounded-full bg-slate-200">
        <div
          className="absolute h-full rounded-full bg-blue-600"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'absolute inset-0 w-full h-2 opacity-0 cursor-pointer',
          disabled && 'cursor-not-allowed'
        )}
      />
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-600 shadow-sm pointer-events-none',
          disabled && 'border-slate-300'
        )}
        style={{ left: `calc(${percentage}% - 8px)` }}
      />
    </div>
  );
}
