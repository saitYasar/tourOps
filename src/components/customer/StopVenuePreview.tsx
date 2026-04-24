'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Building2, Bus, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient, type ResourceDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TableOccupant } from '@/components/restaurant/VenueModel3D';
import type { SeatOccupant } from '@/components/transport/TransportModel3D';
import type { Floor, Room, Table } from '@/types';
import dynamic from 'next/dynamic';

const VenueModel3D = dynamic(
  () => import('@/components/restaurant/VenueModel3D').then(m => ({ default: m.VenueModel3D })),
  { ssr: false, loading: () => <div className="h-[400px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl animate-pulse" /> },
);

const TransportModel3D = dynamic(
  () => import('@/components/transport/TransportModel3D').then(m => ({ default: m.TransportModel3D })),
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

interface StopVenuePreviewProps {
  stopId: number;
  floors: ResourceDto[];
  childrenCache: Record<number, ResourceDto[]>;
  categoryId?: number;
  /** Called when user clicks a table in the 3D model */
  onTableSelect?: (tableResourceId: number) => void;
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

// ── Convert flat resource tree → legacy format for VenueModel3D ──

/** Maps legacy table string id → numeric resource id */
type TableIdMap = Record<string, number>;

function convertToLegacy(floorResources: ResourceDto[], cache: Record<number, ResourceDto[]>) {
  const now = new Date().toISOString();
  const floors: Floor[] = [];
  const rooms: Room[] = [];
  const tables: Table[] = [];
  const objects: VenueObject[] = [];
  const occupancy: Record<string, (TableOccupant | null)[]> = {};
  const tableIdMap: TableIdMap = {};

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
          tableIdMap[cid] = child.id;

          const chairs = cache[child.id] ?? [];
          if (chairs.length > 0) {
            const occ: (TableOccupant | null)[] = chairs.map(chair =>
              chair.client
                ? { clientId: chair.client.id, clientName: `${chair.client.firstName} ${chair.client.lastName}`.trim(), gender: chair.client.gender }
                : null,
            );
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

  return { floors, rooms, tables, objects, occupancy, tableIdMap };
}

// ── Main component ───────────────────────────────────────────

export function StopVenuePreview({ stopId, floors: floorResources, childrenCache: parentCache, categoryId, onTableSelect }: StopVenuePreviewProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [treeCache, setTreeCache] = useState<Record<number, ResourceDto[]>>({});
  const [ready, setReady] = useState(false);
  const loadingRef = useRef(false);
  const [selectedTableId3D, setSelectedTableId3D] = useState<string | null>(null);

  const isTransport = categoryId === 2 || floorResources.some(r => r.resourceType?.code === 'section');

  // Use ref for parentCache so the async effect always reads fresh values
  const parentCacheRef = useRef(parentCache);
  parentCacheRef.current = parentCache;

  const cache = useMemo(() => ({ ...treeCache, ...parentCache }), [treeCache, parentCache]);

  // Load full resource tree when expanded
  useEffect(() => {
    if (!expanded || !stopId || floorResources.length === 0) return;
    if (loadingRef.current || ready) return;
    loadingRef.current = true;

    const sid = stopId;
    const floors = floorResources;

    const fetchRaw = async (parentId: number): Promise<ResourceDto[]> => {
      try {
        const result = await apiClient.getStopLayout(sid, parentId);
        return Array.isArray(result) ? result : (result as unknown as { data?: ResourceDto[] })?.data ?? [];
      } catch { return []; }
    };

    (async () => {
      const pc = parentCacheRef.current;
      const batch: Record<number, ResourceDto[]> = {};

      if (isTransport) {
        // Transport: 2-level fetch (sections → seats)
        await Promise.all(floors.map(async section => {
          if (pc[section.id]) { batch[section.id] = pc[section.id]; return; }
          batch[section.id] = await fetchRaw(section.id);
        }));
      } else {
        // Restaurant: 3-level fetch (floors → rooms → tables → chairs)
        // Level 1: floors → rooms
        await Promise.all(floors.map(async floor => {
          if (pc[floor.id]) { batch[floor.id] = pc[floor.id]; return; }
          batch[floor.id] = await fetchRaw(floor.id);
        }));

        // Level 2: rooms → tables/objects
        const tablePromises: Promise<void>[] = [];
        for (const floor of floors) {
          for (const room of batch[floor.id] ?? []) {
            tablePromises.push((async () => {
              if (pc[room.id]) { batch[room.id] = pc[room.id]; return; }
              batch[room.id] = await fetchRaw(room.id);
            })());
          }
        }
        await Promise.all(tablePromises);

        // Level 3: tables → chairs
        const chairPromises: Promise<void>[] = [];
        for (const floor of floors) {
          for (const room of batch[floor.id] ?? []) {
            for (const child of batch[room.id] ?? []) {
              if (!isTableResource(child)) continue;
              chairPromises.push((async () => {
                if (pc[child.id]) { batch[child.id] = pc[child.id]; return; }
                batch[child.id] = await fetchRaw(child.id);
              })());
            }
          }
        }
        await Promise.all(chairPromises);
      }

      setTreeCache(batch);
      setReady(true);
      loadingRef.current = false;
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, stopId, floorResources.length, ready, isTransport]);

  const emptyLegacy = useMemo(() => ({ floors: [] as Floor[], rooms: [] as Room[], tables: [] as Table[], objects: [] as VenueObject[], occupancy: {} as Record<string, (TableOccupant | null)[]>, tableIdMap: {} as Record<string, number> }), []);

  const { floors, rooms, tables, objects, occupancy, tableIdMap } = useMemo(
    () => !isTransport && ready ? convertToLegacy(floorResources, cache) : emptyLegacy,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorResources, cache, ready, isTransport],
  );

  // Convert to transport model
  const { tSections, tSeats, tOccupancy } = useMemo(() => {
    if (!isTransport || !ready) return { tSections: [], tSeats: [], tOccupancy: {} as Record<number, SeatOccupant | null> };
    const sections = floorResources.map(r => {
      const c = parseCoords(r.coordinates);
      return { id: r.id, name: r.name, x: c.x, y: c.y, w: r.width || 200, h: r.height || 150 };
    });
    const occ: Record<number, SeatOccupant | null> = {};
    const seats = floorResources.flatMap(r => {
      const children = cache[r.id] ?? [];
      return children.map(ch => {
        const c = parseCoords(ch.coordinates);
        const isObj = ch.resourceType?.code === 'transport_object' || ch.resourceType?.code === 'object';
        if (!isObj && ch.client) {
          occ[ch.id] = {
            clientId: ch.client.id,
            clientName: `${ch.client.firstName} ${ch.client.lastName}`.trim(),
            gender: ch.client.gender,
          };
        }
        return { id: ch.id, name: ch.name, sectionId: r.id, x: c.x, y: c.y, isObject: isObj, color: ch.color || undefined, width: ch.width, height: ch.height };
      });
    });
    return { tSections: sections, tSeats: seats, tOccupancy: occ };
  }, [isTransport, floorResources, cache, ready]);

  const handleTableSelect = (legacyTableId: string) => {
    setSelectedTableId3D(legacyTableId);
    const numericId = tableIdMap[legacyTableId];
    if (numericId && onTableSelect) {
      onTableSelect(numericId);
      // Collapse 3D panel after selection
      setTimeout(() => setExpanded(false), 150);
    }
  };

  if (floorResources.length === 0) return null;

  const hasData = isTransport ? tSections.length > 0 : floors.length > 0;
  const IconComp = isTransport ? Bus : Building2;

  return (
    <div className="mb-4">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
      >
        <IconComp className="h-4 w-4 text-orange-500" />
        <span className="flex-1 text-left">
          {expanded
            ? ((t.venue as Record<string, string>)?.switchToSeatLayout || 'Koltuk Düzenine Geç')
            : ((t.venue as Record<string, string>)?.switchToModel || '3D Modele Geç')}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {/* Collapsible 3D content */}
      {expanded && (
        <div className="mt-2 rounded-xl overflow-hidden border border-slate-200">
          {!ready ? (
            <div className="h-[400px] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <IconComp className="h-5 w-5 animate-pulse" />
                {t.common.loading}
              </div>
            </div>
          ) : !hasData ? (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
              {(t.venue as Record<string, string>)?.noDataFor3D || 'Mekan verisi bulunamadı'}
            </div>
          ) : isTransport ? (
            <TransportModel3D
              sections={tSections}
              seats={tSeats}
              occupancy={tOccupancy}
            />
          ) : (
            <VenueModel3D
              floors={floors}
              rooms={rooms}
              tables={tables}
              objects={objects}
              occupancy={occupancy}
              selectedTableId={selectedTableId3D}
              onTableSelect={handleTableSelect}
            />
          )}

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
              <div className="w-3 h-3 rounded-full" style={{ background: isTransport ? '#4b5563' : '#6B4C35' }} />
              <span className="text-slate-600">{t.customer?.seatEmpty || 'Boş'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
