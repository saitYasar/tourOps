import { useRef, useEffect } from 'react';
import { Group, Rect, Circle, Text, Line, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { EditorObject, EditorRoom, EditorAction } from '../types';
import { OBJECT_KIND_CONFIG } from '../types';
import { snapToGrid, clampToRoomEdge } from '../utils/collision';

interface ObjectShapeProps {
  object: EditorObject;
  room: EditorRoom | undefined;
  isSelected: boolean;
  onSelect: () => void;
  dispatch: React.Dispatch<EditorAction>;
}

/** Darken a hex color by a percentage (0-1) */
function darkenHex(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

/** Check if a hex color is light (for label contrast) */
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

/** Get fill, stroke, and label color for an object */
function getObjectStyle(obj: EditorObject) {
  const config = OBJECT_KIND_CONFIG[obj.kind];
  const fill = obj.color || config.defaultColor;
  const stroke = darkenHex(fill, 0.3);
  const labelColor = isLightColor(fill) ? '#1F2937' : '#FFFFFF';
  const opacity = obj.kind === 'window' ? 0.7 : 0.9;
  return { fill, stroke, labelColor, opacity };
}

export function ObjectShape({
  object,
  room,
  isSelected,
  onSelect,
  dispatch,
}: ObjectShapeProps) {
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const style = getObjectStyle(object);
  const label = object.displayName;

  const handleDragMove = () => {
    const node = groupRef.current;
    if (!node) return;

    let x = snapToGrid(node.x());
    let y = snapToGrid(node.y());

    if (room) {
      const clamped = clampToRoomEdge(x, y, object.w, object.h, room, object.r);
      x = clamped.x;
      y = clamped.y;
    }

    node.x(x);
    node.y(y);
  };

  const handleDragEnd = () => {
    const node = groupRef.current;
    if (!node) return;
    let x = snapToGrid(node.x());
    let y = snapToGrid(node.y());
    if (room) {
      const clamped = clampToRoomEdge(x, y, object.w, object.h, room, object.r);
      x = clamped.x;
      y = clamped.y;
    }
    dispatch({ type: 'MOVE_OBJECT', id: object.id, x, y });
  };

  const handleTransformEnd = () => {
    const node = groupRef.current;
    if (!node) return;
    const rotation = Math.round(node.rotation());
    node.scaleX(1);
    node.scaleY(1);
    dispatch({ type: 'ROTATE_OBJECT', id: object.id, r: rotation });

    // Re-clamp position to account for rotated bounding box
    if (room) {
      const x = snapToGrid(node.x());
      const y = snapToGrid(node.y());
      const clamped = clampToRoomEdge(x, y, object.w, object.h, room, rotation);
      node.x(clamped.x);
      node.y(clamped.y);
      dispatch({ type: 'MOVE_OBJECT', id: object.id, x: clamped.x, y: clamped.y });
    }
  };

  const borderStroke = isSelected ? '#3B82F6' : style.stroke;
  const borderWidth = isSelected ? 2.5 : 1.5;

  // Column is rendered as a circle, others as rectangles
  const isColumn = object.kind === 'column';
  const isFree = object.kind === 'free';

  return (
    <>
      <Group
        ref={groupRef}
        x={object.x}
        y={object.y}
        rotation={object.r}
        draggable
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={(e) => { e.cancelBubble = true; onSelect(); }}
        onTap={(e) => { e.cancelBubble = true; onSelect(); }}
        onTransformEnd={handleTransformEnd}
      >
        {/* Object body */}
        {isColumn ? (
          <Circle
            x={object.w / 2}
            y={object.h / 2}
            radius={Math.min(object.w, object.h) / 2}
            fill={style.fill}
            stroke={borderStroke}
            strokeWidth={borderWidth}
            opacity={style.opacity}
          />
        ) : isFree ? (
          // Free object: rounded rectangle, no pattern
          <Rect
            width={object.w}
            height={object.h}
            fill={style.fill}
            stroke={borderStroke}
            strokeWidth={borderWidth}
            opacity={style.opacity}
            cornerRadius={6}
          />
        ) : object.kind === 'window' ? (
          // Window: glass-like rectangle with reflection lines
          <>
            <Rect
              width={object.w}
              height={object.h}
              fill={style.fill}
              stroke={borderStroke}
              strokeWidth={borderWidth}
              opacity={style.opacity}
              cornerRadius={2}
            />
            {/* Glass reflection lines */}
            <Line
              points={[4, 4, object.w * 0.3, object.h - 4]}
              stroke="#93C5FD"
              strokeWidth={1}
              opacity={0.5}
              listening={false}
            />
            <Line
              points={[10, 4, object.w * 0.4, object.h - 4]}
              stroke="#93C5FD"
              strokeWidth={1}
              opacity={0.3}
              listening={false}
            />
          </>
        ) : (
          // Wall: solid rectangle with brick-like pattern
          <>
            <Rect
              width={object.w}
              height={object.h}
              fill={style.fill}
              stroke={borderStroke}
              strokeWidth={borderWidth}
              opacity={style.opacity}
              cornerRadius={1}
            />
            {/* Brick lines */}
            {object.h > 10 && (
              <Line
                points={[0, object.h / 2, object.w, object.h / 2]}
                stroke={darkenHex(style.fill, 0.2)}
                strokeWidth={0.5}
                opacity={0.4}
                listening={false}
              />
            )}
          </>
        )}

        {/* Label - show displayName */}
        <Text
          x={0}
          y={isColumn ? object.h / 2 - 5 : object.h / 2 - 5}
          width={object.w}
          text={label}
          fontSize={isColumn ? 7 : isFree ? 10 : 9}
          fontStyle="bold"
          fill={style.labelColor}
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
