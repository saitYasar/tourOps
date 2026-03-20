import type { ResourceDto, ResourceTypeDto } from '@/lib/api';

// Canvas constants
export const CANVAS_WIDTH = 3000;
export const CANVAS_HEIGHT = 2000;
export const GRID_SNAP = 20;

// Room color palette
export const ROOM_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
] as const;

// Object kind for structural/decorative elements
export type ObjectKind = 'window' | 'wall' | 'column' | 'free';

export const OBJECT_KIND_LABELS: Record<ObjectKind, string> = {
  window: 'Cam Kenarı',
  wall: 'Duvar',
  column: 'Kolon',
  free: 'Serbest Obje',
};

// Per-kind config: which properties are editable
export interface ObjectKindConfigEntry {
  lengthEditable: boolean;
  thicknessEditable: boolean;
  colorEditable: boolean;
  nameEditable: boolean;
  rotationEditable: boolean;
  fixedThickness: number | null;  // null = no fixed thickness
  defaultColor: string;
}

export const OBJECT_KIND_CONFIG: Record<ObjectKind, ObjectKindConfigEntry> = {
  window: { lengthEditable: true, thicknessEditable: false, colorEditable: false, nameEditable: false, rotationEditable: true, fixedThickness: 12, defaultColor: '#DBEAFE' },
  wall:   { lengthEditable: true, thicknessEditable: false, colorEditable: true,  nameEditable: false, rotationEditable: true, fixedThickness: 14, defaultColor: '#6B7280' },
  column: { lengthEditable: false, thicknessEditable: false, colorEditable: false, nameEditable: false, rotationEditable: false, fixedThickness: null, defaultColor: '#9CA3AF' },
  free:   { lengthEditable: true, thicknessEditable: true, colorEditable: true,  nameEditable: true,  rotationEditable: true, fixedThickness: null, defaultColor: '#A3E635' },
};

// Editor item types
export interface EditorRoom {
  id: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  floorId: number;
  capacity: number;
  dirty: boolean;
  resource: ResourceDto;
}

export interface EditorChair {
  id: number;
  name: string;
  order: number;
}

export interface EditorTable {
  id: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number; // rotation in degrees
  capacity: number;
  isRound: boolean;
  roomId: number;
  dirty: boolean;
  resource: ResourceDto;
  chairs: EditorChair[]; // actual chairs from DB
}

export interface EditorObject {
  id: number;
  name: string;        // Internal unique name: "Cam Kenarı-123"
  displayName: string;  // Display name: "Cam Kenarı" (no ID shown)
  kind: ObjectKind;
  color?: string;       // Custom color (overrides kind default)
  x: number;
  y: number;
  w: number;
  h: number;
  r: number; // rotation in degrees
  roomId: number;
  dirty: boolean;
  resource: ResourceDto;
}

export type SelectedItem =
  | { type: 'room'; id: number }
  | { type: 'table'; id: number }
  | { type: 'object'; id: number }
  | null;

export interface EditorState {
  rooms: EditorRoom[];
  tables: EditorTable[];
  objects: EditorObject[];
  selectedItem: SelectedItem;
  zoom: number;
  panX: number;
  panY: number;
  isDirty: boolean;
  activeFloorId: number | null;
  collisionTableId: number | null;
}

export type EditorAction =
  | { type: 'LOAD_FLOOR'; rooms: EditorRoom[]; tables: EditorTable[]; objects: EditorObject[]; floorId: number }
  | { type: 'SELECT'; item: SelectedItem }
  | { type: 'DESELECT' }
  | { type: 'MOVE_TABLE'; id: number; x: number; y: number }
  | { type: 'ROTATE_TABLE'; id: number; r: number }
  | { type: 'MOVE_ROOM'; id: number; x: number; y: number }
  | { type: 'MOVE_ROOM_WITH_CHILDREN'; id: number; x: number; y: number }
  | { type: 'RESIZE_ROOM'; id: number; w: number; h: number; x?: number; y?: number }
  | { type: 'UPDATE_TABLE_PROPERTY'; id: number; key: keyof Pick<EditorTable, 'name' | 'capacity' | 'roomId'>; value: string | number }
  | { type: 'UPDATE_ROOM_PROPERTY'; id: number; key: keyof Pick<EditorRoom, 'name' | 'w' | 'h' | 'capacity'>; value: string | number }
  | { type: 'ADD_ROOM'; room: EditorRoom }
  | { type: 'ADD_TABLE'; table: EditorTable }
  | { type: 'ADD_OBJECT'; object: EditorObject }
  | { type: 'MOVE_OBJECT'; id: number; x: number; y: number }
  | { type: 'ROTATE_OBJECT'; id: number; r: number }
  | { type: 'UPDATE_OBJECT_PROPERTY'; id: number; key: keyof Pick<EditorObject, 'name' | 'w' | 'h' | 'roomId' | 'color' | 'displayName'>; value: string | number }
  | { type: 'UPDATE_CHAIR_NAME'; tableId: number; chairId: number; name: string }
  | { type: 'DELETE_ITEM'; itemType: 'room' | 'table' | 'object'; id: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; x: number; y: number }
  | { type: 'MARK_CLEAN' }
  | { type: 'SET_COLLISION'; tableId: number | null }
  | { type: 'RESTORE_SNAPSHOT'; snapshot: UndoableSnapshot };

// Undo system types
export interface UndoableSnapshot {
  rooms: EditorRoom[];
  tables: EditorTable[];
  objects: EditorObject[];
}

export interface UndoEntry {
  label: string;
  snapshot: UndoableSnapshot;
  apiReverseOps?: { action: 'delete'; resourceIds: number[] }[];
}

// API adapter for LayoutEditor — allows both restaurant and admin APIs
export interface LayoutApiAdapter {
  getLayout: (parentId: number) => Promise<{ success: boolean; data?: ResourceDto[]; error?: string }>;
  getChildren: (parentId: number) => Promise<{ success: boolean; data?: ResourceDto[]; error?: string }>;
  create: (data: import('@/lib/api').CreateResourceDto) => Promise<{ success: boolean; data?: ResourceDto; error?: string }>;
  update: (id: number, data: import('@/lib/api').UpdateResourceDto) => Promise<{ success: boolean; data?: ResourceDto; error?: string }>;
  delete: (id: number) => Promise<{ success: boolean; error?: string }>;
}

export interface LayoutEditorProps {
  resources: ResourceDto[];
  resourceTypes: ResourceTypeDto[];
  childrenCache: Record<number, ResourceDto[]>;
  onResourceCreated: () => void;
  onResourceUpdated: () => void;
  onResourceDeleted: () => void;
  onReady?: () => void;
  apiAdapter?: LayoutApiAdapter;
}
