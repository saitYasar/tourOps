'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Box, User, Move, ZoomIn, ZoomOut } from 'lucide-react';

import { resourceApi, type ResourceDto, type ResourceTypeDto, type UpdateResourceDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// ── Types ──

export interface TransportLayoutEditorProps {
  resources: ResourceDto[];
  resourceTypes: ResourceTypeDto[];
  childrenCache: Record<number, ResourceDto[]>;
  onResourceCreated: () => void;
  onResourceUpdated: () => void;
  onResourceDeleted: () => void;
  onOpenCreateForm: (parentId: number | null, resourceTypeId: number) => void;
  onOpenSectionCreateForm: (resourceTypeId: number) => void;
  onOpenEditForm: (resource: ResourceDto) => void;
  onDeleteRequest: (target: { id: number; name: string }) => void;
  onBulkDeleteRequest?: (sectionId: number, seats: ResourceDto[]) => void;
  onChildrenCacheUpdate: (updater: (prev: Record<number, ResourceDto[]>) => Record<number, ResourceDto[]>) => void;
  apiAdapter?: {
    update: (id: number, data: UpdateResourceDto) => Promise<{ success: boolean; data?: ResourceDto; error?: string }>;
    getLayout?: (parentId: number | null) => Promise<{ success: boolean; data?: ResourceDto[] }>;
  };
}

// ── Helpers ──

function parseCoordinates(coords: string | string[] | number[] | undefined | null): { x: number; y: number } {
  if (!coords) return { x: 50, y: 50 };

  let x: number, y: number;

  if (Array.isArray(coords)) {
    if (coords.length !== 2) return { x: 50, y: 50 };
    x = typeof coords[0] === 'string' ? parseFloat(coords[0]) : coords[0];
    y = typeof coords[1] === 'string' ? parseFloat(coords[1]) : coords[1];
  } else if (typeof coords === 'string') {
    const parts = coords.split(',');
    if (parts.length !== 2) return { x: 50, y: 50 };
    x = parseFloat(parts[0]);
    y = parseFloat(parts[1]);
  } else {
    return { x: 50, y: 50 };
  }

  return {
    x: isNaN(x) ? 50 : x,
    y: isNaN(y) ? 50 : y,
  };
}

// ── Component ──

export function TransportLayoutEditor({
  resources,
  resourceTypes,
  childrenCache,
  onResourceUpdated,
  onOpenCreateForm,
  onOpenSectionCreateForm,
  onOpenEditForm,
  onDeleteRequest,
  onBulkDeleteRequest,
  onChildrenCacheUpdate,
  apiAdapter,
}: TransportLayoutEditorProps) {
  const { t } = useLanguage();

  // Helper: resolve type by ID
  const getTypeById = useCallback(
    (typeId: number): ResourceTypeDto | undefined => resourceTypes.find((rt) => rt.id === typeId),
    [resourceTypes]
  );

  const getChildType = useCallback(
    (parentTypeId: number): ResourceTypeDto | undefined => {
      const parentType = getTypeById(parentTypeId);
      if (parentType?.childId) return getTypeById(parentType.childId);
      return undefined;
    },
    [getTypeById]
  );

  const objectType = resourceTypes.find((rt) => rt.code === 'object' || rt.code === 'transport_object');
  const rootType = resourceTypes.find((rt) => rt.order === 1);

  // Use apiAdapter.update if provided, otherwise fall back to resourceApi.update
  const updateResource = useCallback(
    (id: number, data: UpdateResourceDto) => {
      if (apiAdapter) return apiAdapter.update(id, data);
      return resourceApi.update(id, data);
    },
    [apiAdapter]
  );

  // Sort resources by order descending
  const sortedResources = [...resources].sort((a, b) => b.order - a.order);

  // ── Load layout data (sections with dimensions + children with coordinates) ──
  const layoutLoadedRef = useRef<{ root: boolean; children: Set<number> }>({ root: false, children: new Set() });
  useEffect(() => {
    if (!resources.length) return;
    const getLayoutFn = apiAdapter?.getLayout ?? ((parentId: number | null) => resourceApi.getLayout(parentId));

    // 1) Load root sections with their width/height/coordinates
    if (!layoutLoadedRef.current.root) {
      layoutLoadedRef.current.root = true;
      // Check if root sections already have dimensions
      const needsRootLoad = resources.some(r => !r.width && !r.height);
      if (needsRootLoad) {
        getLayoutFn(null).then((result) => {
          if (result.success && result.data) {
            const layoutSections = Array.isArray(result.data) ? result.data : [];
            setSectionStates((prev) => {
              const next = { ...prev };
              for (const ls of layoutSections) {
                const coords = parseCoordinates(ls.coordinates);
                next[ls.id] = {
                  x: coords.x,
                  y: coords.y,
                  w: ls.width || 200,
                  h: ls.height || 150,
                };
              }
              return next;
            });
          }
        });
      }
    }

    // 2) Load children for each section (seats with coordinates)
    for (const section of resources) {
      const existing = childrenCache[section.id];
      const hasCoords = existing?.length && existing.some(c => c.coordinates);

      if (hasCoords) {
        layoutLoadedRef.current.children.add(section.id);
        continue;
      }

      if (layoutLoadedRef.current.children.has(section.id) && !existing?.length) continue;

      layoutLoadedRef.current.children.add(section.id);

      getLayoutFn(section.id).then((result) => {
        if (result.success && result.data) {
          const children = Array.isArray(result.data) ? result.data : [];
          if (children.length > 0) {
            onChildrenCacheUpdate((prev) => ({
              ...prev,
              [section.id]: children,
            }));
          }
        }
      });
    }
  }, [resources, apiAdapter, childrenCache, onChildrenCacheUpdate]);

  // ── Debounced auto-save for property inputs ──
  const propSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSave = useCallback((id: number, data: UpdateResourceDto) => {
    if (propSaveTimer.current) clearTimeout(propSaveTimer.current);
    propSaveTimer.current = setTimeout(() => {
      updateResource(id, data);
    }, 500);
  }, [updateResource]);

  // ── Canvas State ──
  const [sectionStates, setSectionStates] = useState<Record<number, { x: number; y: number; w: number; h: number }>>({});
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<number>>(new Set());
  const [selectionRect, setSelectionRect] = useState<{ sectionId: number; x: number; y: number; w: number; h: number } | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasInteraction, setCanvasInteraction] = useState<{
    type: 'drag' | 'resize' | 'seat-drag' | 'pan' | 'select-rect';
    corner?: string;
    sectionId: number;
    seatId?: number;
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Sync section states from resource data ──
  useEffect(() => {
    if (!resources.length) return;
    setSectionStates((prev) => {
      const next = { ...prev };
      for (const res of resources) {
        if (!next[res.id]) {
          const coords = parseCoordinates(res.coordinates);
          next[res.id] = {
            x: coords.x,
            y: coords.y,
            w: res.width || 200,
            h: res.height || 150,
          };
        }
      }
      // Remove deleted sections
      for (const id of Object.keys(next)) {
        if (!resources.find((r) => r.id === Number(id))) {
          delete next[Number(id)];
        }
      }
      return next;
    });
  }, [resources]);

  // Clear stale seat selection when children change (e.g. after bulk delete)
  useEffect(() => {
    if (selectedSeatIds.size === 0 || !selectedSectionId) return;
    const children = childrenCache[selectedSectionId] || [];
    const childIds = new Set(children.map(c => c.id));
    const stillValid = new Set([...selectedSeatIds].filter(id => childIds.has(id)));
    if (stillValid.size !== selectedSeatIds.size) {
      setSelectedSeatIds(stillValid);
    }
  }, [childrenCache, selectedSectionId, selectedSeatIds]);

  // ── Global mouse handlers for drag/resize/seat-drag/pan/select-rect ──
  useEffect(() => {
    if (!canvasInteraction) return;
    const { type, corner, sectionId, startMouseX, startMouseY, startX, startY, startW, startH } = canvasInteraction;

    const handleMouseMove = (e: MouseEvent) => {
      if (type === 'pan') {
        setCanvasOffset({ x: startX + (e.clientX - startMouseX), y: startY + (e.clientY - startMouseY) });
        return;
      }

      const dx = (e.clientX - startMouseX) / canvasZoom;
      const dy = (e.clientY - startMouseY) / canvasZoom;

      if (type === 'select-rect') {
        const rx = Math.min(startX, startX + dx);
        const ry = Math.min(startY, startY + dy);
        setSelectionRect({ sectionId, x: rx, y: ry, w: Math.abs(dx), h: Math.abs(dy) });
        return;
      }

      if (type === 'seat-drag') {
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) seatDragMoved.current = true;
        const origPositions = seatOriginalPositions.current;
        const idsToMove = new Set(Object.keys(origPositions).map(Number));
        onChildrenCacheUpdate((prev) => {
          const children = prev[sectionId];
          if (!children) return prev;
          return {
            ...prev,
            [sectionId]: children.map((c) => {
              if (!idsToMove.has(c.id)) return c;
              const orig = origPositions[c.id];
              if (!orig) return c;
              return { ...c, coordinates: `${Math.max(0, Math.round(orig.x + dx))},${Math.max(0, Math.round(orig.y + dy))}` };
            }),
          };
        });
        return;
      }

      setSectionStates((prev) => {
        const s = prev[sectionId];
        if (!s) return prev;
        if (type === 'drag') {
          return { ...prev, [sectionId]: { ...s, x: Math.max(0, Math.round(startX + dx)), y: Math.max(0, Math.round(startY + dy)) } };
        }
        let newX = startX, newY = startY, newW = startW, newH = startH;
        if (corner?.includes('right')) newW = Math.max(100, startW + dx);
        if (corner?.includes('bottom')) newH = Math.max(60, startH + dy);
        if (corner?.includes('left')) { newW = Math.max(100, startW - dx); newX = startX + (startW - newW); }
        if (corner?.includes('top')) { newH = Math.max(60, startH - dy); newY = startY + (startH - newH); }
        return { ...prev, [sectionId]: { x: Math.max(0, Math.round(newX)), y: Math.max(0, Math.round(newY)), w: Math.round(newW), h: Math.round(newH) } };
      });
    };

    const handleMouseUp = () => {
      const interactionType = canvasInteraction.type;
      setCanvasInteraction(null);

      if (interactionType === 'pan') return;

      if (interactionType === 'select-rect') {
        setSelectionRect((prev) => {
          if (!prev) return null;
          const children = childrenCache[prev.sectionId] || [];
          const ids = new Set<number>();
          for (const seat of children) {
            const c = parseCoordinates(seat.coordinates);
            const cx = c.x + 12, cy = c.y + 12;
            if (cx >= prev.x && cx <= prev.x + prev.w && cy >= prev.y && cy <= prev.y + prev.h) {
              ids.add(seat.id);
            }
          }
          setSelectedSeatIds(ids);
          return null;
        });
        return;
      }

      if (interactionType === 'seat-drag') {
        if (!seatDragMoved.current && pendingSeatClick.current) {
          setSelectedChildId(pendingSeatClick.current.id);
          pendingSeatClick.current = null;
          seatOriginalPositions.current = {};
          return;
        }
        pendingSeatClick.current = null;
        const idsToSave = new Set(Object.keys(seatOriginalPositions.current).map(Number));
        const children = childrenCache[sectionId] || [];
        for (const c of children) {
          if (idsToSave.has(c.id) && c.coordinates) {
            updateResource(c.id, { coordinates: c.coordinates });
          }
        }
        seatOriginalPositions.current = {};
        return;
      }

      // Section drag/resize ended — persist
      setSectionStates((prev) => {
        const s = prev[sectionId];
        if (s) {
          updateResource(sectionId, { coordinates: `${s.x},${s.y}`, width: s.w, height: s.h })
            .then((result) => {
              if (result.success) onResourceUpdated();
            });
        }
        return prev;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasInteraction, canvasZoom, selectedSeatIds, childrenCache, onChildrenCacheUpdate, updateResource, onResourceUpdated]);

  // ── Interaction starters ──
  const startDrag = (e: React.MouseEvent, sectionId: number) => {
    if ((e.target as HTMLElement).closest('[data-resize-handle]') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[data-seat]')) return;
    e.preventDefault();
    const s = sectionStates[sectionId];
    if (!s) return;
    setSelectedSectionId(sectionId);
    setSelectedSeatIds(new Set());
    setCanvasInteraction({ type: 'drag', sectionId, startMouseX: e.clientX, startMouseY: e.clientY, startX: s.x, startY: s.y, startW: s.w, startH: s.h });
  };

  const startResize = (e: React.MouseEvent, sectionId: number, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    const s = sectionStates[sectionId];
    if (!s) return;
    setSelectedSectionId(sectionId);
    setSelectedChildId(null);
    setCanvasInteraction({ type: 'resize', corner, sectionId, startMouseX: e.clientX, startMouseY: e.clientY, startX: s.x, startY: s.y, startW: s.w, startH: s.h });
  };

  const seatOriginalPositions = useRef<Record<number, { x: number; y: number }>>({});
  const seatDragMoved = useRef(false);
  const pendingSeatClick = useRef<ResourceDto | null>(null);

  const startSeatDrag = (e: React.MouseEvent, sectionId: number, seat: ResourceDto) => {
    e.preventDefault();
    e.stopPropagation();
    seatDragMoved.current = false;
    pendingSeatClick.current = seat;
    const coords = parseCoordinates(seat.coordinates);
    const isMulti = selectedSeatIds.size > 0 && selectedSeatIds.has(seat.id);
    const positions: Record<number, { x: number; y: number }> = {};
    if (isMulti) {
      const children = childrenCache[sectionId] || [];
      for (const c of children) {
        if (selectedSeatIds.has(c.id)) {
          positions[c.id] = parseCoordinates(c.coordinates);
        }
      }
    }
    positions[seat.id] = coords;
    seatOriginalPositions.current = positions;
    setCanvasInteraction({ type: 'seat-drag', sectionId, seatId: seat.id, startMouseX: e.clientX, startMouseY: e.clientY, startX: coords.x, startY: coords.y, startW: 0, startH: 0 });
  };

  const startSelectRect = (e: React.MouseEvent, sectionId: number, containerRect: DOMRect) => {
    e.preventDefault();
    e.stopPropagation();
    const localX = (e.clientX - containerRect.left) / canvasZoom;
    const localY = (e.clientY - containerRect.top) / canvasZoom;
    setSelectedSeatIds(new Set());
    setCanvasInteraction({ type: 'select-rect', sectionId, startMouseX: e.clientX, startMouseY: e.clientY, startX: localX, startY: localY, startW: 0, startH: 0 });
  };

  const startPan = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-section]') || target.closest('button')) return;
    e.preventDefault();
    setSelectedSectionId(null);
    setSelectedChildId(null);
    setSelectedSeatIds(new Set());
    setCanvasInteraction({ type: 'pan', sectionId: 0, startMouseX: e.clientX, startMouseY: e.clientY, startX: canvasOffset.x, startY: canvasOffset.y, startW: 0, startH: 0 });
  };

  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setCanvasZoom((prev) => Math.min(3, Math.max(0.3, prev - e.deltaY * 0.002)));
    }
  }, []);

  // ── Canvas bounds ──
  const canvasBounds = (() => {
    let maxX = 600, maxY = 400;
    for (const s of Object.values(sectionStates)) {
      maxX = Math.max(maxX, s.x + s.w + 40);
      maxY = Math.max(maxY, s.y + s.h + 40);
    }
    return { width: maxX, height: maxY };
  })();

  // ── Render ──
  return (
    <div className="mt-4 space-y-2">
      {/* Toolbar: actions + zoom */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Koltuk Ekle */}
        {selectedSectionId && (() => {
          const seatType = resourceTypes.find((rt) => rt.code === 'transport_seat');
          if (!seatType) return null;
          return (
            <Button size="sm" variant="outline" onClick={() => onOpenCreateForm(selectedSectionId, seatType.id)}>
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{seatType.name} {t.venue.addSuffix}</span>
              <span className="sm:hidden">{seatType.name}</span>
            </Button>
          );
        })()}
        {/* Obje Ekle */}
        {selectedSectionId && objectType && (
          <Button size="sm" variant="outline" onClick={() => onOpenCreateForm(selectedSectionId, objectType.id)}>
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{objectType.name} {t.venue.addSuffix}</span>
            <span className="sm:hidden">{objectType.name}</span>
          </Button>
        )}
        {/* Bölüm Ekle */}
        {rootType && (
          <Button size="sm" onClick={() => onOpenSectionCreateForm(rootType.id)}>
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{rootType.name} {t.venue.addSuffix}</span>
            <span className="sm:hidden">{rootType.name}</span>
          </Button>
        )}
        {/* Seçilenleri Sil */}
        {selectedSectionId && selectedSeatIds.size > 0 && onBulkDeleteRequest && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              const children = childrenCache[selectedSectionId] || [];
              const selectedSeats = children.filter((c) => selectedSeatIds.has(c.id));
              if (selectedSeats.length > 0) {
                onBulkDeleteRequest(selectedSectionId, selectedSeats);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t.venue.deleteSelected}</span>
            <span className="sm:hidden">{t.common.delete}</span>
            {' '}({selectedSeatIds.size})
          </Button>
        )}
        {/* Zoom — pushed to end */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCanvasZoom((prev) => Math.min(3, prev + 0.2))} title={t.venue.zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <button
            className="text-xs text-slate-500 w-12 text-center hover:text-slate-800 hover:bg-slate-100 rounded-md border h-8 px-1"
            onClick={() => { setCanvasZoom(1); setCanvasOffset({ x: 0, y: 0 }); }}
            title={t.venue.resetView}
          >
            {Math.round(canvasZoom * 100)}%
          </button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCanvasZoom((prev) => Math.max(0.3, prev - 0.2))} title={t.venue.zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Info bar for selected section */}
            {selectedSectionId && (() => {
              const res = resources.find((r) => r.id === selectedSectionId);
              if (!res) return null;
              const children = childrenCache[res.id] || res.children || [];
              const s = sectionStates[res.id];
              return (
                <div className="flex items-center justify-between border-b px-3 py-2 bg-slate-50 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Box className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="font-medium text-sm truncate">{res.name}</span>
                    {s && (
                      <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                        {s.w} × {s.h}
                      </Badge>
                    )}
                    <span className="text-xs text-slate-400 shrink-0">
                      ({children.length} {t.venue.totalSeats.toLowerCase()})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenEditForm(res)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteRequest({ id: res.id, name: res.name })}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Canvas */}
            <div
              ref={canvasRef}
              className="overflow-hidden select-none flex-1"
              style={{
                cursor: canvasInteraction?.type === 'pan' ? 'grabbing' : 'default',
              }}
              onWheel={handleCanvasWheel}
              onMouseDown={startPan}
            >
              <div
                data-canvas-bg="true"
                className="relative bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)]"
                style={{
                  backgroundSize: '20px 20px',
                  transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom})`,
                  transformOrigin: 'top left',
                  width: canvasBounds.width,
                  height: canvasBounds.height,
                  minWidth: `${100 / canvasZoom}%`,
                  minHeight: 400 / canvasZoom,
                }}
              >
                {sortedResources.map((res) => {
                  const s = sectionStates[res.id];
                  if (!s) return null;
                  const type = res.resourceType || getTypeById(res.resourceTypeId);
                  const children = childrenCache[res.id] || res.children || [];
                  const isSelected = selectedSectionId === res.id;
                  const isActive = canvasInteraction?.sectionId === res.id;

                  return (
                    <div
                      key={res.id}
                      data-section="true"
                      className={`absolute rounded-xl border-2 transition-shadow ${
                        isSelected
                          ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-200'
                          : 'border-slate-300 hover:border-slate-400'
                      } ${!res.active ? 'opacity-40' : ''} ${
                        isActive ? 'shadow-xl' : ''
                      }`}
                      style={{
                        left: s.x,
                        top: s.y,
                        width: s.w,
                        height: s.h,
                        cursor: canvasInteraction?.type === 'drag' && isActive ? 'grabbing' : 'grab',
                        background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)',
                        zIndex: isSelected ? 10 : 1,
                      }}
                      onMouseDown={(e) => { e.stopPropagation(); startDrag(e, res.id); }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if ((e.target as HTMLElement).closest('[data-seat]')) return;
                        setSelectedSectionId(res.id);
                        setSelectedChildId(null);
                      }}
                    >
                      {/* Section header bar */}
                      <div className="flex items-center px-2 py-1 border-b border-slate-200/80 bg-white/60 rounded-t-[10px]">
                        <Move className="h-3 w-3 text-slate-400 shrink-0 mr-1.5" />
                        <span className="text-xs font-semibold text-slate-700 truncate">{res.name}</span>
                        <span className="text-[10px] text-slate-400 ml-auto shrink-0">{children.filter((c) => { const cc = (c.resourceType || getTypeById(c.resourceTypeId))?.code; return cc !== 'object' && cc !== 'transport_object'; }).length} {t.venue.seatUnit}</span>
                      </div>

                      {/* Seats — positioned by coordinates */}
                      <div
                        className="relative overflow-hidden"
                        style={{ height: s.h - 28 }}
                        onMouseDown={(e) => {
                          if ((e.target as HTMLElement).closest('[data-seat]')) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          startSelectRect(e, res.id, rect);
                        }}
                      >
                        {children.map((child) => {
                          const childCoords = parseCoordinates(child.coordinates);
                          const childTypeObj = child.resourceType || getTypeById(child.resourceTypeId);
                          const isObject = childTypeObj?.code === 'object' || childTypeObj?.code === 'transport_object' || (objectType && child.resourceTypeId === objectType.id);
                          const isDragging = canvasInteraction?.type === 'seat-drag' && canvasInteraction.seatId === child.id;
                          const isChildSelected = selectedSeatIds.has(child.id) || selectedChildId === child.id;
                          const isBeingMultiDragged = isChildSelected && canvasInteraction?.type === 'seat-drag';

                          if (isObject) {
                            const objColor = child.color || '#A3E635';
                            return (
                              <Tooltip key={child.id}>
                                <TooltipTrigger asChild>
                                  <div
                                    data-seat="true"
                                    className={`absolute rounded-sm border flex items-center justify-center transition-colors ${
                                      isDragging || isBeingMultiDragged
                                        ? 'shadow-md cursor-grabbing z-20'
                                        : isChildSelected
                                          ? 'ring-1 ring-offset-1 cursor-grab z-10'
                                          : 'cursor-grab hover:brightness-110'
                                    }`}
                                    style={{
                                      left: childCoords.x,
                                      top: childCoords.y,
                                      width: child.width || 30,
                                      height: child.height || 20,
                                      backgroundColor: isDragging || isBeingMultiDragged ? objColor : isChildSelected ? objColor : `${objColor}66`,
                                      borderColor: objColor,
                                    }}
                                    onMouseDown={(e) => { e.stopPropagation(); startSeatDrag(e, res.id, child); }}
                                  >
                                    <span className="text-[7px] font-bold pointer-events-none truncate px-0.5" style={{ color: '#333' }}>{child.name}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">{child.name}</TooltipContent>
                              </Tooltip>
                            );
                          }

                          // Seat rendering
                          return (
                            <Tooltip key={child.id}>
                              <TooltipTrigger asChild>
                                <div
                                  data-seat="true"
                                  className={`absolute w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                                    isDragging || isBeingMultiDragged
                                      ? 'bg-indigo-400 border-indigo-600 shadow-md cursor-grabbing z-20'
                                      : isChildSelected
                                        ? 'bg-indigo-300 border-indigo-500 ring-1 ring-indigo-400 cursor-grab z-10'
                                        : 'bg-indigo-100 border-indigo-300 cursor-grab hover:bg-indigo-200'
                                  }`}
                                  style={{ left: childCoords.x, top: childCoords.y }}
                                  onMouseDown={(e) => { e.stopPropagation(); startSeatDrag(e, res.id, child); }}
                                >
                                  <span className="text-[8px] font-medium text-indigo-700 pointer-events-none">{child.name}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">{child.name}</TooltipContent>
                            </Tooltip>
                          );
                        })}
                        {/* Selection rectangle */}
                        {selectionRect && selectionRect.sectionId === res.id && (
                          <div
                            className="absolute border-2 border-dashed border-indigo-400 bg-indigo-100/30 pointer-events-none z-30"
                            style={{ left: selectionRect.x, top: selectionRect.y, width: selectionRect.w, height: selectionRect.h }}
                          />
                        )}
                        {children.length === 0 && (
                          <div className="flex items-center justify-center w-full h-full text-xs text-slate-400">
                            {t.venue.noSeatsYet}
                          </div>
                        )}
                      </div>

                      {/* Resize handles — only show when selected */}
                      {isSelected && (
                        <>
                          <div data-resize-handle className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-500 rounded-full cursor-se-resize border-2 border-white shadow z-20" onMouseDown={(e) => startResize(e, res.id, 'bottom-right')} />
                          <div data-resize-handle className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-indigo-500 rounded-full cursor-sw-resize border-2 border-white shadow z-20" onMouseDown={(e) => startResize(e, res.id, 'bottom-left')} />
                          <div data-resize-handle className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-500 rounded-full cursor-ne-resize border-2 border-white shadow z-20" onMouseDown={(e) => startResize(e, res.id, 'top-right')} />
                          <div data-resize-handle className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-indigo-500 rounded-full cursor-nw-resize border-2 border-white shadow z-20" onMouseDown={(e) => startResize(e, res.id, 'top-left')} />
                        </>
                      )}

                      {/* Dimension/position tooltip while interacting */}
                      {isActive && (
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap z-30">
                          {canvasInteraction?.type === 'drag'
                            ? `x: ${s.x}  y: ${s.y}`
                            : `${s.w} × ${s.h}`
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspector Panel — right side */}
        {(() => {
          const selectedChild = selectedChildId
            ? Object.values(childrenCache).flat().find((c) => c.id === selectedChildId)
            : null;
          const childType = selectedChild ? getTypeById(selectedChild.resourceTypeId) : null;
          const isChildObject = childType?.code === 'object' || childType?.code === 'transport_object';
          const selectedSection = selectedSectionId && !selectedChild ? resources.find((r) => r.id === selectedSectionId) : null;

          if (selectedChild && childType) {
            return (
              <div className="hidden md:block w-64 border-l bg-slate-50 p-4 space-y-4 overflow-y-auto rounded-r-lg">
                <h3 className="font-semibold text-sm">{childType.name} {t.venue.properties}</h3>

                <div className="space-y-2">
                  <Label className="text-xs">{t.venue.nameLabel}</Label>
                  <Input
                    value={selectedChild.name}
                    className="h-8"
                    onChange={(e) => {
                      const newName = e.target.value;
                      onChildrenCacheUpdate((prev) => {
                        const updated = { ...prev };
                        for (const [pid, arr] of Object.entries(updated)) {
                          updated[Number(pid)] = arr.map((c) => c.id === selectedChild.id ? { ...c, name: newName } : c);
                        }
                        return updated;
                      });
                      debouncedSave(selectedChild.id, { name: newName });
                    }}
                  />
                </div>

                {isChildObject && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">{t.venue.objectColor}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedChild.color || '#A3E635'}
                          onChange={(e) => {
                            const newColor = e.target.value;
                            onChildrenCacheUpdate((prev) => {
                              const updated = { ...prev };
                              for (const [pid, arr] of Object.entries(updated)) {
                                updated[Number(pid)] = arr.map((c) => c.id === selectedChild.id ? { ...c, color: newColor } : c);
                              }
                              return updated;
                            });
                            updateResource(selectedChild.id, { color: newColor });
                          }}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                        <span className="text-xs text-slate-500">{selectedChild.color || '#A3E635'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t.venue.objectWidth}</Label>
                        <Input
                          type="number"
                          value={selectedChild.width || 30}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = Math.max(10, parseInt(e.target.value) || 10);
                            onChildrenCacheUpdate((prev) => {
                              const updated = { ...prev };
                              for (const [pid, arr] of Object.entries(updated)) {
                                updated[Number(pid)] = arr.map((c) => c.id === selectedChild.id ? { ...c, width: val } : c);
                              }
                              return updated;
                            });
                            debouncedSave(selectedChild.id, { width: val });
                          }}
                          className="h-8"
                          min={10}
                          step={5}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.venue.objectHeight}</Label>
                        <Input
                          type="number"
                          value={selectedChild.height || 20}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = Math.max(10, parseInt(e.target.value) || 10);
                            onChildrenCacheUpdate((prev) => {
                              const updated = { ...prev };
                              for (const [pid, arr] of Object.entries(updated)) {
                                updated[Number(pid)] = arr.map((c) => c.id === selectedChild.id ? { ...c, height: val } : c);
                              }
                              return updated;
                            });
                            debouncedSave(selectedChild.id, { height: val });
                          }}
                          className="h-8"
                          min={10}
                          step={5}
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedChild.coordinates && (() => {
                  const coords = parseCoordinates(selectedChild.coordinates);
                  return (
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <span>X: {Math.round(coords.x)}</span>
                      <span>Y: {Math.round(coords.y)}</span>
                    </div>
                  );
                })()}

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedChildId(null);
                    onDeleteRequest({ id: selectedChild.id, name: selectedChild.name });
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t.common.delete}
                </Button>
              </div>
            );
          }

          if (selectedSection) {
            const sChildren = childrenCache[selectedSection.id] || [];
            const seatCount = sChildren.filter((c) => {
              const ct = getTypeById(c.resourceTypeId);
              return ct?.code !== 'object' && ct?.code !== 'transport_object';
            }).length;
            const s = sectionStates[selectedSection.id];
            return (
              <div className="hidden md:block w-64 border-l bg-slate-50 p-4 space-y-4 overflow-y-auto rounded-r-lg">
                <h3 className="font-semibold text-sm">{t.venue.sectionProperties}</h3>

                <div className="space-y-2">
                  <Label className="text-xs">{t.venue.nameLabel}</Label>
                  <Input
                    value={selectedSection.name}
                    className="h-8"
                    readOnly
                  />
                </div>

                {s && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t.venue.objectWidth}</Label>
                      <div className="text-sm text-slate-600 bg-white rounded px-2 py-1.5 border">{s.w}px</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t.venue.objectHeight}</Label>
                      <div className="text-sm text-slate-600 bg-white rounded px-2 py-1.5 border">{s.h}px</div>
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-500">
                  {seatCount} {t.venue.seatUnit}
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onDeleteRequest({ id: selectedSection.id, name: selectedSection.name });
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t.common.delete}
                </Button>
              </div>
            );
          }

          return (
            <div className="hidden md:flex w-64 border-l bg-slate-50 p-4 items-center justify-center rounded-r-lg">
              <p className="text-sm text-slate-400 text-center">{t.venue.selectItemToEdit}</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
