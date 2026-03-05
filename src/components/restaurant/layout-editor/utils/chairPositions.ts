export interface ChairPosition {
  x: number;
  y: number;
  /** Rotation in radians — chair faces toward the table center */
  angle: number;
}

// Chair dimensions (top-down view)
export const CHAIR_W = 10;
export const CHAIR_H = 10;
export const CHAIR_GAP = 3;

/**
 * Cafe-style chair positions: chairs on left and right sides only.
 * Top and bottom edges always empty.
 * Returns positions relative to table center (0,0).
 * Each chair has an angle so the "back" faces away from the table.
 */
export function getChairPositions(
  capacity: number,
  w: number,
  h: number,
  isRound: boolean,
): ChairPosition[] {
  const positions: ChairPosition[] = [];
  const offset = CHAIR_W / 2 + CHAIR_GAP;

  if (isRound) {
    const radius = Math.max(w, h) / 2 + offset;
    for (let i = 0; i < capacity; i++) {
      const a = (i / capacity) * 2 * Math.PI - Math.PI / 2;
      positions.push({
        x: Math.cos(a) * radius,
        y: Math.sin(a) * radius,
        angle: a + Math.PI / 2, // face inward
      });
    }
    return positions.slice(0, capacity);
  }

  // Rectangular: chairs along the longer sides
  const perSide = Math.ceil(capacity / 2);
  const sideA = perSide;
  const sideB = capacity - sideA;

  if (w > h) {
    // Wide table — chairs on top and bottom (along the long edge)
    // Top side — chairs face down (toward table)
    for (let i = 0; i < sideA; i++) {
      const spacing = w / (sideA + 1);
      positions.push({
        x: -w / 2 + spacing * (i + 1),
        y: -h / 2 - offset,
        angle: Math.PI, // face down
      });
    }
    // Bottom side — chairs face up (toward table)
    for (let i = 0; i < sideB; i++) {
      const spacing = w / (sideB + 1);
      positions.push({
        x: -w / 2 + spacing * (i + 1),
        y: h / 2 + offset,
        angle: 0, // face up
      });
    }
  } else {
    // Tall or square table — chairs on left and right
    // Left side — chairs face right (toward table)
    for (let i = 0; i < sideA; i++) {
      const spacing = h / (sideA + 1);
      positions.push({
        x: -w / 2 - offset,
        y: -h / 2 + spacing * (i + 1),
        angle: Math.PI / 2, // face right
      });
    }
    // Right side — chairs face left (toward table)
    for (let i = 0; i < sideB; i++) {
      const spacing = h / (sideB + 1);
      positions.push({
        x: w / 2 + offset,
        y: -h / 2 + spacing * (i + 1),
        angle: -Math.PI / 2, // face left
      });
    }
  }

  return positions;
}
