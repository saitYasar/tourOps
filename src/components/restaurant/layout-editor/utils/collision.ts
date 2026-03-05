import { GRID_SNAP, type EditorTable, type EditorRoom } from '../types';

/** Snap a value to the nearest grid point */
export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SNAP) * GRID_SNAP;
}

/**
 * Compute the axis-aligned bounding box of a rectangle rotated around its top-left corner.
 * Returns the min/max offsets from the origin (top-left of the unrotated rect).
 */
export function getRotatedBounds(
  w: number,
  h: number,
  rotation: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  if (rotation === 0) return { minX: 0, maxX: w, minY: 0, maxY: h };

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // 4 corners of the rectangle (origin = top-left)
  const xs = [0, w * cos, w * cos - h * sin, -h * sin];
  const ys = [0, w * sin, w * sin + h * cos, h * cos];

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** AABB overlap check between two rectangles */
export function aabbOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** Clamp table position within room boundaries (5px padding) */
export function clampToRoom(
  tableX: number,
  tableY: number,
  tableW: number,
  tableH: number,
  room: EditorRoom,
): { x: number; y: number } {
  const padding = 5;
  const x = Math.max(room.x + padding, Math.min(tableX, room.x + room.w - tableW - padding));
  const y = Math.max(room.y + padding, Math.min(tableY, room.y + room.h - tableH - padding));
  return { x: snapToGrid(x), y: snapToGrid(y) };
}

/** Clamp object position within room boundaries (no padding — allows edge placement).
 *  When rotation is provided, uses the rotated bounding box for clamping. */
export function clampToRoomEdge(
  objX: number,
  objY: number,
  objW: number,
  objH: number,
  room: EditorRoom,
  rotation: number = 0,
): { x: number; y: number } {
  const bounds = getRotatedBounds(objW, objH, rotation);
  // The group position + bounds.minX/minY must be >= room origin
  // The group position + bounds.maxX/maxY must be <= room origin + room size
  const x = Math.max(room.x - bounds.minX, Math.min(objX, room.x + room.w - bounds.maxX));
  const y = Math.max(room.y - bounds.minY, Math.min(objY, room.y + room.h - bounds.maxY));
  return { x: snapToGrid(x), y: snapToGrid(y) };
}

/** Check if a table overlaps with any other table (excluding self) */
export function hasTableOverlap(
  table: { id: number; x: number; y: number; w: number; h: number },
  tables: EditorTable[],
): EditorTable | null {
  for (const other of tables) {
    if (other.id === table.id) continue;
    if (aabbOverlap(table, other)) {
      return other;
    }
  }
  return null;
}

/** Find the room a position falls within */
export function findRoomAtPosition(x: number, y: number, rooms: EditorRoom[]): EditorRoom | undefined {
  return rooms.find(
    (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
  );
}
