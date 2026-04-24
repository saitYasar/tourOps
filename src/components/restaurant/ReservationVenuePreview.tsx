'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type ResourceDto, type AgencyStopChoicesDto, type ClientResourceChoiceDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TableOccupant } from '@/components/restaurant/VenueModel3D';
import type { Floor, Room, Table } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';

const VenueModel3D = dynamic(
  () => import('@/components/restaurant/VenueModel3D').then(m => ({ default: m.VenueModel3D })),
  { ssr: false, loading: () => <div className="h-[400px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl animate-pulse" /> },
);

interface VenueObject {
  id: string;
  name: string;
  kind: 'window' | 'wall' | 'column' | 'free';
  color?: string;
  roomId: string;
  x?: number; y?: number; w?: number; h?: number; rotation?: number;
}

interface ReservationVenuePreviewProps {
  tourStopId?: number | null;
  tourId?: number | null;
  organizationId?: number | null;
  choices: AgencyStopChoicesDto[];
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
        <div className="h-[400px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex flex-col items-center justify-center gap-3">
          <Building2 className="h-8 w-8 text-slate-300" />
          <p className="text-slate-400 text-sm">3D görünüm yüklenemedi</p>
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

// ── Helpers ──────────────────────────────────────────────────

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

// ── API fetch helper ── uses /client/tours/stops/{stopId}/layout

async function fetchLayoutApi(stopId: number, parentId?: number): Promise<ResourceDto[]> {
  try {
    const result = await apiClient.getStopLayout(stopId, parentId);
    return Array.isArray(result) ? result : (result as unknown as { data?: ResourceDto[] })?.data ?? [];
  } catch { return []; }
}

// ── Build seat→client map from choices ──

function buildSeatClientMap(choices: AgencyStopChoicesDto[]): Map<number, { id: number; firstName: string; lastName: string; gender?: 'm' | 'f' | null }> {
  const map = new Map<number, { id: number; firstName: string; lastName: string; gender?: 'm' | 'f' | null }>();
  for (const choice of choices) {
    if (!choice.resourceChoice || !choice.client) continue;
    let seatId: number | null = null;
    if (Array.isArray(choice.resourceChoice)) {
      for (const item of choice.resourceChoice) {
        if ((item.resourceTypeCode === 'seat' || item.resourceTypeCode === 'chair') && (item as unknown as { resourceId?: number }).resourceId) {
          seatId = (item as unknown as { resourceId?: number }).resourceId!;
        }
      }
    } else {
      const rc = choice.resourceChoice as ClientResourceChoiceDto;
      seatId = rc.resourceId ?? null;
    }
    if (seatId) {
      map.set(seatId, {
        id: choice.client.id,
        firstName: choice.client.firstName || '',
        lastName: choice.client.lastName || '',
        gender: (choice.client as Record<string, unknown>)?.gender as 'm' | 'f' | null | undefined,
      });
    }
  }
  return map;
}

// ── Convert cache data → legacy model types ──

function convertFromCache(
  floorResources: ResourceDto[],
  cache: Record<number, ResourceDto[]>,
  seatClientMap: Map<number, { id: number; firstName: string; lastName: string; gender?: 'm' | 'f' | null }>,
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
          const tableChildren = cache[child.id] ?? [];
          tables.push({
            id: cid, name: child.name, roomId: rid, capacity: child.capacity,
            order: child.order, restaurantId: '1', createdAt: now, updatedAt: now,
            x: tc.x, y: tc.y, w: child.width, h: child.height, rotation: child.rotation,
            children: tableChildren.length > 0
              ? tableChildren.map(c => ({ id: c.id, name: c.name, order: c.order }))
              : undefined,
          });

          const chairs = tableChildren;
          if (chairs.length > 0) {
            const occ: (TableOccupant | null)[] = chairs.map(chair => {
              if (chair.client) {
                return { clientId: chair.client.id, clientName: `${chair.client.firstName} ${chair.client.lastName}`.trim(), gender: chair.client.gender };
              }
              const choiceClient = seatClientMap.get(chair.id);
              if (choiceClient) {
                return { clientId: choiceClient.id, clientName: `${choiceClient.firstName} ${choiceClient.lastName}`.trim(), gender: choiceClient.gender };
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

// ── Main component ───────────────────────────────────────────

export const ReservationVenuePreview = React.memo(function ReservationVenuePreview({ tourStopId, tourId, organizationId, choices }: ReservationVenuePreviewProps) {
  const { t } = useLanguage();

  // Resolve tourStopId: if null, look it up from tourId + organizationId
  const { data: resolvedStopId } = useQuery({
    queryKey: ['resolve-tour-stop', tourId, organizationId],
    queryFn: async () => {
      const stops = await apiClient.getTourStops(tourId!);
      const arr = Array.isArray(stops) ? stops : (stops as unknown as { data?: { id: number; organizationId: number }[] })?.data ?? [];
      const match = arr.find((s: { organizationId: number }) => s.organizationId === organizationId);
      return match?.id ?? null;
    },
    enabled: !tourStopId && !!tourId && !!organizationId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const stopId = tourStopId ?? resolvedStopId ?? null;

  // Progressive cache: accumulates children as user navigates
  const [cache, setCache] = useState<Record<number, ResourceDto[]>>({});
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const stopIdRef = useRef(stopId);
  stopIdRef.current = stopId;

  // Step 1: Fetch only top-level floors via /client/tours/stops/{stopId}/layout
  const { data: floorResources, isLoading, isError } = useQuery({
    queryKey: ['venue-floors', stopId],
    queryFn: () => fetchLayoutApi(stopId!),
    enabled: !!stopId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const floors = floorResources ?? [];

  // Stable callbacks using refs — no dependency on cache state
  const handleFloorSelect = useCallback(async (floorId: string) => {
    const numericId = Number(floorId);
    const sid = stopIdRef.current;
    if (!numericId || !sid || cacheRef.current[numericId]) return;
    const children = await fetchLayoutApi(sid, numericId);
    setCache(prev => ({ ...prev, [numericId]: children }));
  }, []);

  const handleRoomSelect = useCallback(async (roomId: string) => {
    const numericId = Number(roomId);
    const sid = stopIdRef.current;
    if (!numericId || !sid || cacheRef.current[numericId]) return;
    const children = await fetchLayoutApi(sid, numericId);
    setCache(prev => ({ ...prev, [numericId]: children }));

    // Also fetch chairs for tables (for occupancy)
    const tableChildren = children.filter(isTableResource);
    if (tableChildren.length > 0) {
      const chairResults = await Promise.all(
        tableChildren
          .filter(table => !cacheRef.current[table.id])
          .map(async table => {
            const chairs = await fetchLayoutApi(sid, table.id);
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
  }, []);

  // Convert to legacy model
  const seatClientMap = useMemo(() => buildSeatClientMap(choices), [choices]);
  const { floors: mFloors, rooms, tables, objects, occupancy } = useMemo(
    () => floors.length > 0
      ? convertFromCache(floors, cache, seatClientMap)
      : { floors: [] as Floor[], rooms: [] as Room[], tables: [] as Table[], objects: [] as VenueObject[], occupancy: {} },
    [floors, cache, seatClientMap],
  );

  const hasFloors = mFloors.length > 0;

  return (
    <Card>
      <CardHeader className="p-3 pb-2 md:p-6 md:pb-2">
        <CardTitle className="text-sm md:text-lg flex items-center gap-2">
          <Building2 className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
          3D Gösterim
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
        {isLoading && (
          <div className="h-[400px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Building2 className="h-5 w-5 animate-pulse" />
              {t.common.loading}
            </div>
          </div>
        )}
        {!isLoading && (isError || !hasFloors) && (
          <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
            {(t.venue as Record<string, string>)?.noDataFor3D || 'Mekan verisi bulunamadı'}
          </div>
        )}
        {hasFloors && (
          <Canvas3DErrorBoundary
            fallback={
              <div className="h-[400px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                <p className="text-slate-400 text-sm">3D görünüm yüklenemedi</p>
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
        )}
      </CardContent>
    </Card>
  );
});
