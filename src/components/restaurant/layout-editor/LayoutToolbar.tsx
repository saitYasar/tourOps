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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

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
    <div className="flex items-center gap-1.5 md:gap-2 p-2 md:p-3 bg-slate-50 rounded-lg border flex-wrap">
      {/* Floor selector */}
      <Select
        value={activeFloorId?.toString() ?? ''}
        onValueChange={(val) => onFloorChange(Number(val))}
      >
        <SelectTrigger className="w-[120px] md:w-[160px] h-8 md:h-9 text-xs md:text-sm">
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

      <div className="h-6 w-px bg-slate-300 hidden md:block" />

      {/* Add room */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs md:text-sm"
              onClick={onAddRoom}
              disabled={!activeFloorId}
            >
              <SquarePlus className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">{t.venue.newRoom}</span>
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{!activeFloorId ? t.tooltips.noFloorSelected : t.venue.newRoom}</TooltipContent>
      </Tooltip>

      {/* Add table */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs md:text-sm"
              onClick={onAddTable}
              disabled={!activeFloorId || roomCount === 0}
            >
              <Plus className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">{t.venue.newTable}</span>
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{(!activeFloorId || roomCount === 0) ? (!activeFloorId ? t.tooltips.noFloorSelected : t.tooltips.noRoomsYet) : t.venue.newTable}</TooltipContent>
      </Tooltip>

      {/* Add object (wall, window, column) */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs md:text-sm"
                  disabled={!activeFloorId || roomCount === 0}
                >
                  <Columns className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">{t.layoutEditor?.newObject ?? 'Nesne Ekle'}</span>
                </Button>
              </DropdownMenuTrigger>
            </span>
          </TooltipTrigger>
          {(!activeFloorId || roomCount === 0) && <TooltipContent>{!activeFloorId ? t.tooltips.noFloorSelected : t.tooltips.noRoomsYet}</TooltipContent>}
        </Tooltip>
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

      <div className="h-6 w-px bg-slate-300 hidden md:block" />

      {/* Undo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs md:text-sm"
              onClick={onUndo}
              disabled={!canUndo}
              title="Ctrl+Z"
            >
              <Undo2 className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">{t.layoutEditor?.undo ?? 'Geri Al'}</span>
            </Button>
          </span>
        </TooltipTrigger>
        {!canUndo && <TooltipContent>{t.tooltips.noUndoHistory}</TooltipContent>}
      </Tooltip>

      {/* Zoom controls */}
      <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" onClick={onZoomOut}>
        <ZoomOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </Button>
      <span className="text-[10px] md:text-xs text-slate-500 w-10 md:w-12 text-center">
        {Math.round(zoom * 100)}%
      </span>
      <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" onClick={onZoomIn}>
        <ZoomIn className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </Button>

      <div className="flex-1" />

      {/* Dirty indicator + Save */}
      {isDirty && (
        <Badge variant="secondary" className="text-amber-600 bg-amber-50 text-[10px] md:text-xs hidden md:inline-flex">
          {t.layoutEditor?.unsaved ?? 'Kaydedilmemiş'}
        </Badge>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button
              size="sm"
              className="h-8 text-xs md:text-sm"
              onClick={onSave}
              disabled={!isDirty || saving}
            >
              <Save className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">{saving ? (t.layoutEditor?.saving ?? 'Kaydediliyor...') : (t.layoutEditor?.save ?? 'Kaydet')}</span>
            </Button>
          </span>
        </TooltipTrigger>
        {(!isDirty || saving) && <TooltipContent>{!isDirty ? t.tooltips.noChanges : t.tooltips.saving}</TooltipContent>}
      </Tooltip>
    </div>
  );
}
