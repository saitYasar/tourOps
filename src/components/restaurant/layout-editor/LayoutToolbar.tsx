'use client';

import { Plus, ZoomIn, ZoomOut, Save, SquarePlus, Columns, PanelTop, Box, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ResourceDto } from '@/lib/api';
import type { ObjectKind } from './types';
import { useLanguage } from '@/contexts/LanguageContext';

interface LayoutToolbarProps {
  floors: ResourceDto[];
  activeFloorId: number | null;
  isDirty: boolean;
  zoom: number;
  onFloorChange: (floorId: number) => void;
  onAddRoom: () => void;
  onAddTable: () => void;
  onAddObject: (kind: ObjectKind) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSave: () => void;
  saving: boolean;
  roomCount: number;
  canUndo: boolean;
  onUndo: () => void;
}

export function LayoutToolbar({
  floors,
  activeFloorId,
  isDirty,
  zoom,
  onFloorChange,
  onAddRoom,
  onAddTable,
  onAddObject,
  onZoomIn,
  onZoomOut,
  onSave,
  saving,
  roomCount,
  canUndo,
  onUndo,
}: LayoutToolbarProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border flex-wrap">
      {/* Floor selector */}
      <Select
        value={activeFloorId?.toString() ?? ''}
        onValueChange={(val) => onFloorChange(Number(val))}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder={t.venue.floor} />
        </SelectTrigger>
        <SelectContent>
          {floors.map((floor) => (
            <SelectItem key={floor.id} value={floor.id.toString()}>
              {floor.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="h-6 w-px bg-slate-300" />

      {/* Add room */}
      <Button
        variant="outline"
        size="sm"
        onClick={onAddRoom}
        disabled={!activeFloorId}
      >
        <SquarePlus className="h-4 w-4 mr-1" />
        {t.venue.newRoom}
      </Button>

      {/* Add table */}
      <Button
        variant="outline"
        size="sm"
        onClick={onAddTable}
        disabled={!activeFloorId || roomCount === 0}
      >
        <Plus className="h-4 w-4 mr-1" />
        {t.venue.newTable}
      </Button>

      {/* Add object (wall, window, column) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!activeFloorId || roomCount === 0}
          >
            <Columns className="h-4 w-4 mr-1" />
            {t.layoutEditor?.newObject ?? 'Nesne Ekle'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onAddObject('window')}>
            <PanelTop className="h-4 w-4 mr-2" />
            {t.layoutEditor?.windowSide ?? 'Cam Kenarı'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddObject('wall')}>
            <Columns className="h-4 w-4 mr-2" />
            {t.layoutEditor?.wall ?? 'Duvar'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddObject('free')}>
            <Box className="h-4 w-4 mr-2" />
            {t.layoutEditor?.freeObject ?? 'Serbest Obje'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-6 w-px bg-slate-300" />

      {/* Undo */}
      <Button
        variant="outline"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        title="Ctrl+Z"
      >
        <Undo2 className="h-4 w-4 mr-1" />
        {t.layoutEditor?.undo ?? 'Geri Al'}
      </Button>

      <div className="h-6 w-px bg-slate-300" />

      {/* Zoom controls */}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-xs text-slate-500 w-12 text-center">
        {Math.round(zoom * 100)}%
      </span>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn}>
        <ZoomIn className="h-4 w-4" />
      </Button>

      <div className="flex-1" />

      {/* Dirty indicator + Save */}
      {isDirty && (
        <Badge variant="secondary" className="text-amber-600 bg-amber-50">
          {t.layoutEditor?.unsaved ?? 'Kaydedilmemiş'}
        </Badge>
      )}
      <Button
        size="sm"
        onClick={onSave}
        disabled={!isDirty || saving}
      >
        <Save className="h-4 w-4 mr-1" />
        {saving ? (t.layoutEditor?.saving ?? 'Kaydediliyor...') : (t.layoutEditor?.save ?? 'Kaydet')}
      </Button>
    </div>
  );
}
