'use client';

import { useState, useCallback, useMemo, useEffect, Component, type ReactNode } from 'react';
import { Building2, Armchair, Check, Loader2, ChevronLeft, MapPin, Box, Layers, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Floor, Room, Table } from '@/types';
import type { ResourceDto } from '@/lib/api';
import dynamic from 'next/dynamic';

/** Filter out structural/decorative objects — keep only tables.
 *  Objects are: Cam Kenarı, Duvar, Kolon, Serbest Obje (Projeksiyon, Perde, etc.)
 *  Uses resourceType.code when available, then name patterns + capacity heuristic. */
function filterTables(resources: ResourceDto[]): ResourceDto[] {
  return resources.filter(r => {
    // 1. If resourceType is populated, use it directly
    if (r.resourceType?.code) return r.resourceType.code === 'table';
    // 2. Known object name patterns (all object kinds)
    const lower = r.name.toLowerCase();
    const dashIdx = r.name.lastIndexOf('-');
    const baseName = dashIdx > 0 ? r.name.substring(0, dashIdx).toLowerCase() : lower;
    if (baseName.startsWith('cam kenar') || baseName.startsWith('cam_kenar') || baseName.startsWith('window')) return false;
    if (baseName.startsWith('duvar') || baseName.startsWith('wall')) return false;
    if (baseName.startsWith('kolon') || baseName.startsWith('column')) return false;
    if (baseName.startsWith('serbest') || baseName.startsWith('free')) return false;
    if (baseName.startsWith('projeksiyon') || baseName.startsWith('projector')) return false;
    if (baseName.startsWith('perde') || baseName.startsWith('curtain')) return false;
    // 3. Objects have capacity 0, tables always have capacity >= 1
    if (r.capacity === 0 || r.capacity == null) return false;
    return true;
  });
}

// Lazy load Konva canvas (heavy dependency)
const FloorPlanCanvas = dynamic(
  () => import('./FloorPlanCanvas').then(m => ({ default: m.FloorPlanCanvas })),
  { ssr: false, loading: () => <div className="h-[450px] bg-slate-100 rounded-xl animate-pulse" /> }
);

// Lazy load 3D model (heavy Three.js dependency)
const VenueModel3D = dynamic(
  () => import('@/components/restaurant/VenueModel3D').then(m => ({ default: m.VenueModel3D })),
  { ssr: false, loading: () => <div className="h-[400px] bg-slate-100 rounded-xl animate-pulse" /> }
);

// ── Error boundary for 3D Canvas ───────────────────────────────
interface ErrorBoundaryState { hasError: boolean }
class Canvas3DErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.warn('[VenueModel3D] Render error:', error.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

interface CustomerVenueSelectorProps {
  floors: ResourceDto[];
  childrenCache: Record<number, ResourceDto[]>;
  loadingChildren: boolean;
  fetchChildren: (parentId: number, force?: boolean) => Promise<void>;
  onSelectChair: (chair: ResourceDto) => void;
  savingTable: boolean;
  existingResourceId?: number;
}

// Parse coordinates that can be "x,y" string, [x,y] array, or {x,y} object
function parseCoords(coords: unknown): { x: number; y: number } {
  if (!coords) return { x: 0, y: 0 };
  if (typeof coords === 'object' && !Array.isArray(coords)) {
    const obj = coords as Record<string, unknown>;
    return { x: Number(obj.x) || 0, y: Number(obj.y) || 0 };
  }
  if (Array.isArray(coords) && coords.length >= 2) {
    return { x: Number(coords[0]) || 0, y: Number(coords[1]) || 0 };
  }
  if (typeof coords === 'string') {
    const parts = coords.split(',');
    if (parts.length >= 2) return { x: parseFloat(parts[0]) || 0, y: parseFloat(parts[1]) || 0 };
  }
  return { x: 0, y: 0 };
}

// Convert ResourceDto to legacy Floor type
function toFloor(r: ResourceDto): Floor {
  return {
    id: String(r.id),
    restaurantId: String(r.organizationId),
    name: r.name,
    order: r.order ?? 0,
    createdAt: r.createdAt ?? '',
    updatedAt: r.updatedAt ?? '',
  };
}

// Convert ResourceDto to legacy Room type
function toRoom(r: ResourceDto, floorId: number): Room {
  const c = parseCoords(r.coordinates);
  return {
    id: String(r.id),
    floorId: String(floorId),
    restaurantId: String(r.organizationId),
    name: r.name,
    order: r.order ?? 0,
    createdAt: r.createdAt ?? '',
    updatedAt: r.updatedAt ?? '',
    x: c.x,
    y: c.y,
    width: r.width,
    height: r.height,
  };
}

// Convert ResourceDto to legacy Table type
function toTable(r: ResourceDto, roomId: number): Table {
  const c = parseCoords(r.coordinates);
  return {
    id: String(r.id),
    roomId: String(roomId),
    restaurantId: String(r.organizationId),
    name: r.name,
    capacity: r.capacity ?? 0,
    order: r.order ?? 0,
    createdAt: r.createdAt ?? '',
    updatedAt: r.updatedAt ?? '',
    isWindowSide: false,
    x: c.x,
    y: c.y,
    w: r.width,
    h: r.height,
    rotation: r.rotation,
  };
}

export function CustomerVenueSelector({
  floors: floorResources,
  childrenCache,
  loadingChildren,
  fetchChildren,
  onSelectChair,
  savingTable,
  existingResourceId,
}: CustomerVenueSelectorProps) {
  const { t } = useLanguage();
  const [viewTab, setViewTab] = useState<'plan' | '3d'>('plan');
  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [showChairs, setShowChairs] = useState(false);

  // Auto-select first floor + pre-fetch ALL floors' children (3D needs all)
  useEffect(() => {
    if (floorResources.length === 0) return;
    if (!activeFloorId) {
      setActiveFloorId(floorResources[0].id);
    }
    for (const floor of floorResources) {
      if (!childrenCache[floor.id]) {
        fetchChildren(floor.id);
      }
    }
  }, [floorResources, activeFloorId, childrenCache, fetchChildren]);

  // When any floor's rooms load, auto-fetch tables for each room
  useEffect(() => {
    for (const floor of floorResources) {
      const rooms = childrenCache[floor.id] ?? [];
      for (const room of rooms) {
        if (!childrenCache[room.id]) {
          fetchChildren(room.id);
        }
      }
    }
  }, [floorResources, childrenCache, fetchChildren]);

  // Get rooms and tables for active floor
  const activeRooms = activeFloorId ? (childrenCache[activeFloorId] ?? []) : [];
  const activeTablesMap: Record<number, ResourceDto[]> = {};
  for (const room of activeRooms) {
    activeTablesMap[room.id] = filterTables(childrenCache[room.id] ?? []);
  }

  // Get chairs for selected table
  const chairResources = selectedTableId ? (childrenCache[selectedTableId] ?? []) : [];

  // Convert to legacy types for VenueModel3D
  const legacyFloors = useMemo(() => floorResources.map(toFloor), [floorResources]);

  const legacyRooms = useMemo(() => {
    const result: Room[] = [];
    for (const floor of floorResources) {
      const rooms = childrenCache[floor.id] ?? [];
      result.push(...rooms.map(r => toRoom(r, floor.id)));
    }
    return result;
  }, [floorResources, childrenCache]);

  const legacyTables = useMemo(() => {
    const result: Table[] = [];
    for (const floor of floorResources) {
      const rooms = childrenCache[floor.id] ?? [];
      for (const room of rooms) {
        const tables = filterTables(childrenCache[room.id] ?? []);
        result.push(...tables.map(tbl => toTable(tbl, room.id)));
      }
    }
    return result;
  }, [floorResources, childrenCache]);

  // Handle floor tab change
  const handleFloorChange = useCallback((floorId: number) => {
    setActiveFloorId(floorId);
    setSelectedTableId(null);
    setShowChairs(false);
    fetchChildren(floorId);
  }, [fetchChildren]);

  // Handle table click → fetch chairs
  const handleTableClick = useCallback((tableId: number) => {
    setSelectedTableId(tableId);
    setShowChairs(true);
    fetchChildren(tableId, true);
  }, [fetchChildren]);

  // Back from chairs
  const handleBackFromChairs = () => {
    setShowChairs(false);
    setSelectedTableId(null);
  };

  // Find parent names for breadcrumb
  const selectedTableResource = useMemo(() => {
    if (!selectedTableId) return null;
    for (const room of activeRooms) {
      const tables = childrenCache[room.id] ?? [];
      const found = tables.find(t => t.id === selectedTableId);
      if (found) return { table: found, room, floor: floorResources.find(f => f.id === activeFloorId) };
    }
    return null;
  }, [selectedTableId, activeRooms, childrenCache, floorResources, activeFloorId]);

  // Chair selection overlay
  if (showChairs && selectedTableId) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleBackFromChairs}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t.customer.back}
            </Button>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Armchair className="h-5 w-5 text-orange-500" />
                {t.customer.selectChair}
              </h3>
              {selectedTableResource && (
                <p className="text-sm text-slate-500">
                  {selectedTableResource.floor?.name} &gt; {selectedTableResource.room.name} &gt; {selectedTableResource.table.name}
                </p>
              )}
            </div>
          </div>
        </div>

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
          <div className="grid grid-cols-3 gap-3">
            {chairResources.map(chair => {
              const isSelected = existingResourceId === chair.id;
              return (
                <button
                  key={chair.id}
                  disabled={savingTable}
                  className={`relative p-4 rounded-xl border-2 transition-all text-center ${
                    savingTable ? 'opacity-50 cursor-wait' :
                    isSelected
                      ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                      : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
                  }`}
                  onClick={() => onSelectChair(chair)}
                >
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                  )}
                  {savingTable ? (
                    <Loader2 className="h-8 w-8 mx-auto mb-1 text-orange-500 animate-spin" />
                  ) : (
                    <Armchair className={`h-8 w-8 mx-auto mb-1 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                  )}
                  <p className="font-bold text-sm text-slate-800">{chair.name}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Check if any data is loading for the floor
  const isFloorDataLoading = loadingChildren && activeRooms.length === 0;
  const hasRoomsButNoTables = activeRooms.length > 0 && loadingChildren && Object.values(activeTablesMap).every(t => t.length === 0);

  // 3D model needs ALL data loaded before mounting (Three.js can't handle data transitions)
  const allRoomsLoaded = floorResources.every(f => childrenCache[f.id] !== undefined);
  const allRooms = floorResources.flatMap(f => childrenCache[f.id] ?? []);
  const allTablesLoaded = allRooms.length === 0 || allRooms.every(r => childrenCache[r.id] !== undefined);
  const dataReadyFor3D = allRoomsLoaded && allTablesLoaded && legacyRooms.length > 0;

  return (
    <div className="space-y-3">
      {/* View tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
        <button
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            viewTab === 'plan'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setViewTab('plan')}
        >
          <MapPin className="h-4 w-4" />
          {t.customer.venuePlan}
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            viewTab === '3d'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setViewTab('3d')}
        >
          <Box className="h-4 w-4" />
          {t.customer.venue3D}
        </button>
      </div>

      {/* Floor tabs */}
      {floorResources.length > 1 && (
        <div className="flex gap-1 overflow-x-auto">
          {floorResources.map(floor => (
            <button
              key={floor.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeFloorId === floor.id
                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-200'
              }`}
              onClick={() => handleFloorChange(floor.id)}
            >
              <Layers className="h-3.5 w-3.5" />
              {floor.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {viewTab === 'plan' ? (
        <div>
          {isFloorDataLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">{t.common.loading}</span>
            </div>
          ) : activeRooms.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">{t.customer.noRooms}</p>
            </div>
          ) : (
            <>
              {hasRoomsButNoTables && (
                <div className="flex items-center justify-center py-2 gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">{t.common.loading}</span>
                </div>
              )}
              <FloorPlanCanvas
                rooms={activeRooms}
                tablesMap={activeTablesMap}
                selectedTableId={selectedTableId}
                onTableClick={handleTableClick}
              />
            </>
          )}
        </div>
      ) : !dataReadyFor3D ? (
        <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-xl gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t.common.loading}</span>
        </div>
      ) : (
        <Canvas3DErrorBoundary
          fallback={
            <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <AlertTriangle className="h-10 w-10 text-amber-400 mb-3" />
              <p className="text-slate-500 text-sm">3D model yüklenemedi</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setViewTab('plan')}
              >
                <MapPin className="h-4 w-4 mr-1" />
                {t.customer.venuePlan}
              </Button>
            </div>
          }
        >
          <VenueModel3D
            floors={legacyFloors}
            rooms={legacyRooms}
            tables={legacyTables}
            selectedTableId={selectedTableId ? String(selectedTableId) : null}
            onFloorSelect={(floorId) => {
              const id = Number(floorId);
              setActiveFloorId(id);
              fetchChildren(id);
            }}
            onRoomSelect={(roomId) => {
              fetchChildren(Number(roomId));
            }}
            onTableSelect={(tableId) => {
              handleTableClick(Number(tableId));
            }}
          />
        </Canvas3DErrorBoundary>
      )}
    </div>
  );
}
