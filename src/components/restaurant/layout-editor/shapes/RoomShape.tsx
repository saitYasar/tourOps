import { useRef } from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import type Konva from 'konva';
import type { EditorRoom } from '../types';
import { GRID_SNAP } from '../types';

const HANDLE_SIZE = 10;
const MIN_ROOM_W = 100;
const MIN_ROOM_H = 100;

type Corner = 'nw' | 'ne' | 'sw' | 'se';

const CURSOR_MAP: Record<Corner, string> = {
  nw: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  se: 'nwse-resize',
};

interface RoomShapeProps {
  room: EditorRoom;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (id: number, x: number, y: number) => void;
  onDragMove: (id: number, x: number, y: number) => void;
  onDragEnd: (id: number, x: number, y: number) => void;
  onResize?: (id: number, x: number, y: number, w: number, h: number) => void;
}

export function RoomShape({ room, isSelected, onSelect, onDragStart, onDragMove, onDragEnd, onResize }: RoomShapeProps) {
  // Ref to track initial state at resize drag start
  const resizeRef = useRef<{
    px: number; py: number; // canvas pointer at start
    rx: number; ry: number; rw: number; rh: number; // room geometry at start
  } | null>(null);

  const getCanvasPointer = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY(),
    };
  };

  // --- Room drag (move) handlers ---
  const handleDragStart = () => {
    onDragStart(room.id, room.x, room.y);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const x = Math.round(node.x() / GRID_SNAP) * GRID_SNAP;
    const y = Math.round(node.y() / GRID_SNAP) * GRID_SNAP;
    const snappedX = Math.max(0, x);
    const snappedY = Math.max(0, y);
    node.x(snappedX);
    node.y(snappedY);
    onDragMove(room.id, snappedX, snappedY);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onDragEnd(room.id, node.x(), node.y());
  };

  // --- Corner resize handlers ---
  const handleCornerDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const cp = getCanvasPointer(e);
    if (!cp) return;
    resizeRef.current = {
      px: cp.x, py: cp.y,
      rx: room.x, ry: room.y, rw: room.w, rh: room.h,
    };
  };

  const handleCornerDragMove = (corner: Corner) => (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    if (!resizeRef.current || !onResize) return;
    const cp = getCanvasPointer(e);
    if (!cp) return;

    const s = resizeRef.current;
    const dx = cp.x - s.px;
    const dy = cp.y - s.py;

    let newW = s.rw;
    let newH = s.rh;
    let newX = s.rx;
    let newY = s.ry;

    switch (corner) {
      case 'se':
        newW = s.rw + dx;
        newH = s.rh + dy;
        break;
      case 'sw':
        newW = s.rw - dx;
        newH = s.rh + dy;
        break;
      case 'ne':
        newW = s.rw + dx;
        newH = s.rh - dy;
        break;
      case 'nw':
        newW = s.rw - dx;
        newH = s.rh - dy;
        break;
    }

    // Snap to grid & enforce minimum
    newW = Math.max(MIN_ROOM_W, Math.round(newW / GRID_SNAP) * GRID_SNAP);
    newH = Math.max(MIN_ROOM_H, Math.round(newH / GRID_SNAP) * GRID_SNAP);

    // Recalculate position for corners that shift origin
    if (corner === 'sw' || corner === 'nw') {
      newX = s.rx + s.rw - newW;
    }
    if (corner === 'ne' || corner === 'nw') {
      newY = s.ry + s.rh - newH;
    }

    newX = Math.max(0, Math.round(newX / GRID_SNAP) * GRID_SNAP);
    newY = Math.max(0, Math.round(newY / GRID_SNAP) * GRID_SNAP);

    onResize(room.id, newX, newY, newW, newH);
  };

  const handleCornerDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    resizeRef.current = null;
  };

  return (
    <Group
      x={room.x}
      y={room.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {/* Room floor base */}
      <Rect
        width={room.w}
        height={room.h}
        fill="#F5F0E8"
        stroke={isSelected ? room.color : room.color + '90'}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={4}
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
      {/* Room name label */}
      <Rect
        x={0}
        y={0}
        width={Math.min(room.name.length * 8 + 16, room.w)}
        height={24}
        fill={room.color}
        cornerRadius={[4, 0, 4, 0]}
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

      {/* Resize corner handles (visible when selected) */}
      {isSelected && onResize &&
        (['nw', 'ne', 'sw', 'se'] as Corner[]).map((corner) => {
          const cx = corner.includes('e') ? room.w : 0;
          const cy = corner.includes('s') ? room.h : 0;
          return (
            <Rect
              key={corner}
              x={cx - HANDLE_SIZE / 2}
              y={cy - HANDLE_SIZE / 2}
              width={HANDLE_SIZE}
              height={HANDLE_SIZE}
              fill="white"
              stroke={room.color}
              strokeWidth={2}
              cornerRadius={2}
              draggable
              onDragStart={handleCornerDragStart}
              onDragMove={handleCornerDragMove(corner)}
              onDragEnd={handleCornerDragEnd}
              onMouseEnter={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = CURSOR_MAP[corner];
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
              }}
            />
          );
        })}
    </Group>
  );
}
