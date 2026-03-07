'use client';

import { useState } from 'react';
import { CheckCircle, Users, Building2, DoorOpen, Armchair, Sun, RotateCcw, ZoomIn, ZoomOut, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Floor, Room, Table } from '@/types';

interface VenueSelector3DProps {
  floors: Floor[];
  rooms: Room[];
  tables: Table[];
  selectedFloorId: string | null;
  selectedRoomId: string | null;
  selectedTableId: string | null;
  onSelectFloor: (floorId: string) => void;
  onSelectRoom: (roomId: string) => void;
  onSelectTable: (tableId: string) => void;
  translations: {
    selectFloor: string;
    selectRoom: string;
    selectTable: string;
    noFloors: string;
    noRooms: string;
    noTables: string;
    persons: string;
  };
}

// Oda renkleri
const roomColors = [
  { bg: 'bg-blue-100', border: 'border-blue-400', accent: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', gradient: 'from-blue-500 to-blue-600' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', accent: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', gradient: 'from-emerald-500 to-emerald-600' },
  { bg: 'bg-amber-100', border: 'border-amber-400', accent: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', gradient: 'from-amber-500 to-amber-600' },
  { bg: 'bg-purple-100', border: 'border-purple-400', accent: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', gradient: 'from-purple-500 to-purple-600' },
  { bg: 'bg-rose-100', border: 'border-rose-400', accent: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700', gradient: 'from-rose-500 to-rose-600' },
  { bg: 'bg-cyan-100', border: 'border-cyan-400', accent: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-700', gradient: 'from-cyan-500 to-cyan-600' },
];

export function VenueSelector3D({
  floors,
  rooms,
  tables,
  selectedFloorId,
  selectedRoomId,
  selectedTableId,
  onSelectFloor,
  onSelectRoom,
  onSelectTable,
  translations: t,
}: VenueSelector3DProps) {
  const [rotation, setRotation] = useState(45);
  const [scale, setScale] = useState(1);
  const [viewMode, setViewMode] = useState<'building' | 'floor' | 'room'>('building');
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  const getRoomsForFloor = (floorId: string) =>
    rooms.filter((r) => r.floorId === floorId).sort((a, b) => a.order - b.order);

  const getTablesForRoom = (roomId: string) =>
    tables.filter((t) => t.roomId === roomId).sort((a, b) => a.order - b.order);

  const getRoomColor = (index: number) => roomColors[index % roomColors.length];

  const getRoomColorById = (roomId: string) => {
    const roomIndex = rooms.findIndex(r => r.id === roomId);
    return getRoomColor(roomIndex >= 0 ? roomIndex : 0);
  };

  const sortedFloors = [...floors].sort((a, b) => a.order - b.order);

  const handleRotateLeft = () => setRotation((prev) => prev - 15);
  const handleRotateRight = () => setRotation((prev) => prev + 15);
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
  const handleReset = () => {
    setRotation(45);
    setScale(1);
  };

  const handleFloorClick = (floorId: string) => {
    onSelectFloor(floorId);
    setViewMode('floor');
  };

  const handleRoomClick = (roomId: string) => {
    onSelectRoom(roomId);
    setViewMode('room');
  };

  const handleBack = () => {
    if (viewMode === 'room') {
      setViewMode('floor');
    } else if (viewMode === 'floor') {
      setViewMode('building');
    }
  };

  // Masa Seçim Görünümü
  if (viewMode === 'room' && selectedRoomId) {
    const room = rooms.find(r => r.id === selectedRoomId);
    const roomTables = getTablesForRoom(selectedRoomId);
    const color = getRoomColorById(selectedRoomId);
    const floor = floors.find(f => f.id === room?.floorId);

    return (
      <div className="space-y-4 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Geri
            </Button>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <DoorOpen className={`h-5 w-5 ${color.text}`} />
                {room?.name}
              </h3>
              <p className="text-sm text-slate-500">{floor?.name}</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Armchair className="h-3 w-3" />
            {roomTables.length} Masa
          </Badge>
        </div>

        {/* Masa Planı */}
        <div className={`rounded-xl border-4 ${color.border} ${color.light} p-6 min-h-[350px]`}>
          {roomTables.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Armchair className="h-12 w-12 mb-2" />
              <p>{t.noTables}</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {roomTables.map((table, index) => {
                const isSelected = selectedTableId === table.id;
                const isHovered = hoveredTable === table.id;

                return (
                  <button
                    key={table.id}
                    className={`
                      relative p-4 rounded-xl transition-all duration-300
                      ${isSelected
                        ? `bg-gradient-to-br ${color.gradient} text-white shadow-xl scale-105`
                        : isHovered
                        ? `${color.bg} border-2 ${color.border} shadow-lg`
                        : 'bg-white border-2 border-slate-200 hover:border-slate-300 shadow-sm'
                      }
                    `}
                    onMouseEnter={() => setHoveredTable(table.id)}
                    onMouseLeave={() => setHoveredTable(null)}
                    onClick={() => onSelectTable(table.id)}
                  >
                    {/* Cam Kenarı İşareti */}
                    {table.isWindowSide && (
                      <div className={`
                        absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-10
                        ${isSelected ? 'bg-yellow-400' : 'bg-gradient-to-br from-yellow-400 to-orange-400'}
                      `}>
                        <Sun className="w-4 h-4 text-white" />
                      </div>
                    )}

                    {/* Masa Üstten Görünüm */}
                    <div className="relative mx-auto mb-3" style={{ width: '90px', height: '70px' }}>
                      {/* Masa */}
                      <div
                        className={`
                          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                          w-14 h-10 rounded-lg shadow-inner
                          transition-all duration-300
                          ${isSelected
                            ? 'bg-white/30 border-2 border-white/50'
                            : 'bg-amber-200 border-2 border-amber-400'
                          }
                        `}
                      >
                        <div className={`
                          absolute inset-0 flex items-center justify-center font-bold text-lg
                          ${isSelected ? 'text-white' : 'text-amber-700'}
                        `}>
                          {index + 1}
                        </div>
                      </div>

                      {/* Sandalyeler - Üst */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {[...Array(Math.min(Math.ceil(table.capacity / 2), 3))].map((_, i) => (
                          <div
                            key={`top-${i}`}
                            className={`
                              w-4 h-4 rounded-full transition-all duration-300
                              ${isSelected || isHovered ? 'animate-pulse' : ''}
                              ${isSelected
                                ? 'bg-white/40 border border-white/60'
                                : `${color.accent} border-2 border-white`
                              }
                            `}
                          />
                        ))}
                      </div>

                      {/* Sandalyeler - Alt */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {[...Array(Math.min(Math.floor(table.capacity / 2), 3))].map((_, i) => (
                          <div
                            key={`bottom-${i}`}
                            className={`
                              w-4 h-4 rounded-full transition-all duration-300
                              ${isSelected || isHovered ? 'animate-pulse' : ''}
                              ${isSelected
                                ? 'bg-white/40 border border-white/60'
                                : `${color.accent} border-2 border-white`
                              }
                            `}
                          />
                        ))}
                      </div>

                      {/* Sandalyeler - Sol */}
                      {table.capacity > 4 && (
                        <div
                          className={`
                            absolute left-0 top-1/2 -translate-y-1/2
                            w-4 h-4 rounded-full transition-all duration-300
                            ${isSelected || isHovered ? 'animate-pulse' : ''}
                            ${isSelected
                              ? 'bg-white/40 border border-white/60'
                              : `${color.accent} border-2 border-white`
                            }
                          `}
                        />
                      )}

                      {/* Sandalyeler - Sağ */}
                      {table.capacity > 5 && (
                        <div
                          className={`
                            absolute right-0 top-1/2 -translate-y-1/2
                            w-4 h-4 rounded-full transition-all duration-300
                            ${isSelected || isHovered ? 'animate-pulse' : ''}
                            ${isSelected
                              ? 'bg-white/40 border border-white/60'
                              : `${color.accent} border-2 border-white`
                            }
                          `}
                        />
                      )}
                    </div>

                    {/* Masa Bilgisi */}
                    <div className="text-center">
                      <p className={`font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                        {table.name}
                      </p>
                      <div className={`
                        inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs
                        ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}
                      `}>
                        <Users className="w-3 h-3" />
                        <span>{table.capacity} {t.persons}</span>
                      </div>
                      {table.isWindowSide && (
                        <p className={`text-xs mt-1 ${isSelected ? 'text-yellow-200' : 'text-amber-600'}`}>
                          ☀️ Cam Kenarı
                        </p>
                      )}
                    </div>

                    {/* Seçili İşareti */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Açıklama */}
        <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center">
              <Sun className="w-3 h-3 text-white" />
            </div>
            <span>Cam Kenarı</span>
          </div>
        </div>
      </div>
    );
  }

  // Oda Seçim Görünümü
  if (viewMode === 'floor' && selectedFloorId) {
    const floor = floors.find(f => f.id === selectedFloorId);
    const floorRooms = getRoomsForFloor(selectedFloorId);

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 bg-gradient-to-r from-slate-100 to-slate-50 p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleBack} className="shadow-sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Geri
            </Button>
            <div>
              <h3 className="font-bold text-xl flex items-center gap-2 text-slate-800">
                <Building2 className="h-6 w-6 text-blue-600" />
                {floor?.name}
              </h3>
              <p className="text-sm text-slate-500">Bir oda seçin</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {floorRooms.length} Oda
          </Badge>
        </div>

        {/* Odalar - 3D Kart Görünümü */}
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {floorRooms.map((room, index) => {
            const roomTables = getTablesForRoom(room.id);
            const color = getRoomColor(index);
            const isSelected = selectedRoomId === room.id;
            const windowTables = roomTables.filter(t => t.isWindowSide).length;
            const totalCapacity = roomTables.reduce((sum, t) => sum + t.capacity, 0);

            return (
              <button
                key={room.id}
                className={`
                  relative overflow-hidden rounded-2xl transition-all duration-300 text-left group
                  ${isSelected
                    ? 'ring-4 ring-blue-500 ring-offset-2 shadow-2xl scale-[1.02]'
                    : 'shadow-lg hover:shadow-xl hover:scale-[1.01]'
                  }
                `}
                onClick={() => handleRoomClick(room.id)}
              >
                {/* Oda Görsel Alanı */}
                <div className={`
                  relative h-32 p-4
                  ${isSelected
                    ? `bg-gradient-to-br ${color.gradient}`
                    : `bg-gradient-to-br from-slate-100 to-slate-200 group-hover:${color.bg}`
                  }
                `}>
                  {/* Dekoratif Pencere */}
                  <div className="absolute top-3 right-3 flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-6 rounded-sm ${
                          isSelected ? 'bg-white/30' : 'bg-blue-200/60'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Oda İçi Mini Masalar */}
                  <div className="absolute bottom-3 left-3 right-3 flex justify-center gap-2">
                    {roomTables.slice(0, 4).map((table, ti) => (
                      <div
                        key={table.id}
                        className={`
                          relative w-8 h-6 rounded
                          ${isSelected ? 'bg-white/40' : 'bg-amber-200'}
                        `}
                      >
                        {table.isWindowSide && (
                          <Sun className={`absolute -top-1 -right-1 w-3 h-3 ${
                            isSelected ? 'text-yellow-300' : 'text-yellow-500'
                          }`} />
                        )}
                      </div>
                    ))}
                    {roomTables.length > 4 && (
                      <div className={`
                        w-8 h-6 rounded flex items-center justify-center text-xs font-medium
                        ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}
                      `}>
                        +{roomTables.length - 4}
                      </div>
                    )}
                  </div>

                  {/* Oda İsmi Overlay */}
                  <div className={`
                    absolute top-3 left-3 px-3 py-1.5 rounded-lg font-bold text-sm
                    ${isSelected ? 'bg-white/20 text-white' : 'bg-white/80 text-slate-700'}
                  `}>
                    {room.name}
                  </div>
                </div>

                {/* Alt Bilgi Alanı */}
                <div className={`
                  p-4
                  ${isSelected ? 'bg-blue-600 text-white' : 'bg-white'}
                `}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        flex items-center gap-1.5 text-sm
                        ${isSelected ? 'text-blue-100' : 'text-slate-600'}
                      `}>
                        <Armchair className="w-4 h-4" />
                        <span className="font-medium">{roomTables.length} Masa</span>
                      </div>
                      <div className={`
                        flex items-center gap-1.5 text-sm
                        ${isSelected ? 'text-blue-100' : 'text-slate-600'}
                      `}>
                        <Users className="w-4 h-4" />
                        <span>{totalCapacity} Kişi</span>
                      </div>
                    </div>
                    {windowTables > 0 && (
                      <div className={`
                        flex items-center gap-1 text-xs px-2 py-1 rounded-full
                        ${isSelected ? 'bg-yellow-400 text-yellow-900' : 'bg-yellow-100 text-yellow-700'}
                      `}>
                        <Sun className="w-3 h-3" />
                        {windowTables}
                      </div>
                    )}
                  </div>
                </div>

                {/* Seçili İşareti */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            );
          })}

          {floorRooms.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 rounded-xl">
              <DoorOpen className="h-16 w-16 mb-3 opacity-50" />
              <p className="text-lg">{t.noRooms}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3D Bina Görünümü
  if (!floors.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
        <Building2 className="h-16 w-16 text-slate-300 mb-4" />
        <p className="text-slate-500">{t.noFloors}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Kontroller */}
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
            Sıfırla
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Building2 className="h-3 w-3" />
            {floors.length} Kat
          </Badge>
          <Badge variant="outline" className="gap-1">
            <DoorOpen className="h-3 w-3" />
            {rooms.length} Oda
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Armchair className="h-3 w-3" />
            {tables.length} Masa
          </Badge>
        </div>
      </div>

      {/* 3D Bina */}
      <div
        className="relative bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 rounded-xl overflow-hidden"
        style={{
          height: '450px',
          perspective: '1200px',
        }}
      >
        {/* Bina */}
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
            const isSelected = selectedFloorId === floor.id;

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
                {/* Kat Kutusu */}
                <div
                  className={`relative transition-all duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}
                  style={{
                    width: '280px',
                    height: `${floorHeight}px`,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Kat Etiketi */}
                  <div
                    className="absolute -top-6 left-0 right-0 text-center pointer-events-none"
                    style={{ transform: 'rotateY(0deg) translateZ(1px)' }}
                  >
                    <span className={`
                      inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-sm transition-colors
                      ${isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/90 text-slate-700 group-hover:bg-blue-600 group-hover:text-white'
                      }
                    `}>
                      <Building2 className="h-3 w-3" />
                      {floor.name}
                      <span className={isSelected ? 'text-blue-200' : 'text-slate-400 group-hover:text-blue-200'}>
                        ({floorRooms.length} oda)
                      </span>
                    </span>
                  </div>

                  {/* Üst Yüzey - Kat Planı */}
                  <div
                    className={`
                      absolute inset-0 border-2 transition-colors
                      ${isSelected
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-white border-slate-300 group-hover:border-blue-400'
                      }
                    `}
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
                                  className={`w-2 h-2 rounded-sm ${table.isWindowSide ? 'bg-yellow-400' : color.accent}`}
                                  title={table.name}
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
                          Oda yok
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ön Yüzey */}
                  <div
                    className={`
                      absolute w-full border-x-2 border-b-2 transition-colors
                      ${isSelected
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-slate-50 border-slate-300 group-hover:bg-blue-50 group-hover:border-blue-400'
                      }
                    `}
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

                  {/* Sağ Yüzey */}
                  <div
                    className={`
                      absolute border-y-2 border-r-2 transition-colors
                      ${isSelected
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-slate-100 border-slate-300 group-hover:bg-blue-100 group-hover:border-blue-400'
                      }
                    `}
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
                        <Armchair className={`h-4 w-4 mx-auto ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className={`text-[8px] font-medium ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                          {floorRooms.reduce((sum, room) =>
                            sum + getTablesForRoom(room.id).length, 0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Seçili İşareti */}
                  {isSelected && (
                    <div
                      className="absolute -top-3 -right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-50"
                      style={{ transform: 'translateZ(20px)' }}
                    >
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tıklama Bilgisi */}
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <span className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-slate-600 shadow-sm">
            <Building2 className="h-4 w-4" />
            Detay için kata tıklayın
          </span>
        </div>
      </div>

    </div>
  );
}
