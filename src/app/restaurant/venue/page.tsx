'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Box, Layers, Square, Circle, User, Power, PowerOff, MapPin, Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { resourceApi, type ResourceDto, type ResourceTypeDto, type CreateResourceDto, type UpdateResourceDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, EmptyState, ErrorState, ConfirmDialog } from '@/components/shared';
import { VenueModel3D } from '@/components/restaurant/VenueModel3D';
import { LayoutEditor } from '@/components/restaurant/layout-editor';

interface FormState {
  isOpen: boolean;
  editId: number | null;
  parentId: number | null;
  resourceTypeId: number | null;
  name: string;
  capacity: number;
  order: number;
  serviceStartAt: string;
  serviceEndAt: string;
  // Multiple creation for chairs
  count: number;
  // Coordinates for tables
  coordinateX: number;
  coordinateY: number;
  // Existing tables in the same room (for coordinate picker)
  siblingTables: ResourceDto[];
}

// Grid size for coordinate system
const GRID_SIZE = 15;

const initialForm: FormState = {
  isOpen: false,
  editId: null,
  parentId: null,
  resourceTypeId: null,
  name: '',
  capacity: 4,
  order: 0,
  serviceStartAt: '09:00',
  serviceEndAt: '23:00',
  count: 1,
  coordinateX: 50, // Center by default
  coordinateY: 50,
  siblingTables: [],
};

// Icon mapping for resource types
const typeIcons: Record<string, React.ElementType> = {
  floor: Layers,
  room: Square,
  table: Circle,
  chair: User,
  seat: User,
};

// Component to show table with seat dots
function TableWithSeats({
  table,
  onClick,
  parseCoordinates,
}: {
  table: ResourceDto;
  onClick: () => void;
  parseCoordinates: (coords: string | string[] | number[] | undefined | null) => { x: number; y: number };
}) {
  const coords = parseCoordinates(table.coordinates);
  const capacity = table.capacity || 4;

  // Calculate seat positions around the table
  const getSeatPositions = () => {
    const positions: { x: number; y: number }[] = [];
    const radius = 22; // Distance from center to seats

    for (let i = 0; i < capacity; i++) {
      const angle = (i / capacity) * 2 * Math.PI - Math.PI / 2;
      positions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return positions;
  };

  const seats = getSeatPositions();

  return (
    <div
      className="absolute flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
      style={{
        left: `${coords.x}%`,
        top: `${coords.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={onClick}
      title={`${table.name} - ${capacity} kişi`}
    >
      {/* Seat dots */}
      {seats.map((pos, idx) => (
        <div
          key={idx}
          className="absolute w-3 h-3 rounded-full bg-slate-400 border border-slate-500"
          style={{
            left: `calc(50% + ${pos.x}px - 6px)`,
            top: `calc(50% + ${pos.y}px - 6px)`,
          }}
        />
      ))}
      {/* Table circle */}
      <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-lg z-10 relative">
        {capacity}
      </div>
      <span className="text-xs mt-1 bg-white px-1 rounded shadow z-10 relative">
        {table.name}
      </span>
    </div>
  );
}

export default function VenuePage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [childrenCache, setChildrenCache] = useState<Record<number, ResourceDto[]>>({});
  const [loadingChildren, setLoadingChildren] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<FormState>(initialForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [multipleCreating, setMultipleCreating] = useState(false);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [childrenLoadingInProgress, setChildrenLoadingInProgress] = useState(false);

  // Query: Resource Types
  const { data: typesResult, isLoading: typesLoading, error: typesError } = useQuery({
    queryKey: ['resource-types'],
    queryFn: () => resourceApi.getTypes(1), // categoryId: 1 = Restoran
  });
  const resourceTypes = typesResult?.success ? typesResult.data || [] : [];

  // Query: Resource Layout (tree structure)
  const {
    data: layoutResult,
    isLoading: layoutLoading,
    error: layoutError,
    refetch: refetchLayout,
  } = useQuery({
    queryKey: ['resource-layout'],
    queryFn: () => resourceApi.getLayout(null),
  });
  // Treat API errors as empty state (user might not have any resources yet)
  const resources = layoutResult?.success ? layoutResult.data || [] : [];

  // Sort floors: higher floor numbers first (e.g., Floor 2, Floor 1, Floor 0, Floor -1)
  const sortedResources = [...resources].sort((a, b) => b.order - a.order);

  // Clear children cache for a parent
  const clearChildrenCache = useCallback((parentId: number | null) => {
    if (parentId) {
      setChildrenCache(prev => {
        const next = { ...prev };
        delete next[parentId];
        return next;
      });
    }
  }, []);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateResourceDto) => resourceApi.create(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
        // Keep existing cache visible, trigger background refresh
        setChildrenLoaded(false);
        toast.success('Kaynak oluşturuldu');
        closeForm();
      } else {
        toast.error(result.error || 'Oluşturulamadı');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateResourceDto }) =>
      resourceApi.update(id, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
        // Keep existing cache visible, trigger background refresh
        setChildrenLoaded(false);
        toast.success('Kaynak güncellendi');
        closeForm();
      } else {
        toast.error(result.error || 'Güncellenemedi');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => resourceApi.delete(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
        // Keep existing cache visible, trigger background refresh
        setChildrenLoaded(false);
        toast.success('Kaynak silindi');
        setDeleteTarget(null);
      } else {
        toast.error(result.error || 'Silinemedi');
      }
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => resourceApi.activate(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
        toast.success('Kaynak aktifleştirildi');
      }
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => resourceApi.deactivate(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
        toast.success('Kaynak pasifleştirildi');
      }
    },
  });

  // Fetch children for a resource using layout endpoint with parentId
  const fetchChildren = useCallback(async (parentId: number): Promise<ResourceDto[]> => {
    if (childrenCache[parentId]) return childrenCache[parentId];
    if (loadingChildren.has(parentId)) return [];

    setLoadingChildren(prev => new Set(prev).add(parentId));
    try {
      // Use /resources/{parentId}/children — works for all resource types
      const result = await resourceApi.getChildren(parentId);
      if (result.success && result.data) {
        // Ensure each child has parentId set
        const childrenWithParentId = result.data.map(child => ({
          ...child,
          parentId: child.parentId ?? parentId
        }));
        setChildrenCache(prev => ({ ...prev, [parentId]: childrenWithParentId }));
        return childrenWithParentId;
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoadingChildren(prev => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }
    return [];
  }, [childrenCache, loadingChildren]);

  // Load all children recursively — self-contained, no stale closure issues
  const loadAllChildren = useCallback(async () => {
    if (!resources.length) return;

    setChildrenLoadingInProgress(true);

    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Retry helper: try up to 3 times with 1s delay between attempts
    const fetchWithRetry = async <T,>(fn: () => Promise<{ success: boolean; data?: T; error?: string }>, label: string): Promise<T | null> => {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await wait(1000 * attempt); // 1s, 2s backoff
        const result = await fn();
        if (result.success && result.data) return result.data;
        console.warn(`[loadAllChildren] ${label} attempt ${attempt + 1} failed:`, result.error);
      }
      console.error(`[loadAllChildren] ${label} gave up after 3 attempts`);
      return null;
    };

    try {
      const newCache: Record<number, ResourceDto[]> = {};

      for (let fi = 0; fi < resources.length; fi++) {
        const floor = resources[fi];
        // Delay between floors to avoid overwhelming backend
        if (fi > 0) await wait(500);

        const roomsRaw = await fetchWithRetry(
          () => resourceApi.getLayout(floor.id),
          `getLayout(floor=${floor.id} "${floor.name}")`
        );

        if (roomsRaw && roomsRaw.length > 0) {
          const rooms = roomsRaw.map(r => ({ ...r, parentId: r.parentId ?? floor.id }));
          newCache[floor.id] = rooms;

          // Get tables: prefer room.children, fall back to getChildren with delay + retry
          for (let ri = 0; ri < rooms.length; ri++) {
            const room = rooms[ri];
            if (room.children && room.children.length > 0) {
              newCache[room.id] = room.children.map(t => ({ ...t, parentId: t.parentId ?? room.id }));
            } else if (!room.children) {
              // children not populated — fall back to API
              await wait(500); // Delay before each children call
              const tables = await fetchWithRetry(
                () => resourceApi.getChildren(room.id),
                `getChildren(room=${room.id} "${room.name}")`
              );
              if (tables && tables.length > 0) {
                newCache[room.id] = tables.map(t => ({ ...t, parentId: t.parentId ?? room.id }));
              }
            }
          }
        }
      }

      console.log('[loadAllChildren] done, newCache keys:', Object.keys(newCache), 'entries:', Object.entries(newCache).map(([k, v]) => `${k}:${(v as ResourceDto[]).length}`));
      setChildrenCache(prev => ({ ...prev, ...newCache }));
    } finally {
      setChildrenLoadingInProgress(false);
    }
  }, [resources]);

  // Load all children AFTER LayoutEditor finishes its initial API calls (avoids concurrent requests)
  const [editorReady, setEditorReady] = useState(false);
  const handleEditorReady = useCallback(() => {
    setEditorReady(true);
  }, []);

  useEffect(() => {
    if (editorReady && resources.length > 0 && !childrenLoaded) {
      setChildrenLoaded(true);
      loadAllChildren();
    }
  }, [editorReady, resources, childrenLoaded, loadAllChildren]);

  const toggleExpand = useCallback((id: number, hasChildType: boolean) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Fetch children if not already cached and resource type allows children
        if (hasChildType && !childrenCache[id]) {
          fetchChildren(id);
        }
      }
      return next;
    });
  }, [childrenCache, fetchChildren]);

  const getTypeById = (typeId: number): ResourceTypeDto | undefined => {
    return resourceTypes.find(t => t.id === typeId);
  };

  const getChildType = (parentTypeId: number): ResourceTypeDto | undefined => {
    const parentType = getTypeById(parentTypeId);
    if (parentType?.childId) {
      return getTypeById(parentType.childId);
    }
    return undefined;
  };

  const openCreateForm = async (parentId: number | null, resourceTypeId: number) => {
    const type = getTypeById(resourceTypeId);

    // Get sibling resources if creating a resource that supports coordinates
    let siblingTables: ResourceDto[] = [];
    if (type?.supportsCoordinates && parentId) {
      // Use getLayout with parentId (returns children of that parent)
      try {
        const result = await resourceApi.getLayout(parentId);
        if (result.success && result.data) {
          // Ensure each sibling has parentId set
          siblingTables = result.data.map(child => ({
            ...child,
            parentId: child.parentId ?? parentId
          }));
          // Update cache with fresh data (with parentId set)
          setChildrenCache(prev => ({ ...prev, [parentId]: siblingTables }));
        }
      } catch (error) {
        console.error('Failed to fetch siblings:', error);
      }
    }

    setForm({
      isOpen: true,
      editId: null,
      parentId,
      resourceTypeId,
      name: '',
      capacity: type?.defaultCapacity || 4,
      order: 0,
      serviceStartAt: '09:00',
      serviceEndAt: '23:00',
      count: type?.code === 'chair' || type?.code === 'seat' ? 4 : 1, // Default 4 chairs/seats
      coordinateX: 50, // Center by default
      coordinateY: 50,
      siblingTables,
    });
  };

  // Parse coordinates - handles both string "x,y" and array [x, y] formats
  const parseCoordinates = (coords: string | string[] | number[] | undefined | null): { x: number; y: number } => {
    if (!coords) return { x: 50, y: 50 };

    let x: number, y: number;

    // Handle array format [x, y]
    if (Array.isArray(coords)) {
      if (coords.length !== 2) return { x: 50, y: 50 };
      x = typeof coords[0] === 'string' ? parseFloat(coords[0]) : coords[0];
      y = typeof coords[1] === 'string' ? parseFloat(coords[1]) : coords[1];
    }
    // Handle string format "x,y"
    else if (typeof coords === 'string') {
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
  };

  const openEditForm = async (resource: ResourceDto) => {
    // Read coordinates (handles both string "x,y" and array [x, y] formats)
    let coordX = 50, coordY = 50; // Default to center
    if (resource.coordinates) {
      const parsed = parseCoordinates(resource.coordinates);
      coordX = parsed.x;
      coordY = parsed.y;
    }

    // Get sibling resources if editing a resource that supports coordinates
    const type = getTypeById(resource.resourceTypeId);
    console.log('openEditForm - resource:', resource);
    console.log('openEditForm - type:', type);
    console.log('openEditForm - supportsCoordinates:', type?.supportsCoordinates);
    console.log('openEditForm - parentId:', resource.parentId);

    let siblingTables: ResourceDto[] = [];
    if (type?.supportsCoordinates && resource.parentId) {
      // Use getLayout with parentId to get siblings
      try {
        console.log('openEditForm - fetching siblings for parentId:', resource.parentId);
        const result = await resourceApi.getLayout(resource.parentId);
        console.log('openEditForm - getLayout result:', result);
        if (result.success && result.data) {
          // Ensure each sibling has parentId set
          const siblingsWithParentId = result.data.map(child => ({
            ...child,
            parentId: child.parentId ?? resource.parentId
          }));
          // Exclude the one being edited
          siblingTables = siblingsWithParentId.filter(t => t.id !== resource.id);
          console.log('openEditForm - siblingTables (excluding current):', siblingTables);
          // Update cache with fresh data (with parentId set)
          setChildrenCache(prev => ({ ...prev, [resource.parentId!]: siblingsWithParentId }));
        }
      } catch (error) {
        console.error('Failed to fetch siblings:', error);
      }
    } else {
      console.log('openEditForm - skipping sibling fetch (supportsCoordinates or parentId missing)');
    }

    setForm({
      isOpen: true,
      editId: resource.id,
      parentId: resource.parentId,
      resourceTypeId: resource.resourceTypeId,
      name: resource.name,
      capacity: resource.capacity,
      order: resource.order,
      serviceStartAt: resource.serviceStartAt || '09:00',
      serviceEndAt: resource.serviceEndAt || '23:00',
      count: 1,
      coordinateX: coordX,
      coordinateY: coordY,
      siblingTables,
    });
  };

  const closeForm = () => {
    setForm(initialForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = form.resourceTypeId ? getTypeById(form.resourceTypeId) : null;
    const isChair = type?.code === 'chair' || type?.code === 'seat';

    // For chairs/seats with count > 1, name is optional (will be auto-generated)
    if (!isChair && !form.name.trim()) {
      toast.error('Lütfen ad alanını doldurun');
      return;
    }
    if (!form.resourceTypeId) {
      toast.error('Lütfen kaynak tipini seçin');
      return;
    }

    // Build base data
    const baseData: CreateResourceDto = {
      name: form.name,
      resourceTypeId: form.resourceTypeId,
      parentId: form.parentId,
      capacity: form.capacity,
      order: form.order,
      serviceStartAt: form.serviceStartAt,
      serviceEndAt: form.serviceEndAt,
    };

    // Add coordinates for types that support coordinates (room, table, seat)
    if (type?.supportsCoordinates) {
      baseData.coordinates = `${form.coordinateX},${form.coordinateY}`;
    }

    if (form.editId) {
      updateMutation.mutate({ id: form.editId, data: baseData });
    } else if (isChair && form.count > 1) {
      // Multiple chair creation
      const baseName = form.name.trim() || 'Sandalye';
      setMultipleCreating(true);
      try {
        for (let i = 1; i <= form.count; i++) {
          const data = {
            ...baseData,
            name: `${baseName} ${i}`,
            order: i,
          };
          await resourceApi.create(data);
        }
        queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
        clearChildrenCache(form.parentId);
        setChildrenLoaded(false);
        toast.success(`${form.count} sandalye oluşturuldu`);
        closeForm();
      } catch (error) {
        toast.error('Sandalye oluşturulurken hata oluştu');
      } finally {
        setMultipleCreating(false);
      }
    } else if (type?.code === 'table') {
      // Table creation: create table + auto-create chairs
      setMultipleCreating(true);
      try {
        const tableResult = await resourceApi.create(baseData);
        if (tableResult.success && tableResult.data) {
          // Find chair resource type (could be 'chair' or 'seat')
          const chairType = resourceTypes.find(t => t.code === 'chair' || t.code === 'seat');
          if (chairType) {
            const capacity = form.capacity || 4;
            const tableName = form.name.trim();
            let chairsCreated = 0;
            for (let i = 1; i <= capacity; i++) {
              try {
                await resourceApi.create({
                  name: `${tableName}-${i}`,
                  resourceTypeId: chairType.id,
                  parentId: tableResult.data.id,
                  capacity: 1,
                  order: i,
                });
                chairsCreated++;
              } catch (chairErr) {
                console.error(`Chair ${tableName}-${i} creation failed:`, chairErr);
              }
            }
            toast.success(`Masa ve ${chairsCreated} sandalye oluşturuldu`);
          } else {
            console.warn('[Venue] Chair/seat resource type not found. Available types:', resourceTypes.map(t => t.code));
            toast.success('Masa oluşturuldu (sandalye tipi bulunamadı)');
          }
          queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
          clearChildrenCache(form.parentId);
          setChildrenLoaded(false);
          closeForm();
        } else {
          toast.error(tableResult.error || 'Masa oluşturulamadı');
        }
      } catch (error) {
        toast.error('Masa oluşturulurken hata oluştu');
      } finally {
        setMultipleCreating(false);
      }
    } else {
      createMutation.mutate(baseData);
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || multipleCreating;

  // Get first level type (usually "floor")
  const rootType = resourceTypes.find(t => t.order === 1);

  // Recursive component to render resource tree
  const ResourceTreeItem = ({ resource, depth = 0 }: { resource: ResourceDto; depth?: number }) => {
    const type = resource.resourceType || getTypeById(resource.resourceTypeId);
    const childType = type ? getChildType(type.id) : undefined;
    // Use cached children if available, otherwise use resource.children
    const children = childrenCache[resource.id] || resource.children || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedItems.has(resource.id);
    const isLoadingChildren = loadingChildren.has(resource.id);
    const Icon = type ? typeIcons[type.code] || Layers : Layers;

    return (
      <div className={depth > 0 ? 'ml-4' : ''}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(resource.id, !!childType)}>
          <div className={`border rounded-lg ${!resource.active ? 'opacity-50 bg-slate-50' : ''}`}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-2">
                  {type?.allowsChildren ? (
                    isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )
                  ) : (
                    <div className="w-4" />
                  )}
                  <Icon className="h-5 w-5 text-indigo-500" />
                  <span className="font-medium">{resource.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {type?.name || 'Bilinmiyor'}
                  </Badge>
                  {type?.code === 'floor' && (
                    <span className="text-sm text-slate-400">
                      (Kat {resource.order >= 0 ? resource.order : resource.order})
                    </span>
                  )}
                  {resource.capacity > 1 && (
                    <span className="text-sm text-slate-400">
                      ({resource.capacity} kişi)
                    </span>
                  )}
                  {!resource.active && (
                    <Badge variant="secondary" className="text-xs">Pasif</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {childType && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCreateForm(resource.id, childType.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {childType.name}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => resource.active
                      ? deactivateMutation.mutate(resource.id)
                      : activateMutation.mutate(resource.id)
                    }
                    title={resource.active ? 'Pasif Yap' : 'Aktif Yap'}
                  >
                    {resource.active ? (
                      <PowerOff className="h-4 w-4 text-orange-500" />
                    ) : (
                      <Power className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditForm(resource)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget({ id: resource.id, name: resource.name })}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CollapsibleTrigger>

            {type?.allowsChildren && (
              <CollapsibleContent className="overflow-visible">
                <div
                  className="border-t bg-slate-50/50 p-2 space-y-2"
                  style={{
                    maxHeight: type?.code === 'table' ? '200px' : type?.code === 'room' ? '400px' : '500px',
                    overflowY: 'auto',
                  }}
                >
                  {isLoadingChildren ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
                      <span className="ml-2 text-sm text-slate-500">Yükleniyor...</span>
                    </div>
                  ) : hasChildren ? (
                    children.map((child) => (
                      <ResourceTreeItem key={child.id} resource={child} depth={depth + 1} />
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Henüz {childType?.name?.toLowerCase() || 'alt kaynak'} eklenmemiş
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            )}
          </div>
        </Collapsible>
      </div>
    );
  };

  // Convert ResourceDto to legacy format for 3D component
  const convertToLegacyFormat = () => {
    const now = new Date().toISOString();
    const floors: Array<{ id: string; name: string; order: number; restaurantId: string; createdAt: string; updatedAt: string }> = [];
    const rooms: Array<{ id: string; name: string; floorId: string; order: number; restaurantId: string; createdAt: string; updatedAt: string }> = [];
    const tables: Array<{ id: string; name: string; roomId: string; capacity: number; order: number; restaurantId: string; createdAt: string; updatedAt: string }> = [];

    const processResource = (resource: ResourceDto, parentFloorId?: string, parentRoomId?: string) => {
      const type = resource.resourceType || getTypeById(resource.resourceTypeId);
      const children = childrenCache[resource.id] || resource.children || [];

      if (type?.code === 'floor') {
        floors.push({
          id: String(resource.id),
          name: resource.name,
          order: resource.order,
          restaurantId: '1',
          createdAt: resource.createdAt || now,
          updatedAt: resource.updatedAt || now,
        });
        children.forEach(child => processResource(child, String(resource.id)));
      } else if (type?.code === 'room' && parentFloorId) {
        rooms.push({
          id: String(resource.id),
          name: resource.name,
          floorId: parentFloorId,
          order: resource.order,
          restaurantId: '1',
          createdAt: resource.createdAt || now,
          updatedAt: resource.updatedAt || now,
        });
        children.forEach(child => processResource(child, parentFloorId, String(resource.id)));
      } else if (type?.code === 'table' && parentRoomId) {
        tables.push({
          id: String(resource.id),
          name: resource.name,
          roomId: parentRoomId,
          capacity: resource.capacity,
          order: resource.order,
          restaurantId: '1',
          createdAt: resource.createdAt || now,
          updatedAt: resource.updatedAt || now,
        });
      }
    };

    sortedResources.forEach(r => processResource(r));
    console.log('[3D] convertToLegacyFormat:', { floors: floors.length, rooms: rooms.length, tables: tables.length, cacheKeys: Object.keys(childrenCache) });
    return { floors, rooms, tables };
  };

  const legacyData = convertToLegacyFormat();

  return (
    <div className="flex flex-col h-full">
      <Header title={t.venue.title} description={t.venue.description} />

      <div className="flex-1 p-6">
        <Tabs defaultValue="summary" className="space-y-4" onValueChange={(tab) => {
          // 3D model tabına geçişte: editor hazırsa cache'i yenile, değilse editorReady sonrası otomatik yüklenecek
          if (tab === 'model' && editorReady && !childrenLoadingInProgress) {
            setChildrenLoaded(false);
          }
        }}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="summary" className="gap-2">
                <MapPin className="h-4 w-4" />
                Kat Planı
              </TabsTrigger>
              <TabsTrigger value="model" className="gap-2">
                <Box className="h-4 w-4" />
                {t.venue.modelView}
              </TabsTrigger>
            </TabsList>
            {typesLoading ? (
              <Button disabled>
                <Plus className="h-4 w-4 mr-2" />
                Yükleniyor...
              </Button>
            ) : rootType ? (
              <Button onClick={() => openCreateForm(null, rootType.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni {rootType.name}
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <Plus className="h-4 w-4 mr-2" />
                Kaynak tipi bulunamadı
              </Button>
            )}
          </div>

          {/* Summary View */}
          <TabsContent value="summary">
            {layoutLoading ? (
              <LoadingState message={t.common.loading} />
            ) : !resources.length ? (
              /* Empty State - Onboarding */
              <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="py-16">
                  <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-6">
                      <Building2 className="h-10 w-10 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">
                      İşletmenizin Oturma Düzenini Oluşturun
                    </h2>
                    <p className="text-slate-500 mb-6 leading-relaxed">
                      Restoranınızın kat, salon ve masa yapısını tanımlayarak rezervasyon yönetimini kolaylaştırın.
                      Bu bilgiler müşterilerinize sunulacak ve kapasite yönetiminde kullanılacaktır.
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-8 w-full">
                      <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                        <Layers className="h-6 w-6 text-indigo-500 mb-2" />
                        <span className="text-sm font-medium text-slate-700">1. Kat Ekle</span>
                        <span className="text-xs text-slate-400 mt-1">Zemin, 1. kat vb.</span>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                        <Square className="h-6 w-6 text-blue-500 mb-2" />
                        <span className="text-sm font-medium text-slate-700">2. Salon Ekle</span>
                        <span className="text-xs text-slate-400 mt-1">Teras, iç mekan vb.</span>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                        <Circle className="h-6 w-6 text-amber-500 mb-2" />
                        <span className="text-sm font-medium text-slate-700">3. Masa Ekle</span>
                        <span className="text-xs text-slate-400 mt-1">Kapasiteli masalar</span>
                      </div>
                    </div>

                    {rootType ? (
                      <Button size="lg" onClick={() => openCreateForm(null, rootType.id)} className="gap-2">
                        <Plus className="h-5 w-5" />
                        İlk Katınızı Ekleyerek Başlayın
                      </Button>
                    ) : (
                      <p className="text-sm text-red-500">
                        Kaynak tipleri yüklenemedi. Sayfayı yenileyin.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Stats Cards */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Kat</CardTitle>
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{resources.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Salon</CardTitle>
                      <Square className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {resources.reduce((acc, floor) => {
                          const children = childrenCache[floor.id] || floor.children || [];
                          return acc + children.length;
                        }, 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Masa</CardTitle>
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {resources.reduce((acc, floor) => {
                          const rooms = childrenCache[floor.id] || floor.children || [];
                          return acc + rooms.reduce((roomAcc, room) => {
                            const tables = childrenCache[room.id] || room.children || [];
                            return roomAcc + tables.length;
                          }, 0);
                        }, 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Kapasite</CardTitle>
                      <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {resources.reduce((acc, floor) => acc + floor.capacity, 0)} kişi
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Layout Editor — always mounted, handles its own loading */}
                <div className="mt-4">
                  <LayoutEditor
                    resources={sortedResources}
                    resourceTypes={resourceTypes}
                    childrenCache={childrenCache}
                    onResourceCreated={() => { refetchLayout(); }}
                    onResourceUpdated={() => { refetchLayout(); }}
                    onResourceDeleted={() => { refetchLayout(); }}
                    onReady={handleEditorReady}
                  />
                </div>
              </>
            )}
          </TabsContent>

          {/* 3D Model View */}
          <TabsContent value="model">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.venue.buildingModel}</CardTitle>
                <CardDescription>{t.venue.buildingModelDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                {layoutLoading || childrenLoadingInProgress ? (
                  <LoadingState message="Katlar ve salonlar yükleniyor..." />
                ) : !resources.length ? (
                  <EmptyState
                    icon={Box}
                    title="3D model için veri yok"
                    description="Önce kat planından kat ve salon ekleyin"
                  />
                ) : (
                  <VenueModel3D
                    floors={legacyData.floors}
                    rooms={legacyData.rooms}
                    tables={legacyData.tables}
                    onTableClick={(table) => {
                      // Find table in childrenCache
                      for (const floor of resources) {
                        const rooms = childrenCache[floor.id] || floor.children || [];
                        for (const room of rooms) {
                          const tables = childrenCache[room.id] || room.children || [];
                          const foundTable = tables.find(t => String(t.id) === table.id);
                          if (foundTable) {
                            openEditForm({ ...foundTable, parentId: foundTable.parentId || room.id });
                            return;
                          }
                        }
                      }
                    }}
                    onRoomClick={(room) => {
                      // Find room in childrenCache
                      for (const floor of resources) {
                        const rooms = childrenCache[floor.id] || floor.children || [];
                        const foundRoom = rooms.find(r => String(r.id) === room.id);
                        if (foundRoom) {
                          openEditForm({ ...foundRoom, parentId: foundRoom.parentId || floor.id });
                          return;
                        }
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* Form Dialog */}
      <Dialog open={form.isOpen} onOpenChange={() => closeForm()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.editId ? 'Düzenle' : 'Yeni Ekle'}: {form.resourceTypeId && getTypeById(form.resourceTypeId)?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Ad {form.resourceTypeId && getTypeById(form.resourceTypeId)?.code === 'chair' && !form.editId ? '(opsiyonel)' : '*'}
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={
                    form.resourceTypeId && getTypeById(form.resourceTypeId)?.code === 'chair'
                      ? 'Örn: Sandalye (boş bırakılırsa otomatik numaralanır)'
                      : 'Örn: Ana Salon, Masa 1'
                  }
                />
              </div>

              {form.resourceTypeId && getTypeById(form.resourceTypeId)?.code === 'floor' && (
                <div className="space-y-2">
                  <Label htmlFor="order">Kat Numarası</Label>
                  <Select
                    value={String(form.order)}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, order: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-2">-2. Kat (Bodrum)</SelectItem>
                      <SelectItem value="-1">-1. Kat (Bodrum)</SelectItem>
                      <SelectItem value="0">Zemin Kat</SelectItem>
                      <SelectItem value="1">1. Kat</SelectItem>
                      <SelectItem value="2">2. Kat</SelectItem>
                      <SelectItem value="3">3. Kat</SelectItem>
                      <SelectItem value="4">4. Kat</SelectItem>
                      <SelectItem value="5">5. Kat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="capacity">Kapasite (Kişi)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={form.capacity || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      capacity: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceStartAt">Servis Başlangıç</Label>
                  <Input
                    id="serviceStartAt"
                    type="time"
                    value={form.serviceStartAt}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, serviceStartAt: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceEndAt">Servis Bitiş</Label>
                  <Input
                    id="serviceEndAt"
                    type="time"
                    value={form.serviceEndAt}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, serviceEndAt: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Chair/Seat count for multiple creation */}
              {form.resourceTypeId && (getTypeById(form.resourceTypeId)?.code === 'chair' || getTypeById(form.resourceTypeId)?.code === 'seat') && !form.editId && (
                <div className="space-y-2">
                  <Label htmlFor="count">Sandalye Sayısı</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="count"
                      type="number"
                      min={1}
                      max={50}
                      value={form.count || ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          count: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)),
                        }))
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-slate-500">
                      {form.count > 1 ? `"${form.name || 'Sandalye'} 1" ... "${form.name || 'Sandalye'} ${form.count}" olarak oluşturulacak` : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Coordinates - Visual picker with 20x20 grid (for types that support coordinates) */}
              {form.resourceTypeId && getTypeById(form.resourceTypeId)?.supportsCoordinates && (
                <div className="space-y-2">
                  <Label>Konum</Label>
                  <p className="text-xs text-slate-500 mb-2">
                    {getTypeById(form.resourceTypeId)?.name} konumunu seçmek için tıklayın
                    {form.siblingTables.length > 0 && ` (${form.siblingTables.length} mevcut öğe gösteriliyor)`}
                  </p>
                  <div
                    className="relative bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg cursor-crosshair"
                    style={{ height: '300px' }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      // Snap to grid (20x20 = 5% increments)
                      const gridStep = 100 / GRID_SIZE;
                      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
                      const rawY = ((e.clientY - rect.top) / rect.height) * 100;
                      const x = Math.round(rawX / gridStep) * gridStep;
                      const y = Math.round(rawY / gridStep) * gridStep;

                      // Check if position is occupied by another table
                      const isOccupied = form.siblingTables.some(table => {
                        const coords = parseCoordinates(table.coordinates);
                        return Math.abs(coords.x - x) < gridStep && Math.abs(coords.y - y) < gridStep;
                      });

                      if (isOccupied) {
                        toast.error('Bu konumda zaten bir masa var!');
                        return;
                      }

                      setForm((prev) => ({
                        ...prev,
                        coordinateX: Math.max(0, Math.min(100, x)),
                        coordinateY: Math.max(0, Math.min(100, y)),
                      }));
                    }}
                  >
                    {/* Grid lines - 20x20 */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-30"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                      }}
                    >
                      {[...Array(GRID_SIZE * GRID_SIZE)].map((_, i) => (
                        <div key={i} className="border border-slate-300" />
                      ))}
                    </div>

                    {/* Existing tables (siblings) - shown in gray with seat dots */}
                    {form.siblingTables.map((table) => {
                      const coords = parseCoordinates(table.coordinates);
                      const capacity = table.capacity || 4;
                      // Calculate seat positions
                      const seatPositions = [];
                      const radius = 18;
                      for (let i = 0; i < capacity; i++) {
                        const angle = (i / capacity) * 2 * Math.PI - Math.PI / 2;
                        seatPositions.push({
                          x: Math.cos(angle) * radius,
                          y: Math.sin(angle) * radius,
                        });
                      }
                      return (
                        <div
                          key={table.id}
                          className="absolute flex flex-col items-center pointer-events-none"
                          style={{
                            left: `${coords.x}%`,
                            top: `${coords.y}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          title={`${table.name} - ${capacity} kişi`}
                        >
                          {/* Seat dots */}
                          {seatPositions.map((pos, idx) => (
                            <div
                              key={idx}
                              className="absolute w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-400"
                              style={{
                                left: `calc(50% + ${pos.x}px - 5px)`,
                                top: `calc(50% + ${pos.y}px - 5px)`,
                              }}
                            />
                          ))}
                          <div className="w-8 h-8 rounded-full bg-slate-400 shadow flex items-center justify-center text-white text-xs font-bold z-10 relative">
                            {capacity}
                          </div>
                          <span className="text-[10px] mt-0.5 bg-slate-600 text-white px-1 rounded whitespace-nowrap z-10 relative">
                            {table.name}
                          </span>
                        </div>
                      );
                    })}

                    {/* Current table marker - shown in amber */}
                    <div
                      className="absolute w-10 h-10 rounded-full bg-amber-500 shadow-lg flex items-center justify-center text-white font-bold text-sm transition-all duration-150 z-10"
                      style={{
                        left: `${form.coordinateX}%`,
                        top: `${form.coordinateY}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <Circle className="h-4 w-4" />
                    </div>

                    {/* Corner labels */}
                    <span className="absolute top-1 left-1 text-[10px] text-slate-400">Sol Üst</span>
                    <span className="absolute top-1 right-1 text-[10px] text-slate-400">Sağ Üst</span>
                    <span className="absolute bottom-1 left-1 text-[10px] text-slate-400">Sol Alt</span>
                    <span className="absolute bottom-1 right-1 text-[10px] text-slate-400">Sağ Alt</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Konum: X={form.coordinateX}%, Y={form.coordinateY}% (Grid: {GRID_SIZE}x{GRID_SIZE})</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((prev) => ({ ...prev, coordinateX: 50, coordinateY: 50 }))}
                    >
                      Ortala
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t.common.loading : form.editId ? t.common.update : t.common.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Kaynağı Sil"
        description={`"${deleteTarget?.name}" silinecek. Alt kaynakları varsa önce onları silmelisiniz.`}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
