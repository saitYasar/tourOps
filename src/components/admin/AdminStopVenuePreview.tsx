'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type ResourceDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TableOccupant } from '@/components/restaurant/VenueModel3D';
import type { Floor, Room, Table } from '@/types';
import dynamic from 'next/dynamic';

const VenueModel3D = dynamic(
  () => import('@/components/restaurant/VenueModel3D').then(m => ({ default: m.VenueModel3D })),
  { ssr: false, loading: () => <div className="h-[500px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl animate-pulse" /> },
);

interface VenueObject {
  id: string;
  name: string;
  kind: 'window' | 'wall' | 'column' | 'free';
  color?: string;
  roomId: string;
  x?: number; y?: number; w?: number; h?: number; rotation?: number;
}

interface AdminStopVenuePreviewProps {
  stopId: number;
}

// ── ErrorBoundary for Three.js Canvas crashes ──

class Canvas3DErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; errorKey: number }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorKey: 0 };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  retry = () => {
    this.setState(prev => ({ hasError: false, errorKey: prev.errorKey + 1 }));
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[500px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex flex-col items-center justify-center gap-3">
          <Building2 className="h-8 w-8 text-slate-300" />
          <p className="text-slate-400 text-sm">3D model yüklenemedi</p>
          <button
            onClick={this.retry}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
          >
            Tekrar Dene
          </button>
        </div>
      );
    }
    return <React.Fragment key={this.state.errorKey}>{this.props.children}</React.Fragment>;
  }
}

// ── Helpers ──

function parseCoords(coords: string | string[] | number[] | undefined | null): { x: number; y: number } {
  if (!coords) return { x: 50, y: 50 };
  if (Array.isArray(coords)) {
    const [x, y] = coords.map(Number);
    return { x: x || 50, y: y || 50 };
  }
  const parts = String(coords).split(',');
  return { x: Number(parts[0]) || 50, y: Number(parts[1]) || 50 };
}

function detectKind(name: string): 'window' | 'wall' | 'column' | 'free' {
  const lower = name.toLowerCase();
  if (lower.startsWith('cam kenar') || lower.startsWith('cam_kenar') || lower.startsWith('window')) return 'window';
  if (lower.startsWith('kolon') || lower.startsWith('column')) return 'column';
  if (lower.startsWith('duvar') || lower.startsWith('wall')) return 'wall';
  return 'free';
}

function isTableResource(r: ResourceDto): boolean {
  const code = r.resourceType?.code;
  if (code === 'table') return true;
  if (code) return false;
  return (r.capacity ?? 0) > 0;
}

function isObjectResource(r: ResourceDto): boolean {
  const code = r.resourceType?.code;
  if (code === 'object') return true;
  if (code) return false;
  const lower = r.name.toLowerCase();
  const dashIdx = r.name.lastIndexOf('-');
  const baseName = dashIdx > 0 ? r.name.substring(0, dashIdx).toLowerCase() : lower;
  if (baseName.startsWith('cam kenar') || baseName.startsWith('cam_kenar') || baseName.startsWith('window')) return true;
  if (baseName.startsWith('duvar') || baseName.startsWith('wall')) return true;
  if (baseName.startsWith('kolon') || baseName.startsWith('column')) return true;
  if (baseName.startsWith('serbest') || baseName.startsWith('free')) return true;
  if (baseName.startsWith('projeksiyon') || baseName.startsWith('projector')) return true;
  if (baseName.startsWith('perde') || baseName.startsWith('curtain')) return true;
  if (baseName.startsWith('bar ') || baseName.startsWith('şömine') || baseName.startsWith('fireplace')) return true;
  return false;
}

// ── API fetch helper ──

async function fetchLayoutApi(stopId: number, parentId?: number): Promise<ResourceDto[]> {
  try {
    const result = await apiClient.getStopLayout(stopId, parentId);
    return Array.isArray(result) ? result : (result as unknown as { data?: ResourceDto[] })?.data ?? [];
  } catch { return []; }
}

// ── Convert cache data → legacy model types with occupancy from chair.client ──

function convertFromCache(
  floorResources: ResourceDto[],
  cache: Record<number, ResourceDto[]>,
) {
  const now = new Date().toISOString();
  const floors: Floor[] = [];
  const rooms: Room[] = [];
  const tables: Table[] = [];
  const objects: VenueObject[] = [];
  const occupancy: Record<string, (TableOccupant | null)[]> = {};

  for (const floor of floorResources) {
    const fid = String(floor.id);
    floors.push({
      id: fid, name: floor.name, order: floor.order,
      restaurantId: '1', createdAt: now, updatedAt: now,
    });

    for (const room of cache[floor.id] ?? []) {
      const rid = String(room.id);
      const rc = parseCoords(room.coordinates);
      rooms.push({
        id: rid, name: room.name, floorId: fid, order: room.order,
        restaurantId: '1', createdAt: now, updatedAt: now,
        x: rc.x, y: rc.y, width: room.width, height: room.height,
      });

      for (const child of cache[room.id] ?? []) {
        const cid = String(child.id);

        if (isTableResource(child)) {
          const tc = parseCoords(child.coordinates);
          tables.push({
            id: cid, name: child.name, roomId: rid, capacity: child.capacity,
            order: child.order, restaurantId: '1', createdAt: now, updatedAt: now,
            x: tc.x, y: tc.y, w: child.width, h: child.height, rotation: child.rotation,
          });

          const chairs = cache[child.id] ?? [];
          if (chairs.length > 0) {
            const occ: (TableOccupant | null)[] = chairs.map(chair => {
              if (chair.client) {
                return {
                  clientId: chair.client.id,
                  clientName: `${chair.client.firstName} ${chair.client.lastName}`.trim(),
                  gender: chair.client.gender,
                };
              }
              return null;
            });
            if (occ.some(Boolean)) {
              occupancy[cid] = occ;
            }
          }
        } else if (isObjectResource(child)) {
          const oc = parseCoords(child.coordinates);
          objects.push({
            id: cid, name: child.name, kind: detectKind(child.name),
            color: child.color || undefined, roomId: rid,
            x: oc.x, y: oc.y, w: child.width, h: child.height, rotation: child.rotation,
          });
        }
      }
    }
  }

  return { floors, rooms, tables, objects, occupancy };
}

// ── Main component ──

export const AdminStopVenuePreview = React.memo(function AdminStopVenuePreview({ stopId }: AdminStopVenuePreviewProps) {
  const { t } = useLanguage();

  const [cache, setCache] = useState<Record<number, ResourceDto[]>>({});
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  // Step 1: Fetch top-level floors
  const { data: floorResources, isLoading, isError } = useQuery({
    queryKey: ['admin-venue-floors', stopId],
    queryFn: () => fetchLayoutApi(stopId),
    enabled: !!stopId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const floors = floorResources ?? [];

  // Progressive loading handlers
  const handleFloorSelect = useCallback(async (floorId: string) => {
    const numericId = Number(floorId);
    if (!numericId || cacheRef.current[numericId]) return;
    const children = await fetchLayoutApi(stopId, numericId);
    setCache(prev => ({ ...prev, [numericId]: children }));
  }, [stopId]);

  const handleRoomSelect = useCallback(async (roomId: string) => {
    const numericId = Number(roomId);
    if (!numericId || cacheRef.current[numericId]) return;
    const children = await fetchLayoutApi(stopId, numericId);
    setCache(prev => ({ ...prev, [numericId]: children }));

    // Also fetch chairs for tables (for occupancy data)
    const tableChildren = children.filter(isTableResource);
    if (tableChildren.length > 0) {
      const chairResults = await Promise.all(
        tableChildren
          .filter(table => !cacheRef.current[table.id])
          .map(async table => {
            const chairs = await fetchLayoutApi(stopId, table.id);
            return { tableId: table.id, chairs };
          }),
      );
      if (chairResults.length > 0) {
        setCache(prev => {
          const next = { ...prev };
          for (const { tableId, chairs } of chairResults) {
            next[tableId] = chairs;
          }
          return next;
        });
      }
    }
  }, [stopId]);

  // Convert to legacy model
  const { floors: mFloors, rooms, tables, objects, occupancy } = useMemo(
    () => floors.length > 0
      ? convertFromCache(floors, cache)
      : { floors: [] as Floor[], rooms: [] as Room[], tables: [] as Table[], objects: [] as VenueObject[], occupancy: {} },
    [floors, cache],
  );

  const hasFloors = mFloors.length > 0;

  if (isLoading) {
    return (
      <div className="h-[500px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Building2 className="h-5 w-5 animate-pulse" />
          {t.common.loading}
        </div>
      </div>
    );
  }

  if (isError || !hasFloors) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
        <Building2 className="h-8 w-8 text-slate-300" />
        <p>Mekan yerleşim verisi bulunamadı</p>
      </div>
    );
  }

  return (
    <Canvas3DErrorBoundary
      fallback={
        <div className="h-[500px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
          <p className="text-slate-400 text-sm">3D model yüklenemedi</p>
        </div>
      }
    >
      <div className="rounded-xl overflow-hidden border border-slate-200">
        <VenueModel3D
          floors={mFloors}
          rooms={rooms}
          tables={tables}
          objects={objects}
          occupancy={occupancy}
          onFloorSelect={handleFloorSelect}
          onRoomSelect={handleRoomSelect}
          readOnly
        />

        {/* Legend */}
        <div className="flex flex-wrap gap-4 px-3 py-2 bg-slate-50 border-t text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#2563eb' }} />
            <span className="text-slate-600">{t.customer?.seatOccupiedMale || 'Dolu (Erkek)'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#db2777' }} />
            <span className="text-slate-600">{t.customer?.seatOccupiedFemale || 'Dolu (Kadın)'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#6B4C35' }} />
            <span className="text-slate-600">{t.customer?.seatEmpty || 'Boş'}</span>
          </div>
        </div>
      </div>
    </Canvas3DErrorBoundary>
  );
});
