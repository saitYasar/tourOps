// ============================================
// HerHafta - Veri Modelleri
// ============================================

// Base entity with common fields
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ============================================
// Geolocation
// ============================================
export interface LatLng {
  lat: number;
  lng: number;
}

// ============================================
// Region (Bölge)
// ============================================
export interface Region extends BaseEntity {
  name: string;
  description?: string;
}

// ============================================
// Tour (Tur)
// ============================================
export type TourStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export interface TourStop {
  id: string;
  restaurantId: string;
  order: number;
  note?: string;
}

export interface Tour extends BaseEntity {
  name: string;
  description?: string;
  regionId: string;
  startDate: string;
  endDate: string;
  capacity: number;
  status: TourStatus;
  route: LatLng[];
  stops: TourStop[];
  photoUrl?: string;
}

// ============================================
// Restaurant (Restoran)
// ============================================
export interface Restaurant extends BaseEntity {
  name: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
  location: LatLng;
  regionId?: string;
  photoUrl?: string;
}

// ============================================
// PreReservationRequest (Ön Rezervasyon İsteği)
// ============================================
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface PreReservationRequest extends BaseEntity {
  tourId: string;
  restaurantId: string;
  headcount: number;
  date: string;
  timeStart: string;
  timeEnd: string;
  status: RequestStatus;
  note?: string;
}

// ============================================
// Venue (Mekan Planı)
// ============================================
export interface Floor extends BaseEntity {
  restaurantId: string;
  name: string;
  order: number;
}

export interface Room extends BaseEntity {
  floorId: string;
  restaurantId: string;
  name: string;
  order: number;
  // Layout editor coordinates (pixels)
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface TableChild {
  id: number;
  name: string;
  order: number;
}

export interface Table extends BaseEntity {
  roomId: string;
  restaurantId: string;
  name: string;
  capacity: number;
  order: number;
  isWindowSide?: boolean;
  children?: TableChild[];
  // Layout editor coordinates (pixels)
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
}

export interface Chair extends BaseEntity {
  tableId: string;
  restaurantId: string;
  number: number;
}

// ============================================
// Menu (Menü)
// ============================================
export interface MenuCategory extends BaseEntity {
  restaurantId: string;
  name: string;
  order: number;
}

export interface MenuItem extends BaseEntity {
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  photoUrl?: string;
  isActive: boolean;
  order: number;
  ingredients?: string[];
}

// ============================================
// Customer (Misafir)
// ============================================
export interface Customer extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
}

// ============================================
// TourAssignment (Tur Ataması)
// ============================================
export interface TourAssignment extends BaseEntity {
  tourId: string;
  customerId: string;
}

// ============================================
// CustomerSelection (Misafir Seçimi)
// ============================================
export interface OrderItem {
  menuItemId: string;
  quantity: number;
  note?: string;
  excludeIngredients?: string[];
}

export interface CustomerSelection extends BaseEntity {
  tourId: string;
  customerId: string;
  restaurantId: string;
  tableId?: string;
  items: OrderItem[];
}

// ============================================
// Audit Log
// ============================================
export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
}

// ============================================
// User Role (Kullanıcı Rolü)
// ============================================
export type UserRole = 'agency' | 'restaurant' | 'customer' | 'admin';

export interface User extends BaseEntity {
  name: string;
  email: string;
  password: string; // Gercek uygulamada hash'lenmeli
  role: UserRole;
  restaurantId?: string; // Restaurant admin için
  customerId?: string;   // Customer için
}

// ============================================
// API Response Types
// ============================================
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
