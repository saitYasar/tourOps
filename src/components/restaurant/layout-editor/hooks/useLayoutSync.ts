import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { resourceApi, type ResourceDto, type ResourceTypeDto } from '@/lib/api';
import type { EditorRoom, EditorTable, EditorObject, EditorAction, ObjectKind, LayoutApiAdapter } from '../types';
import { ROOM_COLORS, OBJECT_KIND_LABELS, OBJECT_KIND_CONFIG } from '../types';
import { parseCoordinates, serializeCoordinates } from '../utils/coordinates';
import { getTableDefault } from '../utils/tableDefaults';
import { getChairPositions } from '../utils/chairPositions';
import { snapToGrid } from '../utils/collision';

// Default dimensions per object kind
const OBJECT_DEFAULTS: Record<ObjectKind, { w: number; h: number }> = {
  window: { w: 120, h: 12 },
  wall: { w: 120, h: 14 },
  column: { w: 24, h: 24 },
  free: { w: 60, h: 60 },
};

/** Detect ObjectKind from resource name.
 *  Names follow the pattern "Cam Kenarı-123", "Duvar-456", "Kolon-789" */
function detectObjectKind(name: string): ObjectKind {
  const lower = name.toLowerCase();
  if (lower.startsWith('cam kenar') || lower.startsWith('cam_kenar') || lower.startsWith('window')) return 'window';
  if (lower.startsWith('kolon') || lower.startsWith('column')) return 'column';
  if (lower.startsWith('duvar') || lower.startsWith('wall')) return 'wall';
  return 'free'; // default to free for unknown names
}

/** Small helper to pause between API calls */
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Fetch rooms of a floor using the provided API adapter or default resourceApi */
function createFetchRooms(api?: LayoutApiAdapter) {
  return async (floorId: number): Promise<ResourceDto[]> => {
    const result = api
      ? await api.getLayout(floorId)
      : await resourceApi.getLayout(floorId);
    if (result.success && result.data) return result.data;
    console.error('[LayoutEditor] fetchRooms failed for floor', floorId, '—', result.error);
    return [];
  };
}

/** Fetch tables of a room with retry + delay using the provided API adapter or default resourceApi */
function createFetchTables(api?: LayoutApiAdapter) {
  return async (roomId: number): Promise<ResourceDto[]> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await delay(500 * attempt);
      const result = api
        ? await api.getChildren(roomId)
        : await resourceApi.getChildren(roomId);
      if (result.success && result.data) return result.data;
      console.warn(`[LayoutEditor] fetchTables attempt ${attempt + 1} failed for room`, roomId, '—', result.error);
    }
    console.error('[LayoutEditor] fetchTables gave up for room', roomId);
    return [];
  };
}

function resourceToRoom(
  room: ResourceDto,
  index: number,
  floorId: number,
): EditorRoom {
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
    floorId,
    capacity: room.capacity,
    dirty: false,
    resource: room,
  };
}

function resourceToTable(
  table: ResourceDto,
  roomId: number,
  room?: EditorRoom,
  tableIndex?: number,
): EditorTable {
  const coords = parseCoordinates(table.coordinates);
  const capacity = table.capacity || 4;
  const defaults = getTableDefault(capacity);

  let x: number;
  let y: number;

  if (!room) {
    x = coords.x || 100;
    y = coords.y || 100;
  } else if (!table.coordinates) {
    // No coordinates at all → auto-place in grid inside room
    const idx = tableIndex ?? 0;
    const cols = Math.max(1, Math.floor((room.w - 20) / (defaults.w + 20)));
    const col = idx % cols;
    const row = Math.floor(idx / cols);
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
      // Absolute pixel coords — use as-is
      x = coords.x;
      y = coords.y;
    } else if (coords.x <= 100 && coords.y <= 100) {
      // Legacy percent format: 0-100% within room area
      const px = Math.max(5, Math.min(95, coords.x)) / 100;
      const py = Math.max(5, Math.min(95, coords.y)) / 100;
      x = room.x + px * (room.w - defaults.w);
      y = room.y + 24 + py * (room.h - defaults.h - 24);
    } else {
      // Unknown — place at room origin
      x = room.x + 20;
      y = room.y + 40;
    }
  }

  // Extract chairs from table.children — all children of a table are chairs
  const chairs = (table.children ?? [])
    .map(c => ({ id: c.id, name: c.name, order: c.order }))
    .sort((a, b) => a.order - b.order);

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
    roomId,
    dirty: false,
    resource: table,
    chairs,
  };
}

function resourceToObject(
  obj: ResourceDto,
  roomId: number,
  room?: EditorRoom,
  objIndex?: number,
): EditorObject {
  const coords = parseCoordinates(obj.coordinates);
  const kind = detectObjectKind(obj.name);
  const defaults = OBJECT_DEFAULTS[kind];

  let x: number;
  let y: number;

  if (!room) {
    x = coords.x || 100;
    y = coords.y || 100;
  } else if (!obj.coordinates) {
    const idx = objIndex ?? 0;
    x = room.x + 10;
    y = room.y + room.h - 20 - idx * 30;
  } else {
    const insideRoom =
      coords.x >= room.x &&
      coords.x <= room.x + room.w &&
      coords.y >= room.y &&
      coords.y <= room.y + room.h;

    if (insideRoom) {
      x = coords.x;
      y = coords.y;
    } else {
      x = room.x + 10;
      y = room.y + room.h - 20;
    }
  }

  // Parse displayName from name: "CustomName-123" → "CustomName", fallback to kind label
  const dashIdx = obj.name.lastIndexOf('-');
  const parsedDisplayName = dashIdx > 0 ? obj.name.substring(0, dashIdx) : OBJECT_KIND_LABELS[kind];

  return {
    id: obj.id,
    name: obj.name,
    displayName: parsedDisplayName,
    kind,
    color: obj.color || undefined,
    x,
    y,
    w: obj.width ?? coords.w ?? defaults.w,
    h: obj.height ?? coords.h ?? defaults.h,
    r: obj.rotation ?? coords.r ?? 0,
    roomId,
    dirty: false,
    resource: obj,
  };
}

export function useLayoutSync(
  dispatch: React.Dispatch<EditorAction>,
  _childrenCache: Record<number, ResourceDto[]>,
  resourceTypes: ResourceTypeDto[],
  onResourceCreated: () => void,
  onResourceUpdated: () => void,
  onResourceDeleted: () => void,
  apiAdapter?: LayoutApiAdapter,
) {
  // Use refs to avoid stale closure and infinite re-render loops
  const typesRef = useRef(resourceTypes);
  typesRef.current = resourceTypes;

  const onUpdatedRef = useRef(onResourceUpdated);
  onUpdatedRef.current = onResourceUpdated;

  // API adapter ref (stable across renders)
  const apiRef = useRef(apiAdapter);
  apiRef.current = apiAdapter;

  const loadFloorData = useCallback(
    async (floorId: number) => {
      console.log('[LayoutEditor] loadFloorData START floorId:', floorId);

      // Use apiRef.current to always get the latest adapter (avoids stale closure)
      const currentApi = apiRef.current;
      const fetchRoomsFn = createFetchRooms(currentApi);
      const fetchTablesFn = createFetchTables(currentApi);

      // Step 1: GET /resources/layout?parentId=floorId → rooms (may include room.children = tables)
      const rooms = await fetchRoomsFn(floorId);
      if (rooms.length === 0) {
        console.warn('[LayoutEditor] No rooms found for floor', floorId);
        dispatch({ type: 'LOAD_FLOOR', rooms: [], tables: [], objects: [], floorId });
        return;
      }
      console.log('[LayoutEditor] Fetched', rooms.length, 'rooms for floor', floorId,
        '— children populated:', rooms.map(r => `${r.name}:${r.children?.length ?? 'none'}`).join(', '));

      const editorRooms: EditorRoom[] = rooms.map((room, i) =>
        resourceToRoom(room, i, floorId),
      );

      // Step 2: Get tables & objects — prefer room.children from getLayout response
      //         Fall back to getChildren(roomId) only if children not populated
      const editorTables: EditorTable[] = [];
      const editorObjects: EditorObject[] = [];
      for (const room of rooms) {
        let children: ResourceDto[];

        if (room.children && room.children.length > 0) {
          children = room.children;
          console.log('[LayoutEditor] Room', room.id, room.name, '→', children.length, 'children (from children)');
        } else if (room.children && room.children.length === 0) {
          children = [];
          console.log('[LayoutEditor] Room', room.id, room.name, '→ 0 children (empty)');
        } else {
          console.log('[LayoutEditor] Room', room.id, room.name, '→ children not populated, fetching...');
          await delay(300);
          children = await fetchTablesFn(room.id);
          console.log('[LayoutEditor] Room', room.id, room.name, '→', children.length, 'children (from API)');
        }

        const editorRoom = editorRooms.find((r) => r.id === room.id);

        // Separate tables from objects by resourceType code or resourceTypeId
        const objectTypeId = typesRef.current.find(t => t.code === 'object')?.id;
        const tableChildren: ResourceDto[] = [];
        const objectChildren: ResourceDto[] = [];
        for (const child of children) {
          const code = child.resourceType?.code;
          const isObject = code === 'object' || (objectTypeId != null && child.resourceTypeId === objectTypeId);
          if (isObject) {
            objectChildren.push(child);
          } else {
            tableChildren.push(child);
          }
        }

        // Fetch chairs for all tables in parallel
        await Promise.all(
          tableChildren.map(async (child) => {
            try {
              child.children = await fetchTablesFn(child.id);
            } catch {
              child.children = [];
            }
          })
        );

        let objIdx = 0;
        for (const obj of objectChildren) {
          editorObjects.push(resourceToObject(obj, room.id, editorRoom, objIdx++));
        }
        let tableIdx = 0;
        for (const tbl of tableChildren) {
          editorTables.push(resourceToTable(tbl, room.id, editorRoom, tableIdx++));
        }
      }

      console.log('[LayoutEditor] DONE:', editorRooms.length, 'rooms,', editorTables.length, 'tables,', editorObjects.length, 'objects');
      dispatch({ type: 'LOAD_FLOOR', rooms: editorRooms, tables: editorTables, objects: editorObjects, floorId });
    },
    [dispatch],
  );

  const saveAll = useCallback(
    async (rooms: EditorRoom[], tables: EditorTable[], objects: EditorObject[]) => {
      const dirtyRooms = rooms.filter((r) => r.dirty);
      const dirtyTables = tables.filter((t) => t.dirty);
      const dirtyObjects = objects.filter((o) => o.dirty);

      if (dirtyRooms.length === 0 && dirtyTables.length === 0 && dirtyObjects.length === 0) {
        dispatch({ type: 'MARK_CLEAN' });
        toast.info('Değişiklik yok');
        return;
      }

      let savedCount = 0;
      let errorCount = 0;

      // Save rooms one by one
      for (const room of dirtyRooms) {
        try {
          const coordStr = serializeCoordinates({ x: room.x, y: room.y });
          console.log('[LayoutEditor] Saving room:', room.id, room.name, 'coords:', coordStr, 'w:', room.w, 'h:', room.h);
          const result = await (apiRef.current || resourceApi).update(room.id, {
            name: room.name,
            capacity: room.capacity,
            coordinates: coordStr,
            width: room.w,
            height: room.h,
          });
          if (result.success) {
            savedCount++;
          } else {
            console.error('[LayoutEditor] Room save error:', result.error);
            errorCount++;
          }
        } catch (error) {
          console.error('[LayoutEditor] Room save exception:', error);
          errorCount++;
        }
      }

      // Save tables one by one
      for (const table of dirtyTables) {
        try {
          const coordStr = serializeCoordinates({ x: table.x, y: table.y });
          console.log('[LayoutEditor] Saving table:', table.id, table.name, 'coords:', coordStr, 'w:', table.w, 'h:', table.h, 'r:', table.r);
          const result = await (apiRef.current || resourceApi).update(table.id, {
            name: table.name,
            capacity: table.capacity,
            coordinates: coordStr,
            width: table.w,
            height: table.h,
            rotation: table.r,
          });
          if (result.success) {
            savedCount++;
          } else {
            console.error('[LayoutEditor] Table save error:', result.error);
            errorCount++;
          }
        } catch (error) {
          console.error('[LayoutEditor] Table save exception:', error);
          errorCount++;
        }
      }

      // Save chairs of dirty tables
      for (const table of dirtyTables) {
        for (const chair of table.chairs) {
          try {
            await (apiRef.current || resourceApi).update(chair.id, { name: chair.name });
            savedCount++;
          } catch (error) {
            console.error('[LayoutEditor] Chair save exception:', error);
            errorCount++;
          }
        }
      }

      // Save objects one by one
      for (const obj of dirtyObjects) {
        try {
          const coordStr = serializeCoordinates({ x: obj.x, y: obj.y });
          console.log('[LayoutEditor] Saving object:', obj.id, obj.name, 'coords:', coordStr, 'w:', obj.w, 'h:', obj.h, 'r:', obj.r, 'color:', obj.color);
          const result = await (apiRef.current || resourceApi).update(obj.id, {
            name: obj.name,
            coordinates: coordStr,
            width: obj.w,
            height: obj.h,
            rotation: obj.r,
            color: obj.color || undefined,
          });
          if (result.success) {
            savedCount++;
          } else {
            console.error('[LayoutEditor] Object save error:', result.error);
            errorCount++;
          }
        } catch (error) {
          console.error('[LayoutEditor] Object save exception:', error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        dispatch({ type: 'MARK_CLEAN' });
        toast.success(`${savedCount} öğe kaydedildi`);
      } else {
        toast.error(`${errorCount} hata, ${savedCount} başarılı`);
      }
    },
    [dispatch],
  );

  const createRoom = useCallback(
    async (floorId: number, name: string, existingRoomsCount: number, capacity: number = 20) => {
      console.log('[LayoutEditor] createRoom - types:', typesRef.current.map(t => t.code));
      const roomType = typesRef.current.find((t) => t.code === 'room');
      if (!roomType) {
        toast.error('Oda tipi bulunamadı - Mevcut tipler: ' + typesRef.current.map(t => t.code).join(', '));
        return null;
      }

      const x = snapToGrid(40 + existingRoomsCount * 260);
      const y = snapToGrid(40);

      try {
        const createData: import('@/lib/api').CreateResourceDto = {
          name,
          resourceTypeId: roomType.id,
          parentId: floorId,
          capacity,
          order: existingRoomsCount,
          width: 240,
          height: 300,
          serviceStartAt: '09:00',
          serviceEndAt: '23:00',
        };
        // Only add coordinates if the type supports it
        if (roomType.supportsCoordinates) {
          createData.coordinates = serializeCoordinates({ x, y });
        }
        const result = await (apiRef.current || resourceApi).create(createData);

        if (result.success && result.data) {
          const newRoom: EditorRoom = {
            id: result.data.id,
            name,
            x,
            y,
            w: 240,
            h: 300,
            color: ROOM_COLORS[existingRoomsCount % ROOM_COLORS.length],
            floorId,
            capacity,
            dirty: true,
            resource: result.data,
          };
          dispatch({ type: 'ADD_ROOM', room: newRoom });
          // Don't call onResourceCreated here — it resets parent cache
          // The room is already in editor state
          return newRoom;
        }
        toast.error(result.error || 'Oda oluşturulamadı');
      } catch (error) {
        toast.error('Oda oluşturulamadı: ' + (error as Error).message);
      }
      return null;
    },
    [dispatch],
  );

  const createTable = useCallback(
    async (roomId: number, capacity: number, room: EditorRoom, existingTablesCount: number, allTableNames: string[], nameOverride?: string, maxSeatNumber?: number) => {
      const tableType = typesRef.current.find((t) => t.code === 'table');
      if (!tableType) {
        toast.error('Masa tipi bulunamadı');
        return null;
      }

      const defaults = getTableDefault(capacity);
      const x = snapToGrid(room.x + 30 + (existingTablesCount % 4) * (defaults.w + 30));
      const y = snapToGrid(room.y + 60 + Math.floor(existingTablesCount / 4) * (defaults.h + 40));

      const name = nameOverride ?? (() => {
        const nameSet = new Set(allTableNames);
        let num = existingTablesCount + 1;
        while (nameSet.has(`Masa ${num}`)) num++;
        return `Masa ${num}`;
      })();

      try {
        const createData: import('@/lib/api').CreateResourceDto = {
          name,
          resourceTypeId: tableType.id,
          parentId: roomId,
          capacity,
          order: existingTablesCount,
          width: defaults.w,
          height: defaults.h,
          rotation: 0,
          serviceStartAt: '09:00',
          serviceEndAt: '23:00',
        };
        if (tableType.supportsCoordinates) {
          createData.coordinates = serializeCoordinates({ x, y });
        }
        const result = await (apiRef.current || resourceApi).create(createData);

        if (result.success && result.data) {
          const createdChairs: { id: number; name: string; order: number }[] = [];

          // Create chair resources as children of the table
          const chairType = typesRef.current.find((t) => t.code === 'chair' || t.code === 'seat');
          if (chairType) {
            const positions = getChairPositions(capacity, defaults.w, defaults.h, defaults.isRound);

            // Reorder positions so opposite chairs are sequential pairs:
            // Original: [SideA_0, SideA_1, ..., SideB_0, SideB_1, ...]
            // Reordered: [SideA_0, SideB_0, SideA_1, SideB_1, ...]
            // This gives us: 1↔2 opposite, 3↔4 opposite, 5↔6 opposite, etc.
            const perSide = Math.ceil(capacity / 2);
            const reordered: typeof positions = [];
            for (let i = 0; i < perSide; i++) {
              reordered.push(positions[i]); // SideA chair
              if (perSide + i < positions.length) {
                reordered.push(positions[perSide + i]); // SideB chair (opposite)
              }
            }

            const seatStart = (maxSeatNumber ?? 0);
            for (let i = 0; i < reordered.length; i++) {
              const chairName = `${seatStart + i + 1}`;
              const chairPos = reordered[i];
              const chairX = Math.round(x + defaults.w / 2 + chairPos.x);
              const chairY = Math.round(y + defaults.h / 2 + chairPos.y);

              try {
                const chairData: import('@/lib/api').CreateResourceDto = {
                  name: chairName,
                  resourceTypeId: chairType.id,
                  parentId: result.data.id,
                  capacity: 1,
                  order: i + 1,
                };
                if (chairType.supportsCoordinates) {
                  chairData.coordinates = serializeCoordinates({ x: chairX, y: chairY });
                }
                const chairResult = await (apiRef.current || resourceApi).create(chairData);
                if (chairResult.success && chairResult.data) {
                  createdChairs.push({ id: chairResult.data.id, name: chairName, order: i + 1 });
                }
              } catch (chairError) {
                console.error(`[LayoutEditor] Chair ${chairName} creation failed:`, chairError);
              }
            }
            toast.success(`Masa ve ${createdChairs.length} sandalye oluşturuldu`);
          } else {
            toast.success('Masa oluşturuldu');
          }

          const newTable: EditorTable = {
            id: result.data.id,
            name,
            x,
            y,
            w: defaults.w,
            h: defaults.h,
            r: 0,
            capacity,
            isRound: defaults.isRound,
            roomId,
            dirty: true,
            resource: result.data,
            chairs: createdChairs,
          };
          dispatch({ type: 'ADD_TABLE', table: newTable });

          return newTable;
        }
        toast.error(result.error || 'Masa oluşturulamadı');
      } catch (error) {
        toast.error('Masa oluşturulamadı: ' + (error as Error).message);
      }
      return null;
    },
    [dispatch],
  );

  const createObject = useCallback(
    async (roomId: number, kind: ObjectKind, room: EditorRoom, existingObjectsCount: number, customName?: string, customColor?: string) => {
      const objectType = typesRef.current.find((t) => t.code === 'object');
      if (!objectType) {
        toast.error('Nesne tipi bulunamadı - Mevcut tipler: ' + typesRef.current.map(t => t.code).join(', '));
        return null;
      }

      const defaults = OBJECT_DEFAULTS[kind];
      const label = customName || OBJECT_KIND_LABELS[kind];
      const tempName = `${label}`;

      // Position objects along the bottom of the room, stacked
      const x = snapToGrid(room.x + 10);
      const y = snapToGrid(room.y + room.h - 20 - existingObjectsCount * (defaults.h + 10));

      const color = customColor || (kind === 'free' ? OBJECT_KIND_CONFIG.free.defaultColor : undefined);

      try {
        const createData: import('@/lib/api').CreateResourceDto = {
          name: tempName,
          resourceTypeId: objectType.id,
          parentId: roomId,
          capacity: 0,
          order: existingObjectsCount,
          width: defaults.w,
          height: defaults.h,
          rotation: 0,
          color: color || undefined,
        };
        if (objectType.supportsCoordinates) {
          createData.coordinates = serializeCoordinates({ x, y });
        }
        const result = await (apiRef.current || resourceApi).create(createData);

        if (result.success && result.data) {
          // Update name to include ID: "Label-{id}" — include all fields to prevent backend clearing them
          const finalName = `${label}-${result.data.id}`;
          await (apiRef.current || resourceApi).update(result.data.id, {
            name: finalName,
            coordinates: serializeCoordinates({ x, y }),
            width: defaults.w,
            height: defaults.h,
            rotation: 0,
            color: color || undefined,
          });

          const newObj: EditorObject = {
            id: result.data.id,
            name: finalName,
            displayName: label,
            kind,
            color: color || undefined,
            x,
            y,
            w: defaults.w,
            h: defaults.h,
            r: 0,
            roomId,
            dirty: false,
            resource: result.data,
          };
          dispatch({ type: 'ADD_OBJECT', object: newObj });
          return newObj;
        }
        toast.error(result.error || 'Nesne oluşturulamadı');
      } catch (error) {
        toast.error('Nesne oluşturulamadı: ' + (error as Error).message);
      }
      return null;
    },
    [dispatch],
  );

  const deleteItem = useCallback(
    async (itemType: 'room' | 'table' | 'object', id: number) => {
      try {
        const result = await (apiRef.current || resourceApi).delete(id);
        if (result.success) {
          dispatch({ type: 'DELETE_ITEM', itemType, id });
          const label = itemType === 'room' ? 'Oda' : itemType === 'table' ? 'Masa' : 'Nesne';
          toast.success(`${label} silindi`);
        } else {
          toast.error(result.error || 'Silme hatası');
        }
      } catch (error) {
        toast.error('Silme hatası: ' + (error as Error).message);
      }
    },
    [dispatch],
  );

  return { loadFloorData, saveAll, createRoom, createTable, createObject, deleteItem };
}
