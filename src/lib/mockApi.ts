// ============================================
// Mock API - Fake network delay ile async CRUD
// ============================================

import {
  getDatabase,
  saveDatabase,
  addAuditLog,
  generateEntityId,
  getCurrentTimestamp,
  type Database,
} from './mockDb';
import type {
  Region,
  Tour,
  Restaurant,
  PreReservationRequest,
  Floor,
  Room,
  Table,
  Chair,
  MenuCategory,
  MenuItem,
  Customer,
  TourAssignment,
  CustomerSelection,
  AuditLog,
  User,
  LatLng,
  RequestStatus,
  TourStatus,
} from '@/types';

// ============================================
// Network Simulation
// ============================================
const MIN_DELAY = 200;
const MAX_DELAY = 600;

async function simulateNetwork<T>(data: T): Promise<T> {
  const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
  await new Promise((resolve) => setTimeout(resolve, delay));

  // %5 hata simülasyonu (geliştirme için kapalı)
  // if (Math.random() < 0.05) {
  //   throw new Error('Network error: Baglanti sorunu olustu');
  // }

  return data;
}

// ============================================
// REGION API
// ============================================
export const regionApi = {
  async list(): Promise<Region[]> {
    const db = getDatabase();
    const active = db.regions.filter((r) => !r.deletedAt);
    return simulateNetwork(active);
  },

  async getById(id: string): Promise<Region | null> {
    const db = getDatabase();
    const region = db.regions.find((r) => r.id === id && !r.deletedAt);
    return simulateNetwork(region || null);
  },

  async create(data: Omit<Region, 'id' | 'createdAt' | 'updatedAt'>): Promise<Region> {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const region: Region = {
      ...data,
      id: generateEntityId(),
      createdAt: now,
      updatedAt: now,
    };
    db.regions.push(region);
    addAuditLog(db, 'CREATE', 'region', region.id, `Bölge oluşturuldu: ${region.name}`);
    saveDatabase(db);
    return simulateNetwork(region);
  },

  async update(id: string, data: Partial<Omit<Region, 'id' | 'createdAt'>>): Promise<Region | null> {
    const db = getDatabase();
    const index = db.regions.findIndex((r) => r.id === id);
    if (index === -1) return simulateNetwork(null);

    db.regions[index] = {
      ...db.regions[index],
      ...data,
      updatedAt: getCurrentTimestamp(),
    };
    addAuditLog(db, 'UPDATE', 'region', id, `Bölge güncellendi: ${db.regions[index].name}`);
    saveDatabase(db);
    return simulateNetwork(db.regions[index]);
  },

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const index = db.regions.findIndex((r) => r.id === id);
    if (index === -1) return simulateNetwork(false);

    db.regions[index].deletedAt = getCurrentTimestamp();
    addAuditLog(db, 'DELETE', 'region', id, `Bölge silindi: ${db.regions[index].name}`);
    saveDatabase(db);
    return simulateNetwork(true);
  },
};

// ============================================
// TOUR API
// ============================================
export const tourApi = {
  async list(): Promise<Tour[]> {
    const db = getDatabase();
    const active = db.tours.filter((t) => !t.deletedAt);
    return simulateNetwork(active);
  },

  async getById(id: string): Promise<Tour | null> {
    const db = getDatabase();
    const tour = db.tours.find((t) => t.id === id && !t.deletedAt);
    return simulateNetwork(tour || null);
  },

  async create(data: Omit<Tour, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tour> {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const tour: Tour = {
      ...data,
      id: generateEntityId(),
      createdAt: now,
      updatedAt: now,
    };
    db.tours.push(tour);
    addAuditLog(db, 'CREATE', 'tour', tour.id, `Tur oluşturuldu: ${tour.name}`);
    saveDatabase(db);
    return simulateNetwork(tour);
  },

  async update(id: string, data: Partial<Omit<Tour, 'id' | 'createdAt'>>): Promise<Tour | null> {
    const db = getDatabase();
    const index = db.tours.findIndex((t) => t.id === id);
    if (index === -1) return simulateNetwork(null);

    db.tours[index] = {
      ...db.tours[index],
      ...data,
      updatedAt: getCurrentTimestamp(),
    };
    addAuditLog(db, 'UPDATE', 'tour', id, `Tur güncellendi: ${db.tours[index].name}`);
    saveDatabase(db);
    return simulateNetwork(db.tours[index]);
  },

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const index = db.tours.findIndex((t) => t.id === id);
    if (index === -1) return simulateNetwork(false);

    db.tours[index].deletedAt = getCurrentTimestamp();
    addAuditLog(db, 'DELETE', 'tour', id, `Tur silindi: ${db.tours[index].name}`);
    saveDatabase(db);
    return simulateNetwork(true);
  },

  async updateRoute(id: string, route: LatLng[]): Promise<Tour | null> {
    return this.update(id, { route });
  },

  async updateStatus(id: string, status: TourStatus): Promise<Tour | null> {
    return this.update(id, { status });
  },
};

// ============================================
// RESTAURANT API
// ============================================
export const restaurantApi = {
  async list(): Promise<Restaurant[]> {
    const db = getDatabase();
    const active = db.restaurants.filter((r) => !r.deletedAt);
    return simulateNetwork(active);
  },

  async getById(id: string): Promise<Restaurant | null> {
    const db = getDatabase();
    const restaurant = db.restaurants.find((r) => r.id === id && !r.deletedAt);
    return simulateNetwork(restaurant || null);
  },

  async findNearRoute(route: LatLng[], radiusKm: number = 2): Promise<Restaurant[]> {
    const db = getDatabase();
    const active = db.restaurants.filter((r) => !r.deletedAt);

    if (route.length === 0) return simulateNetwork(active.slice(0, 5));

    // Basit bounding box hesaplama
    const lats = route.map((p) => p.lat);
    const lngs = route.map((p) => p.lng);
    const minLat = Math.min(...lats) - radiusKm / 111;
    const maxLat = Math.max(...lats) + radiusKm / 111;
    const minLng = Math.min(...lngs) - radiusKm / 111;
    const maxLng = Math.max(...lngs) + radiusKm / 111;

    const nearby = active.filter((r) => {
      const { lat, lng } = r.location;
      return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    });

    // En az 5 restoran döndür
    if (nearby.length < 5) {
      return simulateNetwork(active.slice(0, Math.max(5, nearby.length)));
    }

    return simulateNetwork(nearby);
  },

  async create(data: Omit<Restaurant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Restaurant> {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const restaurant: Restaurant = {
      ...data,
      id: generateEntityId(),
      createdAt: now,
      updatedAt: now,
    };
    db.restaurants.push(restaurant);
    addAuditLog(db, 'CREATE', 'restaurant', restaurant.id, `Restoran oluşturuldu: ${restaurant.name}`);
    saveDatabase(db);
    return simulateNetwork(restaurant);
  },

  async update(id: string, data: Partial<Omit<Restaurant, 'id' | 'createdAt'>>): Promise<Restaurant | null> {
    const db = getDatabase();
    const index = db.restaurants.findIndex((r) => r.id === id);
    if (index === -1) return simulateNetwork(null);

    db.restaurants[index] = {
      ...db.restaurants[index],
      ...data,
      updatedAt: getCurrentTimestamp(),
    };
    addAuditLog(db, 'UPDATE', 'restaurant', id, `Restoran güncellendi: ${db.restaurants[index].name}`);
    saveDatabase(db);
    return simulateNetwork(db.restaurants[index]);
  },

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const index = db.restaurants.findIndex((r) => r.id === id);
    if (index === -1) return simulateNetwork(false);

    db.restaurants[index].deletedAt = getCurrentTimestamp();
    addAuditLog(db, 'DELETE', 'restaurant', id, `Restoran silindi: ${db.restaurants[index].name}`);
    saveDatabase(db);
    return simulateNetwork(true);
  },
};

// ============================================
// PRE-RESERVATION REQUEST API
// ============================================
export const preReservationApi = {
  async list(): Promise<PreReservationRequest[]> {
    const db = getDatabase();
    const active = db.preReservationRequests.filter((r) => !r.deletedAt);
    return simulateNetwork(active);
  },

  async listByTour(tourId: string): Promise<PreReservationRequest[]> {
    const db = getDatabase();
    const filtered = db.preReservationRequests.filter(
      (r) => r.tourId === tourId && !r.deletedAt
    );
    return simulateNetwork(filtered);
  },

  async listByRestaurant(restaurantId: string): Promise<PreReservationRequest[]> {
    const db = getDatabase();
    const filtered = db.preReservationRequests.filter(
      (r) => r.restaurantId === restaurantId && !r.deletedAt
    );
    return simulateNetwork(filtered);
  },

  async getById(id: string): Promise<PreReservationRequest | null> {
    const db = getDatabase();
    const request = db.preReservationRequests.find((r) => r.id === id && !r.deletedAt);
    return simulateNetwork(request || null);
  },

  async create(data: Omit<PreReservationRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<PreReservationRequest> {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const request: PreReservationRequest = {
      ...data,
      id: generateEntityId(),
      createdAt: now,
      updatedAt: now,
    };
    db.preReservationRequests.push(request);
    addAuditLog(db, 'CREATE', 'preReservationRequest', request.id, `Ön rezervasyon isteği oluşturuldu`);
    saveDatabase(db);
    return simulateNetwork(request);
  },

  async updateStatus(id: string, status: RequestStatus): Promise<PreReservationRequest | null> {
    const db = getDatabase();
    const index = db.preReservationRequests.findIndex((r) => r.id === id);
    if (index === -1) return simulateNetwork(null);

    db.preReservationRequests[index] = {
      ...db.preReservationRequests[index],
      status,
      updatedAt: getCurrentTimestamp(),
    };
    addAuditLog(db, 'UPDATE_STATUS', 'preReservationRequest', id, `Durum güncellendi: ${status}`);
    saveDatabase(db);
    return simulateNetwork(db.preReservationRequests[index]);
  },

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const index = db.preReservationRequests.findIndex((r) => r.id === id);
    if (index === -1) return simulateNetwork(false);

    db.preReservationRequests[index].deletedAt = getCurrentTimestamp();
    addAuditLog(db, 'DELETE', 'preReservationRequest', id, `Ön rezervasyon isteği silindi`);
    saveDatabase(db);
    return simulateNetwork(true);
  },
};

// ============================================
// VENUE API (Floor, Room, Table, Chair)
// ============================================
export const venueApi = {
  // Floors
  async listFloors(restaurantId: string): Promise<Floor[]> {
    const db = getDatabase();
    return simulateNetwork(
      db.floors.filter((f) => f.restaurantId === restaurantId && !f.deletedAt).sort((a, b) => a.order - b.order)
    );
  },

  async createFloor(data: Omit<Floor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Floor> {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const floor: Floor = { ...data, id: generateEntityId(), createdAt: now, updatedAt: now };
    db.floors.push(floor);
    addAuditLog(db, 'CREATE', 'floor', floor.id, `Kat oluşturuldu: ${floor.name}`);
    saveDatabase(db);
    return simulateNetwork(floor);
  },

  async updateFloor(id: string, data: Partial<Omit<Floor, 'id' | 'createdAt'>>): Promise<Floor | null> {
    const db = getDatabase();
    const index = db.floors.findIndex((f) => f.id === id);
    if (index === -1) return simulateNetwork(null);
    db.floors[index] = { ...db.floors[index], ...data, updatedAt: getCurrentTimestamp() };
    saveDatabase(db);
    return simulateNetwork(db.floors[index]);
  },

  async deleteFloor(id: string): Promise<boolean> {
    const db = getDatabase();
    const index = db.floors.findIndex((f) => f.id === id);
    if (index === -1) return simulateNetwork(false);
    db.floors[index].deletedAt = getCurrentTimestamp();
    saveDatabase(db);
    return simulateNetwork(true);
  },

  // Rooms
  async listRooms(floorId: string): Promise<Room[]> {
    const db = getDatabase();
    return simulateNetwork(
      db.rooms.filter((r) => r.floorId === floorId && !r.deletedAt).sort((a, b) => a.order - b.order)
    );
  },

  async listRoomsByRestaurant(restaurantId: string): Promise<Room[]> {
    const db = getDatabase();
    return simulateNetwork(
      db.rooms.filter((r) => r.restaurantId === restaurantId && !r.deletedAt).sort((a, b) => a.order - b.order)
    );
  },

  async createRoom(data: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>): Promise<Room> {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const room: Room = { ...data, id: generateEntityId(), createdAt: now, updatedAt: now };
    db.rooms.push(room);
    addAuditLog(db, 'CREATE', 'room', room.id, `Oda oluşturuldu: ${room.name}`);
    saveDatabase(db);
    return simulateNetwork(room);
  },

  async updateRoom(id: string, data: Partial<Omit<Room, 'id' | 'createdAt'>>): Promise<Room | null> {
    const db = getDatabase();
    const index = db.rooms.findIndex((r) => r.id === id);
    if (index === -1) return simulateNetwork(null);
    db.rooms[index] = { ...db.rooms[index], ...data, updatedAt: getCurrentTimestamp() };
    saveDatabase(db);
    return simulateNetwork(db.rooms[index]);
  },

  async deleteRoom(id: string): Promise<boolean> {
    const db = getDatabase();
    const index = db.rooms.findIndex((r) => r.id === id);
    if (index === -1) return simulateNetwork(false);
    db.rooms[index].deletedAt = getCurrentTimestamp();
    saveDatabase(db);
    return simulateNetwork(true);
  },

  // Tables
  async listTables(roomId: string): Promise<Table[]> {
    const db = getDatabase();
    return simulateNetwork(
      db.tables.filter((t) => t.roomId === roomId && !t.deletedAt).sort((a, b) => a.order - b.order)
    );
  },

  async listTablesByRestaurant(restaurantId: string): Promise<Table[]> {
    const db = getDatabase();
    return simulateNetwork(
      db.tables.filter((t) => t.restaurantId === restaurantId && !t.deletedAt).sort((a, b) => a.order - b.order)
    );
  },

  async createTable(data: Omit<Table, 'id' | 'createdAt' | 'updatedAt'>): Promise<Table> {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const table: Table = { ...data, id: generateEntityId(), createdAt: now, updatedAt: now };
    db.tables.push(table);
    addAuditLog(db, 'CREATE', 'table', table.id, `Masa oluşturuldu: ${table.name}`);
    saveDatabase(db);
    return simulateNetwork(table);
  },

  async updateTable(id: string, data: Partial<Omit<Table, 'id' | 'createdAt'>>): Promise<Table | null> {
    const db = getDatabase();
    const index = db.tables.findIndex((t) => t.id === id);
    if (index === -1) return simulateNetwork(null);
    db.tables[index] = { ...db.tables[index], ...data, updatedAt: getCurrentTimestamp() };
    saveDatabase(db);
    return simulateNetwork(db.tables[index]);
  },

  async deleteTable(id: string): Promise<boolean> {
    const db = getDatabase();
    const index = db.tables.findIndex((t) => t.id === id);
    if (index === -1) return simulateNetwork(false);
    db.tables[index].deletedAt = getCurrentTimestamp();
    saveDatabase(db);
    return simulateNetwork(true);
  },

  // Chairs
  async listChairs(tableId: string): Promise<Chair[]> {
    const db = getDatabase();
    return simulateNetwork(
      db.chairs.filter((c) => c.tableId === tableId && !c.deletedAt).sort((a, b) => a.number - b.number)
    );
  },

  async createChair(data: Omit<Chair, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chair> {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const chair: Chair = { ...data, id: generateEntityId(), createdAt: now, updatedAt: now };
    db.chairs.push(chair);
    saveDatabase(db);
    return simulateNetwork(chair);
  },

  async deleteChair(id: string): Promise<boolean> {
    const db = getDatabase();
    const index = db.chairs.findIndex((c) => c.id === id);
    if (index === -1) return simulateNetwork(false);
    db.chairs[index].deletedAt = getCurrentTimestamp();
    saveDatabase(db);
    return simulateNetwork(true);
  },
};

// ============================================
// MENU API
// ============================================
export const menuApi = {
  // Categories
  async listCategories(restaurantId: string): Promise<MenuCategory[]> {
    const db = getDatabase();
    return simulateNetwork(
      db.menuCategories.filter((c) => c.restaurantId === restaurantId && !c.deletedAt).sort((a, b) => a.order - b.order)
    );
  },

  async createCategory(data: Omit<MenuCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<MenuCategory> {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const category: MenuCategory = { ...data, id: generateEntityId(), createdAt: now, updatedAt: now };
    db.menuCategories.push(category);
    addAuditLog(db, 'CREATE', 'menuCategory', category.id, `Kategori oluşturuldu: ${category.name}`);
    saveDatabase(db);
    return simulateNetwork(category);
  },

  async updateCategory(id: string, data: Partial<Omit<MenuCategory, 'id' | 'createdAt'>>): Promise<MenuCategory | null> {
    const db = getDatabase();
    const index = db.menuCategories.findIndex((c) => c.id === id);
    if (index === -1) return simulateNetwork(null);
    db.menuCategories[index] = { ...db.menuCategories[index], ...data, updatedAt: getCurrentTimestamp() };
    saveDatabase(db);
    return simulateNetwork(db.menuCategories[index]);
  },

  async deleteCategory(id: string): Promise<boolean> {
    const db = getDatabase();
    const index = db.menuCategories.findIndex((c) => c.id === id);
    if (index === -1) return simulateNetwork(false);
    db.menuCategories[index].deletedAt = getCurrentTimestamp();
    saveDatabase(db);
    return simulateNetwork(true);
  },

  async reorderCategories(restaurantId: string, orderedIds: string[]): Promise<void> {
    const db = getDatabase();
    orderedIds.forEach((id, index) => {
      const cat = db.menuCategories.find((c) => c.id === id);
      if (cat) cat.order = index;
    });
    saveDatabase(db);
    return simulateNetwork(undefined);
  },

  // Items
  async listItems(categoryId: string): Promise<MenuItem[]> {
    const db = getDatabase();
    return simulateNetwork(
      db.menuItems.filter((i) => i.categoryId === categoryId && !i.deletedAt).sort((a, b) => a.order - b.order)
    );
  },

  async listItemsByRestaurant(restaurantId: string): Promise<MenuItem[]> {
    const db = getDatabase();
    return simulateNetwork(
      db.menuItems.filter((i) => i.restaurantId === restaurantId && !i.deletedAt).sort((a, b) => a.order - b.order)
    );
  },

  async getItemById(id: string): Promise<MenuItem | null> {
    const db = getDatabase();
    const item = db.menuItems.find((i) => i.id === id && !i.deletedAt);
    return simulateNetwork(item || null);
  },

  async createItem(data: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<MenuItem> {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const item: MenuItem = { ...data, id: generateEntityId(), createdAt: now, updatedAt: now };
    db.menuItems.push(item);
    addAuditLog(db, 'CREATE', 'menuItem', item.id, `Menü öğesi oluşturuldu: ${item.name}`);
    saveDatabase(db);
    return simulateNetwork(item);
  },

  async updateItem(id: string, data: Partial<Omit<MenuItem, 'id' | 'createdAt'>>): Promise<MenuItem | null> {
    const db = getDatabase();
    const index = db.menuItems.findIndex((i) => i.id === id);
    if (index === -1) return simulateNetwork(null);
    db.menuItems[index] = { ...db.menuItems[index], ...data, updatedAt: getCurrentTimestamp() };
    saveDatabase(db);
    return simulateNetwork(db.menuItems[index]);
  },

  async deleteItem(id: string): Promise<boolean> {
    const db = getDatabase();
    const index = db.menuItems.findIndex((i) => i.id === id);
    if (index === -1) return simulateNetwork(false);
    db.menuItems[index].deletedAt = getCurrentTimestamp();
    saveDatabase(db);
    return simulateNetwork(true);
  },

  async reorderItems(categoryId: string, orderedIds: string[]): Promise<void> {
    const db = getDatabase();
    orderedIds.forEach((id, index) => {
      const item = db.menuItems.find((i) => i.id === id);
      if (item) item.order = index;
    });
    saveDatabase(db);
    return simulateNetwork(undefined);
  },
};

// ============================================
// CUSTOMER API
// ============================================
export const customerApi = {
  async list(): Promise<Customer[]> {
    const db = getDatabase();
    return simulateNetwork(db.customers.filter((c) => !c.deletedAt));
  },

  async getById(id: string): Promise<Customer | null> {
    const db = getDatabase();
    const customer = db.customers.find((c) => c.id === id && !c.deletedAt);
    return simulateNetwork(customer || null);
  },
};

// ============================================
// TOUR ASSIGNMENT API
// ============================================
export const tourAssignmentApi = {
  async listByTour(tourId: string): Promise<TourAssignment[]> {
    const db = getDatabase();
    return simulateNetwork(db.tourAssignments.filter((a) => a.tourId === tourId && !a.deletedAt));
  },

  async listByCustomer(customerId: string): Promise<TourAssignment[]> {
    const db = getDatabase();
    return simulateNetwork(db.tourAssignments.filter((a) => a.customerId === customerId && !a.deletedAt));
  },

  async create(data: Omit<TourAssignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<TourAssignment> {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const assignment: TourAssignment = { ...data, id: generateEntityId(), createdAt: now, updatedAt: now };
    db.tourAssignments.push(assignment);
    addAuditLog(db, 'CREATE', 'tourAssignment', assignment.id, `Tur atamasi yapildi`);
    saveDatabase(db);
    return simulateNetwork(assignment);
  },

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const index = db.tourAssignments.findIndex((a) => a.id === id);
    if (index === -1) return simulateNetwork(false);
    db.tourAssignments[index].deletedAt = getCurrentTimestamp();
    saveDatabase(db);
    return simulateNetwork(true);
  },
};

// ============================================
// CUSTOMER SELECTION API
// ============================================
export const customerSelectionApi = {
  async listByTourAndCustomer(tourId: string, customerId: string): Promise<CustomerSelection[]> {
    const db = getDatabase();
    return simulateNetwork(
      db.customerSelections.filter(
        (s) => s.tourId === tourId && s.customerId === customerId && !s.deletedAt
      )
    );
  },

  async getByRestaurant(tourId: string, customerId: string, restaurantId: string): Promise<CustomerSelection | null> {
    const db = getDatabase();
    const selection = db.customerSelections.find(
      (s) =>
        s.tourId === tourId &&
        s.customerId === customerId &&
        s.restaurantId === restaurantId &&
        !s.deletedAt
    );
    return simulateNetwork(selection || null);
  },

  async upsert(data: Omit<CustomerSelection, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomerSelection> {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const existingIndex = db.customerSelections.findIndex(
      (s) =>
        s.tourId === data.tourId &&
        s.customerId === data.customerId &&
        s.restaurantId === data.restaurantId &&
        !s.deletedAt
    );

    if (existingIndex !== -1) {
      db.customerSelections[existingIndex] = {
        ...db.customerSelections[existingIndex],
        ...data,
        updatedAt: now,
      };
      saveDatabase(db);
      return simulateNetwork(db.customerSelections[existingIndex]);
    }

    const selection: CustomerSelection = {
      ...data,
      id: generateEntityId(),
      createdAt: now,
      updatedAt: now,
    };
    db.customerSelections.push(selection);
    addAuditLog(db, 'CREATE', 'customerSelection', selection.id, `Müşteri seçimi kaydedildi`);
    saveDatabase(db);
    return simulateNetwork(selection);
  },
};

// ============================================
// AUDIT LOG API
// ============================================
export const auditLogApi = {
  async list(limit: number = 20): Promise<AuditLog[]> {
    const db = getDatabase();
    return simulateNetwork(db.auditLogs.slice(0, limit));
  },
};

// ============================================
// AUTH API
// ============================================
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'agency' | 'restaurant' | 'customer' | 'admin';
  restaurantId?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const db = getDatabase();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === credentials.email.toLowerCase() && !u.deletedAt
    );

    if (!user) {
      return simulateNetwork({ success: false, error: 'Kullanıcı bulunamadı' });
    }

    if (user.password !== credentials.password) {
      return simulateNetwork({ success: false, error: 'Sifre hatali' });
    }

    addAuditLog(db, 'LOGIN', 'user', user.id, `${user.name} giriş yaptı`);
    saveDatabase(db);

    // Password'u response'dan cikar
    const { password: _, ...userWithoutPassword } = user;
    return simulateNetwork({
      success: true,
      user: { ...userWithoutPassword, password: '' } as User
    });
  },

  async register(data: RegisterData): Promise<AuthResult> {
    const db = getDatabase();

    // Email kontrolu
    const existingUser = db.users.find(
      (u) => u.email.toLowerCase() === data.email.toLowerCase() && !u.deletedAt
    );

    if (existingUser) {
      return simulateNetwork({ success: false, error: 'Bu email zaten kayıtlı' });
    }

    const now = getCurrentTimestamp();
    const newUser: User = {
      id: generateEntityId(),
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: data.role,
      restaurantId: data.restaurantId,
      createdAt: now,
      updatedAt: now,
    };

    // Eğer customer olarak kayıt oluyorsa, Customer entity'si de oluştur
    if (data.role === 'customer') {
      const customer = {
        id: generateEntityId(),
        name: data.name,
        email: data.email.toLowerCase(),
        createdAt: now,
        updatedAt: now,
      };
      db.customers.push(customer);
      newUser.customerId = customer.id;
    }

    db.users.push(newUser);
    addAuditLog(db, 'REGISTER', 'user', newUser.id, `${newUser.name} kayıt oldu (${newUser.role})`);
    saveDatabase(db);

    const { password: _, ...userWithoutPassword } = newUser;
    return simulateNetwork({
      success: true,
      user: { ...userWithoutPassword, password: '' } as User
    });
  },

  async getById(id: string): Promise<User | null> {
    const db = getDatabase();
    const user = db.users.find((u) => u.id === id && !u.deletedAt);
    if (!user) return simulateNetwork(null);

    const { password: _, ...userWithoutPassword } = user;
    return simulateNetwork({ ...userWithoutPassword, password: '' } as User);
  },

  async listAll(): Promise<User[]> {
    const db = getDatabase();
    const users = db.users.filter((u) => !u.deletedAt);
    return simulateNetwork(users.map(u => {
      const { password: _, ...userWithoutPassword } = u;
      return { ...userWithoutPassword, password: '' } as User;
    }));
  },

  async deleteUser(id: string): Promise<boolean> {
    const db = getDatabase();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) return simulateNetwork(false);
    db.users[index].deletedAt = getCurrentTimestamp();
    addAuditLog(db, 'DELETE', 'user', id, `Kullanıcı silindi: ${db.users[index].name}`);
    saveDatabase(db);
    return simulateNetwork(true);
  },

  async updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'password'>>): Promise<User | null> {
    const db = getDatabase();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) return simulateNetwork(null);
    db.users[index] = { ...db.users[index], ...data, updatedAt: getCurrentTimestamp() };
    addAuditLog(db, 'UPDATE', 'user', id, `Kullanıcı güncellendi: ${db.users[index].name}`);
    saveDatabase(db);
    const { password: _, ...userWithoutPassword } = db.users[index];
    return simulateNetwork({ ...userWithoutPassword, password: '' } as User);
  },
};

// ============================================
// USER API (Eski - geriye uyumluluk)
// ============================================
export const userApi = {
  async getCurrentUser(role: 'agency' | 'restaurant' | 'customer'): Promise<User | null> {
    const db = getDatabase();
    const user = db.users.find((u) => u.role === role && !u.deletedAt);
    return simulateNetwork(user || null);
  },

  async list(): Promise<User[]> {
    const db = getDatabase();
    return simulateNetwork(db.users.filter((u) => !u.deletedAt));
  },
};

// ============================================
// RESTAURANT API - Ek metodlar
// ============================================
export const restaurantListApi = {
  async listAll(): Promise<Restaurant[]> {
    const db = getDatabase();
    return simulateNetwork(db.restaurants.filter((r) => !r.deletedAt));
  },
};

// Alias for preReservationApi
export const preReservationRequestApi = preReservationApi;
