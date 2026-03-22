export interface TableDefault {
  w: number;
  h: number;
  isRound: boolean;
}

// Cafe tarzı masalar: 4 kişilik yatay dikdörtgen (2 sol, 2 sağ)
export const TABLE_DEFAULTS: Record<number, TableDefault> = {
  2: { w: 50, h: 50, isRound: true },
  4: { w: 80, h: 50, isRound: false },
  6: { w: 100, h: 55, isRound: false },
  8: { w: 130, h: 60, isRound: false },
};

export function getTableDefault(capacity: number): TableDefault {
  if (TABLE_DEFAULTS[capacity]) return TABLE_DEFAULTS[capacity];
  if (capacity > 8) {
    const perSide = Math.ceil(capacity / 2);
    return { w: Math.min(200, 80 + perSide * 12), h: Math.min(120, 40 + perSide * 10), isRound: false };
  }
  return TABLE_DEFAULTS[4];
}
