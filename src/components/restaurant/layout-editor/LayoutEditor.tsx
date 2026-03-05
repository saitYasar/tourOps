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
import { cn } from '@/lib/utils';
import type { ObjectKind, EditorTable, EditorObject } from './types';
import { toast } from 'sonner';

type ClipboardItem =
  | { type: 'table'; data: Pick<EditorTable, 'name' | 'capacity' | 'w' | 'h' | 'r' | 'roomId' | 'x' | 'y'> }
  | { type: 'object'; data: Pick<EditorObject, 'kind' | 'color' | 'displayName' | 'w' | 'h' | 'r' | 'roomId' | 'x' | 'y'> };

const LayoutCanvas = dynamic(
  () => import('./LayoutCanvas').then((mod) => ({ default: mod.LayoutCanvas })),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-lg border"><LoadingState message="Canvas yükleniyor..." /></div> },
);

type AddDialog =
  | { type: 'room' }
  | { type: 'table' }
  | { type: 'free-object' }
  | null;

// Mini table+chair SVG previews for capacity picker
function TablePreview({ capacity, selected, onClick }: { capacity: number; selected: boolean; onClick: () => void }) {
  const perSide = Math.ceil(capacity / 2);
  const rightCount = capacity - perSide;
  const tw = capacity <= 2 ? 20 : capacity <= 4 ? 26 : capacity <= 6 ? 30 : 36;
  const th = capacity <= 2 ? 20 : Math.max(20, perSide * 12 + 4);
  const isRound = capacity === 2;
  const cx = 28;
  const cy = th / 2 + 6;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all cursor-pointer',
        selected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      <svg width="56" height={th + 12} viewBox={`0 0 56 ${th + 12}`}>
        {/* Left chairs */}
        {Array.from({ length: perSide }).map((_, i) => {
          const spacing = th / (perSide + 1);
          const chairY = cy - th / 2 + spacing * (i + 1);
          return (
            <g key={`l-${i}`}>
              <rect x={cx - tw / 2 - 10} y={chairY - 4} width={8} height={8} rx={1.5} fill="#a8b8cc" stroke="#7a8da3" strokeWidth={0.5} />
              <line x1={cx - tw / 2 - 11} y1={chairY - 5} x2={cx - tw / 2 - 3} y2={chairY - 5} stroke="#6b7d93" strokeWidth={2} strokeLinecap="round" />
            </g>
          );
        })}
        {/* Right chairs */}
        {Array.from({ length: rightCount }).map((_, i) => {
          const spacing = th / (rightCount + 1);
          const chairY = cy - th / 2 + spacing * (i + 1);
          return (
            <g key={`r-${i}`}>
              <rect x={cx + tw / 2 + 2} y={chairY - 4} width={8} height={8} rx={1.5} fill="#a8b8cc" stroke="#7a8da3" strokeWidth={0.5} />
              <line x1={cx + tw / 2 + 3} y1={chairY + 5} x2={cx + tw / 2 + 11} y2={chairY + 5} stroke="#6b7d93" strokeWidth={2} strokeLinecap="round" />
            </g>
          );
        })}
        {/* Table */}
        {isRound ? (
          <circle cx={cx} cy={cy} r={tw / 2} fill="#FEFCE8" stroke="#94a3b8" strokeWidth={1} />
        ) : (
          <rect x={cx - tw / 2} y={cy - th / 2} width={tw} height={th} rx={2} fill="#FEFCE8" stroke="#94a3b8" strokeWidth={1} />
        )}
      </svg>
      <span className={cn(
        'text-sm font-medium',
        selected ? 'text-blue-700' : 'text-slate-600',
      )}>
        {capacity} kişilik
      </span>
    </button>
  );
}

export function LayoutEditor({
  resources,
  resourceTypes,
  childrenCache,
  onResourceCreated,
  onResourceUpdated,
  onResourceDeleted,
  onReady,
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

  // Keyboard shortcuts: Delete, Ctrl+C, Ctrl+V
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't handle if focus is in input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const isMeta = e.metaKey || e.ctrlKey;

      // Delete / Backspace → delete selected item
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedItem) {
        e.preventDefault();
        await deleteItem(state.selectedItem.type, state.selectedItem.id);
        return;
      }

      // Ctrl+C → copy selected table or object
      if (isMeta && e.key === 'c' && state.selectedItem) {
        if (state.selectedItem.type === 'table') {
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

        const targetRoom = state.rooms.find(r => r.id === clip.data.roomId) ?? state.rooms[0];
        if (!targetRoom) return;

        if (clip.type === 'table') {
          const tablesInRoom = state.tables.filter(t => t.roomId === targetRoom.id);
          const allTableNames = state.tables.map(t => t.name);
          // Generate unique name
          const nameSet = new Set(allTableNames);
          let num = state.tables.length + 1;
          while (nameSet.has(`Masa ${num}`)) num++;
          const newName = `Masa ${num}`;

          const newTable = await createTable(targetRoom.id, clip.data.capacity, targetRoom, tablesInRoom.length, allTableNames, newName);
          if (newTable) {
            // Move to offset position from original
            dispatch({ type: 'MOVE_TABLE', id: newTable.id, x: clip.data.x + 40, y: clip.data.y + 40 });
          }
        } else if (clip.type === 'object') {
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
            // Move to offset position from original
            dispatch({ type: 'MOVE_OBJECT', id: newObj.id, x: clip.data.x + 40, y: clip.data.y + 40 });
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedItem, state.tables, state.objects, state.rooms, deleteItem, createTable, createObject, dispatch]);

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
      await loadFloorData(floorId);
      setLoading(false);
    },
    [loadFloorData],
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
    const objectsInRoom = state.objects.filter((o) => o.roomId === targetRoom!.id);
    await createObject(targetRoom.id, kind, targetRoom, objectsInRoom.length);
    setCreating(false);
  }, [state.rooms, state.objects, createObject, getSelectedRoom]);

  const handleAddConfirm = useCallback(async () => {
    if (!addName.trim() || !addDialog) return;
    setCreating(true);

    if (addDialog.type === 'room') {
      if (!state.activeFloorId) { setCreating(false); return; }
      await createRoom(state.activeFloorId, addName.trim(), state.rooms.length, addRoomCapacity);
    } else if (addDialog.type === 'free-object') {
      let targetRoom = getSelectedRoom();
      if (!targetRoom && state.rooms.length > 0) {
        targetRoom = state.rooms[0];
      }
      if (!targetRoom) { setCreating(false); return; }

      const objectsInRoom = state.objects.filter((o) => o.roomId === targetRoom!.id);
      await createObject(targetRoom.id, 'free', targetRoom, objectsInRoom.length, addName.trim(), freeObjectColor);
    } else {
      let targetRoom = getSelectedRoom();
      if (!targetRoom && state.rooms.length > 0) {
        targetRoom = state.rooms[0];
      }
      if (!targetRoom) { setCreating(false); return; }

      const tablesInRoom = state.tables.filter((tt) => tt.roomId === targetRoom!.id);
      const allTableNames = state.tables.map((tt) => tt.name);
      await createTable(targetRoom.id, addCapacity, targetRoom, tablesInRoom.length, allTableNames, addName.trim());
    }

    setCreating(false);
    setAddDialog(null);
    setAddName('');
  }, [addDialog, addName, addCapacity, addRoomCapacity, freeObjectColor, state.activeFloorId, state.rooms, state.tables, state.objects, createRoom, createTable, createObject, getSelectedRoom]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await saveAll(state.rooms, state.tables, state.objects);
    setSaving(false);
  }, [saveAll, state.rooms, state.tables, state.objects]);

  const handleDelete = useCallback(
    async (itemType: 'room' | 'table' | 'object', id: number) => {
      await deleteItem(itemType, id);
    },
    [deleteItem],
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
      />

      <div className="flex" style={{ height: 'calc(100vh - 260px)', minHeight: 600 }}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-lg border">
            <LoadingState message="Kat verisi yükleniyor..." />
          </div>
        ) : (
          <LayoutCanvas state={state} dispatch={dispatch} />
        )}
        <LayoutInspector
          selectedRoom={getSelectedRoom()}
          selectedTable={getSelectedTable()}
          selectedObject={getSelectedObject()}
          rooms={state.rooms}
          dispatch={dispatch}
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
                    ? 'Salon adı'
                    : addDialog?.type === 'free-object'
                      ? (t.layoutEditor?.freeObjectNamePlaceholder ?? 'Ağaç, Kapı, Saksı...')
                      : 'Masa adı'
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
                <Label>{t.venue.capacity}</Label>
                <Input
                  type="number"
                  value={addRoomCapacity || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setAddRoomCapacity(Math.max(1, Number(e.target.value)))}
                  min={1}
                  step={1}
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
            <Button onClick={handleAddConfirm} disabled={!addName.trim() || creating}>
              {creating ? t.common.loading : t.common.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
