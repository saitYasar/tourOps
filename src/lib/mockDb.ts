// ============================================
// Mock Database - localStorage tabanlı
// ============================================

import { v4 as uuidv4 } from 'uuid';
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
} from '@/types';

const STORAGE_KEY = 'tourops_db';
const SEED_VERSION = '3.3.0'; // Tur fotoğrafı özelliği eklendi
const SEED_VERSION_KEY = 'tourops_seed_version';

// ============================================
// Database Schema
// ============================================
export interface Database {
  regions: Region[];
  tours: Tour[];
  restaurants: Restaurant[];
  preReservationRequests: PreReservationRequest[];
  floors: Floor[];
  rooms: Room[];
  tables: Table[];
  chairs: Chair[];
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  customers: Customer[];
  tourAssignments: TourAssignment[];
  customerSelections: CustomerSelection[];
  auditLogs: AuditLog[];
  users: User[];
}

// ============================================
// Seed Data Generator
// ============================================
function generateId(): string {
  return uuidv4();
}

function now(): string {
  return new Date().toISOString();
}

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

// Istanbul merkez koordinatları etrafında rastgele nokta
function randomLatLng(centerLat = 41.0082, centerLng = 28.9784, radiusKm = 15): LatLng {
  const radiusInDegree = radiusKm / 111;
  const lat = centerLat + (Math.random() - 0.5) * 2 * radiusInDegree;
  const lng = centerLng + (Math.random() - 0.5) * 2 * radiusInDegree;
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

function generateSeedData(): Database {
  const timestamp = now();

  // ============================================
  // Regions (10 bölge)
  // ============================================
  const regionNames = [
    'Sultanahmet', 'Beyoglu', 'Kadikoy', 'Besiktas', 'Uskudar',
    'Sisli', 'Bakirkoy', 'Fatih', 'Sariyer', 'Bebek'
  ];

  const regions: Region[] = regionNames.map((name, i) => ({
    id: generateId(),
    name,
    description: `${name} bölgesi - Istanbul'un en güzel yerlerinden biri`,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  // ============================================
  // Restaurants (12 restoran)
  // ============================================
  const restaurantData = [
    { name: 'Tarihi Sultanahmet Koftecisi', region: 0 },
    { name: 'Pandeli', region: 0 },
    { name: 'Mikla Restaurant', region: 1 },
    { name: '360 Istanbul', region: 1 },
    { name: 'Ciya Sofrasi', region: 2 },
    { name: 'Borsam Tasfirin', region: 2 },
    { name: 'Sunset Grill', region: 4 },
    { name: 'Lucca', region: 3 },
    { name: 'Nicole Restaurant', region: 5 },
    { name: 'Nusr-Et Steakhouse', region: 3 },
    { name: 'Karakoy Lokantasi', region: 1 },
    { name: 'Asitane', region: 7 },
  ];

  const restaurants: Restaurant[] = restaurantData.map((r, i) => ({
    id: generateId(),
    name: r.name,
    description: `${r.name} - Enfes lezzetler sunan ozel bir mekan`,
    address: `${regionNames[r.region]} Mah. Ornek Sok. No:${i + 1}`,
    phone: `0212 ${100 + i} ${20 + i} ${30 + i}`,
    email: `info@${r.name.toLowerCase().replace(/\s+/g, '')}.com`,
    location: randomLatLng(),
    regionId: regions[r.region].id,
    photoUrl: `https://picsum.photos/seed/restaurant${i}/400/300`,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  // ============================================
  // Tours (10 tur)
  // ============================================
  const tourNames = [
    'Istanbul Tarihi Yarimada Turu',
    'Bogazici Sahil Turu',
    'Gastronomi Turu - Anadolu',
    'Sanat ve Kultur Gezisi',
    'Gece Istanbul Turu',
    'Osmanli Mutfagi Kesfi',
    'Modern Istanbul Deneyimi',
    'Sokak Lezzetleri Turu',
    'Romantik Bogaz Turu',
    'Aile Dostu Hafta Sonu',
  ];

  // Tur fotoğrafları
  const tourPhotos = [
    'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800', // Sultanahmet
    'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800', // Boğaz
    'https://images.unsplash.com/photo-1567529692333-de9fd6772897?w=800', // Yemek
    'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800', // Sanat
    'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800', // Gece
    'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800', // Mutfak
    'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=800', // Modern
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', // Sokak yemek
    'https://images.unsplash.com/photo-1549877452-9c387954fbc2?w=800', // Romantik
    'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800', // Aile
  ];

  const tours: Tour[] = tourNames.map((name, i) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + i * 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2);

    // Rastgele rota noktaları
    const routePoints: LatLng[] = [];
    let currentLat = 41.0082;
    let currentLng = 28.9784;
    for (let j = 0; j < 5 + Math.floor(Math.random() * 3); j++) {
      currentLat += (Math.random() - 0.5) * 0.02;
      currentLng += (Math.random() - 0.5) * 0.02;
      routePoints.push({ lat: Number(currentLat.toFixed(6)), lng: Number(currentLng.toFixed(6)) });
    }

    return {
      id: generateId(),
      name,
      description: `${name} - Unutulmaz bir deneyim icin size ozel hazirlandi`,
      regionId: regions[i % regions.length].id,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      capacity: 20 + Math.floor(Math.random() * 30),
      status: i < 7 ? 'Published' : 'Draft',
      route: routePoints,
      stops: [],
      photoUrl: tourPhotos[i],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  // ============================================
  // PreReservationRequests
  // ============================================
  const preReservationRequests: PreReservationRequest[] = [];

  // Her tura rastgele restoran istekleri ekle
  for (let i = 0; i < 15; i++) {
    const tour = tours[i % tours.length];
    const restaurant = restaurants[i % restaurants.length];
    const statuses: Array<'Pending' | 'Approved' | 'Rejected'> = ['Pending', 'Approved', 'Rejected'];

    preReservationRequests.push({
      id: generateId(),
      tourId: tour.id,
      restaurantId: restaurant.id,
      headcount: 15 + Math.floor(Math.random() * 35),
      date: tour.startDate,
      timeStart: `${12 + Math.floor(Math.random() * 4)}:00`,
      timeEnd: `${16 + Math.floor(Math.random() * 4)}:00`,
      status: statuses[i % 3],
      note: i % 2 === 0 ? 'Pencere kenari tercih edilir' : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // "Sanat ve Kultur Gezisi" (index 3) turuna ek onaylı restoranlar ekle
  const sanatTour = tours[3];
  if (sanatTour) {
    // Mikla Restaurant, 360 Istanbul, Karakoy Lokantasi, Nicole Restaurant
    const additionalRestaurants = [restaurants[2], restaurants[3], restaurants[10], restaurants[8]];
    additionalRestaurants.forEach((restaurant, idx) => {
      if (restaurant && !preReservationRequests.some(r => r.tourId === sanatTour.id && r.restaurantId === restaurant.id)) {
        preReservationRequests.push({
          id: generateId(),
          tourId: sanatTour.id,
          restaurantId: restaurant.id,
          headcount: 20 + Math.floor(Math.random() * 20),
          date: sanatTour.startDate,
          timeStart: `${12 + idx}:00`,
          timeEnd: `${15 + idx}:00`,
          status: 'Approved',
          note: idx === 0 ? 'VIP masa tercih edilir' : undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    });
  }

  // ============================================
  // Venue: Floors, Rooms, Tables, Chairs
  // ============================================
  const floors: Floor[] = [];
  const rooms: Room[] = [];
  const tables: Table[] = [];
  const chairs: Chair[] = [];

  restaurants.forEach((restaurant, ri) => {
    // Her restorana 1-2 kat
    const floorCount = 1 + Math.floor(Math.random() * 2);
    for (let fi = 0; fi < floorCount; fi++) {
      const floor: Floor = {
        id: generateId(),
        restaurantId: restaurant.id,
        name: fi === 0 ? 'Zemin Kat' : `${fi}. Kat`,
        order: fi,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      floors.push(floor);

      // Her kata 1-3 oda
      const roomCount = 1 + Math.floor(Math.random() * 3);
      for (let roi = 0; roi < roomCount; roi++) {
        const roomNames = ['Ana Salon', 'VIP Bolum', 'Teras', 'Bahce', 'Ozel Oda'];
        const room: Room = {
          id: generateId(),
          floorId: floor.id,
          restaurantId: restaurant.id,
          name: roomNames[roi % roomNames.length],
          order: roi,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        rooms.push(room);

        // Her odaya 3-8 masa
        const tableCount = 3 + Math.floor(Math.random() * 6);
        for (let ti = 0; ti < tableCount; ti++) {
          const tableCapacity = [2, 4, 6, 8][Math.floor(Math.random() * 4)];
          // İlk 2 masa cam kenarı olsun (her odada)
          const isWindowSide = ti < 2;
          const table: Table = {
            id: generateId(),
            roomId: room.id,
            restaurantId: restaurant.id,
            name: `Masa ${ti + 1}`,
            capacity: tableCapacity,
            order: ti,
            isWindowSide,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          tables.push(table);

          // Her masaya sandalyeler
          for (let ci = 0; ci < tableCapacity; ci++) {
            chairs.push({
              id: generateId(),
              tableId: table.id,
              restaurantId: restaurant.id,
              number: ci + 1,
              createdAt: timestamp,
              updatedAt: timestamp,
            });
          }
        }
      }
    }
  });

  // ============================================
  // Menu: Categories and Items
  // ============================================
  const menuCategories: MenuCategory[] = [];
  const menuItems: MenuItem[] = [];

  // İçindekiler bilgisi ile menü şablonları
  const categoryTemplates = [
    {
      name: 'Corbalar',
      items: [
        { name: 'Mercimek Corbasi', ingredients: ['Kırmızı mercimek', 'Soğan', 'Havuç', 'Tereyağı', 'Pul biber'] },
        { name: 'Ezogelin Corbasi', ingredients: ['Kırmızı mercimek', 'Bulgur', 'Soğan', 'Domates salçası', 'Nane'] },
        { name: 'Yayla Corbasi', ingredients: ['Yoğurt', 'Pirinç', 'Yumurta', 'Nane', 'Tereyağı'] },
        { name: 'Tavuk Suyu Corbasi', ingredients: ['Tavuk', 'Havuç', 'Şehriye', 'Soğan', 'Limon'] },
      ]
    },
    {
      name: 'Baslangiclar',
      items: [
        { name: 'Humus', ingredients: ['Nohut', 'Tahin', 'Sarımsak', 'Limon', 'Zeytinyağı'] },
        { name: 'Patlican Salatasi', ingredients: ['Patlıcan', 'Sarımsak', 'Yoğurt', 'Zeytinyağı', 'Tuz'] },
        { name: 'Atom', ingredients: ['Acı biber', 'Domates', 'Sarımsak', 'Ceviz', 'Nar ekşisi'] },
        { name: 'Haydari', ingredients: ['Süzme yoğurt', 'Sarımsak', 'Dereotu', 'Zeytinyağı', 'Nane'] },
        { name: 'Cacik', ingredients: ['Yoğurt', 'Salatalık', 'Sarımsak', 'Dereotu', 'Nane'] },
      ]
    },
    {
      name: 'Ana Yemekler',
      items: [
        { name: 'Adana Kebap', ingredients: ['Dana kıyma', 'Kuyruk yağı', 'Pul biber', 'Soğan', 'Maydanoz'] },
        { name: 'Urfa Kebap', ingredients: ['Dana kıyma', 'Kuyruk yağı', 'Karabiber', 'Soğan', 'Maydanoz'] },
        { name: 'Kuzu Tandir', ingredients: ['Kuzu eti', 'Soğan', 'Sarımsak', 'Defne yaprağı', 'Karabiber'] },
        { name: 'Kofte', ingredients: ['Dana kıyma', 'Soğan', 'Ekmek içi', 'Maydanoz', 'Kimyon'] },
        { name: 'Piliç Izgara', ingredients: ['Tavuk göğsü', 'Zeytinyağı', 'Sarımsak', 'Kekik', 'Limon'] },
      ]
    },
    {
      name: 'Tatlilar',
      items: [
        { name: 'Baklava', ingredients: ['Yufka', 'Ceviz', 'Tereyağı', 'Şeker', 'Limon'] },
        { name: 'Kunefe', ingredients: ['Kadayıf', 'Peynir', 'Tereyağı', 'Şerbet', 'Antep fıstığı'] },
        { name: 'Sutlac', ingredients: ['Süt', 'Pirinç', 'Şeker', 'Vanilin', 'Tarçın'] },
        { name: 'Kazandibi', ingredients: ['Süt', 'Tavuk göğsü', 'Şeker', 'Pirinç unu', 'Vanilin'] },
        { name: 'Asure', ingredients: ['Buğday', 'Nohut', 'Kuru fasulye', 'Kuru kayısı', 'Ceviz'] },
      ]
    },
    {
      name: 'Icecekler',
      items: [
        { name: 'Ayran', ingredients: ['Yoğurt', 'Su', 'Tuz'] },
        { name: 'Salgam', ingredients: ['Şalgam', 'Havuç', 'Tuz', 'Acı biber'] },
        { name: 'Limonata', ingredients: ['Limon', 'Şeker', 'Su', 'Nane'] },
        { name: 'Turk Kahvesi', ingredients: ['Türk kahvesi', 'Su', 'Şeker'] },
        { name: 'Cay', ingredients: ['Çay', 'Su'] },
      ]
    },
  ];

  restaurants.forEach((restaurant) => {
    categoryTemplates.forEach((catTemplate, ci) => {
      const category: MenuCategory = {
        id: generateId(),
        restaurantId: restaurant.id,
        name: catTemplate.name,
        order: ci,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      menuCategories.push(category);

      catTemplate.items.forEach((item, ii) => {
        menuItems.push({
          id: generateId(),
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: item.name,
          description: `Ozenle hazirlanan ${item.name.toLowerCase()}`,
          price: 50 + Math.floor(Math.random() * 150),
          photoUrl: `https://picsum.photos/seed/${item.name.replace(/\s+/g, '')}${restaurant.id.slice(0,4)}/200/150`,
          isActive: Math.random() > 0.1,
          order: ii,
          ingredients: item.ingredients,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      });
    });
  });

  // ============================================
  // Customers (15 müşteri)
  // ============================================
  const customerNames = [
    'Ahmet Yilmaz', 'Mehmet Demir', 'Ayse Kaya', 'Fatma Celik', 'Ali Ozturk',
    'Zeynep Arslan', 'Mustafa Dogan', 'Elif Sahin', 'Hasan Yildiz', 'Emine Aydin',
    'Huseyin Polat', 'Hatice Erdogan', 'Ibrahim Koc', 'Meryem Kurt', 'Omer Ozdemir',
  ];

  const customers: Customer[] = customerNames.map((name, i) => ({
    id: generateId(),
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@email.com`,
    phone: `0532 ${100 + i} ${20 + i} ${30 + i}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  // ============================================
  // TourAssignments (her tura 3-5 müşteri)
  // ============================================
  const tourAssignments: TourAssignment[] = [];
  tours.forEach((tour) => {
    const assignCount = 3 + Math.floor(Math.random() * 3);
    const shuffled = [...customers].sort(() => Math.random() - 0.5);
    for (let i = 0; i < assignCount; i++) {
      tourAssignments.push({
        id: generateId(),
        tourId: tour.id,
        customerId: shuffled[i].id,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  });

  // ============================================
  // CustomerSelections (örnek seçimler)
  // ============================================
  const customerSelections: CustomerSelection[] = [];

  // ============================================
  // Users (mock kullanıcılar)
  // ============================================
  const users: User[] = [
    {
      id: generateId(),
      name: 'Sistem Yoneticisi',
      email: 'admin@tourops.com',
      password: '123456',
      role: 'admin',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: generateId(),
      name: 'Acente Admin',
      email: 'acente@tourops.com',
      password: '123456',
      role: 'agency',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: generateId(),
      name: 'Restoran Yoneticisi',
      email: 'restoran@tourops.com',
      password: '123456',
      role: 'restaurant',
      restaurantId: restaurants[0].id,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: generateId(),
      name: customers[0].name,
      email: customers[0].email,
      password: '123456',
      role: 'customer',
      customerId: customers[0].id,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  // ============================================
  // Audit Logs
  // ============================================
  const auditLogs: AuditLog[] = [
    {
      id: generateId(),
      timestamp,
      action: 'SEED_DATA_CREATED',
      entityType: 'system',
      entityId: 'system',
      details: 'Sistem başlatıldı ve örnek veriler oluşturuldu',
    },
  ];

  return {
    regions,
    tours,
    restaurants,
    preReservationRequests,
    floors,
    rooms,
    tables,
    chairs,
    menuCategories,
    menuItems,
    customers,
    tourAssignments,
    customerSelections,
    auditLogs,
    users,
  };
}

// ============================================
// Database Operations
// ============================================

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getDatabase(): Database {
  if (!isBrowser()) {
    return generateSeedData();
  }

  const storedVersion = localStorage.getItem(SEED_VERSION_KEY);
  const stored = localStorage.getItem(STORAGE_KEY);

  // Versiyon değişmişse veya veri yoksa seed data oluştur
  if (storedVersion !== SEED_VERSION || !stored) {
    const seedData = generateSeedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    return seedData;
  }

  try {
    return JSON.parse(stored) as Database;
  } catch {
    const seedData = generateSeedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    return seedData;
  }
}

export function saveDatabase(db: Database): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetDatabase(): Database {
  if (!isBrowser()) return generateSeedData();
  const seedData = generateSeedData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
  localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
  return seedData;
}

// ============================================
// Audit Log Helper
// ============================================
export function addAuditLog(
  db: Database,
  action: string,
  entityType: string,
  entityId: string,
  details?: string
): void {
  const log: AuditLog = {
    id: generateId(),
    timestamp: now(),
    action,
    entityType,
    entityId,
    details,
  };

  db.auditLogs.unshift(log);

  // Son 50 logu tut
  if (db.auditLogs.length > 50) {
    db.auditLogs = db.auditLogs.slice(0, 50);
  }
}

// ============================================
// Generic CRUD Helpers
// ============================================
export function generateEntityId(): string {
  return generateId();
}

export function getCurrentTimestamp(): string {
  return now();
}
