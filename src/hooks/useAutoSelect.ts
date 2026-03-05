import { useEffect, useRef } from 'react';

/**
 * Dropdown'da tek secenek varsa ve henuz bir sey secilmemisse,
 * o secenegi otomatik olarak secer.
 *
 * @param items - Dropdown'daki secenekler
 * @param currentValue - Secili olan deger (bos/null/undefined/0 ise "secilmemis" kabul edilir)
 * @param onSelect - Secim yapildiginda cagrilacak callback
 * @param options.enabled - false ise auto-select devre disi (ornegin dialog kapali iken)
 */
export function useAutoSelect<T>(
  items: T[] | undefined,
  currentValue: string | number | null | undefined,
  onSelect: (item: T) => void,
  options?: { enabled?: boolean }
) {
  const onSelectRef = useRef(onSelect);

  // Ref'i effect icinde guncelle (React Compiler uyumlu)
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;
    if (!items || items.length !== 1) return;
    if (
      currentValue !== '' &&
      currentValue !== null &&
      currentValue !== undefined &&
      currentValue !== 0
    ) return;

    onSelectRef.current(items[0]);
  }, [items, currentValue, enabled]);
}
