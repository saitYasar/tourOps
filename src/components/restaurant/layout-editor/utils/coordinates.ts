export interface CoordinateData {
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
}

/**
 * Parse coordinates from API field.
 * Handles all formats the backend may return:
 * - string: "x,y" or "x,y,w,h,r"
 * - object: { x, y } or { x, y, w, h, r }
 * - array:  [x, y]
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseCoordinates(coords: any): CoordinateData {
  if (!coords) return { x: 0, y: 0 };

  // Object with x,y properties
  if (typeof coords === 'object' && !Array.isArray(coords) && coords.x !== undefined) {
    return {
      x: Number(coords.x) || 0,
      y: Number(coords.y) || 0,
      w: coords.w !== undefined ? Number(coords.w) : undefined,
      h: coords.h !== undefined ? Number(coords.h) : undefined,
      r: coords.r !== undefined ? Number(coords.r) : undefined,
    };
  }

  // Array [x, y]
  if (Array.isArray(coords)) {
    return {
      x: Number(coords[0]) || 0,
      y: Number(coords[1]) || 0,
    };
  }

  // String: "x,y" or "x,y,w,h" or "x,y,w,h,r"
  if (typeof coords === 'string') {
    const parts = coords.split(',').map((p: string) => parseFloat(p.trim()));
    if (parts.some(isNaN) || parts.length < 2) return { x: 0, y: 0 };

    const result: CoordinateData = {
      x: parts[0],
      y: parts[1],
    };

    if (parts.length >= 4) {
      result.w = parts[2];
      result.h = parts[3];
      if (parts.length >= 5) {
        result.r = parts[4];
      }
    }

    return result;
  }

  return { x: 0, y: 0 };
}

/**
 * Serialize coordinates for API storage.
 * Backend only accepts "x,y" (max 2 elements).
 */
export function serializeCoordinates(data: CoordinateData): string {
  return `${Math.round(data.x)},${Math.round(data.y)}`;
}
