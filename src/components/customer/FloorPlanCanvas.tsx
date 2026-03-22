'use client';

import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Group, Text, Circle, Line } from 'react-konva';
import type Konva from 'konva';
import type { ResourceDto } from '@/lib/api';

import { getTableDefault } from '@/components/restaurant/layout-editor/utils/tableDefaults';

// ── Constants (matching LayoutEditor) ──────────────────────────
const ROOM_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const CHAIR_W = 10;
const CHAIR_H = 10;
const CHAIR_GAP = 6;

// ── Coordinate parsing (handles string, object, array) ─────────
interface CoordinateData {
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCoordinates(coords: any): CoordinateData {
  if (!coords) return { x: 0, y: 0 };
  if (typeof coords === 'object' && !Array.isArray(coords) && coords.x !== undefined) {
    return {
      x: Number(coords.x) || 0,
      y: Number(coords.y) || 0,
      w: coords.w !== undefined ? Number(coords.w) : undefined,
      h: coords.h !== undefined ? Number(coords.h) : undefined,
      r: coords.r !== undefined ? Number(coords.r) : undefined,
    };
  }
  if (Array.isArray(coords)) {
    return { x: Number(coords[0]) || 0, y: Number(coords[1]) || 0 };
  }
  if (typeof coords === 'string') {
    const parts = coords.split(',').map((p: string) => parseFloat(p.trim()));
    if (parts.some(isNaN) || parts.length < 2) return { x: 0, y: 0 };
    const result: CoordinateData = { x: parts[0], y: parts[1] };
    if (parts.length >= 4) {
      result.w = parts[2];
      result.h = parts[3];
      if (parts.length >= 5) result.r = parts[4];
    }
    return result;
  }
  return { x: 0, y: 0 };
}

// ── Room conversion (matching useLayoutSync resourceToRoom) ────
interface EditorRoom {
  id: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

function resourceToRoom(room: ResourceDto, index: number): EditorRoom {
  const hasCoords = !!room.coordinates;
  const coords = parseCoordinates(room.coordinates);
  return {
    id: room.id,
    name: room.name,
    x: hasCoords ? coords.x : 40 + index * 260,
    y: hasCoords ? coords.y : 40,
    w: room.width ?? coords.w ?? 240,
    h: room.height ?? coords.h ?? 300,
    color: ROOM_COLORS[index % ROOM_COLORS.length],
  };
}

// ── Table conversion (matching useLayoutSync resourceToTable) ──
interface EditorChair {
  id: number;
  occupied: boolean;
}

interface EditorTable {
  id: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  capacity: number;
  isRound: boolean;
  chairCount: number;
  chairs: EditorChair[];
}

function resourceToTable(
  table: ResourceDto,
  roomId: number,
  room: EditorRoom,
  tableIndex: number,
): EditorTable {
  const coords = parseCoordinates(table.coordinates);
  const capacity = table.capacity || 4;
  const defaults = getTableDefault(capacity);

  let x: number;
  let y: number;

  if (!table.coordinates) {
    // No coordinates → auto-place in grid inside room
    const cols = Math.max(1, Math.floor((room.w - 20) / (defaults.w + 20)));
    const col = tableIndex % cols;
    const row = Math.floor(tableIndex / cols);
    x = room.x + 20 + col * (defaults.w + 20);
    y = room.y + 40 + row * (defaults.h + 30);
  } else {
    // Check if coords are inside room bounds (absolute pixel) or legacy (0-100%)
    const insideRoom =
      coords.x >= room.x &&
      coords.x <= room.x + room.w &&
      coords.y >= room.y &&
      coords.y <= room.y + room.h;

    if (insideRoom) {
      x = coords.x;
      y = coords.y;
    } else if (coords.x <= 100 && coords.y <= 100) {
      // Legacy percent format
      const px = Math.max(5, Math.min(95, coords.x)) / 100;
      const py = Math.max(5, Math.min(95, coords.y)) / 100;
      x = room.x + px * (room.w - defaults.w);
      y = room.y + 24 + py * (room.h - defaults.h - 24);
    } else {
      x = room.x + 20;
      y = room.y + 40;
    }
  }

  // Get number of chairs from children
  const chairCount = table.children?.length ?? capacity;

  // Use stored dimensions from DB if available, otherwise fall back to defaults
  const w = (table.width && table.width > 0) ? table.width : (coords.w && coords.w > 0) ? coords.w : defaults.w;
  const h = (table.height && table.height > 0) ? table.height : (coords.h && coords.h > 0) ? coords.h : defaults.h;

  const chairs: EditorChair[] = (table.children ?? []).map(child => ({
    id: child.id,
    occupied: !!child.client,
  }));

  return {
    id: table.id,
    name: table.name,
    x,
    y,
    w,
    h,
    r: table.rotation ?? coords.r ?? 0,
    capacity,
    isRound: defaults.isRound,
    chairCount,
    chairs,
  };
}

// ── Chair positions (matching chairPositions.ts) ───────────────
interface ChairPosition {
  x: number;
  y: number;
  angle: number;
}

function getChairPositions(count: number, w: number, h: number, isRound: boolean): ChairPosition[] {
  const positions: ChairPosition[] = [];
  const offset = CHAIR_W / 2 + CHAIR_GAP;

  if (isRound) {
    const radius = Math.max(w, h) / 2 + offset;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 2 * Math.PI - Math.PI / 2;
      positions.push({
        x: Math.cos(a) * radius,
        y: Math.sin(a) * radius,
        angle: a + Math.PI / 2,
      });
    }
    return positions;
  }

  const perSide = Math.ceil(count / 2);
  const sideA = perSide;
  const sideB = count - sideA;

  if (w > h) {
    for (let i = 0; i < sideA; i++) {
      const spacing = w / (sideA + 1);
      positions.push({ x: -w / 2 + spacing * (i + 1), y: -h / 2 - offset, angle: Math.PI });
    }
    for (let i = 0; i < sideB; i++) {
      const spacing = w / (sideB + 1);
      positions.push({ x: -w / 2 + spacing * (i + 1), y: h / 2 + offset, angle: 0 });
    }
  } else {
    for (let i = 0; i < sideA; i++) {
      const spacing = h / (sideA + 1);
      positions.push({ x: -w / 2 - offset, y: -h / 2 + spacing * (i + 1), angle: Math.PI / 2 });
    }
    for (let i = 0; i < sideB; i++) {
      const spacing = h / (sideB + 1);
      positions.push({ x: w / 2 + offset, y: -h / 2 + spacing * (i + 1), angle: -Math.PI / 2 });
    }
  }

  return positions;
}

// Reorder so opposite chairs are sequential pairs: [A0, B0, A1, B1, ...]
function reorderChairPositions(positions: ChairPosition[], capacity: number): ChairPosition[] {
  const perSide = Math.ceil(capacity / 2);
  const reordered: ChairPosition[] = [];
  for (let i = 0; i < perSide; i++) {
    reordered.push(positions[i]);
    if (perSide + i < positions.length) {
      reordered.push(positions[perSide + i]);
    }
  }
  return reordered;
}

// ── Object types (matching layout editor) ───────────────────────
type ObjectKind = 'window' | 'wall' | 'column' | 'free';

interface EditorObject {
  id: number;
  name: string;
  kind: ObjectKind;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  color?: string;
}

const OBJECT_DEFAULTS: Record<ObjectKind, { w: number; h: number }> = {
  window: { w: 120, h: 12 },
  wall: { w: 120, h: 14 },
  column: { w: 24, h: 24 },
  free: { w: 60, h: 60 },
};

const OBJECT_COLORS: Record<ObjectKind, string> = {
  window: '#DBEAFE',
  wall: '#6B7280',
  column: '#9CA3AF',
  free: '#A3E635',
};

function detectObjectKind(name: string): ObjectKind {
  const lower = name.toLowerCase();
  if (lower.startsWith('cam kenar') || lower.startsWith('cam_kenar') || lower.startsWith('window')) return 'window';
  if (lower.startsWith('kolon') || lower.startsWith('column')) return 'column';
  if (lower.startsWith('duvar') || lower.startsWith('wall')) return 'wall';
  return 'free';
}

function resourceToObject(obj: ResourceDto, roomId: number, room: EditorRoom, objIndex: number): EditorObject {
  const coords = parseCoordinates(obj.coordinates);
  const kind = detectObjectKind(obj.name);
  const defaults = OBJECT_DEFAULTS[kind];

  let x: number;
  let y: number;

  if (!obj.coordinates) {
    x = room.x + 10;
    y = room.y + room.h - 20 - objIndex * 20;
  } else {
    const insideRoom = coords.x >= room.x && coords.x <= room.x + room.w && coords.y >= room.y && coords.y <= room.y + room.h;
    if (insideRoom) {
      x = coords.x;
      y = coords.y;
    } else {
      x = room.x + 10;
      y = room.y + room.h - 20;
    }
  }

  return {
    id: obj.id,
    name: obj.name,
    kind,
    x,
    y,
    w: obj.width ?? coords.w ?? defaults.w,
    h: obj.height ?? coords.h ?? defaults.h,
    r: obj.rotation ?? coords.r ?? 0,
    color: obj.color || undefined,
  };
}

function darkenHex(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// ── Props ──────────────────────────────────────────────────────
interface FloorPlanCanvasProps {
  rooms: ResourceDto[];
  tablesMap: Record<number, ResourceDto[]>;
  objectsMap?: Record<number, ResourceDto[]>;
  selectedTableId: number | null;
  onTableClick: (tableId: number) => void;
}

// ── Main Component ─────────────────────────────────────────────
export function FloorPlanCanvas({ rooms, tablesMap, objectsMap, selectedTableId, onTableClick }: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [hoveredTableId, setHoveredTableId] = useState<number | null>(null);
  const [fitted, setFitted] = useState(false);
  const hasFitted = useRef(false);

  // Convert rooms and tables to editor types
  const editorRooms = rooms.map((r, i) => resourceToRoom(r, i));
  const editorTables: (EditorTable & { roomId: number })[] = [];
  const editorObjects: (EditorObject & { roomId: number })[] = [];
  for (const room of editorRooms) {
    const tables = tablesMap[room.id] || [];
    tables.forEach((t, ti) => {
      editorTables.push({ ...resourceToTable(t, room.id, room, ti), roomId: room.id });
    });
    const objects = objectsMap?.[room.id] || [];
    objects.forEach((o, oi) => {
      editorObjects.push({ ...resourceToObject(o, room.id, room, oi), roomId: room.id });
    });
  }

  // Measure container synchronously before paint
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (w > 0 && h > 0) {
      setContainerSize({ width: w, height: h });
    }
    const observer = new ResizeObserver(() => {
      const nw = container.offsetWidth;
      const nh = container.offsetHeight;
      if (nw > 0 && nh > 0) setContainerSize({ width: nw, height: nh });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Auto-fit: zoom & center content to fill the container.
  // Re-fits every time rooms change (navigation) or container resizes.
  const roomsKey = rooms.map(r => r.id).join(',');
  const lastFitKey = useRef('');

  useLayoutEffect(() => {
    const fitKey = `${roomsKey}|${containerSize.width}|${containerSize.height}`;
    if (fitKey === lastFitKey.current) return;
    if (editorRooms.length === 0 || containerSize.width === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const room of editorRooms) {
      minX = Math.min(minX, room.x);
      minY = Math.min(minY, room.y);
      maxX = Math.max(maxX, room.x + room.w);
      maxY = Math.max(maxY, room.y + room.h);
    }

    if (minX === Infinity) return;

    const padding = 30;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const scaleX = containerSize.width / contentW;
    const scaleY = containerSize.height / contentH;
    const fitZoom = Math.min(scaleX, scaleY);

    setZoom(fitZoom);
    // Center content in the container
    const scaledW = contentW * fitZoom;
    const scaledH = contentH * fitZoom;
    const offsetX = (containerSize.width - scaledW) / 2;
    const offsetY = (containerSize.height - scaledH) / 2;
    setPanX(-minX * fitZoom + padding * fitZoom + offsetX);
    setPanY(-minY * fitZoom + padding * fitZoom + offsetY);
    setFitted(true);
    hasFitted.current = true;
    lastFitKey.current = fitKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomsKey, containerSize]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.08;
    const newZoom = e.evt.deltaY < 0 ? zoom * scaleBy : zoom / scaleBy;
    setZoom(Math.min(Math.max(newZoom, 0.1), 5));
  }, [zoom]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target === stageRef.current) {
      setPanX(e.target.x());
      setPanY(e.target.y());
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-slate-50 rounded-xl border overflow-hidden"
      style={{ height: 450 }}
    >
      {containerSize.width > 0 && containerSize.height > 0 && fitted && (
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          scaleX={zoom}
          scaleY={zoom}
          x={panX}
          y={panY}
          draggable
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
        >
          <Layer>
            {/* ── Rooms ── */}
            {editorRooms.map((room) => {
              const roomTables = editorTables.filter(t => t.roomId === room.id);

              return (
                <Group key={room.id} x={room.x} y={room.y}>
                  {/* Room floor base */}
                  <Rect
                    width={room.w}
                    height={room.h}
                    fill="#E8DFD0"
                    stroke={room.color + '90'}
                    strokeWidth={2}
                    cornerRadius={4}
                    listening={false}
                  />
                  {/* Parquet floor — horizontal planks */}
                  {Array.from({ length: Math.ceil(room.h / 18) }).map((_, row) => (
                    <Group key={`pr-${row}`} listening={false}>
                      {/* Plank row — offset every other row for staggered look */}
                      {Array.from({ length: Math.ceil(room.w / 60) + 1 }).map((_, col) => {
                        const plankW = 60;
                        const plankH = 18;
                        const offsetX = row % 2 === 0 ? 0 : -30;
                        const px = col * plankW + offsetX;
                        const py = row * plankH;
                        if (px + plankW < 0 || px > room.w || py > room.h) return null;
                        return (
                          <Rect
                            key={`p-${row}-${col}`}
                            x={px + 0.5}
                            y={py + 0.5}
                            width={plankW - 1}
                            height={plankH - 1}
                            fill={(row + col) % 3 === 0 ? '#DDD4C4' : (row + col) % 3 === 1 ? '#E3DACE' : '#D8CFBF'}
                            cornerRadius={1}
                          />
                        );
                      })}
                    </Group>
                  ))}
                  {/* Room color tint overlay */}
                  <Rect
                    width={room.w}
                    height={room.h}
                    fill={room.color + '08'}
                    cornerRadius={4}
                    listening={false}
                  />

                  {/* ── Objects (window, wall, column, free) ── */}
                  {editorObjects.filter(o => o.roomId === room.id).map((obj) => {
                    const ox = obj.x - room.x;
                    const oy = obj.y - room.y;
                    const fill = obj.color || OBJECT_COLORS[obj.kind];
                    const stroke = darkenHex(fill, 0.3);
                    const isColumn = obj.kind === 'column';
                    const isWindow = obj.kind === 'window';
                    const opacity = isWindow ? 0.7 : 0.9;
                    // Display name: strip trailing "-123" id suffix
                    const dashIdx = obj.name.lastIndexOf('-');
                    const displayName = dashIdx > 0 && !isNaN(Number(obj.name.slice(dashIdx + 1)))
                      ? obj.name.slice(0, dashIdx)
                      : obj.name;
                    const isLight = (() => {
                      const c = fill.replace('#', '');
                      const num = parseInt(c, 16);
                      const r = (num >> 16) & 0xff; const g = (num >> 8) & 0xff; const b = num & 0xff;
                      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
                    })();
                    const labelColor = isLight ? '#1F2937' : '#FFFFFF';

                    return (
                      <Group key={`obj-${obj.id}`} x={ox} y={oy} rotation={obj.r} listening={false}>
                        {isColumn ? (
                          <Circle
                            x={obj.w / 2}
                            y={obj.h / 2}
                            radius={Math.min(obj.w, obj.h) / 2}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={1.5}
                            opacity={opacity}
                          />
                        ) : isWindow ? (
                          <>
                            <Rect
                              width={obj.w}
                              height={obj.h}
                              fill={fill}
                              stroke={stroke}
                              strokeWidth={1.5}
                              opacity={opacity}
                              cornerRadius={2}
                            />
                            <Line
                              points={[4, 4, obj.w * 0.3, obj.h - 4]}
                              stroke="#93C5FD"
                              strokeWidth={1}
                              opacity={0.5}
                            />
                          </>
                        ) : (
                          <Rect
                            width={obj.w}
                            height={obj.h}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={1.5}
                            opacity={opacity}
                            cornerRadius={obj.kind === 'free' ? 6 : 1}
                          />
                        )}
                        {/* Object label */}
                        <Text
                          x={0}
                          y={isColumn ? obj.h / 2 - 4 : obj.h / 2 - 4}
                          width={obj.w}
                          text={displayName}
                          fontSize={7}
                          fontStyle="bold"
                          fill={labelColor}
                          align="center"
                        />
                      </Group>
                    );
                  })}

                  {/* ── Tables ── */}
                  {roomTables.map((table) => {
                    // Table position is absolute, offset by room position for the group
                    const tx = table.x - room.x;
                    const ty = table.y - room.y;
                    const isSelected = selectedTableId === table.id;
                    const isHovered = hoveredTableId === table.id;

                    const rawPositions = getChairPositions(table.chairCount, table.w, table.h, table.isRound);
                    const chairPositions = table.isRound
                      ? rawPositions
                      : reorderChairPositions(rawPositions, table.chairCount);

                    const tableFill = isSelected ? '#C4A46C' : isHovered ? '#B8956A' : '#A0845C';
                    const tableStroke = isSelected ? '#3B82F6' : isHovered ? '#8B6D3F' : '#7A5C35';
                    const tableStrokeWidth = isSelected ? 2.5 : 1.5;
                    const defaultChairFill = isSelected ? '#93BBFD' : '#7CA8D4';
                    const defaultChairStroke = isSelected ? '#2563EB' : '#5A8AB8';

                    // Occupancy counts for label
                    const occupiedCount = table.chairs.filter(c => c.occupied).length;

                    return (
                      <Group
                        key={table.id}
                        x={tx}
                        y={ty}
                        rotation={table.r}
                      >
                        {/* Chairs */}
                        {chairPositions.map((pos, ci) => {
                          const isOccupied = table.chairs[ci]?.occupied ?? false;
                          const cFill = isOccupied ? '#F87171' : defaultChairFill;
                          const cStroke = isOccupied ? '#DC2626' : defaultChairStroke;
                          return (
                          <Group key={ci} x={table.w / 2 + pos.x} y={table.h / 2 + pos.y} listening={false}>
                            <Group rotation={(pos.angle * 180) / Math.PI}>
                              {/* Chair seat */}
                              <Rect
                                x={-CHAIR_W / 2}
                                y={-CHAIR_H / 2}
                                width={CHAIR_W}
                                height={CHAIR_H}
                                fill={cFill}
                                stroke={cStroke}
                                strokeWidth={0.8}
                                cornerRadius={2}
                              />
                              {/* Chair backrest */}
                              <Rect
                                x={-CHAIR_W / 2 - 0.5}
                                y={-CHAIR_H / 2 - 3}
                                width={CHAIR_W + 1}
                                height={3}
                                fill={cStroke}
                                cornerRadius={[2, 2, 0, 0]}
                              />
                            </Group>
                          </Group>
                          );
                        })}

                        {/* Table shadow */}
                        {table.isRound ? (
                          <Circle
                            x={table.w / 2 + 2}
                            y={table.h / 2 + 2}
                            radius={table.w / 2}
                            fill="#00000015"
                            listening={false}
                          />
                        ) : (
                          <Rect
                            x={2}
                            y={2}
                            width={table.w}
                            height={table.h}
                            fill="#00000015"
                            cornerRadius={4}
                            listening={false}
                          />
                        )}

                        {/* Table body */}
                        {table.isRound ? (
                          <>
                            <Circle
                              x={table.w / 2}
                              y={table.h / 2}
                              radius={table.w / 2}
                              fill={tableFill}
                              stroke={tableStroke}
                              strokeWidth={tableStrokeWidth}
                              onClick={() => onTableClick(table.id)}
                              onTap={() => onTableClick(table.id)}
                              onMouseEnter={() => {
                                setHoveredTableId(table.id);
                                document.body.style.cursor = 'pointer';
                              }}
                              onMouseLeave={() => {
                                setHoveredTableId(null);
                                document.body.style.cursor = 'default';
                              }}
                            />
                            {/* Wood grain highlight */}
                            <Circle
                              x={table.w / 2}
                              y={table.h / 2}
                              radius={table.w / 2 - 4}
                              fill="#FFFFFF10"
                              listening={false}
                            />
                          </>
                        ) : (
                          <>
                            <Rect
                              width={table.w}
                              height={table.h}
                              fill={tableFill}
                              stroke={tableStroke}
                              strokeWidth={tableStrokeWidth}
                              cornerRadius={4}
                              onClick={() => onTableClick(table.id)}
                              onTap={() => onTableClick(table.id)}
                              onMouseEnter={() => {
                                setHoveredTableId(table.id);
                                document.body.style.cursor = 'pointer';
                              }}
                              onMouseLeave={() => {
                                setHoveredTableId(null);
                                document.body.style.cursor = 'default';
                              }}
                            />
                            {/* Wood grain lines */}
                            {Array.from({ length: Math.floor(table.w / 12) }).map((_, i) => (
                              <Line
                                key={`wg-${i}`}
                                points={[(i + 1) * 12, 3, (i + 1) * 12, table.h - 3]}
                                stroke="#00000008"
                                strokeWidth={1}
                                listening={false}
                              />
                            ))}
                          </>
                        )}

                        {/* Table name */}
                        <Text
                          x={0}
                          y={table.h / 2 - 12}
                          width={table.w}
                          text={table.name}
                          fontSize={10}
                          fontStyle="bold"
                          fill="#FFFFFF"
                          align="center"
                          listening={false}
                        />
                        {/* Occupancy / Capacity */}
                        <Text
                          x={0}
                          y={table.h / 2 + 1}
                          width={table.w}
                          text={table.chairs.length > 0 ? `${occupiedCount}/${table.chairCount}` : `${table.capacity}k`}
                          fontSize={9}
                          fill="#FFFFFFCC"
                          align="center"
                          listening={false}
                        />

                        {/* Selected indicator */}
                        {isSelected && (
                          <>
                            <Circle
                              x={table.w - 2}
                              y={2}
                              radius={6}
                              fill="#22c55e"
                              stroke="#fff"
                              strokeWidth={1.5}
                              listening={false}
                            />
                            <Text
                              x={table.w - 5.5}
                              y={-2}
                              text="✓"
                              fontSize={8}
                              fill="#fff"
                              listening={false}
                            />
                          </>
                        )}
                      </Group>
                    );
                  })}

                  {/* Room name label — rendered last to stay on top */}
                  <Rect
                    x={0}
                    y={0}
                    width={Math.min(room.name.length * 8 + 16, room.w)}
                    height={24}
                    fill={room.color}
                    cornerRadius={[4, 0, 4, 0]}
                    listening={false}
                  />
                  <Text
                    x={8}
                    y={5}
                    text={room.name}
                    fontSize={12}
                    fontStyle="bold"
                    fill="white"
                    listening={false}
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
