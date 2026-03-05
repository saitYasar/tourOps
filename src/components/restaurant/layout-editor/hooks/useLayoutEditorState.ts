import { useReducer, useCallback } from 'react';
import type { EditorState, EditorAction, EditorTable, EditorRoom, EditorObject } from '../types';
import { OBJECT_KIND_CONFIG } from '../types';
import { getTableDefault } from '../utils/tableDefaults';
import { clampToRoomEdge } from '../utils/collision';

const initialState: EditorState = {
  rooms: [],
  tables: [],
  objects: [],
  selectedItem: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  isDirty: false,
  activeFloorId: null,
  collisionTableId: null,
};

const GAP = 20; // minimum gap between rooms

/**
 * After a room changes size or position, push any overlapping rooms
 * to the right (and their tables with them). Repeats until no overlaps.
 */
function pushRoomsAfterResize(
  rooms: EditorRoom[],
  tables: EditorTable[],
  objects: EditorObject[],
  changedId: number,
): { rooms: EditorRoom[]; tables: EditorTable[]; objects: EditorObject[] } {
  // Work on mutable copies
  const rs = rooms.map((r) => ({ ...r }));
  const ts = tables.map((t) => ({ ...t }));
  const os = objects.map((o) => ({ ...o }));

  // Sort rooms left-to-right so we push in order
  const sorted = rs
    .map((_, i) => i)
    .sort((a, b) => rs[a].x - rs[b].x);

  // Simple iterative push — max 20 passes to avoid infinite loop
  for (let pass = 0; pass < 20; pass++) {
    let moved = false;
    for (let i = 0; i < sorted.length; i++) {
      const a = rs[sorted[i]];
      for (let j = i + 1; j < sorted.length; j++) {
        const b = rs[sorted[j]];
        // Check horizontal overlap
        const overlapX = a.x + a.w + GAP - b.x;
        const overlapY =
          a.y < b.y + b.h && a.y + a.h > b.y; // vertical bands overlap?

        if (overlapX > 0 && overlapY) {
          const dx = overlapX;
          b.x += dx;
          b.dirty = true;
          // Move tables inside this room too
          for (const t of ts) {
            if (t.roomId === b.id) {
              t.x += dx;
              t.dirty = true;
            }
          }
          // Move objects inside this room too
          for (const o of os) {
            if (o.roomId === b.id) {
              o.x += dx;
              o.dirty = true;
            }
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  return { rooms: rs, tables: ts, objects: os };
}

function applyRoomPropertyChange(
  state: EditorState,
  id: number,
  key: string,
  value: string | number,
): EditorState {
  // Apply the property change
  let rooms = state.rooms.map((r) =>
    r.id === id ? { ...r, [key]: value, dirty: true } : r,
  );
  let tables = [...state.tables];
  let objects = [...state.objects];

  // If width or height changed, push overlapping rooms
  if (key === 'w' || key === 'h') {
    const result = pushRoomsAfterResize(rooms, tables, objects, id);
    rooms = result.rooms;
    tables = result.tables;
    objects = result.objects;
  }

  return { ...state, rooms, tables, objects, isDirty: true };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD_FLOOR':
      return {
        ...initialState,
        rooms: action.rooms,
        tables: action.tables,
        objects: action.objects,
        activeFloorId: action.floorId,
        zoom: state.zoom,
        panX: 0,
        panY: 0,
      };

    case 'SELECT':
      return { ...state, selectedItem: action.item };

    case 'DESELECT':
      return { ...state, selectedItem: null, collisionTableId: null };

    case 'MOVE_TABLE':
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id ? { ...t, x: action.x, y: action.y, dirty: true } : t,
        ),
        isDirty: true,
      };

    case 'ROTATE_TABLE':
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id ? { ...t, r: action.r, dirty: true } : t,
        ),
        isDirty: true,
      };

    case 'MOVE_ROOM':
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.id ? { ...r, x: action.x, y: action.y, dirty: true } : r,
        ),
        isDirty: true,
      };

    case 'RESIZE_ROOM': {
      let rooms = state.rooms.map((r) =>
        r.id === action.id
          ? {
              ...r,
              w: action.w,
              h: action.h,
              ...(action.x !== undefined ? { x: action.x } : {}),
              ...(action.y !== undefined ? { y: action.y } : {}),
              dirty: true,
            }
          : r,
      );
      const result = pushRoomsAfterResize(rooms, [...state.tables], [...state.objects], action.id);
      return { ...state, rooms: result.rooms, tables: result.tables, objects: result.objects, isDirty: true };
    }

    case 'UPDATE_TABLE_PROPERTY': {
      return {
        ...state,
        tables: state.tables.map((t) => {
          if (t.id !== action.id) return t;
          const updated = { ...t, [action.key]: action.value, dirty: true };
          if (action.key === 'capacity') {
            const defaults = getTableDefault(action.value as number);
            updated.w = defaults.w;
            updated.h = defaults.h;
            updated.isRound = defaults.isRound;
          }
          return updated;
        }),
        isDirty: true,
      };
    }

    case 'UPDATE_ROOM_PROPERTY':
      return applyRoomPropertyChange(state, action.id, action.key, action.value);

    case 'ADD_ROOM':
      return {
        ...state,
        rooms: [...state.rooms, action.room],
        selectedItem: { type: 'room', id: action.room.id },
        isDirty: true,
      };

    case 'ADD_TABLE':
      return {
        ...state,
        tables: [...state.tables, action.table],
        selectedItem: { type: 'table', id: action.table.id },
        isDirty: true,
      };

    case 'ADD_OBJECT':
      return {
        ...state,
        objects: [...state.objects, action.object],
        selectedItem: { type: 'object', id: action.object.id },
        isDirty: true,
      };

    case 'MOVE_OBJECT':
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.id ? { ...o, x: action.x, y: action.y, dirty: true } : o,
        ),
        isDirty: true,
      };

    case 'ROTATE_OBJECT': {
      const rotObj = state.objects.find((o) => o.id === action.id);
      const rotRoom = rotObj ? state.rooms.find((r) => r.id === rotObj.roomId) : undefined;
      return {
        ...state,
        objects: state.objects.map((o) => {
          if (o.id !== action.id) return o;
          let { x, y } = o;
          if (rotRoom) {
            const clamped = clampToRoomEdge(o.x, o.y, o.w, o.h, rotRoom, action.r);
            x = clamped.x;
            y = clamped.y;
          }
          return { ...o, r: action.r, x, y, dirty: true };
        }),
        isDirty: true,
      };
    }

    case 'UPDATE_OBJECT_PROPERTY': {
      return {
        ...state,
        objects: state.objects.map((o) => {
          if (o.id !== action.id) return o;
          // Block thickness (h) changes for kinds with fixed thickness
          const config = OBJECT_KIND_CONFIG[o.kind];
          if (action.key === 'h' && config.fixedThickness !== null) return o;
          const updated = { ...o, [action.key]: action.value, dirty: true };
          // Re-clamp position when dimensions change
          if (action.key === 'w' || action.key === 'h') {
            const objRoom = state.rooms.find((r) => r.id === o.roomId);
            if (objRoom) {
              const clamped = clampToRoomEdge(updated.x, updated.y, updated.w, updated.h, objRoom, updated.r);
              updated.x = clamped.x;
              updated.y = clamped.y;
            }
          }
          return updated;
        }),
        isDirty: true,
      };
    }

    case 'DELETE_ITEM': {
      if (action.itemType === 'room') {
        return {
          ...state,
          rooms: state.rooms.filter((r) => r.id !== action.id),
          tables: state.tables.filter((t) => t.roomId !== action.id),
          objects: state.objects.filter((o) => o.roomId !== action.id),
          selectedItem: null,
          isDirty: true,
        };
      }
      if (action.itemType === 'object') {
        return {
          ...state,
          objects: state.objects.filter((o) => o.id !== action.id),
          selectedItem: null,
          isDirty: true,
        };
      }
      return {
        ...state,
        tables: state.tables.filter((t) => t.id !== action.id),
        selectedItem: null,
        isDirty: true,
      };
    }

    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.3, Math.min(3, action.zoom)) };

    case 'SET_PAN':
      return { ...state, panX: action.x, panY: action.y };

    case 'MARK_CLEAN':
      return {
        ...state,
        isDirty: false,
        rooms: state.rooms.map((r) => ({ ...r, dirty: false })),
        tables: state.tables.map((t) => ({ ...t, dirty: false })),
        objects: state.objects.map((o) => ({ ...o, dirty: false })),
      };

    case 'SET_COLLISION':
      return { ...state, collisionTableId: action.tableId };

    default:
      return state;
  }
}

export function useLayoutEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const select = useCallback(
    (item: EditorState['selectedItem']) => dispatch({ type: 'SELECT', item }),
    [],
  );

  const deselect = useCallback(() => dispatch({ type: 'DESELECT' }), []);

  const getSelectedRoom = useCallback(() => {
    if (state.selectedItem?.type !== 'room') return null;
    return state.rooms.find((r) => r.id === state.selectedItem!.id) ?? null;
  }, [state.selectedItem, state.rooms]);

  const getSelectedTable = useCallback((): EditorTable | null => {
    if (state.selectedItem?.type !== 'table') return null;
    return state.tables.find((t) => t.id === state.selectedItem!.id) ?? null;
  }, [state.selectedItem, state.tables]);

  const getSelectedObject = useCallback((): EditorObject | null => {
    if (state.selectedItem?.type !== 'object') return null;
    return state.objects.find((o) => o.id === state.selectedItem!.id) ?? null;
  }, [state.selectedItem, state.objects]);

  return { state, dispatch, select, deselect, getSelectedRoom, getSelectedTable, getSelectedObject };
}
