'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { adminApi, type AgencyStopChoicesDto, type ResourceDto, type ClientResourceChoiceDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { LoadingState, EmptyState } from '@/components/shared';
import type { TableOccupant } from '@/components/restaurant/VenueModel3D';
import type { Floor, Room, Table } from '@/types';
import dynamic from 'next/dynamic';

const VenueModel3D = dynamic(
  () => import('@/components/restaurant/VenueModel3D').then(m => ({ default: m.VenueModel3D })),
  { ssr: false, loading: () => <div className="h-[400px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl" /> },
);

interface VenueObject {
  id: string;
  name: string;
  kind: 'window' | 'wall' | 'column' | 'free';
  color?: string;
  roomId: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
}

interface VenueOccupancyViewerProps {
  organizationId: number;
  choices: AgencyStopChoicesDto[];
}

function parseCoordinates(coords: string | string[] | number[] | undefined | null): { x: number; y: number } {
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

function convertResourcesToLegacy(resources: ResourceDto[]) {
  const now = new Date().toISOString();
  const floors: Floor[] = [];
  const rooms: Room[] = [];
  const tables: Table[] = [];
  const objects: VenueObject[] = [];
  const seen = new Set<string>();

  // Build a flat map: id -> resource (includes nested children)
  const allResources: ResourceDto[] = [];
  const flatten = (r: ResourceDto) => {
    allResources.push(r);
    r.children?.forEach(flatten);
  };
  resources.forEach(flatten);

  const processResource = (resource: ResourceDto, parentFloorId?: string, parentRoomId?: string) => {
    const rid = String(resource.id);
    if (seen.has(rid)) return;
    seen.add(rid);

    const type = resource.resourceType;
    const children = resource.children ?? [];

    if (type?.code === 'floor') {
      floors.push({
        id: rid, name: resource.name, order: resource.order,
        restaurantId: '1', createdAt: resource.createdAt || now, updatedAt: resource.updatedAt || now,
      });
      children.forEach(child => processResource(child, rid));
    } else if (type?.code === 'room' && parentFloorId) {
      const coords = parseCoordinates(resource.coordinates);
      rooms.push({
        id: rid, name: resource.name, floorId: parentFloorId, order: resource.order,
        restaurantId: '1', createdAt: resource.createdAt || now, updatedAt: resource.updatedAt || now,
        x: coords.x, y: coords.y, width: resource.width, height: resource.height,
      });
      children.forEach(child => processResource(child, parentFloorId, rid));
    } else if (type?.code === 'table' && parentRoomId) {
      const coords = parseCoordinates(resource.coordinates);
      tables.push({
        id: rid, name: resource.name, roomId: parentRoomId, capacity: resource.capacity,
        order: resource.order, restaurantId: '1',
        createdAt: resource.createdAt || now, updatedAt: resource.updatedAt || now,
        x: coords.x, y: coords.y, w: resource.width, h: resource.height, rotation: resource.rotation,
        children: children.length > 0
          ? children.map(c => ({ id: c.id, name: c.name, order: c.order }))
          : undefined,
      });
    } else if (type?.code === 'object' && parentRoomId) {
      const coords = parseCoordinates(resource.coordinates);
      objects.push({
        id: rid, name: resource.name, kind: detectKind(resource.name),
        color: resource.color || undefined, roomId: parentRoomId,
        x: coords.x, y: coords.y, w: resource.width, h: resource.height, rotation: resource.rotation,
      });
    }
  };

  const sorted = [...resources].sort((a, b) => a.order - b.order);
  sorted.forEach(r => processResource(r));

  return { floors, rooms, tables, objects };
}

/** Build occupancy map: tableId → occupant[] from choices data */
function buildOccupancy(choices: AgencyStopChoicesDto[]): Record<string, TableOccupant[]> {
  const map: Record<string, TableOccupant[]> = {};

  for (const choice of choices) {
    const clientName = choice.client
      ? `${choice.client.firstName || ''} ${choice.client.lastName || ''}`.trim()
      : choice.clientName || `#${choice.clientId}`;

    const rc = choice.resourceChoice;
    if (!rc) continue;

    // resourceChoice can be ClientResourceChoiceDto (single object with resourceId)
    // or ClientResourceChoiceItemDto[] (flattened array with type codes)
    if (Array.isArray(rc)) {
      // Find the "table" entry to get the table resource name → we need resourceId
      // Array format doesn't have resourceId, so we can't map to table 3D ID
      // This path is for display-only (flattened names); skip 3D mapping
      continue;
    }

    // ClientResourceChoiceDto — has resourceId and resource (with parent hierarchy)
    const dto = rc as ClientResourceChoiceDto;
    // The resourceId points to a chair/seat. Its parent is the table.
    const resource = dto.resource;
    if (resource?.parentId) {
      const tableId = String(resource.parentId);
      if (!map[tableId]) map[tableId] = [];
      map[tableId].push({ clientId: choice.clientId, clientName });
    }
  }

  return map;
}

export function VenueOccupancyViewer({ organizationId, choices }: VenueOccupancyViewerProps) {
  const { t } = useLanguage();

  // Fetch organization resources (full tree with children)
  const { data: resourcesResult, isLoading } = useQuery({
    queryKey: ['admin-org-resources-for-3d', organizationId],
    queryFn: () => adminApi.getOrgResources(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60_000,
  });

  const resources = resourcesResult?.success ? resourcesResult.data || [] : [];

  const { floors, rooms, tables, objects } = useMemo(
    () => convertResourcesToLegacy(resources),
    [resources],
  );

  const occupancy = useMemo(() => buildOccupancy(choices), [choices]);

  if (isLoading) {
    return <LoadingState message={t.common.loading} />;
  }

  if (!floors.length) {
    return (
      <EmptyState
        icon={Building2}
        title={(t.venue as Record<string, string>).noDataFor3D || '3D veri yok'}
        description={(t.venue as Record<string, string>).noDataFor3DDesc || 'Mekan yerleşim verisi bulunamadı'}
      />
    );
  }

  return (
    <VenueModel3D
      floors={floors}
      rooms={rooms}
      tables={tables}
      objects={objects}
      occupancy={occupancy}
      readOnly
    />
  );
}
