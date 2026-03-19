'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Building2, Armchair, Check, Loader2, ChevronLeft, ChevronRight, Layers, DoorOpen, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ResourceDto } from '@/lib/api';
import dynamic from 'next/dynamic';

/** Filter out structural/decorative objects — keep only tables. */
function filterTables(resources: ResourceDto[]): ResourceDto[] {
  return resources.filter(r => {
    if (r.resourceType?.code) return r.resourceType.code === 'table';
    const lower = r.name.toLowerCase();
    const dashIdx = r.name.lastIndexOf('-');
    const baseName = dashIdx > 0 ? r.name.substring(0, dashIdx).toLowerCase() : lower;
    if (baseName.startsWith('cam kenar') || baseName.startsWith('cam_kenar') || baseName.startsWith('window')) return false;
    if (baseName.startsWith('duvar') || baseName.startsWith('wall')) return false;
    if (baseName.startsWith('kolon') || baseName.startsWith('column')) return false;
    if (baseName.startsWith('serbest') || baseName.startsWith('free')) return false;
    if (baseName.startsWith('projeksiyon') || baseName.startsWith('projector')) return false;
    if (baseName.startsWith('perde') || baseName.startsWith('curtain')) return false;
    if (r.capacity === 0 || r.capacity == null) return false;
    return true;
  });
}

// Lazy load Konva canvas (heavy dependency)
const FloorPlanCanvas = dynamic(
  () => import('./FloorPlanCanvas').then(m => ({ default: m.FloorPlanCanvas })),
  { ssr: false, loading: () => <div className="h-[450px] bg-slate-100 rounded-xl animate-pulse" /> }
);

interface CustomerVenueSelectorProps {
  floors: ResourceDto[];
  childrenCache: Record<number, ResourceDto[]>;
  loadingChildren: boolean;
  fetchChildren: (parentId: number, force?: boolean) => Promise<void>;
  onSelectChair: (chair: ResourceDto, skipConfirm?: boolean) => void;
  savingTable: boolean;
  existingResourceId?: number;
  currentClientId?: number;
}

export function CustomerVenueSelector({
  floors: floorResources,
  childrenCache,
  loadingChildren,
  fetchChildren,
  onSelectChair,
  savingTable,
  existingResourceId,
  currentClientId,
}: CustomerVenueSelectorProps) {
  const { t } = useLanguage();

  // Navigation state: floor → room → table (chairs)
  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

  // Auto-select first floor and fetch its children on mount
  useEffect(() => {
    if (floorResources.length > 0 && !activeFloorId) {
      const firstId = floorResources[0].id;
      setActiveFloorId(firstId);
      if (!childrenCache[firstId]) {
        fetchChildren(firstId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorResources]);

  // Derived data
  const activeRooms = activeFloorId ? (childrenCache[activeFloorId] ?? []) : [];
  const roomTables = activeRoomId ? filterTables(childrenCache[activeRoomId] ?? []) : [];
  const chairResources = selectedTableId ? (childrenCache[selectedTableId] ?? []) : [];

  // Breadcrumb data
  const activeFloor = floorResources.find(f => f.id === activeFloorId);
  const activeRoom = activeRooms.find(r => r.id === activeRoomId);
  const activeTable = roomTables.find(t => t.id === selectedTableId);

  // Handlers
  const handleFloorChange = useCallback((floorId: number) => {
    setActiveFloorId(floorId);
    setActiveRoomId(null);
    setSelectedTableId(null);
    if (!childrenCache[floorId]) {
      fetchChildren(floorId);
    }
  }, [fetchChildren, childrenCache]);

  const handleRoomClick = useCallback((roomId: number) => {
    setActiveRoomId(roomId);
    setSelectedTableId(null);
    if (!childrenCache[roomId]) {
      fetchChildren(roomId);
    }
  }, [fetchChildren, childrenCache]);

  const handleTableClick = useCallback((tableId: number) => {
    setSelectedTableId(tableId);
    fetchChildren(tableId, true); // always force-refresh for latest occupancy
  }, [fetchChildren]);

  const handleBackToRooms = () => {
    setActiveRoomId(null);
    setSelectedTableId(null);
  };

  const handleBackToTables = () => {
    setSelectedTableId(null);
  };

  // ─── Level 3: Chair selection ───────────────────────────────
  if (selectedTableId) {
    return (
      <div className="space-y-4">
        {/* Breadcrumb + Back */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" onClick={handleBackToTables} className="shrink-0">
            <ChevronLeft className="h-4 w-4 mr-0.5 sm:mr-1" />
            <span className="hidden sm:inline">{t.customer.back}</span>
          </Button>
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
              <Armchair className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 shrink-0" />
              <span className="truncate">{t.customer.selectChair}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 truncate">
              {activeFloor?.name} &gt; {activeRoom?.name} &gt; {activeTable?.name}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-300" />
            <span className="text-slate-500">{t.customer.seatEmpty}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-400" />
            <span className="text-emerald-600">{t.customer.seatYours}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-400" />
            <span className="text-red-500">{t.customer.seatOccupied}</span>
          </div>
        </div>

        {/* Resource type title for chairs */}
        {chairResources.length > 0 && chairResources[0].resourceType?.name && (
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {chairResources[0].resourceType.name}
          </h3>
        )}

        {/* Chairs grid */}
        {loadingChildren && chairResources.length === 0 ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t.common.loading}</span>
          </div>
        ) : chairResources.length === 0 ? (
          <div className="text-center py-12">
            <Armchair className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">{t.customer.noChairs}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {chairResources.map(chair => {
              const occupant = chair.client;
              const isOwnSeat = !!(currentClientId && occupant && occupant.id === currentClientId);
              const isOccupiedByOther = !!(occupant && !isOwnSeat);
              const isSelected = existingResourceId === chair.id;
              const occupantName = occupant ? `${occupant.firstName} ${occupant.lastName}` : '';

              return (
                <div key={chair.id} className="relative group">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <button
                          disabled={savingTable || isOccupiedByOther}
                          className={`relative w-full p-3 sm:p-4 rounded-xl border-2 transition-all text-center ${
                            savingTable ? 'opacity-50 cursor-wait' :
                            isOccupiedByOther
                              ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-80'
                              : isOwnSeat || isSelected
                                ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                                : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
                          }`}
                          onClick={() => {
                            if (!isOccupiedByOther) onSelectChair(chair);
                          }}
                        >
                          {(isOwnSeat || isSelected) && (
                            <div className="absolute top-1.5 right-1.5">
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                          )}
                          {savingTable ? (
                            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1 text-orange-500 animate-spin" />
                          ) : (
                            <Armchair className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1 ${
                              isOccupiedByOther ? 'text-red-400' :
                              isOwnSeat || isSelected ? 'text-emerald-600' : 'text-slate-400'
                            }`} />
                          )}
                          <p className={`font-bold text-xs sm:text-sm truncate ${
                            isOccupiedByOther ? 'text-red-600' :
                            isOwnSeat ? 'text-emerald-700' : 'text-slate-800'
                          }`}>{chair.name}</p>
                          {isOwnSeat && (
                            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{t.customer.yourSeat}</p>
                          )}
                          {isOccupiedByOther && (
                            <p className="text-[10px] text-red-500 font-medium mt-0.5 truncate">{occupantName}</p>
                          )}
                        </button>
                      </span>
                    </TooltipTrigger>
                    {(savingTable || isOccupiedByOther) && (
                      <TooltipContent>
                        {savingTable ? t.tooltips.savingInProgress : t.tooltips.seatOccupied}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Level 2: Table selection (room selected) ───────────────
  if (activeRoomId) {
    const tablesMap: Record<number, ResourceDto[]> = { [activeRoomId]: roomTables };
    const roomForCanvas = activeRooms.filter(r => r.id === activeRoomId);
    const isTablesLoading = loadingChildren && roomTables.length === 0;

    return (
      <div className="space-y-3">
        {/* Breadcrumb + Back */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" onClick={handleBackToRooms} className="shrink-0">
            <ChevronLeft className="h-4 w-4 mr-0.5 sm:mr-1" />
            <span className="hidden sm:inline">{t.customer.back}</span>
          </Button>
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-lg truncate">{activeRoom?.name}</h3>
            <p className="text-xs sm:text-sm text-slate-500 truncate">
              {activeFloor?.name} &gt; {activeRoom?.name}
            </p>
          </div>
        </div>

        {/* Resource type title for tables */}
        {roomTables.length > 0 && roomTables[0].resourceType?.name && (
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {roomTables[0].resourceType.name}
          </h3>
        )}

        {/* Tables */}
        {isTablesLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t.common.loading}</span>
          </div>
        ) : roomTables.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">{t.customer.noTables}</p>
          </div>
        ) : (
          <FloorPlanCanvas
            rooms={roomForCanvas}
            tablesMap={tablesMap}
            selectedTableId={null}
            onTableClick={handleTableClick}
          />
        )}
      </div>
    );
  }

  // ─── Level 1: Room selection (floor selected) ───────────────
  const isRoomsLoading = loadingChildren && activeRooms.length === 0 && !!activeFloorId;

  return (
    <div className="space-y-3">
      {/* Resource type title for floors */}
      {floorResources.length > 0 && floorResources[0].resourceType?.name && (
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          {floorResources[0].resourceType.name}
        </h3>
      )}

      {/* Floor tabs */}
      {floorResources.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1 -mb-1">
          {floorResources.map(floor => (
            <button
              key={floor.id}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                activeFloorId === floor.id
                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-200'
              }`}
              onClick={() => handleFloorChange(floor.id)}
            >
              <Layers className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate max-w-[100px] sm:max-w-none">{floor.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Resource type title for rooms */}
      {activeRooms.length > 0 && activeRooms[0].resourceType?.name && (
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          {activeRooms[0].resourceType.name}
        </h3>
      )}

      {/* Rooms */}
      {isRoomsLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t.common.loading}</span>
        </div>
      ) : activeRooms.length === 0 && activeFloorId ? (
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">{t.customer.noRooms}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeRooms.map(room => (
            <button
              key={room.id}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all text-left group"
              onClick={() => handleRoomClick(room.id)}
            >
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                <DoorOpen className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">{room.name}</p>
                {room.capacity > 0 && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Users className="h-3 w-3" />
                    {room.capacity} {t.customer.persons}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-orange-400 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
