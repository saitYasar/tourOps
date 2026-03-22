export interface TableDefault {
  w: number;
  h: number;
  isRound: boolean;
}

// Cafe tarzı masalar: kapasite arttıkça genişlik artar, yükseklik sabit kalır
export const TABLE_DEFAULTS: Record<number, TableDefault> = {
  2: { w: 50, h: 50, isRound: true },
  4: { w: 90, h: 35, isRound: false },
  6: { w: 120, h: 38, isRound: false },
  8: { w: 160, h: 40, isRound: false },
};

export function getTableDefault(capacity: number): TableDefault {
  if (TABLE_DEFAULTS[capacity]) return TABLE_DEFAULTS[capacity];
  if (capacity > 8) {
    const perSide = Math.ceil(capacity / 2);
    return { w: Math.min(300, perSide * 22 + 40), h: 40, isRound: false };
  }
  return TABLE_DEFAULTS[4];
}
