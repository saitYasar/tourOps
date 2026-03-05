'use client';

import { useState } from 'react';
import { Building2, DoorOpen, Armchair, RotateCcw, ZoomIn, ZoomOut, Users, ChevronLeft, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Floor, Room, Table } from '@/types';

interface VenueModel3DProps {
  floors: Floor[];
  rooms: Room[];
  tables: Table[];
  onTableClick?: (table: Table) => void;
  onRoomClick?: (room: Room) => void;
  selectedTableId?: string | null;
}

// Color palette for different rooms
const roomColors = [
  { bg: 'bg-blue-100', border: 'border-blue-400', accent: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', accent: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', border: 'border-amber-400', accent: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700' },
  { bg: 'bg-purple-100', border: 'border-purple-400', accent: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' },
  { bg: 'bg-rose-100', border: 'border-rose-400', accent: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700' },
  { bg: 'bg-cyan-100', border: 'border-cyan-400', accent: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-700' },
];

// Calculate table dimensions based on capacity
function getTableDimensions(capacity: number, baseSize: 'small' | 'normal' | 'large') {
  // Base multipliers for different view sizes
  const baseMultipliers = {
    small: { width: 10, height: 10, minW: 40, minH: 40, maxW: 80, maxH: 60 },
    normal: { width: 14, height: 12, minW: 60, minH: 50, maxW: 140, maxH: 100 },
    large: { width: 18, height: 14, minW: 80, minH: 60, maxW: 200, maxH: 140 },
  };

  const base = baseMultipliers[baseSize];

  // Calculate dimensions based on capacity
  // Small tables (2-4): compact square
  // Medium tables (5-8): wider rectangle
  // Large tables (9-12): long rectangle
  // Very large tables (13+): banquet style

  let width: number;
  let height: number;
  let isRound = false;

  if (capacity <= 4) {
    // Small square/round tables
    width = base.minW + (capacity * 4);
    height = width; // Square
    isRound = capacity <= 2;
  } else if (capacity <= 8) {
    // Medium rectangular tables
    width = base.minW + (capacity * base.width * 0.6);
    height = base.minH + (capacity * 3);
  } else if (capacity <= 12) {
    // Large rectangular tables
    width = base.minW + (capacity * base.width * 0.5);
    height = base.minH + (capacity * 2);
  } else {
    // Banquet/very large tables
    width = Math.min(base.maxW, base.minW + (capacity * base.width * 0.4));
    height = Math.min(base.maxH, base.minH + (capacity * 1.5));
  }

  // Clamp to max dimensions
  width = Math.min(width, base.maxW);
  height = Math.min(height, base.maxH);

  return { width, height, isRound };
}

// Table shape component
function TableShape({
  table,
  color,
  isSelected,
  onClick,
  size = 'normal'
}: {
  table: Table;
  color: typeof roomColors[0];
  isSelected: boolean;
  onClick?: () => void;
  size?: 'small' | 'normal' | 'large';
}) {
  const { t } = useLanguage();

  const { width, height, isRound } = getTableDimensions(table.capacity, size);

  const chairSizes = {
    small: 6,
    normal: 10,
    large: 14,
  };
  const chairSize = chairSizes[size];
  const chairOffset = chairSize / 2 + 2;

  const fontSizes = {
    small: 'text-[7px]',
    normal: 'text-xs',
    large: 'text-sm',
  };
  const fontSize = fontSizes[size];

  // Calculate chair positions around the table based on shape
  const getChairPositions = () => {
    const positions: { x: number; y: number }[] = [];
    const capacity = table.capacity;

    if (isRound) {
      // Circular arrangement for round tables
      for (let i = 0; i < capacity; i++) {
        const angle = (i / capacity) * 2 * Math.PI - Math.PI / 2;
        const radius = Math.max(width, height) / 2 + chairOffset;
        positions.push({
          x: width / 2 + Math.cos(angle) * radius - chairSize / 2,
          y: height / 2 + Math.sin(angle) * radius - chairSize / 2,
        });
      }
    } else {
      // Rectangular arrangement
      const longSide = width > height;
      const longLength = Math.max(width, height);
      const shortLength = Math.min(width, height);

      // Calculate chairs per side based on table proportions
      const ratio = longLength / shortLength;
      const chairsLong = Math.ceil(capacity * ratio / (2 * ratio + 2));
      let chairsShort = Math.ceil((capacity - chairsLong * 2) / 2);

      // Ensure we don't exceed capacity
      const totalChairs = chairsLong * 2 + chairsShort * 2;
      if (totalChairs > capacity) {
        if (chairsShort > 0) chairsShort = Math.max(0, chairsShort - 1);
      }

      // Top side (long if landscape)
      const topChairs = longSide ? chairsLong : chairsShort;
      for (let i = 0; i < Math.min(topChairs, capacity - positions.length); i++) {
        const spacing = width / (topChairs + 1);
        positions.push({
          x: spacing * (i + 1) - chairSize / 2,
          y: -chairOffset,
        });
      }

      // Bottom side
      const bottomChairs = longSide ? chairsLong : chairsShort;
      for (let i = 0; i < Math.min(bottomChairs, capacity - positions.length); i++) {
        const spacing = width / (bottomChairs + 1);
        positions.push({
          x: spacing * (i + 1) - chairSize / 2,
          y: height + chairOffset - chairSize,
        });
      }

      // Left side
      const leftChairs = longSide ? chairsShort : chairsLong;
      for (let i = 0; i < Math.min(leftChairs, capacity - positions.length); i++) {
        const spacing = height / (leftChairs + 1);
        positions.push({
          x: -chairOffset,
          y: spacing * (i + 1) - chairSize / 2,
        });
      }

      // Right side
      const rightChairs = longSide ? chairsShort : chairsLong;
      for (let i = 0; i < Math.min(rightChairs, capacity - positions.length); i++) {
        const spacing = height / (rightChairs + 1);
        positions.push({
          x: width + chairOffset - chairSize,
          y: spacing * (i + 1) - chairSize / 2,
        });
      }
    }

    return positions.slice(0, capacity);
  };

  const chairs = getChairPositions();
  const containerWidth = width + chairSize * 2 + 8;
  const containerHeight = height + chairSize * 2 + 8;

  return (
    <div
      className="relative cursor-pointer transition-all duration-200 hover:scale-105 hover:z-10"
      style={{
        width: containerWidth,
        height: containerHeight,
        transform: isSelected ? 'scale(1.05)' : undefined,
        zIndex: isSelected ? 10 : undefined,
      }}
      onClick={onClick}
    >
      {/* Table surface */}
      <div
        className={`
          absolute shadow-md transition-all border-2
          ${isRound ? 'rounded-full' : 'rounded-lg'}
          ${isSelected
            ? 'bg-primary border-primary shadow-primary/30 shadow-lg'
            : `${color.bg} ${color.border} hover:shadow-lg`
          }
        `}
        style={{
          width,
          height,
          left: chairSize + 4,
          top: chairSize + 4,
        }}
      >
        {/* Table name and capacity */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center ${fontSize} p-1`}>
          <span className={`font-bold truncate max-w-full px-1 ${isSelected ? 'text-white' : color.text}`}>
            {table.name}
          </span>
          <span className={`${isSelected ? 'text-white/80' : 'text-slate-500'} flex items-center gap-0.5`}>
            <Users style={{ width: size === 'small' ? 8 : size === 'normal' ? 10 : 12, height: size === 'small' ? 8 : size === 'normal' ? 10 : 12 }} />
            {table.capacity}
          </span>
        </div>
      </div>

      {/* Chairs */}
      {chairs.map((pos, idx) => (
        <div
          key={idx}
          className={`absolute rounded-full transition-colors ${isSelected ? 'bg-primary/60' : color.accent}`}
          style={{
            width: chairSize,
            height: chairSize,
            left: pos.x + chairSize + 4,
            top: pos.y + chairSize + 4,
          }}
        />
      ))}
    </div>
  );
}

export function VenueModel3D({
  floors,
  rooms,
  tables,
  onTableClick,
  onRoomClick,
  selectedTableId,
}: VenueModel3DProps) {
  const { t } = useLanguage();
  const [rotation, setRotation] = useState(45);
  const [scale, setScale] = useState(1);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'building' | 'floor' | 'room'>('building');

  const getRoomsForFloor = (floorId: string) =>
    rooms.filter((r) => r.floorId === floorId).sort((a, b) => a.order - b.order);

  const getTablesForRoom = (roomId: string) =>
    tables.filter((t) => t.roomId === roomId).sort((a, b) => a.order - b.order);

  const getRoomColor = (index: number) => roomColors[index % roomColors.length];

  const getRoomColorById = (roomId: string) => {
    const roomIndex = rooms.findIndex(r => r.id === roomId);
    return getRoomColor(roomIndex);
  };

  const getTotalCapacity = () => tables.reduce((sum, t) => sum + t.capacity, 0);
  const getTotalTables = () => tables.length;
  const getTotalRooms = () => rooms.length;

  const sortedFloors = [...floors].sort((a, b) => a.order - b.order);

  const handleRotateLeft = () => setRotation((prev) => prev - 15);
  const handleRotateRight = () => setRotation((prev) => prev + 15);
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
  const handleReset = () => {
    setRotation(45);
    setScale(1);
    setViewMode('building');
    setSelectedFloor(null);
    setSelectedRoom(null);
  };

  const handleFloorClick = (floorId: string) => {
    setSelectedFloor(floorId);
    setViewMode('floor');
  };

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room.id);
    setViewMode('room');
  };

  const handleBack = () => {
    if (viewMode === 'room') {
      setViewMode('floor');
      setSelectedRoom(null);
    } else if (viewMode === 'floor') {
      setViewMode('building');
      setSelectedFloor(null);
    }
  };

  if (!floors.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
        <Building2 className="h-16 w-16 text-slate-300 mb-4" />
        <p className="text-slate-500">{t.venue.noFloors}</p>
      </div>
    );
  }

  // Room Detail View - Shows tables in a room
  if (viewMode === 'room' && selectedRoom) {
    const room = rooms.find(r => r.id === selectedRoom);
    const roomTables = getTablesForRoom(selectedRoom);
    const color = getRoomColorById(selectedRoom);
    const floor = floors.find(f => f.id === room?.floorId);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t.common.back}
            </Button>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <DoorOpen className={`h-5 w-5 ${color.text}`} />
                {room?.name}
              </h3>
              <p className="text-sm text-slate-500">{floor?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Armchair className="h-3 w-3" />
              {roomTables.length} {t.venue.tables}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {roomTables.reduce((sum, t) => sum + t.capacity, 0)} {t.venue.persons}
            </Badge>
          </div>
        </div>

        {/* Room Floor Plan */}
        <div className={`rounded-xl border-4 ${color.border} ${color.light} p-6 min-h-[400px]`}>
          {roomTables.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Armchair className="h-12 w-12 mb-2" />
              <p>{t.venue.noTables}</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-6 justify-center items-center">
              {roomTables.map((table) => (
                <TableShape
                  key={table.id}
                  table={table}
                  color={color}
                  isSelected={selectedTableId === table.id}
                  onClick={() => onTableClick?.(table)}
                  size="large"
                />
              ))}
            </div>
          )}
        </div>

        {/* Table Legend */}
        <div className="flex flex-wrap gap-4 justify-center">
          {roomTables.map((table) => (
            <div
              key={table.id}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all
                ${selectedTableId === table.id
                  ? 'bg-primary text-white border-primary'
                  : `${color.light} ${color.border} hover:shadow-md`
                }
              `}
              onClick={() => onTableClick?.(table)}
            >
              <Armchair className="h-4 w-4" />
              <span className="font-medium">{table.name}</span>
              <Badge variant={selectedTableId === table.id ? 'secondary' : 'outline'} className="ml-1">
                {table.capacity} {t.venue.persons}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Floor Detail View - Shows rooms on a floor
  if (viewMode === 'floor' && selectedFloor) {
    const floor = floors.find(f => f.id === selectedFloor);
    const floorRooms = getRoomsForFloor(selectedFloor);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t.common.back}
            </Button>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-600" />
                {floor?.name}
              </h3>
              <p className="text-sm text-slate-500">{floorRooms.length} {t.venue.rooms}</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {floorRooms.reduce((sum, room) =>
              sum + getTablesForRoom(room.id).reduce((s, t) => s + t.capacity, 0), 0
            )} {t.venue.persons}
          </Badge>
        </div>

        {/* Floor Plan */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {floorRooms.map((room, index) => {
            const roomTables = getTablesForRoom(room.id);
            const color = getRoomColor(index);
            const totalCapacity = roomTables.reduce((sum, t) => sum + t.capacity, 0);

            return (
              <Card
                key={room.id}
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${color.border}`}
                onClick={() => handleRoomClick(room)}
              >
                <CardHeader className={`${color.bg} pb-3`}>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <DoorOpen className={`h-4 w-4 ${color.text}`} />
                      {room.name}
                    </span>
                    <Maximize2 className="h-4 w-4 text-slate-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {/* Mini table preview */}
                  <div className={`${color.light} rounded-lg p-3 mb-3 min-h-[100px] flex flex-wrap gap-2 items-center justify-center`}>
                    {roomTables.length === 0 ? (
                      <p className="text-xs text-slate-400">{t.venue.noTables}</p>
                    ) : (
                      roomTables.slice(0, 6).map((table) => (
                        <div
                          key={table.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTableClick?.(table);
                          }}
                        >
                          <TableShape
                            table={table}
                            color={color}
                            isSelected={selectedTableId === table.id}
                            size="small"
                          />
                        </div>
                      ))
                    )}
                    {roomTables.length > 6 && (
                      <span className="text-xs text-slate-500">+{roomTables.length - 6}</span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Armchair className="h-3.5 w-3.5" />
                      {roomTables.length} {t.venue.tables}
                    </span>
                    <Badge variant="secondary">
                      {totalCapacity} {t.venue.persons}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {floorRooms.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
              <DoorOpen className="h-12 w-12 mb-2" />
              <p>{t.venue.noRooms}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Building View - 3D isometric building
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRotateLeft}>
            <RotateCcw className="h-4 w-4 mr-1" />
            -15°
          </Button>
          <Button variant="outline" size="sm" onClick={handleRotateRight}>
            +15°
            <RotateCcw className="h-4 w-4 ml-1 -scale-x-100" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            {t.tours.clear}
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1">
            <Building2 className="h-3 w-3" />
            {floors.length} {t.venue.floors}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <DoorOpen className="h-3 w-3" />
            {getTotalRooms()} {t.venue.rooms}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Armchair className="h-3 w-3" />
            {getTotalTables()} {t.venue.tables}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {getTotalCapacity()} {t.venue.persons}
          </Badge>
        </div>
      </div>

      {/* 3D Building Container */}
      <div
        className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden"
        style={{
          height: '450px',
          perspective: '1200px',
        }}
      >
        {/* Building */}
        <div
          className="absolute left-1/2 top-1/2 transition-all duration-500 ease-out"
          style={{
            transform: `
              translate(-50%, -50%)
              scale(${scale})
              rotateX(-20deg)
              rotateY(${rotation}deg)
            `,
            transformStyle: 'preserve-3d',
          }}
        >
          {sortedFloors.map((floor, floorIndex) => {
            const floorRooms = getRoomsForFloor(floor.id);
            const floorHeight = 70;
            const floorOffset = (sortedFloors.length - 1 - floorIndex) * (floorHeight + 8);

            return (
              <div
                key={floor.id}
                className="absolute transition-all duration-300 cursor-pointer group"
                style={{
                  transform: `translateY(${-floorOffset}px)`,
                  transformStyle: 'preserve-3d',
                  zIndex: sortedFloors.length - floorIndex,
                }}
                onClick={() => handleFloorClick(floor.id)}
              >
                {/* Floor Base */}
                <div
                  className="relative transition-all duration-300 group-hover:scale-105"
                  style={{
                    width: '280px',
                    height: `${floorHeight}px`,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Floor Label */}
                  <div
                    className="absolute -top-5 left-0 right-0 text-center pointer-events-none"
                    style={{ transform: 'rotateY(0deg) translateZ(1px)' }}
                  >
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-slate-700 shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <Building2 className="h-3 w-3" />
                      {floor.name}
                      <span className="text-slate-400 group-hover:text-slate-300">
                        ({floorRooms.length})
                      </span>
                    </span>
                  </div>

                  {/* Top Face - Floor Plan */}
                  <div
                    className="absolute inset-0 border-2 bg-white border-slate-300 group-hover:border-slate-500 transition-colors"
                    style={{
                      transform: `rotateX(90deg) translateZ(${floorHeight}px)`,
                      transformOrigin: 'bottom',
                    }}
                  >
                    <div className="absolute inset-1 flex gap-1 flex-wrap p-1">
                      {floorRooms.map((room, roomIndex) => {
                        const roomTables = getTablesForRoom(room.id);
                        const color = getRoomColor(roomIndex);

                        return (
                          <div
                            key={room.id}
                            className={`flex-1 min-w-[35px] rounded border ${color.bg} ${color.border} p-0.5`}
                          >
                            <div className="text-[6px] font-bold text-center truncate mb-0.5">{room.name}</div>
                            <div className="flex flex-wrap gap-0.5 justify-center">
                              {roomTables.slice(0, 4).map((table) => (
                                <div
                                  key={table.id}
                                  className={`w-2 h-2 rounded-sm ${color.accent}`}
                                  title={`${table.name}: ${table.capacity} ${t.venue.persons}`}
                                />
                              ))}
                              {roomTables.length > 4 && (
                                <span className="text-[5px]">+{roomTables.length - 4}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {floorRooms.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-[7px] text-slate-400">
                          {t.venue.noRooms}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Front Face */}
                  <div
                    className="absolute w-full border-x-2 border-b-2 bg-slate-50 border-slate-300 group-hover:bg-slate-100 group-hover:border-slate-500 transition-colors"
                    style={{
                      height: `${floorHeight}px`,
                      transform: 'rotateY(0deg)',
                      transformOrigin: 'bottom',
                    }}
                  >
                    <div className="absolute inset-1 flex gap-1 items-center justify-center">
                      {floorRooms.map((room, roomIndex) => {
                        const color = getRoomColor(roomIndex);
                        const roomTables = getTablesForRoom(room.id);
                        return (
                          <div
                            key={room.id}
                            className={`flex-1 h-full max-w-[45px] rounded-t border-2 border-b-0 ${color.bg} ${color.border} flex flex-col items-center justify-center`}
                          >
                            <DoorOpen className={`h-3 w-3 ${color.text}`} />
                            <span className="text-[7px] font-medium">{roomTables.length}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Face */}
                  <div
                    className="absolute border-y-2 border-r-2 bg-slate-100 border-slate-300 group-hover:bg-slate-200 group-hover:border-slate-500 transition-colors"
                    style={{
                      width: `${floorHeight}px`,
                      height: `${floorHeight}px`,
                      right: 0,
                      transform: `rotateY(90deg) translateZ(${280 - floorHeight}px)`,
                      transformOrigin: 'right',
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Armchair className="h-4 w-4 text-slate-400 mx-auto" />
                        <span className="text-[8px] text-slate-500 font-medium">
                          {floorRooms.reduce((sum, room) =>
                            sum + getTablesForRoom(room.id).length, 0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Click instruction */}
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <span className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-slate-600 shadow-sm">
            <Maximize2 className="h-4 w-4" />
            {t.venue.clickFloorForDetails}
          </span>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-[180px]">
          <p className="text-xs font-medium text-slate-600 mb-2">{t.venue.rooms}</p>
          <div className="space-y-1">
            {rooms.slice(0, 6).map((room, index) => {
              const color = getRoomColor(index);
              const roomTables = getTablesForRoom(room.id);
              return (
                <div key={room.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded ${color.accent} flex-shrink-0`} />
                    <span className="text-[10px] text-slate-600 truncate">{room.name}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 flex-shrink-0">
                    {roomTables.length} {t.venue.tableCount}
                  </span>
                </div>
              );
            })}
            {rooms.length > 6 && (
              <p className="text-[9px] text-slate-400 text-center">+{rooms.length - 6} {t.venue.more}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
