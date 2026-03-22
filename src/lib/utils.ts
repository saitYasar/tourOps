import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// Phone Number Formatting
// Format: 5XX XXX XX XX (Turkish mobile)
// ============================================

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
}

export function cleanPhoneNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

// ============================================
// Currency
// ============================================

const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return '₺';
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
}
