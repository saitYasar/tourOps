import { useRef, useEffect } from 'react';
import { Group, Rect, Circle, Text, Line, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { EditorTable, EditorRoom, EditorAction } from '../types';
import { getChairPositions, CHAIR_W, CHAIR_H } from '../utils/chairPositions';
import { snapToGrid, clampToRoom, hasTableOverlap } from '../utils/collision';

interface TableShapeProps {
  table: EditorTable;
  room: EditorRoom | undefined;
  isSelected: boolean;
  isColliding: boolean;
  allTables: EditorTable[];
  onSelect: () => void;
  dispatch: React.Dispatch<EditorAction>;
}

/**
 * Top-down chair shape: a seat rectangle with a curved backrest line.
 * Rendered as a Group that is rotated so the back faces away from the table.
 * Shows chair number label when showLabel is true.
 */
function ChairShape({ x, y, angle, label }: { x: number; y: number; angle: number; label?: string }) {
  // Chair dimensions
  const sw = CHAIR_W;   // seat width
  const sh = CHAIR_H;   // seat height
  const backH = 2;      // backrest thickness

  return (
    <Group x={x} y={y} listening={false}>
      <Group rotation={(angle * 180) / Math.PI}>
        {/* Seat (square cushion) */}
        <Rect
          x={-sw / 2}
          y={-sh / 2}
          width={sw}
          height={sh}
          fill="#a8b8cc"
          stroke="#7a8da3"
          strokeWidth={0.5}
          cornerRadius={2}
        />
        {/* Backrest (thick line at the back edge) */}
        <Line
          points={[-sw / 2 - 0.5, -sh / 2 - backH, sw / 2 + 0.5, -sh / 2 - backH]}
          stroke="#6b7d93"
          strokeWidth={3}
          lineCap="round"
        />
      </Group>
      {/* Chair number label (not rotated, always readable) */}
      {label && (
        <Text
          x={-sw / 2}
          y={-sh / 2}
          width={sw}
          height={sh}
          text={label}
          fontSize={7}
          fontStyle="bold"
          fill="#1e3a5f"
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      )}
    </Group>
  );
}

/**
 * Reorder chair positions so opposite chairs are sequential pairs.
 * Original: [SideA_0, SideA_1, ..., SideB_0, SideB_1, ...]
 * Reordered: [SideA_0, SideB_0, SideA_1, SideB_1, ...]
 * Result: chair 1↔2 opposite, 3↔4 opposite, etc.
 */
function reorderChairPositions<T>(positions: T[], capacity: number): T[] {
  const perSide = Math.ceil(capacity / 2);
  const reordered: T[] = [];
  for (let i = 0; i < perSide; i++) {
    reordered.push(positions[i]);
    if (perSide + i < positions.length) {
      reordered.push(positions[perSide + i]);
    }
  }
  return reordered;
}

export function TableShape({
  table,
  room,
  isSelected,
  isColliding,
  allTables,
  onSelect,
  dispatch,
}: TableShapeProps) {
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Only show chairs if they exist in DB
  const dbChairs = table.chairs ?? [];
  const hasDbChairs = dbChairs.length > 0;
  const rawPositions = getChairPositions(
    hasDbChairs ? dbChairs.length : 0,
    table.w, table.h, table.isRound,
  );
  const positions = reorderChairPositions(rawPositions, hasDbChairs ? dbChairs.length : 0);

  const handleDragMove = () => {
    const node = groupRef.current;
    if (!node) return;

    let x = snapToGrid(node.x());
    let y = snapToGrid(node.y());

    if (room) {
      const clamped = clampToRoom(x, y, table.w, table.h, room);
      x = clamped.x;
      y = clamped.y;
    }

    node.x(x);
    node.y(y);

    const overlap = hasTableOverlap({ id: table.id, x, y, w: table.w, h: table.h }, allTables);
    dispatch({ type: 'SET_COLLISION', tableId: overlap ? table.id : null });
  };

  const handleDragEnd = () => {
    const node = groupRef.current;
    if (!node) return;
    const x = snapToGrid(node.x());
    const y = snapToGrid(node.y());
    dispatch({ type: 'MOVE_TABLE', id: table.id, x, y });
    setTimeout(() => dispatch({ type: 'SET_COLLISION', tableId: null }), 500);
  };

  const handleTransformEnd = () => {
    const node = groupRef.current;
    if (!node) return;
    const rotation = Math.round(node.rotation());
    node.scaleX(1);
    node.scaleY(1);
    dispatch({ type: 'ROTATE_TABLE', id: table.id, r: rotation });
  };

  const bodyStroke = isColliding ? '#EF4444' : isSelected ? '#3B82F6' : '#94a3b8';
  const bodyStrokeWidth = isColliding ? 3 : isSelected ? 2 : 1;
  const bodyFill = isColliding ? '#FEE2E2' : '#FEFCE8';

  return (
    <>
      <Group
        ref={groupRef}
        x={table.x}
        y={table.y}
        rotation={table.r}
        draggable
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={(e) => { e.cancelBubble = true; onSelect(); }}
        onTap={(e) => { e.cancelBubble = true; onSelect(); }}
        onTransformEnd={handleTransformEnd}
      >
        {/* Chairs — only rendered if they exist in DB */}
        {positions.map((pos, i) => (
          <ChairShape
            key={`chair-${dbChairs[i]?.id ?? i}`}
            x={table.w / 2 + pos.x}
            y={table.h / 2 + pos.y}
            angle={pos.angle}
            label={isSelected ? String(i + 1) : undefined}
          />
        ))}

        {/* Table / Bench body */}
        {table.isRound ? (
          <Circle
            x={table.w / 2}
            y={table.h / 2}
            radius={table.w / 2}
            fill={bodyFill}
            stroke={bodyStroke}
            strokeWidth={bodyStrokeWidth}
          />
        ) : (
          <Rect
            width={table.w}
            height={table.h}
            fill={bodyFill}
            stroke={bodyStroke}
            strokeWidth={bodyStrokeWidth}
            cornerRadius={3}
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
      </Group>

      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          enabledAnchors={[]}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          rotationSnapTolerance={10}
          borderStroke="#3B82F6"
          borderStrokeWidth={1}
          anchorStroke="#3B82F6"
          anchorFill="white"
          anchorSize={8}
        />
      )}
    </>
  );
}
