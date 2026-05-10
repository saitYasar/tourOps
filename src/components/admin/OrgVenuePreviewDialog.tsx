'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Building2, Layers, DoorOpen, UtensilsCrossed, Armchair, Box } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type ResourceDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import dynamic from 'next/dynamic';

const FloorPlanCanvas = dynamic(
  () => import('@/components/customer/FloorPlanCanvas').then(m => ({ default: m.FloorPlanCanvas })),
  { ssr: false, loading: () => <div className="h-[450px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl animate-pulse" /> },
);

interface OrgVenuePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: number | null;
  organizationName?: string;
  stopId?: number | null;
  passiveResources?: number[];
  onPassiveResourcesChange?: (ids: number[]) => void;
}

type SelectedResource = {
  type: 'floor' | 'room' | 'table' | 'chair' | 'section' | 'seat';
  resource: ResourceDto;
  children?: ResourceDto[];
};

async function fetchLayout(stopId?: number | null, organizationId?: number | null, parentId?: number): Promise<ResourceDto[]> {
  try {
    if (stopId) {
      const result = await apiClient.getStopLayout(stopId, parentId);
      return Array.isArray(result) ? result : (result as unknown as { data?: ResourceDto[] })?.data ?? [];
    }
    if (organizationId) {
      const result = await apiClient.getResourceLayout(parentId ?? null, 'tr', organizationId);
      return Array.isArray(result) ? result : (result as unknown as { data?: ResourceDto[] })?.data ?? [];
    }
    return [];
  } catch { return []; }
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

function parseCoordinates(coords: string | string[] | number[] | undefined | null): { x: number; y: number } {
  if (!coords) return { x: 50, y: 50 };
  if (Array.isArray(coords)) {
    const [x, y] = coords.map(Number);
    return { x: isNaN(x) ? 50 : x, y: isNaN(y) ? 50 : y };
  }
  if (typeof coords === 'string') {
    const parts = coords.split(',');
    return { x: parseFloat(parts[0]) || 50, y: parseFloat(parts[1]) || 50 };
  }
  return { x: 50, y: 50 };
}

// ── Info Panel ──

function ResourceInfoPanel({ selected, t, passiveIds, onTogglePassive }: {
  selected: SelectedResource;
  t: ReturnType<typeof useLanguage>['t'];
  passiveIds: Set<number>;
  onTogglePassive: (id: number) => void;
}) {
  const { type, resource, children } = selected;
  const isPassive = passiveIds.has(resource.id);

  const icon = type === 'floor' || type === 'section' ? <Layers className="h-4 w-4 text-violet-500" />
    : type === 'room' ? <DoorOpen className="h-4 w-4 text-blue-500" />
    : type === 'table' ? <UtensilsCrossed className="h-4 w-4 text-amber-600" />
    : type === 'seat' ? <Armchair className="h-4 w-4 text-indigo-500" />
    : <Armchair className="h-4 w-4 text-green-600" />;

  const typeLabel = type === 'floor' ? (t.venue?.floor || 'Kat')
    : type === 'section' ? 'Bölüm'
    : type === 'room' ? (t.venue?.room || 'Oda')
    : type === 'table' ? (t.venue?.table || 'Masa')
    : type === 'seat' ? 'Koltuk'
    : (t.venue?.chair || 'Sandalye');

  const occupiedCount = children?.filter(c => c.client).length ?? 0;
  const totalChairs = children?.length ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <Badge variant="secondary" className="text-[10px]">{typeLabel}</Badge>
      </div>

      <div>
        <p className="font-semibold text-sm text-slate-800">{resource.name}</p>
        {resource.resourceType?.name && (
          <p className="text-xs text-slate-400">{resource.resourceType.name}</p>
        )}
        {isPassive && (
          <Badge variant="destructive" className="text-[10px] mt-1">Pasif</Badge>
        )}
      </div>

      <button
        onClick={() => onTogglePassive(resource.id)}
        className={`w-full text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
          isPassive
            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
            : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
        }`}
      >
        {isPassive ? 'Aktif Yap' : 'Pasif Yap'}
      </button>

      <div className="space-y-2 text-xs">
        {resource.capacity != null && resource.capacity > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">{t.venue?.capacity || 'Kapasite'}</span>
            <span className="font-medium text-slate-700">{resource.capacity}</span>
          </div>
        )}

        {(type === 'table' || type === 'room' || type === 'floor' || type === 'section') && children && children.length > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">
              {type === 'floor' ? (t.venue?.rooms || 'Odalar') : type === 'section' ? 'Koltuklar' : type === 'room' ? (t.venue?.tables || 'Masalar') : (t.venue?.chair || 'Sandalyeler')}
            </span>
            <span className="font-medium text-slate-700">{children.length}</span>
          </div>
        )}

        {type === 'table' && totalChairs > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">Doluluk</span>
            <span className="font-medium text-slate-700">{occupiedCount}/{totalChairs}</span>
          </div>
        )}

        {resource.width != null && resource.width > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">Boyut</span>
            <span className="font-medium text-slate-700">{resource.width} × {resource.height || '-'}</span>
          </div>
        )}

        {resource.client && (
          <div className="mt-2 p-2 bg-slate-50 rounded-lg border">
            <p className="text-[10px] text-slate-400 uppercase font-medium mb-1">Misafir</p>
            <p className="text-sm font-medium text-slate-800">
              {resource.client.firstName} {resource.client.lastName}
            </p>
            {resource.client.gender && (
              <p className="text-xs text-slate-500">
                {resource.client.gender === 'm' ? 'Erkek' : resource.client.gender === 'f' ? 'Kadın' : resource.client.gender}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Children list for tables */}
      {type === 'table' && children && children.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] text-slate-400 uppercase font-medium mb-1.5">{t.venue?.chair || 'Sandalyeler'}</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {children.map(child => {
              const childPassive = passiveIds.has(child.id);
              return (
                <div key={child.id} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${childPassive ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <span className={childPassive ? 'text-red-400 line-through' : 'text-slate-700'}>{child.name}</span>
                  <button
                    onClick={() => onTogglePassive(child.id)}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${childPassive ? 'text-green-600 hover:bg-green-100' : 'text-red-500 hover:bg-red-100'}`}
                  >
                    {childPassive ? 'Aktif Yap' : 'Pasif Yap'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Children list for sections (transport) */}
      {type === 'section' && children && children.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] text-slate-400 uppercase font-medium mb-1.5">Koltuklar</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {children.filter(c => c.resourceType?.code !== 'object' && c.resourceType?.code !== 'transport_object').map(child => {
              const childPassive = passiveIds.has(child.id);
              return (
                <div key={child.id} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${childPassive ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <span className={childPassive ? 'text-red-400 line-through' : 'text-slate-700'}>{child.name}</span>
                  <button
                    onClick={() => onTogglePassive(child.id)}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${childPassive ? 'text-green-600 hover:bg-green-100' : 'text-red-500 hover:bg-red-100'}`}
                  >
                    {childPassive ? 'Aktif Yap' : 'Pasif Yap'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transport read-only canvas ──

function TransportPreviewCanvas({ sections, childrenMap, onSectionClick, onSeatClick, passiveIds }: {
  sections: ResourceDto[];
  childrenMap: Record<number, ResourceDto[]>;
  onSectionClick?: (sectionId: number) => void;
  onSeatClick?: (seatId: number, sectionId: number) => void;
  passiveIds?: Set<number>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const sectionStates = useMemo(() => {
    const states: Record<number, { x: number; y: number; w: number; h: number }> = {};
    sections.forEach((s) => {
      const coords = parseCoordinates(s.coordinates);
      states[s.id] = { x: coords.x, y: coords.y, w: s.width || 200, h: s.height || 150 };
    });
    return states;
  }, [sections]);

  const canvasBounds = useMemo(() => {
    let maxX = 400, maxY = 300;
    for (const s of Object.values(sectionStates)) {
      maxX = Math.max(maxX, s.x + s.w + 40);
      maxY = Math.max(maxY, s.y + s.h + 40);
    }
    return { width: maxX, height: maxY };
  }, [sectionStates]);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerSize({ width: el.offsetWidth, height: el.offsetHeight });
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const zoom = useMemo(() => {
    if (containerSize.width === 0 || canvasBounds.width === 0) return 1;
    const sx = containerSize.width / canvasBounds.width;
    const sy = containerSize.height / canvasBounds.height;
    return Math.min(sx, sy, 1.5);
  }, [containerSize, canvasBounds]);

  return (
    <div
      ref={containerRef}
      className="bg-slate-50 rounded-xl border overflow-auto"
      style={{ height: 450 }}
    >
      <div
        className="relative bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)]"
        style={{
          backgroundSize: '20px 20px',
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          width: canvasBounds.width,
          height: canvasBounds.height,
        }}
      >
        {sections.map((res) => {
          const s = sectionStates[res.id];
          if (!s) return null;
          const children = childrenMap[res.id] || [];

          return (
            <div
              key={res.id}
              className="absolute rounded-xl border-2 border-slate-300 hover:border-indigo-400 transition-colors cursor-pointer"
              style={{
                left: s.x,
                top: s.y,
                width: s.w,
                height: s.h,
                background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)',
              }}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-seat]')) return;
                onSectionClick?.(res.id);
              }}
            >
              {/* Section header */}
              <div className="flex items-center px-2 py-1 border-b border-slate-200/80 bg-white/60 rounded-t-[10px]">
                <span className="text-xs font-semibold text-slate-700 truncate">{res.name}</span>
                <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                  {children.filter(c => {
                    const code = c.resourceType?.code;
                    return code !== 'object' && code !== 'transport_object';
                  }).length} koltuk
                </span>
              </div>

              {/* Seats */}
              <div className="relative overflow-hidden" style={{ height: s.h - 28 }}>
                {children.map((child) => {
                  const coords = parseCoordinates(child.coordinates);
                  const isObject = child.resourceType?.code === 'object' || child.resourceType?.code === 'transport_object';

                  if (isObject) {
                    const objColor = child.color || '#A3E635';
                    return (
                      <Tooltip key={child.id}>
                        <TooltipTrigger asChild>
                          <div
                            data-seat="true"
                            className="absolute rounded-sm border flex items-center justify-center"
                            style={{
                              left: coords.x,
                              top: coords.y,
                              width: child.width || 30,
                              height: child.height || 20,
                              backgroundColor: `${objColor}66`,
                              borderColor: objColor,
                            }}
                          >
                            <span className="text-[7px] font-bold truncate px-0.5" style={{ color: '#333' }}>{child.name}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{child.name}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  const isSeatPassive = !!passiveIds?.has(child.id);
                  return (
                    <Tooltip key={child.id}>
                      <TooltipTrigger asChild>
                        <div
                          data-seat="true"
                          className={`absolute w-6 h-6 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                            isSeatPassive
                              ? 'bg-slate-200 border-slate-300 opacity-50'
                              : 'bg-indigo-100 border-indigo-300 hover:bg-indigo-200'
                          }`}
                          style={{ left: coords.x, top: coords.y }}
                          onClick={(e) => { e.stopPropagation(); onSeatClick?.(child.id, res.id); }}
                        >
                          <span className={`text-[8px] font-medium ${isSeatPassive ? 'text-slate-500' : 'text-indigo-700'}`}>{child.name}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">{child.name}</TooltipContent>
                    </Tooltip>
                  );
                })}
                {children.length === 0 && (
                  <div className="flex items-center justify-center w-full h-full text-xs text-slate-400">
                    Koltuk yok
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Dialog ──

export function OrgVenuePreviewDialog({ open, onOpenChange, organizationId, organizationName, stopId, passiveResources = [], onPassiveResourcesChange }: OrgVenuePreviewDialogProps) {
  const { t } = useLanguage();

  const passiveIds = useMemo(() => new Set(passiveResources), [passiveResources]);

  const handleTogglePassive = useCallback((id: number) => {
    const next = passiveIds.has(id)
      ? passiveResources.filter(r => r !== id)
      : [...passiveResources, id];
    onPassiveResourcesChange?.(next);
  }, [passiveIds, passiveResources, onPassiveResourcesChange]);

  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [roomsData, setRoomsData] = useState<ResourceDto[]>([]);
  const [tablesMap, setTablesMap] = useState<Record<number, ResourceDto[]>>({});
  const [objectsMap, setObjectsMap] = useState<Record<number, ResourceDto[]>>({});
  const [transportChildrenMap, setTransportChildrenMap] = useState<Record<number, ResourceDto[]>>({});
  const [loadingRooms, setLoadingRooms] = useState(false);
  const prevFloorRef = useRef<number | null>(null);
  const [selectedResource, setSelectedResource] = useState<SelectedResource | null>(null);

  const { data: floors, isLoading } = useQuery({
    queryKey: ['org-venue-floors', stopId || organizationId, !!stopId],
    queryFn: () => fetchLayout(stopId, organizationId),
    enabled: open && !!(stopId || organizationId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const isTransport = useMemo(() => {
    return floors?.some(r => r.resourceType?.code === 'section') ?? false;
  }, [floors]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedFloorId(null);
      setRoomsData([]);
      setTablesMap({});
      setObjectsMap({});
      setTransportChildrenMap({});
      prevFloorRef.current = null;
      setSelectedResource(null);
    }
  }, [open]);

  // Auto-select first floor and show floor info
  useEffect(() => {
    if (!open || isTransport) return;
    if (floors && floors.length > 0 && !selectedFloorId) {
      setSelectedFloorId(floors[0].id);
      setSelectedResource({ type: 'floor', resource: floors[0], children: undefined });
    }
  }, [open, floors, selectedFloorId, isTransport]);

  // When floor changes, update selected resource to floor
  useEffect(() => {
    if (!selectedFloorId || !floors || isTransport) return;
    const floor = floors.find(f => f.id === selectedFloorId);
    if (floor) {
      setSelectedResource({ type: 'floor', resource: floor, children: undefined });
    }
  }, [selectedFloorId, floors, isTransport]);

  // Load transport children
  useEffect(() => {
    if (!open || !isTransport || !floors?.length) return;
    const loadTransport = async () => {
      setLoadingRooms(true);
      const map: Record<number, ResourceDto[]> = {};
      for (const section of floors) {
        const children = await fetchLayout(stopId, organizationId, section.id);
        map[section.id] = children;
      }
      setTransportChildrenMap(map);
      setLoadingRooms(false);
      // Default select first section
      if (floors.length > 0) {
        setSelectedResource({ type: 'section', resource: floors[0], children: map[floors[0].id] });
      }
    };
    loadTransport();
  }, [open, isTransport, floors, stopId, organizationId]);

  // Load restaurant rooms when floor changes
  const loadFloorData = useCallback(async (floorId: number) => {
    if (prevFloorRef.current === floorId) return;
    prevFloorRef.current = floorId;
    setLoadingRooms(true);
    setRoomsData([]);
    setTablesMap({});
    setObjectsMap({});

    const rooms = await fetchLayout(stopId, organizationId, floorId);
    setRoomsData(rooms);

    const newTablesMap: Record<number, ResourceDto[]> = {};
    const newObjectsMap: Record<number, ResourceDto[]> = {};

    for (const room of rooms) {
      const children = await fetchLayout(stopId, organizationId, room.id);
      const tables = children.filter(isTableResource);
      const objects = children.filter(isObjectResource);
      newTablesMap[room.id] = tables;
      newObjectsMap[room.id] = objects;

      for (const table of tables) {
        const chairs = await fetchLayout(stopId, organizationId, table.id);
        if (chairs.length > 0) {
          table.children = chairs as ResourceDto[];
        }
      }
    }

    setTablesMap(newTablesMap);
    setObjectsMap(newObjectsMap);
    setLoadingRooms(false);

    // Update floor's children info
    if (floors) {
      const floor = floors.find(f => f.id === floorId);
      if (floor) {
        setSelectedResource(prev => prev?.type === 'floor' ? { type: 'floor', resource: floor, children: rooms } : prev);
      }
    }
  }, [stopId, organizationId, floors]);

  useEffect(() => {
    if (selectedFloorId && open && !isTransport) {
      loadFloorData(selectedFloorId);
    }
  }, [selectedFloorId, open, isTransport, loadFloorData]);

  // Handlers
  const handleRoomClick = useCallback((roomId: number) => {
    const room = roomsData.find(r => r.id === roomId);
    if (room) {
      const tables = tablesMap[roomId] || [];
      setSelectedResource({ type: 'room', resource: room, children: tables });
    }
  }, [roomsData, tablesMap]);

  const handleTableClick = useCallback((tableId: number) => {
    for (const [, tables] of Object.entries(tablesMap)) {
      const table = tables.find(t => t.id === tableId);
      if (table) {
        setSelectedResource({ type: 'table', resource: table, children: table.children as ResourceDto[] | undefined });
        return;
      }
    }
  }, [tablesMap]);

  const handleSectionClick = useCallback((sectionId: number) => {
    if (!floors) return;
    const section = floors.find(s => s.id === sectionId);
    if (section) {
      setSelectedResource({ type: 'section', resource: section, children: transportChildrenMap[sectionId] });
    }
  }, [floors, transportChildrenMap]);

  const handleSeatClick = useCallback((seatId: number, sectionId: number) => {
    const children = transportChildrenMap[sectionId] || [];
    const seat = children.find(c => c.id === seatId);
    if (seat) {
      setSelectedResource({ type: 'seat', resource: seat });
    }
  }, [transportChildrenMap]);

  const handleFloorChange = useCallback((val: string) => {
    const id = Number(val);
    setSelectedFloorId(id);
    prevFloorRef.current = null;
    if (floors) {
      const floor = floors.find(f => f.id === id);
      if (floor) setSelectedResource({ type: 'floor', resource: floor });
    }
  }, [floors]);

  const hasFloors = (floors?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-600" />
            {t.menu?.venuePreview || 'Yer Düzeni Ön İzleme'}
            {organizationName && <span className="text-sm font-normal text-slate-500">— {organizationName}</span>}
          </DialogTitle>
          <DialogDescription className="sr-only">{t.menu?.venuePreview || 'Yer Düzeni Ön İzleme'}</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="h-[450px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Building2 className="h-5 w-5 animate-pulse" />
              {t.common.loading}
            </div>
          </div>
        )}

        {!isLoading && !hasFloors && (
          <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <Building2 className="h-8 w-8 text-slate-300" />
            <p>Mekan yerleşim verisi bulunamadı</p>
          </div>
        )}

        {!isLoading && hasFloors && (
          <div className="space-y-3">
            {!isTransport && floors!.length > 1 && (
              <div className="flex items-center gap-3">
                <Label className="text-sm text-slate-600 whitespace-nowrap">{t.venue?.floor || 'Kat'}:</Label>
                <Select
                  value={String(selectedFloorId ?? '')}
                  onValueChange={handleFloorChange}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {floors!.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-4">
              {/* Canvas area */}
              <div className="flex-1 overflow-hidden" style={{ minWidth: 0, width: 0 }}>
                {loadingRooms ? (
                  <div className="h-[450px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Building2 className="h-5 w-5 animate-pulse" />
                      {t.common.loading}
                    </div>
                  </div>
                ) : isTransport ? (
                  <TransportPreviewCanvas
                    sections={floors!}
                    childrenMap={transportChildrenMap}
                    onSectionClick={handleSectionClick}
                    onSeatClick={handleSeatClick}
                    passiveIds={passiveIds}
                  />
                ) : roomsData.length > 0 ? (
                  <FloorPlanCanvas
                    rooms={roomsData}
                    tablesMap={tablesMap}
                    objectsMap={objectsMap}
                    selectedTableId={selectedResource?.type === 'table' ? selectedResource.resource.id : null}
                    onTableClick={handleTableClick}
                    onRoomClick={handleRoomClick}
                    passiveResourceIds={passiveIds}
                  />
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                    <Building2 className="h-8 w-8 text-slate-300" />
                    <p>Bu katta oda bulunamadı</p>
                  </div>
                )}
              </div>

              {/* Info panel */}
              <div className="w-56 shrink-0 border rounded-xl p-3 bg-white shadow-sm self-start">
                {selectedResource ? (
                  <ResourceInfoPanel selected={selectedResource} t={t} passiveIds={passiveIds} onTogglePassive={handleTogglePassive} />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 text-xs py-8 gap-2">
                    <Box className="h-6 w-6 text-slate-300" />
                    <p className="text-center">Bilgi görmek için bir öğeye tıklayın</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
