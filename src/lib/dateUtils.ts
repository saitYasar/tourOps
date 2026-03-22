import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '-';
    // Show time when the value contains a non-midnight time component
    const hasTime = dateString.includes('T') && (date.getHours() !== 0 || date.getMinutes() !== 0);
    return format(date, hasTime ? 'd MMMM yyyy HH:mm' : 'd MMMM yyyy', { locale: tr });
  } catch {
    return '-';
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '-';
    return format(date, 'd MMMM yyyy HH:mm', { locale: tr });
  } catch {
    return '-';
  }
}

export function formatShortDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '-';
    return format(date, 'dd.MM.yyyy', { locale: tr });
  } catch {
    return '-';
  }
}

export function formatShortDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '-';
    return format(date, 'dd.MM.yyyy HH:mm', { locale: tr });
  } catch {
    return '-';
  }
}

export function formatTime(timeString: string | undefined | null): string {
  if (!timeString) return '-';
  return timeString;
}

export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return d >= start && d <= end;
}
