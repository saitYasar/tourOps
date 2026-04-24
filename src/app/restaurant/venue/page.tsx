'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Box, Layers, Square, Circle, User, Power, PowerOff, MapPin, Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { resourceApi, organizationApi, getAuthStorageKeys, type ResourceDto, type ResourceTypeDto, type CreateResourceDto, type UpdateResourceDto } from '@/lib/api';
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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { VenueModel3D } from '@/components/restaurant/VenueModel3D';
import { TransportModel3D } from '@/components/transport/TransportModel3D';
import { TransportLayoutEditor } from '@/components/transport/TransportLayoutEditor';
import { LayoutEditor, TablePreview } from '@/components/restaurant/layout-editor';

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
  // Grid creation for transport seats (columns × rows)
  seatMode: 'single' | 'grid';
  seatColumns: number;
  seatRows: number;
  // Dimensions for section/room/object
  width: number;
  height: number;
  // Color for objects
  color: string;
  // Coordinates for tables
  coordinateX: number;
  coordinateY: number;
  // Existing tables in the same room (for coordinate picker)
  siblingTables: ResourceDto[];
}


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
  seatMode: 'grid',
  seatColumns: 2,
  seatRows: 10,
  width: 0,
  height: 0,
  color: '#A3E635',
  coordinateX: 50, // Center by default
  coordinateY: 50,
  siblingTables: [],
};

// Icon mapping for resource types
const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  floor: Layers,
  room: Square,
  table: Circle,
  chair: User,
  seat: User,
  section: Box,
  transport_seat: User,
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
  const { t } = useLanguage();
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
      title={`${table.name} - ${capacity} ${t.venue.people}`}
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
  const { t, locale } = useLanguage();

  const { data: orgResult } = useQuery({
    queryKey: ['my-organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });
  const organization = orgResult?.success ? orgResult.data : undefined;
  const orgStatus = organization?.status;

  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [childrenCache, setChildrenCache] = useState<Record<number, ResourceDto[]>>({});
  const [loadingChildren, setLoadingChildren] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<FormState>(initialForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [multipleCreating, setMultipleCreating] = useState(false);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [childrenLoadingInProgress, setChildrenLoadingInProgress] = useState(false);

  // Read organizationCategoryId from JWT (instant, no API wait)
  const orgCategoryId = (() => {
    if (typeof window === 'undefined') return undefined;
    try {
      const token = localStorage.getItem(getAuthStorageKeys('restaurant').token);
      if (!token) return undefined;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.organizationCategoryId as number | undefined;
    } catch { return undefined; }
  })();

  // Query: Resource Types (dynamically based on organization's category)
  const { data: typesResult, isLoading: typesLoading, error: typesError } = useQuery({
    queryKey: ['resource-types', orgCategoryId],
    queryFn: () => resourceApi.getTypes(orgCategoryId),
    enabled: !!orgCategoryId,
  });
  const resourceTypes = typesResult?.success ? typesResult.data || [] : [];
  const isTransport = resourceTypes.some(t => t.code === 'section');
  const objectType = resourceTypes.find(t => t.code === 'object' || t.code === 'transport_object');

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

  // Refresh children for a specific parent without clearing cache first
  const refreshChildrenCache = useCallback(async (parentId: number | null) => {
    if (!parentId) return;
    try {
      const result = await resourceApi.getLayout(parentId);
      if (result.success && result.data) {
        const children = result.data.map(c => ({ ...c, parentId: c.parentId ?? parentId }));
        setChildrenCache(prev => ({ ...prev, [parentId]: children }));
      }
    } catch (error) {
      console.error('Failed to refresh children cache:', error);
    }
  }, []);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateResourceDto) => resourceApi.create(data),
    onSuccess: async (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
        // Refresh parent's children cache instead of clearing everything
        if (form.parentId) {
          await refreshChildrenCache(form.parentId);
        } else {
          setChildrenLoaded(false);
        }
        toast.success(t.venue.resourceCreated);
        closeForm();
      } else {
        toast.error(result.error || t.venue.createError);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateResourceDto }) =>
      resourceApi.update(id, data),
    onSuccess: async (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
        // Refresh the specific parent's children instead of re-running full tree load
        if (form.parentId) {
          await refreshChildrenCache(form.parentId);
        }
        toast.success(t.venue.resourceUpdated);
        closeForm();
      } else {
        toast.error(result.error || t.venue.updateError);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => resourceApi.delete(id),
    onSuccess: async (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
        // Refresh the specific parent's children instead of re-running full tree load
        const deleted = deleteTarget;
        if (deleted) {
          // Find the parent of the deleted resource
          const parent = resources.find(r => {
            const children = childrenCache[r.id] || r.children || [];
            return children.some(c => c.id === deleted.id);
          });
          if (parent) {
            await refreshChildrenCache(parent.id);
          }
        }
        toast.success(t.venue.resourceDeleted);
        setDeleteTarget(null);
      } else {
        toast.error(result.error || t.venue.deleteError);
      }
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => resourceApi.activate(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
        toast.success(t.venue.resourceActivated);
      }
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => resourceApi.deactivate(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
        toast.success(t.venue.resourceDeactivated);
      }
    },
  });

  // Fetch children for a resource using children endpoint
  // Transport (categoryId=2): NEVER call children API — use getLayout only
  const fetchChildren = useCallback(async (parentId: number): Promise<ResourceDto[]> => {
    if (orgCategoryId === 2) return [];
    if (childrenCache[parentId]) return childrenCache[parentId];
    if (loadingChildren.has(parentId)) return [];

    setLoadingChildren(prev => new Set(prev).add(parentId));
    try {
      const result = await resourceApi.getChildren(parentId);
      if (result.success && result.data) {
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
  }, [childrenCache, loadingChildren, orgCategoryId]);

  // Load all children — transport: 1 level (section→seats via getLayout), restaurant: 2 levels
  const loadAllChildren = useCallback(async () => {
    if (!resources.length) return;

    setChildrenLoadingInProgress(true);

    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

    const fetchWithRetry = async <T,>(fn: () => Promise<{ success: boolean; data?: T; error?: string }>, label: string): Promise<T | null> => {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await wait(1000 * attempt);
        const result = await fn();
        if (result.success && result.data) return result.data;
        console.warn(`[loadAllChildren] ${label} attempt ${attempt + 1} failed:`, result.error);
      }
      return null;
    };

    try {
      const newCache: Record<number, ResourceDto[]> = {};

      for (let fi = 0; fi < resources.length; fi++) {
        const floor = resources[fi];
        if (fi > 0) await wait(500);

        // getLayout returns direct children — uses /resources/layout?parentId=X (NOT /children)
        const childrenRaw = await fetchWithRetry(
          () => resourceApi.getLayout(floor.id),
          `getLayout(${floor.id} "${floor.name}")`
        );

        if (childrenRaw && childrenRaw.length > 0) {
          const children = childrenRaw.map(r => ({ ...r, parentId: r.parentId ?? floor.id }));
          newCache[floor.id] = children;

          // Transport (categoryId=2): only 2 levels, no children API calls at all
          if (orgCategoryId === 2) continue;

          for (let ri = 0; ri < children.length; ri++) {
            const room = children[ri];
            let roomTables: ResourceDto[];
            if (room.children && room.children.length > 0) {
              roomTables = room.children.map(t => ({ ...t, parentId: t.parentId ?? room.id }));
              newCache[room.id] = roomTables;
            } else if (!room.children) {
              await wait(500);
              const tables = await fetchWithRetry(
                () => resourceApi.getChildren(room.id),
                `getChildren(room=${room.id} "${room.name}")`
              );
              roomTables = tables ? tables.map(t => ({ ...t, parentId: t.parentId ?? room.id })) : [];
              if (roomTables.length > 0) {
                newCache[room.id] = roomTables;
              }
            } else {
              roomTables = [];
            }

            // Fetch chairs for each table that allows children
            const tablesWithChildren = roomTables.filter(t => {
              const tType = t.resourceType || resourceTypes.find(rt => rt.id === t.resourceTypeId);
              return tType?.allowsChildren;
            });
            for (let ti = 0; ti < tablesWithChildren.length; ti++) {
              const table = tablesWithChildren[ti];
              if (table.children && table.children.length > 0) {
                newCache[table.id] = table.children.map(c => ({ ...c, parentId: c.parentId ?? table.id }));
              } else {
                await wait(300);
                const chairs = await fetchWithRetry(
                  () => resourceApi.getChildren(table.id),
                  `getChildren(table=${table.id} "${table.name}")`
                );
                if (chairs && chairs.length > 0) {
                  newCache[table.id] = chairs.map(c => ({ ...c, parentId: c.parentId ?? table.id }));
                }
              }
            }
          }
        }
      }

      setChildrenCache(prev => ({ ...prev, ...newCache }));
    } finally {
      setChildrenLoadingInProgress(false);
    }
  }, [resources, orgCategoryId, resourceTypes]);

  // Load all children AFTER LayoutEditor finishes its initial API calls (avoids concurrent requests)
  const [editorReady, setEditorReady] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const handleEditorReady = useCallback(() => {
    setEditorReady(true);
  }, []);

  useEffect(() => {
    // Wait until resource types are loaded (needed to determine hierarchy)
    if (!resourceTypes.length) return;
    // Transport: no LayoutEditor, so load children immediately
    // Restaurant: wait for LayoutEditor to finish initial API calls
    const canLoad = isTransport ? resources.length > 0 : (editorReady && resources.length > 0);
    if (canLoad && !childrenLoaded) {
      setChildrenLoaded(true);
      loadAllChildren();
    }
  }, [isTransport, editorReady, resources, resourceTypes, childrenLoaded, loadAllChildren]);

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

  // Open section creation form with defaults
  const openSectionCreateForm = (resourceTypeId: number) => {
    const type = getTypeById(resourceTypeId);
    if (!type) return;
    const nextOrder = resources.length + 1;
    // Place new section next to existing ones (offset right)
    let startX = 20;
    for (const res of resources) {
      const coords = parseCoordinates(res.coordinates);
      const w = res.width || 200;
      startX = Math.max(startX, coords.x + w + 20);
    }
    setForm({
      isOpen: true,
      editId: null,
      parentId: null,
      resourceTypeId,
      name: '',
      capacity: type.defaultCapacity || 50,
      order: nextOrder,
      serviceStartAt: '09:00',
      serviceEndAt: '23:00',
      count: 1,
      seatMode: 'grid',
      seatColumns: 2,
      seatRows: 10,
      width: 200,
      height: 150,
      coordinateX: startX,
      coordinateY: 20,
      color: '#A3E635',
      siblingTables: [],
    });
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

    // Tables always default to 4-person (matching visual editor), others use defaultCapacity
    const isTable = type?.code === 'table';
    const isObject = type?.code === 'object' || type?.code === 'transport_object';
    setForm({
      isOpen: true,
      editId: null,
      parentId,
      resourceTypeId,
      name: '',
      capacity: isObject ? 0 : isTable ? 4 : (type?.defaultCapacity || 4),
      order: 0,
      serviceStartAt: '09:00',
      serviceEndAt: '23:00',
      count: type?.code === 'chair' || type?.code === 'seat' || type?.code === 'transport_seat' ? 4 : 1, // Default 4 chairs/seats
      coordinateX: 50, // Center by default
      coordinateY: 50,
      siblingTables,
      seatMode: 'grid',
      seatColumns: 2,
      seatRows: 10,
      width: isObject ? 30 : 0,
      height: isObject ? 20 : 0,
      color: '#A3E635',
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
      seatMode: 'single',
      seatColumns: 2,
      seatRows: 10,
      width: resource.width || 0,
      height: resource.height || 0,
      color: resource.color || '#A3E635',
    });
  };

  const closeForm = () => {
    setForm(initialForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = form.resourceTypeId ? getTypeById(form.resourceTypeId) : null;
    const isChair = type?.code === 'chair' || type?.code === 'seat' || type?.code === 'transport_seat';

    // For chairs/seats with count > 1, name is optional (will be auto-generated)
    if (!isChair && !form.name.trim()) {
      toast.error(t.venue.nameRequired);
      return;
    }
    if (!form.resourceTypeId) {
      toast.error(t.venue.selectResourceType);
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

    // Section: coordinates + dimensions
    if (type?.code === 'section') {
      baseData.coordinates = `${form.coordinateX},${form.coordinateY}`;
      if (form.width > 0) baseData.width = form.width;
      if (form.height > 0) baseData.height = form.height;
    }

    // Object: color + dimensions + coordinates
    if (type?.code === 'object' || type?.code === 'transport_object') {
      baseData.capacity = 0;
      baseData.color = form.color || undefined;
      if (form.width > 0) baseData.width = form.width;
      if (form.height > 0) baseData.height = form.height;
      // Position in empty space inside parent section
      const parentChildren = childrenCache[form.parentId!] || [];
      let maxBottomY = 0;
      for (const child of parentChildren) {
        const cc = parseCoordinates(child.coordinates);
        const ch = child.height || 24;
        if (cc.y + ch > maxBottomY) maxBottomY = cc.y + ch;
      }
      const offsetX = 8;
      const offsetY = maxBottomY > 0 ? maxBottomY + 8 : 8;
      baseData.coordinates = `${offsetX},${offsetY}`;
    }

    if (form.editId) {
      updateMutation.mutate({ id: form.editId, data: baseData });
    } else if (type?.code === 'transport_seat' && form.seatMode === 'grid' && !form.editId) {
      // Grid seat creation (columns × rows)
      const totalSeats = form.seatColumns * form.seatRows;
      setMultipleCreating(true);
      try {
        // Find max existing seat number and rightmost occupied x
        let maxSeatNum = 0;
        let maxOccupiedX = 0;
        const sectionChildren = childrenCache[form.parentId!] || [];
        for (const child of sectionChildren) {
          const num = parseInt(child.name, 10);
          if (!isNaN(num) && num > maxSeatNum) maxSeatNum = num;
          const coords = parseCoordinates(child.coordinates);
          if (coords.x + 24 > maxOccupiedX) maxOccupiedX = coords.x + 24;
        }
        const seatSize = 24;
        const seatGap = 4;
        const padX = sectionChildren.length > 0 ? maxOccupiedX + seatGap : 8;
        const padY = 8;
        let created = 0;
        for (let row = 0; row < form.seatRows; row++) {
          for (let col = 0; col < form.seatColumns; col++) {
            const seatNum = maxSeatNum + row * form.seatColumns + col + 1;
            const cx = padX + col * (seatSize + seatGap);
            const cy = padY + row * (seatSize + seatGap);
            await resourceApi.create({
              ...baseData,
              name: `${seatNum}`,
              capacity: 1,
              order: seatNum,
              coordinates: `${cx},${cy}`,
            });
            created++;
          }
        }
        queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
        await refreshChildrenCache(form.parentId);
        toast.success(`${created} ${t.venue.totalSeats.toLowerCase()} ${t.venue.resourceCreated.toLowerCase()}`);
        closeForm();
      } catch (error) {
        toast.error(t.venue.createError);
      } finally {
        setMultipleCreating(false);
      }
    } else if (isChair && form.count > 1) {
      // Multiple chair/seat creation
      const baseName = form.name.trim() || t.venue.chair;
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
        await refreshChildrenCache(form.parentId);
        toast.success(`${form.count} ${t.venue.chair.toLowerCase()} ${t.venue.resourceCreated.toLowerCase()}`);
        closeForm();
      } catch (error) {
        toast.error(t.venue.chairCreateError);
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
            // Find max seat number across all tables
            let maxSeatNum = 0;
            const findMaxSeat = (nodes: ResourceDto[]) => {
              for (const node of nodes) {
                if (node.resourceType?.code === 'seat' || node.resourceType?.code === 'chair') {
                  const num = parseInt(node.name, 10);
                  if (!isNaN(num) && num > maxSeatNum) maxSeatNum = num;
                }
                if (node.children?.length) findMaxSeat(node.children);
              }
            };
            findMaxSeat(resources);
            let chairsCreated = 0;
            for (let i = 1; i <= capacity; i++) {
              try {
                await resourceApi.create({
                  name: `${maxSeatNum + i}`,
                  resourceTypeId: chairType.id,
                  parentId: tableResult.data.id,
                  capacity: 1,
                  order: i,
                });
                chairsCreated++;
              } catch (chairErr) {
                console.error(`Chair ${maxSeatNum + i} creation failed:`, chairErr);
              }
            }
            toast.success(`${t.venue.table} + ${chairsCreated} ${t.venue.chair.toLowerCase()} ${t.venue.resourceCreated.toLowerCase()}`);
          } else {
            console.warn('[Venue] Chair/seat resource type not found. Available types:', resourceTypes.map(t => t.code));
            toast.success(t.venue.resourceCreated);
          }
          queryClient.invalidateQueries({ queryKey: ['resource-layout'] });
          await refreshChildrenCache(form.parentId);
          closeForm();
        } else {
          toast.error(tableResult.error || t.venue.tableCreateError);
        }
      } catch (error) {
        toast.error(t.venue.tableCreateErrorGeneral);
      } finally {
        setMultipleCreating(false);
      }
    } else {
      createMutation.mutate(baseData);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    // Find children (chairs/seats) from cache or resource tree
    const findResource = (nodes: ResourceDto[]): ResourceDto | undefined => {
      for (const n of nodes) {
        if (n.id === deleteTarget.id) return n;
        const found = findResource(n.children || []);
        if (found) return found;
      }
      return undefined;
    };
    const resource = findResource(resources);
    const children = childrenCache[deleteTarget.id] || resource?.children || [];

    if (children.length > 0) {
      setDeleting(true);
      toast.info(t.venue.deletingSection);
    }

    // Delete all children first (e.g. chairs/seats before section)
    for (const child of children) {
      try { await resourceApi.delete(child.id); } catch { /* ignore */ }
    }
    deleteMutation.mutate(deleteTarget.id);
    setDeleting(false);
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
                    {type?.name || t.venue.unknown}
                  </Badge>
                  {type?.code === 'floor' && (
                    <span className="text-sm text-slate-400">
                      ({t.venue.floorLabel} {resource.order >= 0 ? resource.order : resource.order})
                    </span>
                  )}
                  {resource.capacity > 1 && (
                    <span className="text-sm text-slate-400">
                      ({resource.capacity} {t.venue.people})
                    </span>
                  )}
                  {!resource.active && (
                    <Badge variant="secondary" className="text-xs">{t.team.inactive}</Badge>
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
                    title={resource.active ? t.venue.deactivate : t.venue.activate}
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
                    maxHeight: type?.code === 'table' ? '200px' : type?.code === 'room' || type?.code === 'section' ? '400px' : '500px',
                    overflowY: 'auto',
                  }}
                >
                  {isLoadingChildren ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
                      <span className="ml-2 text-sm text-slate-500">{t.common.loading}</span>
                    </div>
                  ) : hasChildren ? (
                    children.map((child) => (
                      <ResourceTreeItem key={child.id} resource={child} depth={depth + 1} />
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">
                      {t.venue.noChildResources} {childType?.name?.toLowerCase() || ''} {t.venue.noChildResourcesSuffix}
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
    const rooms: Array<{ id: string; name: string; floorId: string; order: number; restaurantId: string; createdAt: string; updatedAt: string; x?: number; y?: number; width?: number; height?: number }> = [];
    const tables: Array<{ id: string; name: string; roomId: string; capacity: number; order: number; restaurantId: string; createdAt: string; updatedAt: string; x?: number; y?: number; w?: number; h?: number; rotation?: number; children?: Array<{ id: number; name: string; order: number }> }> = [];
    const objects: Array<{ id: string; name: string; kind: 'window' | 'wall' | 'column' | 'free'; color?: string; roomId: string; x?: number; y?: number; w?: number; h?: number; rotation?: number }> = [];

    const detectKind = (name: string): 'window' | 'wall' | 'column' | 'free' => {
      const lower = name.toLowerCase();
      if (lower.startsWith('cam kenar') || lower.startsWith('cam_kenar') || lower.startsWith('window')) return 'window';
      if (lower.startsWith('kolon') || lower.startsWith('column')) return 'column';
      if (lower.startsWith('duvar') || lower.startsWith('wall')) return 'wall';
      return 'free';
    };

    const seen = new Set<string>();

    const processResource = (resource: ResourceDto, parentFloorId?: string, parentRoomId?: string) => {
      const rid = String(resource.id);
      if (seen.has(rid)) return;
      seen.add(rid);

      const type = resource.resourceType || getTypeById(resource.resourceTypeId);
      // Prefer explicit cache over embedded children to avoid double-traversal
      const children = childrenCache[resource.id] ?? resource.children ?? [];

      if (type?.code === 'floor') {
        floors.push({
          id: rid,
          name: resource.name,
          order: resource.order,
          restaurantId: '1',
          createdAt: resource.createdAt || now,
          updatedAt: resource.updatedAt || now,
        });
        children.forEach(child => processResource(child, rid));
      } else if (type?.code === 'room' && parentFloorId) {
        const roomCoords = parseCoordinates(resource.coordinates);
        rooms.push({
          id: rid,
          name: resource.name,
          floorId: parentFloorId,
          order: resource.order,
          restaurantId: '1',
          createdAt: resource.createdAt || now,
          updatedAt: resource.updatedAt || now,
          x: roomCoords.x,
          y: roomCoords.y,
          width: resource.width,
          height: resource.height,
        });
        children.forEach(child => processResource(child, parentFloorId, rid));
      } else if (type?.code === 'table' && parentRoomId) {
        const tableCoords = parseCoordinates(resource.coordinates);
        const tableChildren = childrenCache[resource.id] ?? resource.children ?? [];
        tables.push({
          id: rid,
          name: resource.name,
          roomId: parentRoomId,
          capacity: resource.capacity,
          order: resource.order,
          restaurantId: '1',
          createdAt: resource.createdAt || now,
          updatedAt: resource.updatedAt || now,
          x: tableCoords.x,
          y: tableCoords.y,
          w: resource.width,
          h: resource.height,
          rotation: resource.rotation,
          children: tableChildren.length > 0
            ? tableChildren.map(c => ({ id: c.id, name: c.name, order: c.order }))
            : undefined,
        });
      } else if ((type?.code === 'object' || type?.code === 'transport_object') && parentRoomId) {
        const objCoords = parseCoordinates(resource.coordinates);
        objects.push({
          id: rid,
          name: resource.name,
          kind: detectKind(resource.name),
          color: resource.color || undefined,
          roomId: parentRoomId,
          x: objCoords.x,
          y: objCoords.y,
          w: resource.width,
          h: resource.height,
          rotation: resource.rotation,
        });
      }
    };

    sortedResources.forEach(r => processResource(r));
    console.log('[3D] convertToLegacyFormat:', { floors: floors.length, rooms: rooms.length, tables: tables.length, objects: objects.length, cacheKeys: Object.keys(childrenCache) });
    return { floors, rooms, tables, objects };
  };

  const legacyData = convertToLegacyFormat();


  return (
    <div className="flex flex-col h-full">
      <Header title={t.venue.title} description={t.venue.description} organizationStatus={orgStatus} lang={locale} />

      <div className="flex-1 p-3 md:p-6">
        <Tabs value={activeTab} onValueChange={(tab) => {
          setActiveTab(tab);
          // 3D model tabına geçişte: editor hazırsa cache'i yenile, değilse editorReady sonrası otomatik yüklenecek
          if (tab === 'model' && editorReady && !childrenLoadingInProgress) {
            setChildrenLoaded(false);
          }
        }} className="space-y-3 md:space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <TabsList>
              <TabsTrigger value="summary" className="gap-1.5 md:gap-2 text-xs md:text-sm">
                <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {isTransport ? t.venue.vehicleLayout : t.venue.floorPlan}
              </TabsTrigger>
              <TabsTrigger value="model" className="gap-1.5 md:gap-2 text-xs md:text-sm">
                <Box className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {t.venue.modelView}
              </TabsTrigger>
            </TabsList>
            {typesLoading ? (
              <Button size="sm" disabled>
                <Plus className="h-4 w-4 mr-2" />
                {t.common.loading}
              </Button>
            ) : rootType ? (
              !isTransport ? (
                <Button size="sm" onClick={() => openCreateForm(null, rootType.id)}>
                  <Plus className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">{rootType.name} {t.venue.addSuffix}</span>
                  <span className="md:hidden">{rootType.name}</span>
                </Button>
              ) : null
            ) : (
              <Button variant="outline" size="sm" disabled>
                <Plus className="h-4 w-4 mr-2" />
                {t.venue.selectResourceType}
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
                      {isTransport ? t.venue.createVehicleLayoutTitle : t.venue.createSeatingTitle}
                    </h2>
                    <p className="text-slate-500 mb-6 leading-relaxed">
                      {isTransport ? t.venue.createVehicleLayoutDesc : t.venue.createSeatingDesc}
                    </p>

                    {isTransport ? (
                      <div className="grid grid-cols-2 gap-2 md:gap-4 mb-6 md:mb-8 w-full">
                        <div className="flex flex-col items-center p-2 md:p-4 bg-slate-50 rounded-lg">
                          <Box className="h-5 w-5 md:h-6 md:w-6 text-indigo-500 mb-1 md:mb-2" />
                          <span className="text-xs md:text-sm font-medium text-slate-700 text-center">{t.venue.addSectionStep}</span>
                          <span className="text-[10px] md:text-xs text-slate-400 mt-1 text-center">{t.venue.addSectionStepDesc}</span>
                        </div>
                        <div className="flex flex-col items-center p-2 md:p-4 bg-slate-50 rounded-lg">
                          <User className="h-5 w-5 md:h-6 md:w-6 text-amber-500 mb-1 md:mb-2" />
                          <span className="text-xs md:text-sm font-medium text-slate-700 text-center">{t.venue.addSeatStep}</span>
                          <span className="text-[10px] md:text-xs text-slate-400 mt-1 text-center">{t.venue.addSeatStepDesc}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8 w-full">
                        <div className="flex flex-col items-center p-2 md:p-4 bg-slate-50 rounded-lg">
                          <Layers className="h-5 w-5 md:h-6 md:w-6 text-indigo-500 mb-1 md:mb-2" />
                          <span className="text-xs md:text-sm font-medium text-slate-700 text-center">{t.venue.addFloorStep}</span>
                          <span className="text-[10px] md:text-xs text-slate-400 mt-1 text-center">{t.venue.addFloorStepDesc}</span>
                        </div>
                        <div className="flex flex-col items-center p-2 md:p-4 bg-slate-50 rounded-lg">
                          <Square className="h-5 w-5 md:h-6 md:w-6 text-blue-500 mb-1 md:mb-2" />
                          <span className="text-xs md:text-sm font-medium text-slate-700 text-center">{t.venue.addRoomStep}</span>
                          <span className="text-[10px] md:text-xs text-slate-400 mt-1 text-center">{t.venue.addRoomStepDesc}</span>
                        </div>
                        <div className="flex flex-col items-center p-2 md:p-4 bg-slate-50 rounded-lg">
                          <Circle className="h-5 w-5 md:h-6 md:w-6 text-amber-500 mb-1 md:mb-2" />
                          <span className="text-xs md:text-sm font-medium text-slate-700 text-center">{t.venue.addTableStep}</span>
                          <span className="text-[10px] md:text-xs text-slate-400 mt-1 text-center">{t.venue.addTableStepDesc}</span>
                        </div>
                      </div>
                    )}

                    {rootType ? (
                      <Button size="lg" onClick={() => isTransport ? openSectionCreateForm(rootType.id) : openCreateForm(null, rootType.id)} className="gap-2">
                        <Plus className="h-5 w-5" />
                        {isTransport ? t.venue.startByAddingSection : t.venue.startByAddingFloor}
                      </Button>
                    ) : (
                      <p className="text-sm text-red-500">
                        {t.venue.typesLoadError}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {isTransport ? (
                  /* Transport Stats */
                  <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">{t.venue.totalSections}</CardTitle>
                        <Box className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold">{resources.length}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">{t.venue.totalSeats}</CardTitle>
                        <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold">
                          {resources.reduce((acc, section) => {
                            const seats = childrenCache[section.id] || section.children || [];
                            return acc + seats.length;
                          }, 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">{t.venue.totalCapacity}</CardTitle>
                        <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold">
                          {resources.reduce((acc, section) => acc + section.capacity, 0)} {t.venue.people}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  /* Restaurant Stats */
                  <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">{t.venue.totalFloors}</CardTitle>
                        <Layers className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold">{resources.length}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">{t.venue.totalRooms}</CardTitle>
                        <Square className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold">
                          {resources.reduce((acc, floor) => {
                            const children = childrenCache[floor.id] || floor.children || [];
                            return acc + children.length;
                          }, 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">{t.venue.totalTables}</CardTitle>
                        <Circle className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold">
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
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">{t.venue.totalCapacity}</CardTitle>
                        <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold">
                          {resources.reduce((acc, floor) => acc + floor.capacity, 0)} {t.venue.people}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Layout Editor — only for restaurants */}
                {!isTransport && (
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
                )}

                {/* Transport: 2D Section Canvas */}
                {isTransport && (
                  <TransportLayoutEditor
                    resources={sortedResources}
                    resourceTypes={resourceTypes}
                    childrenCache={childrenCache}
                    onResourceCreated={() => refetchLayout()}
                    onResourceUpdated={() => refetchLayout()}
                    onResourceDeleted={() => refetchLayout()}
                    onOpenCreateForm={openCreateForm}
                    onOpenSectionCreateForm={openSectionCreateForm}
                    onOpenEditForm={openEditForm}
                    onDeleteRequest={(target) => setDeleteTarget(target)}
                    onChildrenCacheUpdate={setChildrenCache}
                  />
                )}
              </>
            )}
          </TabsContent>

          {/* 3D Model View */}
          <TabsContent value="model">
            {resources.length > 0 && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Pencil className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-sm text-blue-800">
                  {isTransport ? t.venue.editInLayoutTab : t.venue.editInLayoutTab}
                </p>
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.venue.buildingModel}</CardTitle>
                <CardDescription>{t.venue.buildingModelDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                {layoutLoading || childrenLoadingInProgress ? (
                  <LoadingState message={t.venue.loadingFloorsAndRooms} />
                ) : !resources.length ? (
                  <EmptyState
                    icon={Box}
                    title={t.venue.noDataFor3D}
                    description={t.venue.noDataFor3DDesc}
                  />
                ) : isTransport ? (
                  <TransportModel3D
                    sections={resources.map(r => {
                      const coords = parseCoordinates(r.coordinates);
                      return { id: r.id, name: r.name, x: coords.x, y: coords.y, w: r.width || 200, h: r.height || 150 };
                    })}
                    seats={resources.flatMap(r => {
                      const children = childrenCache[r.id] || r.children || [];
                      return children.map(c => {
                        const ct = getTypeById(c.resourceTypeId);
                        const coords = parseCoordinates(c.coordinates);
                        const isObj = ct?.code === 'object' || ct?.code === 'transport_object';
                        return {
                          id: c.id,
                          name: c.name,
                          sectionId: r.id,
                          x: coords.x,
                          y: coords.y,
                          isObject: isObj,
                          color: c.color,
                          width: c.width,
                          height: c.height,
                        };
                      });
                    })}
                  />
                ) : (
                  <VenueModel3D
                    floors={legacyData.floors}
                    rooms={legacyData.rooms}
                    tables={legacyData.tables}
                    objects={legacyData.objects}
                    onTableClick={(table) => {
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
              {form.editId ? t.venue.editResource : t.venue.addNew}: {form.resourceTypeId && getTypeById(form.resourceTypeId)?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {form.resourceTypeId && getTypeById(form.resourceTypeId)?.code === 'transport_seat' && !form.editId ? (
                <p className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                  {t.venue.seatAutoNumberInfo}
                </p>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {t.venue.nameLabel} {form.resourceTypeId && (getTypeById(form.resourceTypeId)?.code === 'chair' || getTypeById(form.resourceTypeId)?.code === 'transport_seat') && !form.editId ? t.venue.optional : '*'}
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={(() => {
                      const code = form.resourceTypeId ? getTypeById(form.resourceTypeId)?.code : '';
                      switch (code) {
                        case 'floor': return t.venue.floorNameExample;
                        case 'room': return t.venue.roomNameExample;
                        case 'table': return t.venue.tableNameExample;
                        case 'chair': case 'seat': return t.venue.chairNameExample;
                        case 'section': return t.venue.sectionNamePlaceholder;
                        case 'transport_seat': return t.venue.seatNameExample;
                        case 'object': case 'transport_object': return t.venue.objectNamePlaceholder;
                        default: return t.venue.resourceNamePlaceholder;
                      }
                    })()}
                  />
                </div>
              )}

              {form.resourceTypeId && getTypeById(form.resourceTypeId)?.code === 'floor' && (
                <div className="space-y-2">
                  <Label htmlFor="order">{t.venue.floorNumber}</Label>
                  <Select
                    value={String(form.order)}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, order: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-2">-2. {t.venue.floorLabel} ({t.venue.basement})</SelectItem>
                      <SelectItem value="-1">-1. {t.venue.floorLabel} ({t.venue.basement})</SelectItem>
                      <SelectItem value="0">{t.venue.groundFloor}</SelectItem>
                      <SelectItem value="1">1. {t.venue.floorLabel}</SelectItem>
                      <SelectItem value="2">2. {t.venue.floorLabel}</SelectItem>
                      <SelectItem value="3">3. {t.venue.floorLabel}</SelectItem>
                      <SelectItem value="4">4. {t.venue.floorLabel}</SelectItem>
                      <SelectItem value="5">5. {t.venue.floorLabel}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Capacity — hidden for section, transport_seat & object; visual picker for tables; number input for others */}
              {form.resourceTypeId && ['section', 'transport_seat', 'object', 'transport_object'].includes(getTypeById(form.resourceTypeId)?.code || '') ? null : form.resourceTypeId && getTypeById(form.resourceTypeId)?.code === 'table' ? (
                <div className="space-y-2">
                  <Label>{t.venue.personCount}</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {[2, 4, 6, 8].map((cap) => (
                      <TablePreview
                        key={cap}
                        capacity={cap}
                        selected={form.capacity === cap}
                        onClick={() => setForm((prev) => ({ ...prev, capacity: cap }))}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, capacity: prev.capacity > 8 ? prev.capacity : 10 }))}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        ![2, 4, 6, 8].includes(form.capacity)
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-2xl font-bold text-slate-400">+</span>
                      <span className={`text-sm font-medium ${
                        ![2, 4, 6, 8].includes(form.capacity) ? 'text-blue-700' : 'text-slate-600'
                      }`}>
                        {t.venue.customCapacity}
                      </span>
                    </button>
                  </div>
                  {![2, 4, 6, 8].includes(form.capacity) && (
                    <div className="mt-2">
                      <Input
                        type="number"
                        min={1}
                        value={form.capacity || ''}
                        onFocus={(e) => e.target.select()}
                        placeholder={t.venue.personCount}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            capacity: Math.max(1, parseInt(e.target.value) || 1),
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="capacity">
                    {(() => {
                      const code = form.resourceTypeId ? getTypeById(form.resourceTypeId)?.code : '';
                      switch (code) {
                        case 'floor': return t.venue.floorCapacity;
                        case 'room': return t.venue.roomCapacity;
                        default: return t.venue.capacityLabel;
                      }
                    })()}
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={1}
                    value={form.capacity || ''}
                    onFocus={(e) => e.target.select()}
                    placeholder={(() => {
                      const code = form.resourceTypeId ? getTypeById(form.resourceTypeId)?.code : '';
                      switch (code) {
                        case 'floor': return `${t.venue.examplePrefix} 100`;
                        case 'room': return `${t.venue.examplePrefix} 30`;
                        default: return `${t.venue.examplePrefix} 1`;
                      }
                    })()}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        capacity: parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
              )}

              {/* Service times — hidden for section, transport_seat & object */}
              {form.resourceTypeId && !['section', 'transport_seat', 'object', 'transport_object'].includes(getTypeById(form.resourceTypeId)?.code || '') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceStartAt">{t.venue.serviceStart}</Label>
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
                    <Label htmlFor="serviceEndAt">{t.venue.serviceEnd}</Label>
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
              )}

              {/* Object: color picker + dimensions */}
              {form.resourceTypeId && (getTypeById(form.resourceTypeId)?.code === 'object' || getTypeById(form.resourceTypeId)?.code === 'transport_object') && (
                <>
                  <div className="space-y-2">
                    <Label>{t.venue.objectColor}</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={form.color}
                        onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <span className="text-sm text-slate-500">{form.color}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.venue.objectWidth}</Label>
                      <Input
                        type="number"
                        min={10}
                        max={500}
                        value={form.width || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setForm((prev) => ({ ...prev, width: Math.max(10, parseInt(e.target.value) || 10) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.venue.objectHeight}</Label>
                      <Input
                        type="number"
                        min={10}
                        max={500}
                        value={form.height || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setForm((prev) => ({ ...prev, height: Math.max(10, parseInt(e.target.value) || 10) }))}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Transport seat: grid creation */}
              {form.resourceTypeId && getTypeById(form.resourceTypeId)?.code === 'transport_seat' && !form.editId && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t.venue.seatColumns}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={form.seatColumns || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setForm((prev) => ({ ...prev, seatColumns: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t.venue.seatRows}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={form.seatRows || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setForm((prev) => ({ ...prev, seatRows: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)) }))}
                      />
                    </div>
                  </div>
                  {/* Grid preview */}
                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-xs text-slate-500 mb-2">{t.venue.seatPreview}: {form.seatColumns} × {form.seatRows} = {form.seatColumns * form.seatRows} {t.venue.seatUnit}</p>
                    <div className="flex gap-1 justify-center overflow-x-auto py-1" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                      {Array.from({ length: form.seatColumns }).map((_, col) => (
                        <div key={col} className="flex flex-col gap-1">
                          {Array.from({ length: Math.min(form.seatRows, 15) }).map((_, row) => (
                            <div
                              key={row}
                              className="w-6 h-6 rounded bg-indigo-100 border border-indigo-300 flex items-center justify-center"
                            >
                              <span className="text-[8px] text-indigo-600 font-medium">{row * form.seatColumns + col + 1}</span>
                            </div>
                          ))}
                          {form.seatRows > 15 && (
                            <span className="text-[10px] text-slate-400 text-center">...</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Chair/Seat count for multiple creation (restaurant) */}
              {form.resourceTypeId && (getTypeById(form.resourceTypeId)?.code === 'chair' || getTypeById(form.resourceTypeId)?.code === 'seat') && !form.editId && (
                <div className="space-y-2">
                  <Label htmlFor="count">{t.venue.chairCountLabel}</Label>
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
                      {form.count > 1 ? `"${form.name || t.venue.chair} 1" ... "${form.name || t.venue.chair} ${form.count}" ${t.venue.willBeCreatedAs}` : ''}
                    </span>
                  </div>
                </div>
              )}

            </div>
            <DialogFooter className="flex !justify-between">
              {form.editId ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const name = form.name || '';
                    closeForm();
                    setDeleteTarget({ id: form.editId!, name });
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t.common.delete}
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={closeForm}>
                  {t.common.cancel}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button type="submit" disabled={isPending}>
                        {isPending ? t.common.loading : form.editId ? t.common.update : t.common.create}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isPending && <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>}
                </Tooltip>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
        title={t.venue.deleteResource}
        description={(() => {
          if (!deleteTarget) return '';
          const children = childrenCache[deleteTarget.id] || [];
          if (children.length > 0) {
            return `"${deleteTarget.name}" ${t.venue.deleteWithChildrenDesc}`;
          }
          return `"${deleteTarget.name}" ${t.venue.deleteResourceDesc}`;
        })()}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
