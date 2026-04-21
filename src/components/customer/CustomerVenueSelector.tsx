'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Building2, Armchair, Check, Loader2, ChevronLeft, ChevronRight, Layers, DoorOpen, Users, Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ResourceDto } from '@/lib/api';
import dynamic from 'next/dynamic';

/** Parse coordinates that may be "x,y" string, string[], or number[]. */
function parseCoordinates(coords: unknown): { x: number; y: number } {
  if (!coords) return { x: 0, y: 0 };
  if (Array.isArray(coords)) {
    if (coords.length !== 2) return { x: 0, y: 0 };
    const x = typeof coords[0] === 'string' ? parseFloat(coords[0]) : Number(coords[0]);
    const y = typeof coords[1] === 'string' ? parseFloat(coords[1]) : Number(coords[1]);
    return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? 0 : y };
  }
  if (typeof coords === 'string') {
    const parts = coords.split(',');
    if (parts.length !== 2) return { x: 0, y: 0 };
    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);
    return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? 0 : y };
  }
  return { x: 0, y: 0 };
}

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

/** Filter structural/decorative objects — everything that is NOT a table or chair/seat. */
function filterObjects(resources: ResourceDto[]): ResourceDto[] {
  return resources.filter(r => {
    const code = r.resourceType?.code;
    if (code === 'object') return true;
    if (code === 'table' || code === 'chair' || code === 'seat') return false;
    // No resourceType code — use name-based fallback: exclude anything that looks like a table
    if (!code) {
      if (r.capacity && r.capacity > 0) return false; // has capacity → probably a table
      return true; // no capacity, no known type → treat as object
    }
    return false;
  });
}

// Lazy load Konva canvas (heavy dependency) — no loading placeholder to avoid flash
const FloorPlanCanvas = dynamic(
  () => import('./FloorPlanCanvas').then(m => ({ default: m.FloorPlanCanvas })),
  { ssr: false }
);

interface CustomerVenueSelectorProps {
  floors: ResourceDto[];
  childrenCache: Record<number, ResourceDto[]>;
  loadingChildren: boolean;
  fetchChildren: (parentId: number, force?: boolean) => Promise<void>;
  onSelectChair: (chair: ResourceDto, skipConfirm?: boolean) => void;
  savingTable: boolean;
  existingResourceId?: number;
  pendingChairId?: number;
  currentClientId?: number;
  /** When set, auto-navigate to this table's chair view */
  navigateToTableId?: number | null;
  readOnly?: boolean;
  /** Organization category: 1=restaurant, 2=transport */
  categoryId?: number;
}

export function CustomerVenueSelector({
  floors: floorResources,
  childrenCache,
  loadingChildren,
  fetchChildren,
  onSelectChair,
  savingTable,
  existingResourceId,
  pendingChairId,
  currentClientId,
  navigateToTableId,
  readOnly = false,
  categoryId,
}: CustomerVenueSelectorProps) {
  const { t } = useLanguage();

  // Navigation state: floor → room → table (chairs)
  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [tappedChairId, setTappedChairId] = useState<number | null>(null);

  // Auto-select first floor/section on mount
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

  // Transport: preload ALL sections' children so we can locate existing seat
  useEffect(() => {
    if (categoryId !== 2 || floorResources.length === 0) return;
    for (const section of floorResources) {
      if (!childrenCache[section.id]) {
        fetchChildren(section.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorResources, categoryId]);

  // Transport: once children load, switch to the section containing the current user's seat (only on first load)
  const initialSectionSet = useRef(false);
  useEffect(() => {
    if (categoryId !== 2 || !currentClientId) return;
    if (initialSectionSet.current) return;
    // Search all sections for a seat belonging to this client
    for (const section of floorResources) {
      const children = childrenCache[section.id] ?? [];
      if (children.some(c => c.client?.id === currentClientId)) {
        setActiveFloorId(section.id);
        initialSectionSet.current = true;
        return;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childrenCache, currentClientId]);

  // Navigate to a specific table when navigateToTableId changes (from 3D model click)
  useEffect(() => {
    if (!navigateToTableId) return;
    // Find which floor/room contains this table by walking the cache
    for (const floor of floorResources) {
      const rooms = childrenCache[floor.id] ?? [];
      for (const room of rooms) {
        const tables = filterTables(childrenCache[room.id] ?? []);
        if (tables.some(t => t.id === navigateToTableId)) {
          setActiveFloorId(floor.id);
          setActiveRoomId(room.id);
          setSelectedTableId(navigateToTableId);
          fetchChildren(navigateToTableId, true);
          return;
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigateToTableId]);

  // Track which parent IDs we've already auto-skipped (prevents loops on back navigation)
  const autoSkippedFrom = useRef(new Set<number>());

  // Derived data
  const activeRooms = activeFloorId ? (childrenCache[activeFloorId] ?? []) : [];
  const roomTables = activeRoomId ? filterTables(childrenCache[activeRoomId] ?? []) : [];
  const roomObjects = activeRoomId ? filterObjects(childrenCache[activeRoomId] ?? []) : [];
  const chairResources = selectedTableId ? (childrenCache[selectedTableId] ?? []) : [];

  // Auto-skip room selection when floor has only one room
  useEffect(() => {
    if (activeFloorId && !activeRoomId) {
      const rooms = childrenCache[activeFloorId];
      if (rooms && rooms.length === 1 && !autoSkippedFrom.current.has(activeFloorId)) {
        autoSkippedFrom.current.add(activeFloorId);
        setActiveRoomId(rooms[0].id);
        if (!childrenCache[rooms[0].id]) {
          fetchChildren(rooms[0].id);
        }
      }
    }
  }, [activeFloorId, activeRoomId, childrenCache, fetchChildren]);

  // Auto-skip table selection when room has only one table
  useEffect(() => {
    if (activeRoomId && !selectedTableId) {
      const tables = filterTables(childrenCache[activeRoomId] ?? []);
      if (tables.length === 1 && !autoSkippedFrom.current.has(activeRoomId)) {
        autoSkippedFrom.current.add(activeRoomId);
        setSelectedTableId(tables[0].id);
        fetchChildren(tables[0].id, true);
      }
    }
  }, [activeRoomId, selectedTableId, childrenCache, fetchChildren]);

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

  const isTransport = categoryId === 2;

  // ─── Transport: Bus-style seat picker ──────────────────────
  if (isTransport) {
    const sections = floorResources; // root resources = sections for transport
    const activeSectionId = activeFloorId;
    const activeSection = sections.find(s => s.id === activeSectionId);
    const sectionChildren = activeSectionId ? (childrenCache[activeSectionId] ?? []) : [];
    const seats = sectionChildren.filter(r => r.resourceType?.code === 'transport_seat');
    const objects = sectionChildren.filter(r => r.resourceType?.code === 'transport_object');
    const isSeatsLoading = loadingChildren && seats.length === 0 && !!activeSectionId;

    // Parse seat coordinates and compute layout
    const parsedSeats = seats.map(seat => {
      const c = parseCoordinates(seat.coordinates);
      return { ...seat, px: c.x, py: c.y };
    });

    // Parse object coordinates
    const parsedObjects = objects.map(obj => {
      const c = parseCoordinates(obj.coordinates);
      return { ...obj, px: c.x, py: c.y, w: obj.width || 30, h: obj.height || 30 };
    });

    // Proportional grid: snap to columns/rows but preserve relative gaps (aisle wider than seat pairs)
    const seatSize = 44;
    const minCellGap = seatSize + 8; // minimum center-to-center distance

    // Snap nearby coordinates into groups
    const snapTolerance = 15;
    const snapToGroup = (values: number[]): number[] => {
      const sorted = [...new Set(values)].sort((a, b) => a - b);
      const groups: number[][] = [];
      for (const v of sorted) {
        const last = groups[groups.length - 1];
        if (last && Math.abs(v - last[last.length - 1]) < snapTolerance) {
          last.push(v);
        } else {
          groups.push([v]);
        }
      }
      // Return average of each group as representative
      return groups.map(g => g.reduce((a, b) => a + b, 0) / g.length);
    };

    const uniqueXs = snapToGroup(parsedSeats.map(s => s.px));
    const uniqueYs = snapToGroup(parsedSeats.map(s => s.py));

    // Build proportional position maps: preserve gap ratios, enforce minimum gap
    // Returns positions array + scale factor (minCellGap / minOrigGap)
    const buildPositions = (sorted: number[]): { positions: number[]; pixelScale: number } => {
      if (sorted.length <= 1) return { positions: [0], pixelScale: 1 };
      let minOrigGap = Infinity;
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i] - sorted[i - 1];
        if (gap > 0 && gap < minOrigGap) minOrigGap = gap;
      }
      if (!isFinite(minOrigGap) || minOrigGap === 0) minOrigGap = 1;
      const pixelScale = minCellGap / minOrigGap;
      const positions = [0];
      for (let i = 1; i < sorted.length; i++) {
        const origGap = sorted[i] - sorted[i - 1];
        const ratio = Math.min(origGap / minOrigGap, 2.0);
        positions.push(positions[i - 1] + minCellGap * ratio);
      }
      return { positions, pixelScale };
    };

    const { positions: xPositions, pixelScale: scaleX } = buildPositions(uniqueXs);
    const { positions: yPositions, pixelScale: scaleY } = buildPositions(uniqueYs);

    // Find closest group index
    const findIdx = (val: number, groups: number[]) => {
      let best = 0, bestDist = Infinity;
      for (let i = 0; i < groups.length; i++) {
        const d = Math.abs(val - groups[i]);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      return best;
    };

    const pad = seatSize / 2 + 4;
    const normSeats = parsedSeats.map(s => ({
      ...s,
      nx: xPositions[findIdx(s.px, uniqueXs)] + pad,
      ny: yPositions[findIdx(s.py, uniqueYs)] + pad,
    }));
    const normObjects = parsedObjects.map(o => ({
      ...o,
      nx: xPositions[findIdx(o.px, uniqueXs)] + pad - seatSize / 2,
      ny: yPositions[findIdx(o.py, uniqueYs)] + pad - seatSize / 2,
    }));

    const containerW = (xPositions[xPositions.length - 1] || 0) + pad * 2;
    const containerH = (yPositions[yPositions.length - 1] || 0) + pad * 2;

    const handleSectionSelect = (sectionId: number) => {
      setActiveFloorId(sectionId);
      setActiveRoomId(null);
      setSelectedTableId(null);
      fetchChildren(sectionId, true); // force refresh for occupancy
    };

    const renderTransportSeatTile = (seat: typeof normSeats[0]) => {
      const occupant = seat.client;
      const isOwnSeat = !!(currentClientId && occupant && occupant.id === currentClientId);
      const isOccupiedByOther = !!(occupant && !isOwnSeat);
      const isSelected = existingResourceId === seat.id;
      const isPending = pendingChairId === seat.id;
      const occupantName = occupant ? `${occupant.firstName} ${occupant.lastName}` : '';
      const gender = occupant?.gender;
      const isMale = isOccupiedByOther && gender === 'm';
      const isFemale = isOccupiedByOther && gender === 'f';
      const shortLabel = seat.name.replace(/^.*[-–]\s*/, '').replace(/^(Yer|Seat|Sandalye|Koltuk)\s*/i, '') || seat.name;

      const occupiedBorder = isFemale ? 'border-pink-300' : 'border-blue-300';
      const occupiedBg = isFemale ? 'bg-pink-100' : 'bg-blue-100';
      const occupiedIcon = isFemale ? 'text-pink-400' : 'text-blue-400';
      const occupiedNumber = isFemale ? 'text-pink-600' : 'text-blue-600';

      return (
        <Tooltip key={seat.id}>
          <TooltipTrigger asChild>
            <button
              className={`group/seat absolute flex flex-col items-center justify-center rounded-lg border-2 transition-all ${
                savingTable ? 'opacity-50 cursor-wait' :
                isOccupiedByOther
                  ? `${occupiedBorder} ${occupiedBg} cursor-not-allowed`
                  : isPending
                    ? 'border-orange-500 bg-orange-100 shadow-md shadow-orange-200/50 ring-2 ring-orange-300 cursor-pointer'
                    : isOwnSeat || isSelected
                      ? 'border-emerald-500 bg-emerald-100 shadow-md shadow-emerald-200/50 cursor-pointer'
                      : 'border-slate-200 bg-white hover:border-orange-400 hover:bg-orange-50 hover:shadow-sm cursor-pointer'
              }`}
              style={{
                left: seat.nx - seatSize / 2,
                top: seat.ny - seatSize / 2,
                width: seatSize,
                height: seatSize,
              }}
              onClick={() => {
                if (isOccupiedByOther) {
                  setTappedChairId(prev => prev === seat.id ? null : seat.id);
                } else if (!readOnly && !savingTable) {
                  onSelectChair(seat);
                }
              }}
            >
              {isPending ? (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center shadow-sm z-10">
                  <Check className="h-2 w-2 text-white" strokeWidth={3} />
                </div>
              ) : (isOwnSeat || isSelected) ? (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm z-10">
                  <Check className="h-2 w-2 text-white" strokeWidth={3} />
                </div>
              ) : null}

              {savingTable ? (
                <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
              ) : (
                <Armchair className={`h-4 w-4 ${
                  isOccupiedByOther ? occupiedIcon :
                  isPending ? 'text-orange-600' :
                  isOwnSeat || isSelected ? 'text-emerald-600' : 'text-slate-400'
                }`} />
              )}

              <span className={`text-[9px] font-bold leading-tight ${
                isOccupiedByOther ? occupiedNumber :
                isPending ? 'text-orange-700' :
                isOwnSeat || isSelected ? 'text-emerald-700' : 'text-slate-700'
              }`}>
                {shortLabel}
              </span>

              {/* Occupant name on hover and tap */}
              {occupant && (
                <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold px-1.5 py-0.5 rounded shadow-sm z-20 transition-opacity ${
                  tappedChairId === seat.id ? 'opacity-100' : 'opacity-0 group-hover/seat:opacity-100'
                } ${
                  isOwnSeat ? 'bg-emerald-600 text-white' : isFemale ? 'bg-pink-500 text-white' : 'bg-blue-500 text-white'
                }`} style={{ pointerEvents: 'none' }}>
                  {occupantName.length > 15 ? occupantName.substring(0, 15) + '…' : occupantName}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[180px]">
            <p className="font-bold">{seat.name}</p>
            {isOwnSeat && <p className="text-emerald-600 font-medium">{occupantName}</p>}
            {isMale && <p className="text-blue-500 font-medium">{occupantName}</p>}
            {isFemale && <p className="text-pink-500 font-medium">{occupantName}</p>}
            {isOccupiedByOther && !isMale && !isFemale && <p className="text-slate-500 font-medium">{occupantName}</p>}
            {!occupant && <p className="text-slate-400">{t.customer.seatEmpty}</p>}
          </TooltipContent>
        </Tooltip>
      );
    };

    return (
      <div className="space-y-4">
        {/* Section tabs */}
        {sections.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {sections.map(section => (
              <button
                key={section.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  activeSectionId === section.id
                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-200'
                }`}
                onClick={() => handleSectionSelect(section.id)}
              >
                <Bus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[120px]">{section.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-slate-200 bg-white" />
            <span className="text-slate-500">{t.customer.seatEmpty}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-blue-300 bg-blue-100" />
            <span className="text-blue-600">{t.customer.seatOccupiedMale}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-pink-300 bg-pink-100" />
            <span className="text-pink-600">{t.customer.seatOccupiedFemale}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-100" />
            <span className="text-emerald-600">{t.customer.seatYours}</span>
          </div>
        </div>

        {/* Seat map */}
        {!activeSectionId ? (
          <div className="text-center py-12">
            <Bus className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">{t.customer.noSections}</p>
          </div>
        ) : isSeatsLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t.common.loading}</span>
          </div>
        ) : seats.length === 0 ? (
          <div className="text-center py-12">
            <Armchair className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">{t.customer.noSeats}</p>
          </div>
        ) : (
          <div className="flex justify-center overflow-x-auto pb-2">
            <div
              className="relative rounded-2xl border-2 border-slate-300 bg-slate-50 p-3"
              style={{ width: containerW + 24, minHeight: containerH + 24 }}
            >
              {/* Seat container */}
              <div className="relative" style={{ width: containerW, height: containerH }}>
                {/* Objects (decorative) */}
                {normObjects.map(obj => (
                  <div
                    key={obj.id}
                    className="absolute rounded border border-slate-200 flex items-center justify-center overflow-hidden"
                    style={{
                      left: obj.nx,
                      top: obj.ny,
                      width: Math.max(seatSize, obj.w * scaleX),
                      height: Math.max(seatSize, obj.h * scaleY),
                      backgroundColor: obj.color || '#f1f5f9',
                    }}
                  >
                    <span className="text-[9px] font-semibold text-slate-600 text-center leading-tight px-0.5 truncate">
                      {obj.name}
                    </span>
                  </div>
                ))}

                {/* Seats */}
                {normSeats.map(renderTransportSeatTile)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Level 3: Chair selection (bus-seat style layout) ────────
  if (selectedTableId) {
    // Chairs come from DB in opposite-pair order: 1↔2, 3↔4, 5↔6, ...
    // Split into top (odd indices: 0,2,4,...) and bottom (even indices: 1,3,5,...)
    const topRow = chairResources.filter((_, i) => i % 2 === 0);
    const bottomRow = chairResources.filter((_, i) => i % 2 === 1);

    const renderSeatTile = (chair: ResourceDto) => {
      const occupant = chair.client;
      const isOwnSeat = !!(currentClientId && occupant && occupant.id === currentClientId);
      const isOccupiedByOther = !!(occupant && !isOwnSeat);
      const isSelected = existingResourceId === chair.id;
      const isPending = pendingChairId === chair.id;
      const occupantName = occupant ? `${occupant.firstName} ${occupant.lastName}` : '';
      const gender = occupant?.gender; // 'm' | 'f' | null | undefined
      const isMale = isOccupiedByOther && gender === 'm';
      const isFemale = isOccupiedByOther && gender === 'f';
      // Use 1-based index within this table (each table starts from 1)
      const seatIndex = chairResources.findIndex(c => c.id === chair.id);
      const shortLabel = String(seatIndex + 1);

      // Color scheme based on gender
      const occupiedBorder = isFemale ? 'border-pink-300' : 'border-blue-300';
      const occupiedBg = isFemale ? 'bg-pink-100' : 'bg-blue-100';
      const occupiedIcon = isFemale ? 'text-pink-400' : 'text-blue-400';
      const occupiedNumber = isFemale ? 'text-pink-600' : 'text-blue-600';
      const occupiedHoverBg = isFemale ? 'bg-pink-500 text-white' : 'bg-blue-500 text-white';

      return (
        <Tooltip key={chair.id}>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="group/seat relative"
              onClick={() => {
                if (isOccupiedByOther && occupant) {
                  setTappedChairId(prev => prev === chair.id ? null : chair.id);
                } else if (!readOnly && !savingTable) {
                  onSelectChair(chair);
                }
              }}
            >
              <button
                disabled={savingTable || isOccupiedByOther}
                className={`relative flex flex-col items-center justify-center w-[52px] h-[58px] sm:w-[60px] sm:h-[66px] rounded-lg border-2 transition-all pointer-events-none ${
                  savingTable ? 'opacity-50 cursor-wait' :
                  isOccupiedByOther
                    ? `${occupiedBorder} ${occupiedBg}`
                    : isPending
                      ? 'border-orange-500 bg-orange-100 shadow-md shadow-orange-200/50 ring-2 ring-orange-300'
                      : isOwnSeat || isSelected
                        ? 'border-emerald-500 bg-emerald-100 shadow-md shadow-emerald-200/50'
                        : 'border-slate-200 bg-white hover:border-orange-400 hover:bg-orange-50 hover:shadow-sm'
                }`}
                tabIndex={-1}
              >
                {/* Badge for selected/pending seat */}
                {isPending ? (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center shadow-sm">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </div>
                ) : (isOwnSeat || isSelected) ? (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </div>
                ) : null}

                {/* Seat icon */}
                {savingTable ? (
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 animate-spin" />
                ) : (
                  <Armchair className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    isOccupiedByOther ? occupiedIcon :
                    isPending ? 'text-orange-600' :
                    isOwnSeat || isSelected ? 'text-emerald-600' : 'text-slate-400'
                  }`} />
                )}

                {/* Seat number */}
                <span className={`text-[10px] sm:text-xs font-bold leading-tight mt-0.5 ${
                  isOccupiedByOther ? occupiedNumber :
                  isPending ? 'text-orange-700' :
                  isOwnSeat || isSelected ? 'text-emerald-700' : 'text-slate-700'
                }`}>
                  {shortLabel}
                </span>

              </button>
              {/* Occupant name on hover/tap */}
              {occupant && (
                <span className={`absolute -bottom-5 left-0 transition-opacity pointer-events-none whitespace-nowrap text-[9px] font-semibold px-1.5 py-0.5 rounded shadow-sm z-10 ${
                  tappedChairId === chair.id ? 'opacity-100' : 'opacity-0 group-hover/seat:opacity-100'
                } ${isOwnSeat ? 'bg-emerald-600 text-white' : occupiedHoverBg}`}>
                  {occupantName.length > 15 ? occupantName.substring(0, 15) + '…' : occupantName}
                </span>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[180px]">
            <p className="font-bold">{chair.name}</p>
            {isOwnSeat && <p className="text-emerald-600 font-medium">{occupantName}</p>}
            {isMale && <p className="text-blue-500 font-medium">{occupantName}</p>}
            {isFemale && <p className="text-pink-500 font-medium">{occupantName}</p>}
            {isOccupiedByOther && !isMale && !isFemale && <p className="text-slate-500 font-medium">{occupantName}</p>}
            {!occupant && <p className="text-slate-400">{t.customer.seatEmpty}</p>}
          </TooltipContent>
        </Tooltip>
      );
    };

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
        <div className="flex flex-wrap gap-3 sm:gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-slate-200 bg-white" />
            <span className="text-slate-500">{t.customer.seatEmpty}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-blue-300 bg-blue-100" />
            <span className="text-blue-600">{t.customer.seatOccupiedMale}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-pink-300 bg-pink-100" />
            <span className="text-pink-600">{t.customer.seatOccupiedFemale}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-100" />
            <span className="text-emerald-600">{t.customer.seatYours}</span>
          </div>
        </div>

        {/* Seat map */}
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
          <div className="overflow-x-auto pb-2 -mx-2 px-2">
            <div className="flex flex-col items-center gap-6 py-4" style={{ minWidth: 'fit-content' }}>
              {/* Top row of seats */}
              <div className="flex justify-center gap-1.5">
                {topRow.map(renderSeatTile)}
              </div>

              {/* Table visual — stretches to match seat rows */}
              <div className="w-full px-4">
                <div className={`flex items-center justify-center py-2.5 sm:py-3 border-2 border-amber-300 bg-amber-50 text-amber-800 font-bold text-sm sm:text-base ${
                  chairResources.length <= 2 ? 'rounded-full' : 'rounded-xl'
                }`}>
                  <span className="truncate px-4">{activeTable?.name}</span>
                </div>
              </div>

              {/* Bottom row of seats */}
              {bottomRow.length > 0 && (
                <div className="flex justify-center gap-1.5">
                  {bottomRow.map(renderSeatTile)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Level 2: Table selection (room selected) ───────────────
  if (activeRoomId) {
    const tablesMap: Record<number, ResourceDto[]> = { [activeRoomId]: roomTables };
    const objectsMap: Record<number, ResourceDto[]> = { [activeRoomId]: roomObjects };
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
            objectsMap={objectsMap}
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
