'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './types';
import type { EditorState, EditorAction } from './types';
import { GridBackground } from './shapes/GridBackground';
import { RoomShape } from './shapes/RoomShape';
import { TableShape } from './shapes/TableShape';
import { ObjectShape } from './shapes/ObjectShape';

interface LayoutCanvasProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

export function LayoutCanvas({ state, dispatch }: LayoutCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Fit canvas to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setContainerSize({
        width: container.offsetWidth,
        height: container.offsetHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const baseScale = Math.min(
    containerSize.width / CANVAS_WIDTH,
    containerSize.height / CANVAS_HEIGHT,
  );
  const scale = baseScale * state.zoom;

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const scaleBy = 1.08;
      const newZoom = e.evt.deltaY < 0
        ? state.zoom * scaleBy
        : state.zoom / scaleBy;
      dispatch({ type: 'SET_ZOOM', zoom: newZoom });
    },
    [state.zoom, dispatch],
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      // Clicked on stage background → deselect
      if (e.target === e.target.getStage()) {
        dispatch({ type: 'DESELECT' });
      }
    },
    [dispatch],
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      // Stage pan
      if (e.target === stageRef.current) {
        dispatch({ type: 'SET_PAN', x: e.target.x(), y: e.target.y() });
      }
    },
    [dispatch],
  );

  const handleRoomDragStart = useCallback(
    (_roomId: number, _x: number, _y: number) => {},
    [],
  );

  const handleRoomDragMove = useCallback(
    (roomId: number, newX: number, newY: number) => {
      dispatch({ type: 'MOVE_ROOM_WITH_CHILDREN', id: roomId, x: newX, y: newY });
    },
    [dispatch],
  );

  const handleRoomDragEnd = useCallback(
    (roomId: number, x: number, y: number) => {
      dispatch({ type: 'MOVE_ROOM_WITH_CHILDREN', id: roomId, x, y });
    },
    [dispatch],
  );

  const handleRoomResize = useCallback(
    (roomId: number, x: number, y: number, w: number, h: number) => {
      dispatch({ type: 'RESIZE_ROOM', id: roomId, w, h, x, y });
    },
    [dispatch],
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-white rounded-lg border overflow-hidden"
      style={{ minHeight: 600 }}
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={scale}
        scaleY={scale}
        draggable
        x={state.panX}
        y={state.panY}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onDragEnd={handleDragEnd}
      >
        <Layer>
          <GridBackground />

          {/* Rooms */}
          {state.rooms.map((room) => (
            <RoomShape
              key={room.id}
              room={room}
              isSelected={
                state.selectedItem?.type === 'room' &&
                state.selectedItem.id === room.id
              }
              onSelect={() =>
                dispatch({ type: 'SELECT', item: { type: 'room', id: room.id } })
              }
              onDragStart={handleRoomDragStart}
              onDragMove={handleRoomDragMove}
              onDragEnd={handleRoomDragEnd}
              onResize={handleRoomResize}
            />
          ))}

          {/* Objects (structural elements: walls, windows, columns) */}
          {state.objects.map((obj) => (
            <ObjectShape
              key={`obj-${obj.id}`}
              object={obj}
              room={state.rooms.find((r) => r.id === obj.roomId)}
              isSelected={
                state.selectedItem?.type === 'object' &&
                state.selectedItem.id === obj.id
              }
              onSelect={() =>
                dispatch({ type: 'SELECT', item: { type: 'object', id: obj.id } })
              }
              dispatch={dispatch}
            />
          ))}

          {/* Tables */}
          {state.tables.map((table) => (
            <TableShape
              key={table.id}
              table={table}
              room={state.rooms.find((r) => r.id === table.roomId)}
              isSelected={
                state.selectedItem?.type === 'table' &&
                state.selectedItem.id === table.id
              }
              isColliding={state.collisionTableId === table.id}
              allTables={state.tables}
              onSelect={() =>
                dispatch({ type: 'SELECT', item: { type: 'table', id: table.id } })
              }
              dispatch={dispatch}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
