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
  return TABLE_DEFAULTS[capacity] || TABLE_DEFAULTS[4];
}
