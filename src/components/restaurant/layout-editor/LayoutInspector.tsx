'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ConfirmDialog } from '@/components/shared';
import type { EditorRoom, EditorTable, EditorObject, EditorAction } from './types';
import { OBJECT_KIND_LABELS, OBJECT_KIND_CONFIG } from './types';
import { useLanguage } from '@/contexts/LanguageContext';

interface LayoutInspectorProps {
  selectedRoom: EditorRoom | null;
  selectedTable: EditorTable | null;
  selectedObject: EditorObject | null;
  rooms: EditorRoom[];
  dispatch: React.Dispatch<EditorAction>;
  onDelete: (itemType: 'room' | 'table' | 'object', id: number) => void;
}

export function LayoutInspector({
  selectedRoom,
  selectedTable,
  selectedObject,
  rooms,
  dispatch,
  onDelete,
}: LayoutInspectorProps) {
  const { t } = useLanguage();
  const le = t.layoutEditor;
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'room' | 'table' | 'object'; id: number } | null>(null);

  const deleteConfirmMessages: Record<string, { title: string; desc: string }> = {
    room: { title: le?.deleteRoom ?? 'Odayı Sil', desc: le?.deleteRoomConfirm ?? 'Bu odayı silmek istediğinize emin misiniz?' },
    table: { title: le?.deleteTable ?? 'Masayı Sil', desc: le?.deleteTableConfirm ?? 'Bu masayı silmek istediğinize emin misiniz?' },
    object: { title: le?.deleteObject ?? 'Nesneyi Sil', desc: le?.deleteObjectConfirm ?? 'Bu nesneyi silmek istediğinize emin misiniz?' },
  };

  const confirmMsg = deleteTarget ? deleteConfirmMessages[deleteTarget.type] : null;
  const confirmDialog = (
    <ConfirmDialog
      open={!!deleteTarget}
      onOpenChange={(open) => !open && setDeleteTarget(null)}
      title={confirmMsg?.title ?? ''}
      description={confirmMsg?.desc ?? ''}
      confirmLabel={t.common.delete}
      onConfirm={() => {
        if (deleteTarget) onDelete(deleteTarget.type, deleteTarget.id);
        setDeleteTarget(null);
      }}
      variant="destructive"
    />
  );

  if (!selectedRoom && !selectedTable && !selectedObject) {
    return (
      <div className="w-64 border-l bg-slate-50 p-4 flex items-center justify-center">
        {confirmDialog}
        <p className="text-sm text-slate-400 text-center">
          {le?.selectItem ?? 'Düzenlemek için bir oda veya masa seçin'}
        </p>
      </div>
    );
  }

  if (selectedRoom) {
    return (
      <div className="w-64 border-l bg-slate-50 p-4 space-y-4 overflow-y-auto">
        <h3 className="font-semibold text-sm">{le?.roomProperties ?? 'Oda Özellikleri'}</h3>

        <div className="space-y-2">
          <Label className="text-xs">{le?.name ?? 'Ad'}</Label>
          <Input
            value={selectedRoom.name}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_ROOM_PROPERTY',
                id: selectedRoom.id,
                key: 'name',
                value: e.target.value,
              })
            }
            className="h-8"
            placeholder="Örn: Ana Salon, VIP Bölüm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Salon Kapasitesi</Label>
          <Input
            type="number"
            value={selectedRoom.capacity || ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_ROOM_PROPERTY',
                id: selectedRoom.id,
                key: 'capacity',
                value: Math.max(1, Number(e.target.value)),
              })
            }
            className="h-8"
            min={1}
            step={1}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">{le?.width ?? 'Genişlik'}</Label>
            <Input
              type="number"
              value={selectedRoom.w || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_ROOM_PROPERTY',
                  id: selectedRoom.id,
                  key: 'w',
                  value: Math.max(100, Number(e.target.value)),
                })
              }
              className="h-8"
              min={100}
              step={20}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{le?.height ?? 'Yükseklik'}</Label>
            <Input
              type="number"
              value={selectedRoom.h || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_ROOM_PROPERTY',
                  id: selectedRoom.id,
                  key: 'h',
                  value: Math.max(100, Number(e.target.value)),
                })
              }
              className="h-8"
              min={100}
              step={20}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <span>X: {Math.round(selectedRoom.x)}</span>
          <span>Y: {Math.round(selectedRoom.y)}</span>
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => setDeleteTarget({ type: 'room', id: selectedRoom.id })}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {le?.deleteRoom ?? 'Odayı Sil'}
        </Button>
        {confirmDialog}
      </div>
    );
  }

  if (selectedTable) {
    return (
      <div className="w-64 border-l bg-slate-50 p-4 space-y-4 overflow-y-auto">
        <h3 className="font-semibold text-sm">{le?.tableProperties ?? 'Masa Özellikleri'}</h3>

        <div className="space-y-2">
          <Label className="text-xs">{le?.name ?? 'Ad'}</Label>
          <Input
            value={selectedTable.name}
            placeholder="Örn: Masa 1, Pencere Kenarı"
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_TABLE_PROPERTY',
                id: selectedTable.id,
                key: 'name',
                value: e.target.value,
              })
            }
            className="h-8"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">{t.venue.capacity}</Label>
          <Select
            value={selectedTable.capacity.toString()}
            onValueChange={(val) =>
              dispatch({
                type: 'UPDATE_TABLE_PROPERTY',
                id: selectedTable.id,
                key: 'capacity',
                value: Number(val),
              })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2, 4, 6, 8, 10, 12].map((cap) => (
                <SelectItem key={cap} value={cap.toString()}>
                  {cap} {t.venue.persons}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">
            {le?.rotation ?? 'Rotasyon'}: {selectedTable.r}°
          </Label>
          <Slider
            value={[selectedTable.r]}
            onValueChange={([val]) =>
              dispatch({
                type: 'ROTATE_TABLE',
                id: selectedTable.id,
                r: val,
              })
            }
            min={0}
            max={360}
            step={15}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <span>X: {Math.round(selectedTable.x)}</span>
          <span>Y: {Math.round(selectedTable.y)}</span>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">{le?.assignRoom ?? 'Oda'}</Label>
          <Select
            value={selectedTable.roomId.toString()}
            onValueChange={(val) =>
              dispatch({
                type: 'UPDATE_TABLE_PROPERTY',
                id: selectedTable.id,
                key: 'roomId',
                value: Number(val),
              })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id.toString()}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => setDeleteTarget({ type: 'table', id: selectedTable.id })}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {le?.deleteTable ?? 'Masayı Sil'}
        </Button>
        {confirmDialog}
      </div>
    );
  }

  if (selectedObject) {
    const config = OBJECT_KIND_CONFIG[selectedObject.kind];

    return (
      <div className="w-64 border-l bg-slate-50 p-4 space-y-4 overflow-y-auto">
        <h3 className="font-semibold text-sm">{le?.objectProperties ?? 'Nesne Özellikleri'}</h3>

        {/* Type (read-only) */}
        <div className="space-y-2">
          <Label className="text-xs">{le?.objectType ?? 'Tip'}</Label>
          <div className="text-sm font-medium text-slate-700 bg-white rounded px-2 py-1.5 border">
            {OBJECT_KIND_LABELS[selectedObject.kind]}
          </div>
        </div>

        {/* Name — editable only for free */}
        {config.nameEditable && (
          <div className="space-y-2">
            <Label className="text-xs">{le?.name ?? 'Ad'}</Label>
            <Input
              value={selectedObject.displayName}
              placeholder="Örn: Ağaç, Kapı, Saksı"
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_OBJECT_PROPERTY',
                  id: selectedObject.id,
                  key: 'displayName',
                  value: e.target.value,
                })
              }
              className="h-8"
            />
          </div>
        )}

        {/* Color picker — wall + free */}
        {config.colorEditable && (
          <div className="space-y-2">
            <Label className="text-xs">{le?.color ?? 'Renk'}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedObject.color || config.defaultColor}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_OBJECT_PROPERTY',
                    id: selectedObject.id,
                    key: 'color',
                    value: e.target.value,
                  })
                }
                className="w-8 h-8 rounded border cursor-pointer"
              />
              <span className="text-xs text-slate-500">
                {selectedObject.color || config.defaultColor}
              </span>
            </div>
          </div>
        )}

        {/* Length (w) + Thickness (h) */}
        <div className="grid grid-cols-2 gap-2">
          {config.lengthEditable && (
            <div className="space-y-1">
              <Label className="text-xs">{le?.length ?? 'Uzunluk'}</Label>
              <Input
                type="number"
                value={selectedObject.w || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_OBJECT_PROPERTY',
                    id: selectedObject.id,
                    key: 'w',
                    value: Math.max(10, Number(e.target.value)),
                  })
                }
                className="h-8"
                min={10}
                step={10}
              />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">{le?.thickness ?? 'Kalınlık'}</Label>
            {config.thicknessEditable ? (
              <Input
                type="number"
                value={selectedObject.h || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_OBJECT_PROPERTY',
                    id: selectedObject.id,
                    key: 'h',
                    value: Math.max(10, Number(e.target.value)),
                  })
                }
                className="h-8"
                min={10}
                step={10}
              />
            ) : (
              <div className="text-sm text-slate-500 bg-white rounded px-2 py-1.5 border">
                {selectedObject.h}px
              </div>
            )}
          </div>
        </div>

        {/* Rotation — column hariç hepsi */}
        {config.rotationEditable && (
          <div className="space-y-2">
            <Label className="text-xs">
              {le?.rotation ?? 'Rotasyon'}: {selectedObject.r}°
            </Label>
            <Slider
              value={[selectedObject.r]}
              onValueChange={([val]) =>
                dispatch({
                  type: 'ROTATE_OBJECT',
                  id: selectedObject.id,
                  r: val,
                })
              }
              min={0}
              max={360}
              step={15}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <span>X: {Math.round(selectedObject.x)}</span>
          <span>Y: {Math.round(selectedObject.y)}</span>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">{le?.assignRoom ?? 'Oda'}</Label>
          <Select
            value={selectedObject.roomId.toString()}
            onValueChange={(val) =>
              dispatch({
                type: 'UPDATE_OBJECT_PROPERTY',
                id: selectedObject.id,
                key: 'roomId',
                value: Number(val),
              })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id.toString()}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => setDeleteTarget({ type: 'object', id: selectedObject.id })}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {le?.deleteObject ?? 'Nesneyi Sil'}
        </Button>
        {confirmDialog}
      </div>
    );
  }

  return null;
}
