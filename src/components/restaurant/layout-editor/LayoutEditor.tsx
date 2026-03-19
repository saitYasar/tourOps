'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { LayoutEditorProps } from './types';
import { useLayoutEditorState } from './hooks/useLayoutEditorState';
import { useLayoutSync } from './hooks/useLayoutSync';
import { LayoutToolbar } from './LayoutToolbar';
import { LayoutInspector } from './LayoutInspector';
import { LoadingState, EmptyState } from '@/components/shared';
import { MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ObjectKind, EditorTable, EditorObject, EditorRoom, UndoableSnapshot, UndoEntry, EditorAction } from './types';
import { resourceApi } from '@/lib/api';
import { toast } from 'sonner';
import { TablePreview } from './TablePreview';

type ClipboardItem =
  | { type: 'table'; data: Pick<EditorTable, 'name' | 'capacity' | 'w' | 'h' | 'r' | 'roomId' | 'x' | 'y'> }
  | { type: 'object'; data: Pick<EditorObject, 'kind' | 'color' | 'displayName' | 'w' | 'h' | 'r' | 'roomId' | 'x' | 'y'> }
  | { type: 'room'; data: {
      name: string; capacity: number; w: number; h: number;
      tables: Pick<EditorTable, 'name' | 'capacity' | 'w' | 'h' | 'r' | 'x' | 'y'>[];
      objects: Pick<EditorObject, 'kind' | 'color' | 'displayName' | 'w' | 'h' | 'r' | 'x' | 'y'>[];
    }};

const LayoutCanvas = dynamic(
  () => import('./LayoutCanvas').then((mod) => ({ default: mod.LayoutCanvas })),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-lg border"><LoadingState message="Canvas yükleniyor..." /></div> },
);

type AddDialog =
  | { type: 'room' }
  | { type: 'table' }
  | { type: 'free-object' }
  | null;

export function LayoutEditor({
  resources,
  resourceTypes,
  childrenCache,
  onResourceCreated,
  onResourceUpdated,
  onResourceDeleted,
  onReady,
  apiAdapter,
}: LayoutEditorProps) {
  const { t } = useLanguage();
  const { state, dispatch, getSelectedRoom, getSelectedTable, getSelectedObject } = useLayoutEditorState();
  const { loadFloorData, saveAll, createRoom, createTable, createObject, deleteItem } = useLayoutSync(
    dispatch,
    childrenCache,
    resourceTypes,
    onResourceCreated,
    onResourceUpdated,
    onResourceDeleted,
    apiAdapter,
  );

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const loadedFloorRef = useRef<number | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Add dialog state
  const [addDialog, setAddDialog] = useState<AddDialog>(null);
  const [addName, setAddName] = useState('');
  const [addCapacity, setAddCapacity] = useState(4);
  const [addRoomCapacity, setAddRoomCapacity] = useState(20);
  const [freeObjectColor, setFreeObjectColor] = useState('#A3E635');
  const clipboardRef = useRef<ClipboardItem | null>(null);

  // ── Undo system ──────────────────────────────────────────────
  const MAX_UNDO = 30;
  const undoHistoryRef = useRef<UndoEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // Keep a ref to current state to avoid stale closures in dispatchWithUndo
  const stateRef = useRef(state);
  stateRef.current = state;

  // Track last undo-push to debounce rapid drags
  const lastUndoPushRef = useRef<{ actionType: string; targetId: number; time: number } | null>(null);

  const takeSnapshot = useCallback((): UndoableSnapshot => {
    const s = stateRef.current;
    return {
      rooms: s.rooms.map(r => ({ ...r })),
      tables: s.tables.map(t => ({ ...t, chairs: [...t.chairs] })),
      objects: s.objects.map(o => ({ ...o })),
    };
  }, []);

  const pushUndo = useCallback((label: string, snapshot: UndoableSnapshot, apiReverseOps?: UndoEntry['apiReverseOps']) => {
    undoHistoryRef.current.push({ label, snapshot, apiReverseOps });
    if (undoHistoryRef.current.length > MAX_UNDO) {
      undoHistoryRef.current.shift();
    }
    setCanUndo(true);
  }, []);

  const clearUndoHistory = useCallback(() => {
    undoHistoryRef.current = [];
    setCanUndo(false);
  }, []);

  /** Wrap dispatch: auto-pushes undo snapshot for undoable local actions */
  const dispatchWithUndo = useCallback((action: EditorAction) => {
    const UNDOABLE_TYPES = [
      'MOVE_TABLE', 'ROTATE_TABLE', 'MOVE_ROOM', 'MOVE_ROOM_WITH_CHILDREN', 'RESIZE_ROOM',
      'UPDATE_TABLE_PROPERTY', 'UPDATE_ROOM_PROPERTY',
      'MOVE_OBJECT', 'ROTATE_OBJECT', 'UPDATE_OBJECT_PROPERTY',
    ];
    if (UNDOABLE_TYPES.includes(action.type)) {
      const targetId = 'id' in action ? (action as { id: number }).id : 0;
      const now = Date.now();
      const last = lastUndoPushRef.current;
      // Debounce: skip if same action type + target within 2s
      if (last && last.actionType === action.type && last.targetId === targetId && now - last.time < 2000) {
        // Skip snapshot, just dispatch
      } else {
        const snapshot = takeSnapshot();
        pushUndo(action.type, snapshot);
        lastUndoPushRef.current = { actionType: action.type, targetId, time: now };
      }
    }
    dispatch(action);
  }, [dispatch, takeSnapshot, pushUndo]);

  const handleUndo = useCallback(async () => {
    const entry = undoHistoryRef.current.pop();
    if (!entry) return;

    // Execute API reverse operations (delete created resources)
    if (entry.apiReverseOps) {
      for (const op of entry.apiReverseOps) {
        if (op.action === 'delete') {
          for (const id of op.resourceIds) {
            try {
              await (apiAdapter || resourceApi).delete(id);
            } catch (err) {
              console.error('[Undo] Failed to delete resource', id, err);
            }
          }
        }
      }
    }

    dispatch({ type: 'RESTORE_SNAPSHOT', snapshot: entry.snapshot });
    setCanUndo(undoHistoryRef.current.length > 0);
    toast.info(t.layoutEditor?.undone ?? 'Geri alındı');
  }, [dispatch, t]);

  // Keyboard shortcuts: Delete, Ctrl+C, Ctrl+V, Ctrl+Z
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't handle if focus is in input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const isMeta = e.metaKey || e.ctrlKey;

      // Ctrl+Z → undo (guard against undo during paste/create)
      if (isMeta && e.key === 'z' && !creating) {
        e.preventDefault();
        await handleUndo();
        return;
      }

      // Delete / Backspace → delete selected item (clears undo history)
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedItem) {
        e.preventDefault();
        await deleteItem(state.selectedItem.type, state.selectedItem.id);
        clearUndoHistory();
        return;
      }

      // Ctrl+C → copy selected room, table, or object
      if (isMeta && e.key === 'c' && state.selectedItem) {
        if (state.selectedItem.type === 'room') {
          const room = state.rooms.find(r => r.id === state.selectedItem!.id);
          if (room) {
            const roomTables = state.tables.filter(t => t.roomId === room.id);
            const roomObjects = state.objects.filter(o => o.roomId === room.id);
            clipboardRef.current = {
              type: 'room',
              data: {
                name: room.name,
                capacity: room.capacity,
                w: room.w,
                h: room.h,
                tables: roomTables.map(t => ({
                  name: t.name, capacity: t.capacity, w: t.w, h: t.h, r: t.r,
                  x: t.x - room.x, y: t.y - room.y,
                })),
                objects: roomObjects.map(o => ({
                  kind: o.kind, color: o.color, displayName: o.displayName, w: o.w, h: o.h, r: o.r,
                  x: o.x - room.x, y: o.y - room.y,
                })),
              },
            };
            toast.info(t.layoutEditor?.roomCopied ?? 'Oda kopyalandı');
          }
        } else if (state.selectedItem.type === 'table') {
          const tbl = state.tables.find(t => t.id === state.selectedItem!.id);
          if (tbl) {
            clipboardRef.current = {
              type: 'table',
              data: { name: tbl.name, capacity: tbl.capacity, w: tbl.w, h: tbl.h, r: tbl.r, roomId: tbl.roomId, x: tbl.x, y: tbl.y },
            };
            toast.info('Masa kopyalandı');
          }
        } else if (state.selectedItem.type === 'object') {
          const obj = state.objects.find(o => o.id === state.selectedItem!.id);
          if (obj) {
            clipboardRef.current = {
              type: 'object',
              data: { kind: obj.kind, color: obj.color, displayName: obj.displayName, w: obj.w, h: obj.h, r: obj.r, roomId: obj.roomId, x: obj.x, y: obj.y },
            };
            toast.info('Nesne kopyalandı');
          }
        }
        return;
      }

      // Ctrl+V → paste
      if (isMeta && e.key === 'v' && clipboardRef.current) {
        e.preventDefault();
        const clip = clipboardRef.current;

        if (clip.type === 'room') {
          // Paste room with all children
          if (!state.activeFloorId) return;
          setCreating(true);
          const snapshot = takeSnapshot();

          // Generate unique room name
          const existingNames = new Set(state.rooms.map(r => r.name));
          let copyNum = 1;
          let newRoomName = `${clip.data.name} (Kopya)`;
          while (existingNames.has(newRoomName)) {
            copyNum++;
            newRoomName = `${clip.data.name} (Kopya ${copyNum})`;
          }

          const newRoom = await createRoom(state.activeFloorId, newRoomName, state.rooms.length, clip.data.capacity);
          if (newRoom) {
            const createdIds: number[] = [newRoom.id];

            // Create tables at relative positions (before resize so newRoom.x/y is stable)
            for (const tblData of clip.data.tables) {
              const tablesInRoom = stateRef.current.tables.filter(tt => tt.roomId === newRoom.id);
              const allTableNames = stateRef.current.tables.map(tt => tt.name);
              const nameSet = new Set(allTableNames);
              let num = stateRef.current.tables.length + 1;
              while (nameSet.has(`Masa ${num}`)) num++;
              const newName = `Masa ${num}`;

              const newTable = await createTable(newRoom.id, tblData.capacity, newRoom, tablesInRoom.length, allTableNames, newName);
              if (newTable) {
                createdIds.push(newTable.id);
                dispatch({ type: 'MOVE_TABLE', id: newTable.id, x: newRoom.x + tblData.x, y: newRoom.y + tblData.y });
                if (tblData.r !== 0) {
                  dispatch({ type: 'ROTATE_TABLE', id: newTable.id, r: tblData.r });
                }
              }
            }

            // Create objects at relative positions (before resize so newRoom.x/y is stable)
            for (const objData of clip.data.objects) {
              const objectsInRoom = stateRef.current.objects.filter(o => o.roomId === newRoom.id);
              const newObj = await createObject(
                newRoom.id,
                objData.kind,
                newRoom,
                objectsInRoom.length,
                objData.kind === 'free' ? objData.displayName : undefined,
                objData.color,
              );
              if (newObj) {
                createdIds.push(newObj.id);
                dispatch({ type: 'MOVE_OBJECT', id: newObj.id, x: newRoom.x + objData.x, y: newRoom.y + objData.y });
                if (objData.r !== 0) {
                  dispatch({ type: 'ROTATE_OBJECT', id: newObj.id, r: objData.r });
                }
              }
            }

            // Resize room AFTER tables/objects are placed so pushRoomsAfterResize
            // moves them together with the room if it gets pushed
            if (clip.data.w !== 240 || clip.data.h !== 300) {
              dispatch({ type: 'RESIZE_ROOM', id: newRoom.id, w: clip.data.w, h: clip.data.h });
            }

            pushUndo(t.layoutEditor?.roomPasted ?? 'Oda yapıştırıldı', snapshot, [{ action: 'delete', resourceIds: createdIds }]);
            toast.success(t.layoutEditor?.roomPasted ?? 'Oda yapıştırıldı');
          }
          setCreating(false);
          return;
        }

        // Table / Object paste
        const targetRoom = 'roomId' in clip.data
          ? (state.rooms.find(r => r.id === clip.data.roomId) ?? state.rooms[0])
          : state.rooms[0];
        if (!targetRoom) return;

        if (clip.type === 'table') {
          const snapshot = takeSnapshot();
          setCreating(true);
          const tablesInRoom = state.tables.filter(t => t.roomId === targetRoom.id);
          const allTableNames = state.tables.map(t => t.name);
          const nameSet = new Set(allTableNames);
          let num = state.tables.length + 1;
          while (nameSet.has(`Masa ${num}`)) num++;
          const newName = `Masa ${num}`;

          const newTable = await createTable(targetRoom.id, clip.data.capacity, targetRoom, tablesInRoom.length, allTableNames, newName);
          if (newTable) {
            dispatch({ type: 'MOVE_TABLE', id: newTable.id, x: clip.data.x + 40, y: clip.data.y + 40 });
            pushUndo('Paste table', snapshot, [{ action: 'delete', resourceIds: [newTable.id] }]);
          }
          setCreating(false);
        } else if (clip.type === 'object') {
          const snapshot = takeSnapshot();
          setCreating(true);
          const objectsInRoom = state.objects.filter(o => o.roomId === targetRoom.id);
          const newObj = await createObject(
            targetRoom.id,
            clip.data.kind,
            targetRoom,
            objectsInRoom.length,
            clip.data.kind === 'free' ? clip.data.displayName : undefined,
            clip.data.color,
          );
          if (newObj) {
            dispatch({ type: 'MOVE_OBJECT', id: newObj.id, x: clip.data.x + 40, y: clip.data.y + 40 });
            pushUndo('Paste object', snapshot, [{ action: 'delete', resourceIds: [newObj.id] }]);
          }
          setCreating(false);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedItem, state.tables, state.objects, state.rooms, state.activeFloorId, deleteItem, createTable, createObject, createRoom, dispatch, handleUndo, creating, clearUndoHistory, takeSnapshot, pushUndo, t]);

  useEffect(() => {
    if (resources.length > 0 && loadedFloorRef.current === null) {
      loadedFloorRef.current = resources[0].id;
      setLoading(true);
      loadFloorData(resources[0].id).finally(() => {
        setLoading(false);
        // Signal parent that initial API calls are done — safe to start loadAllChildren
        onReadyRef.current?.();
      });
    }
  }, [resources]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFloorChange = useCallback(
    async (floorId: number) => {
      loadedFloorRef.current = floorId;
      setLoading(true);
      clearUndoHistory();
      await loadFloorData(floorId);
      setLoading(false);
    },
    [loadFloorData, clearUndoHistory],
  );

  const handleAddRoomClick = useCallback(() => {
    const existingNames = new Set(state.rooms.map((r) => r.name));
    let num = state.rooms.length + 1;
    while (existingNames.has(`Salon ${num}`)) num++;
    setAddName(`Salon ${num}`);
    setAddRoomCapacity(20);
    setAddDialog({ type: 'room' });
  }, [state.rooms]);

  const handleAddTableClick = useCallback(() => {
    const allNames = new Set(state.tables.map((tt) => tt.name));
    let num = state.tables.length + 1;
    while (allNames.has(`Masa ${num}`)) num++;
    setAddName(`Masa ${num}`);
    setAddCapacity(4);
    setAddDialog({ type: 'table' });
  }, [state.tables]);

  const handleAddObjectClick = useCallback(async (kind: ObjectKind) => {
    if (kind === 'free') {
      // Open dialog for free objects to get name + color
      setAddName('');
      setFreeObjectColor('#A3E635');
      setAddDialog({ type: 'free-object' });
      return;
    }

    let targetRoom = getSelectedRoom();
    if (!targetRoom && state.rooms.length > 0) {
      targetRoom = state.rooms[0];
    }
    if (!targetRoom) return;

    setCreating(true);
    const snapshot = takeSnapshot();
    const objectsInRoom = state.objects.filter((o) => o.roomId === targetRoom!.id);
    const newObj = await createObject(targetRoom.id, kind, targetRoom, objectsInRoom.length);
    if (newObj) {
      pushUndo('Add object', snapshot, [{ action: 'delete', resourceIds: [newObj.id] }]);
    }
    setCreating(false);
  }, [state.rooms, state.objects, createObject, getSelectedRoom, takeSnapshot, pushUndo]);

  const handleAddConfirm = useCallback(async () => {
    if (!addName.trim() || !addDialog) return;
    setCreating(true);
    const snapshot = takeSnapshot();

    if (addDialog.type === 'room') {
      if (!state.activeFloorId) { setCreating(false); return; }
      const newRoom = await createRoom(state.activeFloorId, addName.trim(), state.rooms.length, addRoomCapacity);
      if (newRoom) {
        pushUndo('Add room', snapshot, [{ action: 'delete', resourceIds: [newRoom.id] }]);
      }
    } else if (addDialog.type === 'free-object') {
      let targetRoom = getSelectedRoom();
      if (!targetRoom && state.rooms.length > 0) {
        targetRoom = state.rooms[0];
      }
      if (!targetRoom) { setCreating(false); return; }

      const objectsInRoom = state.objects.filter((o) => o.roomId === targetRoom!.id);
      const newObj = await createObject(targetRoom.id, 'free', targetRoom, objectsInRoom.length, addName.trim(), freeObjectColor);
      if (newObj) {
        pushUndo('Add free object', snapshot, [{ action: 'delete', resourceIds: [newObj.id] }]);
      }
    } else {
      let targetRoom = getSelectedRoom();
      if (!targetRoom && state.rooms.length > 0) {
        targetRoom = state.rooms[0];
      }
      if (!targetRoom) { setCreating(false); return; }

      const tablesInRoom = state.tables.filter((tt) => tt.roomId === targetRoom!.id);
      const allTableNames = state.tables.map((tt) => tt.name);
      const newTable = await createTable(targetRoom.id, addCapacity, targetRoom, tablesInRoom.length, allTableNames, addName.trim());
      if (newTable) {
        pushUndo('Add table', snapshot, [{ action: 'delete', resourceIds: [newTable.id] }]);
      }
    }

    setCreating(false);
    setAddDialog(null);
    setAddName('');
  }, [addDialog, addName, addCapacity, addRoomCapacity, freeObjectColor, state.activeFloorId, state.rooms, state.tables, state.objects, createRoom, createTable, createObject, getSelectedRoom, takeSnapshot, pushUndo]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await saveAll(state.rooms, state.tables, state.objects);
    clearUndoHistory();
    setSaving(false);
  }, [saveAll, state.rooms, state.tables, state.objects, clearUndoHistory]);

  const handleDelete = useCallback(
    async (itemType: 'room' | 'table' | 'object', id: number) => {
      await deleteItem(itemType, id);
      clearUndoHistory();
    },
    [deleteItem, clearUndoHistory],
  );

  if (!resources.length) {
    return (
      <EmptyState
        icon={MapPin}
        title={t.layoutEditor?.noData ?? 'Kat planı için veri yok'}
        description={t.layoutEditor?.noDataDesc ?? 'Önce liste görünümünden kat, salon ve masa ekleyin'}
      />
    );
  }

  return (
    <div className="space-y-3">
      <LayoutToolbar
        floors={resources}
        activeFloorId={state.activeFloorId}
        isDirty={state.isDirty}
        zoom={state.zoom}
        onFloorChange={handleFloorChange}
        onAddRoom={handleAddRoomClick}
        onAddTable={handleAddTableClick}
        onAddObject={handleAddObjectClick}
        onZoomIn={() => dispatch({ type: 'SET_ZOOM', zoom: state.zoom * 1.2 })}
        onZoomOut={() => dispatch({ type: 'SET_ZOOM', zoom: state.zoom / 1.2 })}
        onSave={handleSave}
        saving={saving}
        roomCount={state.rooms.length}
        canUndo={canUndo}
        onUndo={handleUndo}
      />

      <div className="flex" style={{ height: 'calc(100vh - 260px)', minHeight: 600 }}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-lg border">
            <LoadingState message="Kat verisi yükleniyor..." />
          </div>
        ) : (
          <LayoutCanvas state={state} dispatch={dispatchWithUndo} />
        )}
        <LayoutInspector
          selectedRoom={getSelectedRoom()}
          selectedTable={getSelectedTable()}
          selectedObject={getSelectedObject()}
          rooms={state.rooms}
          dispatch={dispatchWithUndo}
          onDelete={handleDelete}
        />
      </div>

      {/* Add Room / Table / Free Object Dialog */}
      <Dialog open={addDialog !== null} onOpenChange={(open) => { if (!open) setAddDialog(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {addDialog?.type === 'room'
                ? t.venue.newRoom
                : addDialog?.type === 'free-object'
                  ? (t.layoutEditor?.newFreeObject ?? 'Yeni Serbest Obje')
                  : t.venue.newTable}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name input */}
            <div className="space-y-2">
              <Label>{t.layoutEditor?.name ?? 'Ad'}</Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={
                  addDialog?.type === 'room'
                    ? 'Örn: Ana Salon, VIP Bölüm, Bahçe'
                    : addDialog?.type === 'free-object'
                      ? (t.layoutEditor?.freeObjectNamePlaceholder ?? 'Örn: Ağaç, Kapı, Saksı...')
                      : 'Örn: Masa 1, Pencere Kenarı'
                }
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && addDialog?.type !== 'table') handleAddConfirm(); }}
              />
            </div>

            {/* Color picker for free objects */}
            {addDialog?.type === 'free-object' && (
              <div className="space-y-2">
                <Label>{t.layoutEditor?.color ?? 'Renk'}</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={freeObjectColor}
                    onChange={(e) => setFreeObjectColor(e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <span className="text-sm text-slate-500">{freeObjectColor}</span>
                </div>
              </div>
            )}

            {/* Capacity input for rooms */}
            {addDialog?.type === 'room' && (
              <div className="space-y-2">
                <Label>Salon Kapasitesi (Kişi)</Label>
                <Input
                  type="number"
                  value={addRoomCapacity || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setAddRoomCapacity(Math.max(1, Number(e.target.value)))}
                  min={1}
                  step={1}
                  placeholder="Örn: 30"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddConfirm(); }}
                />
              </div>
            )}

            {/* Capacity picker — visual cards (for tables) */}
            {addDialog?.type === 'table' && (
              <div className="space-y-2">
                <Label>{t.venue.capacity}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 8].map((cap) => (
                    <TablePreview
                      key={cap}
                      capacity={cap}
                      selected={addCapacity === cap}
                      onClick={() => setAddCapacity(cap)}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(null)}>
              {t.common.cancel}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button onClick={handleAddConfirm} disabled={!addName.trim() || creating}>
                    {creating ? t.common.loading : t.common.create}
                  </Button>
                </span>
              </TooltipTrigger>
              {(!addName.trim() || creating) && <TooltipContent>{!addName.trim() ? t.tooltips.nameRequired : t.tooltips.formSubmitting}</TooltipContent>}
            </Tooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
