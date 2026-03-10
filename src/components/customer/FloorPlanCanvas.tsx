'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Group, Text, Circle, Line } from 'react-konva';
import type Konva from 'konva';
import type { ResourceDto } from '@/lib/api';

// ── Constants (matching LayoutEditor) ──────────────────────────
const ROOM_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const CHAIR_W = 10;
const CHAIR_H = 10;
const CHAIR_GAP = 3;

// Table size defaults by capacity (matching tableDefaults.ts)
const TABLE_DEFAULTS: Record<number, { w: number; h: number; isRound: boolean }> = {
  2: { w: 50, h: 50, isRound: true },
  4: { w: 80, h: 50, isRound: false },
  6: { w: 100, h: 55, isRound: false },
  8: { w: 130, h: 60, isRound: false },
};

function getTableDefault(capacity: number) {
  return TABLE_DEFAULTS[capacity] || TABLE_DEFAULTS[4];
}

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

  return {
    id: table.id,
    name: table.name,
    x,
    y,
    w: table.width ?? coords.w ?? defaults.w,
    h: table.height ?? coords.h ?? defaults.h,
    r: table.rotation ?? coords.r ?? 0,
    capacity,
    isRound: defaults.isRound,
    chairCount,
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

// ── Props ──────────────────────────────────────────────────────
interface FloorPlanCanvasProps {
  rooms: ResourceDto[];
  tablesMap: Record<number, ResourceDto[]>;
  selectedTableId: number | null;
  onTableClick: (tableId: number) => void;
}

// ── Main Component ─────────────────────────────────────────────
export function FloorPlanCanvas({ rooms, tablesMap, selectedTableId, onTableClick }: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [hoveredTableId, setHoveredTableId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  // Convert rooms and tables to editor types
  const editorRooms = rooms.map((r, i) => resourceToRoom(r, i));
  const editorTables: (EditorTable & { roomId: number })[] = [];
  for (const room of editorRooms) {
    const tables = tablesMap[room.id] || [];
    tables.forEach((t, ti) => {
      editorTables.push({ ...resourceToTable(t, room.id, room, ti), roomId: room.id });
    });
  }

  // Fit canvas to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      if (w > 0 && h > 0) {
        setContainerSize({ width: w, height: h });
        setReady(true);
      }
    };

    requestAnimationFrame(updateSize);
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Auto-fit: calculate bounds and center
  useEffect(() => {
    if (editorRooms.length === 0 || !ready || containerSize.width === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const room of editorRooms) {
      minX = Math.min(minX, room.x);
      minY = Math.min(minY, room.y);
      maxX = Math.max(maxX, room.x + room.w);
      maxY = Math.max(maxY, room.y + room.h);
    }

    if (minX === Infinity) return;

    const padding = 40;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const scaleX = containerSize.width / contentW;
    const scaleY = containerSize.height / contentH;
    const fitZoom = Math.min(scaleX, scaleY, 2);

    setZoom(fitZoom);
    setPanX(-minX * fitZoom + padding * fitZoom);
    setPanY(-minY * fitZoom + padding * fitZoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, containerSize, ready]);

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
      {ready && containerSize.width > 0 && containerSize.height > 0 && (
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
                    fill="#F5F0E8"
                    stroke={room.color + '90'}
                    strokeWidth={2}
                    cornerRadius={4}
                    listening={false}
                  />
                  {/* Alternating tile row stripes */}
                  {Array.from({ length: Math.ceil(room.h / 40) }).map((_, i) =>
                    i % 2 === 0 ? (
                      <Rect
                        key={`ts-${i}`}
                        x={1}
                        y={i * 40}
                        width={room.w - 2}
                        height={Math.min(40, room.h - i * 40)}
                        fill="#EDE7D9"
                        cornerRadius={i === 0 ? [4, 4, 0, 0] : 0}
                        listening={false}
                      />
                    ) : null,
                  )}
                  {/* Tile grout — vertical */}
                  {Array.from({ length: Math.floor(room.w / 40) - 1 }).map((_, i) => (
                    <Line
                      key={`tv-${i}`}
                      points={[(i + 1) * 40, 0, (i + 1) * 40, room.h]}
                      stroke="#D6CFC3"
                      strokeWidth={0.8}
                      listening={false}
                    />
                  ))}
                  {/* Tile grout — horizontal */}
                  {Array.from({ length: Math.floor(room.h / 40) - 1 }).map((_, i) => (
                    <Line
                      key={`th-${i}`}
                      points={[0, (i + 1) * 40, room.w, (i + 1) * 40]}
                      stroke="#D6CFC3"
                      strokeWidth={0.8}
                      listening={false}
                    />
                  ))}
                  {/* Room color tint overlay */}
                  <Rect
                    width={room.w}
                    height={room.h}
                    fill={room.color + '12'}
                    cornerRadius={4}
                    listening={false}
                  />
                  {/* Room name label background */}
                  <Rect
                    x={0}
                    y={0}
                    width={Math.min(room.name.length * 8 + 16, room.w)}
                    height={24}
                    fill={room.color}
                    cornerRadius={[4, 0, 4, 0]}
                    listening={false}
                  />
                  {/* Room name text */}
                  <Text
                    x={8}
                    y={5}
                    text={room.name}
                    fontSize={12}
                    fontStyle="bold"
                    fill="white"
                    listening={false}
                  />

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

                    const bodyStroke = isSelected ? '#3B82F6' : isHovered ? '#F59E0B' : '#94a3b8';
                    const bodyStrokeWidth = isSelected ? 2 : 1;
                    const bodyFill = isSelected ? '#DBEAFE' : '#FEFCE8';

                    return (
                      <Group
                        key={table.id}
                        x={tx}
                        y={ty}
                        rotation={table.r}
                      >
                        {/* Chairs */}
                        {chairPositions.map((pos, ci) => (
                          <Group key={ci} x={table.w / 2 + pos.x} y={table.h / 2 + pos.y} listening={false}>
                            <Group rotation={(pos.angle * 180) / Math.PI}>
                              <Rect
                                x={-CHAIR_W / 2}
                                y={-CHAIR_H / 2}
                                width={CHAIR_W}
                                height={CHAIR_H}
                                fill={isSelected ? '#93c5fd' : '#a8b8cc'}
                                stroke={isSelected ? '#3b82f6' : '#7a8da3'}
                                strokeWidth={0.5}
                                cornerRadius={2}
                              />
                              <Line
                                points={[-CHAIR_W / 2 - 0.5, -CHAIR_H / 2 - 2, CHAIR_W / 2 + 0.5, -CHAIR_H / 2 - 2]}
                                stroke={isSelected ? '#2563eb' : '#6b7d93'}
                                strokeWidth={3}
                                lineCap="round"
                              />
                            </Group>
                          </Group>
                        ))}

                        {/* Table body */}
                        {table.isRound ? (
                          <Circle
                            x={table.w / 2}
                            y={table.h / 2}
                            radius={table.w / 2}
                            fill={bodyFill}
                            stroke={bodyStroke}
                            strokeWidth={bodyStrokeWidth}
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
                        ) : (
                          <Rect
                            width={table.w}
                            height={table.h}
                            fill={bodyFill}
                            stroke={bodyStroke}
                            strokeWidth={bodyStrokeWidth}
                            cornerRadius={3}
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
                        )}

                        {/* Table name */}
                        <Text
                          x={0}
                          y={table.h / 2 - 12}
                          width={table.w}
                          text={table.name}
                          fontSize={10}
                          fontStyle="bold"
                          fill="#334155"
                          align="center"
                          listening={false}
                        />
                        {/* Capacity */}
                        <Text
                          x={0}
                          y={table.h / 2 + 1}
                          width={table.w}
                          text={`${table.capacity}k`}
                          fontSize={9}
                          fill="#64748b"
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
                </Group>
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
