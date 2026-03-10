'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Building2, DoorOpen, Armchair, Users, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Floor, Room, Table } from '@/types';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════
const SLAB_H = 0.18;
const WALL_H = 2.4;
const FLOOR_GAP = WALL_H + SLAB_H; // katlar duvar üstüne oturur — bina bütünlüğü
const ROOM_FLOOR_H = 0.06;
const WALL_T = 0.07;
const TABLE_H = 0.6;
const TABLE_TOP_T = 0.05;
const LEG_R = 0.03;
const CHAIR_SZ = 0.22;
const CHAIR_BACK = 0.3;
const ANIM = 4.5;
const ROOF_H = 1.4;
const ROOF_OVERHANG = 0.5;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4'];
const SLAB_CLR = '#c8cdd3';
const WALL_BASE_CLR = '#e8e0d8';
const WOOD = '#8B6F47';
const WOOD_DARK = '#5C4033';
const CHAIR_CLR = '#6B4C35';
const SEL_CLR = '#3b82f6';
const WIN_CLR = '#a5d8ff';
const ROOF_CLR = '#7c8a99';

// ═══════════════════════════════════════════════════════════
// Demo data
// ═══════════════════════════════════════════════════════════
const now = '2024-01-01T00:00:00Z';
const demoId = (n: number) => `demo-${n}`;

function getDemoData() {
  const floors: Floor[] = [
    { id: demoId(1), name: 'Zemin Kat', order: 0, restaurantId: '1', createdAt: now, updatedAt: now },
    { id: demoId(2), name: '1. Kat', order: 1, restaurantId: '1', createdAt: now, updatedAt: now },
    { id: demoId(3), name: '2. Kat', order: 2, restaurantId: '1', createdAt: now, updatedAt: now },
  ];

  const rooms: Room[] = [
    // Zemin Kat — 4 oda
    { id: demoId(10), floorId: demoId(1), name: 'Ana Salon', order: 0, restaurantId: '1', createdAt: now, updatedAt: now, x: 50, y: 50, width: 550, height: 400 },
    { id: demoId(11), floorId: demoId(1), name: 'Bahçe', order: 1, restaurantId: '1', createdAt: now, updatedAt: now, x: 650, y: 50, width: 350, height: 300 },
    { id: demoId(12), floorId: demoId(1), name: 'Bar', order: 2, restaurantId: '1', createdAt: now, updatedAt: now, x: 650, y: 400, width: 350, height: 200 },
    { id: demoId(13), floorId: demoId(1), name: 'Lobi', order: 3, restaurantId: '1', createdAt: now, updatedAt: now, x: 50, y: 500, width: 550, height: 150 },
    // 1. Kat — 3 oda
    { id: demoId(20), floorId: demoId(2), name: 'VIP Salon', order: 0, restaurantId: '1', createdAt: now, updatedAt: now, x: 50, y: 50, width: 480, height: 350 },
    { id: demoId(21), floorId: demoId(2), name: 'Teras', order: 1, restaurantId: '1', createdAt: now, updatedAt: now, x: 580, y: 50, width: 420, height: 250 },
    { id: demoId(22), floorId: demoId(2), name: 'Toplantı Odası', order: 2, restaurantId: '1', createdAt: now, updatedAt: now, x: 580, y: 350, width: 420, height: 300 },
    // 2. Kat — 2 oda
    { id: demoId(30), floorId: demoId(3), name: 'Çatı Salonu', order: 0, restaurantId: '1', createdAt: now, updatedAt: now, x: 50, y: 50, width: 600, height: 400 },
    { id: demoId(31), floorId: demoId(3), name: 'Lounge', order: 1, restaurantId: '1', createdAt: now, updatedAt: now, x: 700, y: 50, width: 300, height: 400 },
  ];

  // Helper: grid of tables inside a room
  const mkTables = (roomId: string, rx: number, ry: number, rw: number, rh: number, count: number, startId: number): Table[] => {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const marginX = rw * 0.12;
    const marginY = rh * 0.12;
    const cellW = (rw - 2 * marginX) / cols;
    const cellH = (rh - 2 * marginY) / rows;
    return Array.from({ length: count }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cap = i % 3 === 0 ? 2 : i % 3 === 1 ? 4 : 6;
      return {
        id: demoId(startId + i),
        roomId,
        name: `Masa ${i + 1}`,
        capacity: cap,
        order: i,
        restaurantId: '1',
        createdAt: now,
        updatedAt: now,
        x: rx + marginX + col * cellW + cellW / 2,
        y: ry + marginY + row * cellH + cellH / 2,
        w: cap <= 2 ? 40 : cap <= 4 ? 55 : 70,
        h: cap <= 2 ? 40 : 40,
        rotation: i % 5 === 0 ? 45 : 0,
        isWindowSide: i % 7 === 0,
      };
    });
  };

  const tables: Table[] = [
    // Zemin Kat
    ...mkTables(demoId(10), 50, 50, 550, 400, 10, 100),   // Ana Salon: 10 masa
    ...mkTables(demoId(11), 650, 50, 350, 300, 6, 120),    // Bahçe: 6 masa
    ...mkTables(demoId(12), 650, 400, 350, 200, 4, 130),   // Bar: 4 masa
    ...mkTables(demoId(13), 50, 500, 550, 150, 5, 140),    // Lobi: 5 masa
    // 1. Kat
    ...mkTables(demoId(20), 50, 50, 480, 350, 8, 200),     // VIP: 8 masa
    ...mkTables(demoId(21), 580, 50, 420, 250, 6, 220),    // Teras: 6 masa
    ...mkTables(demoId(22), 580, 350, 420, 300, 6, 230),   // Toplantı: 6 masa
    // 2. Kat
    ...mkTables(demoId(30), 50, 50, 600, 400, 8, 300),     // Çatı: 8 masa
    ...mkTables(demoId(31), 700, 50, 300, 400, 4, 320),    // Lounge: 4 masa
  ];

  const objects: VenueObject[] = [
    // Zemin Kat — Ana Salon: pencereler + duvar
    { id: demoId(500), name: 'Cam Kenarı-500', kind: 'window', roomId: demoId(10), x: 50 + 275, y: 50, w: 500, h: 12, rotation: 0 },
    { id: demoId(501), name: 'Cam Kenarı-501', kind: 'window', roomId: demoId(10), x: 50, y: 50 + 200, w: 12, h: 350, rotation: 0 },
    { id: demoId(502), name: 'Duvar-502', kind: 'wall', roomId: demoId(10), x: 50 + 550, y: 50 + 200, w: 14, h: 200, rotation: 0 },
    { id: demoId(503), name: 'Kolon-503', kind: 'column', roomId: demoId(10), x: 50 + 275, y: 50 + 200, w: 24, h: 24, rotation: 0 },
    // Bahçe: pencereler
    { id: demoId(510), name: 'Cam Kenarı-510', kind: 'window', roomId: demoId(11), x: 650 + 175, y: 50, w: 300, h: 12, rotation: 0 },
    { id: demoId(511), name: 'Cam Kenarı-511', kind: 'window', roomId: demoId(11), x: 650 + 350, y: 50 + 150, w: 12, h: 250, rotation: 0 },
    // Bar: duvar + serbest obje (bar tezgahı)
    { id: demoId(520), name: 'Duvar-520', kind: 'wall', roomId: demoId(12), x: 650, y: 400 + 100, w: 14, h: 180, rotation: 0 },
    { id: demoId(521), name: 'Bar Tezgahı-521', kind: 'free', color: '#78350f', roomId: demoId(12), x: 650 + 175, y: 400 + 170, w: 280, h: 30, rotation: 0 },
    // Lobi: duvar + kolon
    { id: demoId(530), name: 'Duvar-530', kind: 'wall', roomId: demoId(13), x: 50 + 275, y: 500, w: 500, h: 14, rotation: 0 },
    { id: demoId(531), name: 'Kolon-531', kind: 'column', roomId: demoId(13), x: 50 + 140, y: 500 + 75, w: 24, h: 24, rotation: 0 },
    { id: demoId(532), name: 'Kolon-532', kind: 'column', roomId: demoId(13), x: 50 + 410, y: 500 + 75, w: 24, h: 24, rotation: 0 },
    // 1. Kat — VIP: pencereler + duvarlar
    { id: demoId(600), name: 'Cam Kenarı-600', kind: 'window', roomId: demoId(20), x: 50 + 240, y: 50, w: 430, h: 12, rotation: 0 },
    { id: demoId(601), name: 'Duvar-601', kind: 'wall', roomId: demoId(20), x: 50, y: 50 + 175, w: 14, h: 300, rotation: 0 },
    { id: demoId(602), name: 'Kolon-602', kind: 'column', roomId: demoId(20), x: 50 + 240, y: 50 + 175, w: 26, h: 26, rotation: 0 },
    // Teras: pencereler (3 taraf)
    { id: demoId(610), name: 'Cam Kenarı-610', kind: 'window', roomId: demoId(21), x: 580 + 210, y: 50, w: 380, h: 12, rotation: 0 },
    { id: demoId(611), name: 'Cam Kenarı-611', kind: 'window', roomId: demoId(21), x: 580 + 420, y: 50 + 125, w: 12, h: 200, rotation: 0 },
    { id: demoId(612), name: 'Cam Kenarı-612', kind: 'window', roomId: demoId(21), x: 580 + 210, y: 50 + 250, w: 380, h: 12, rotation: 0 },
    // Toplantı: duvar + serbest obje (projeksiyon)
    { id: demoId(620), name: 'Duvar-620', kind: 'wall', roomId: demoId(22), x: 580, y: 350 + 150, w: 14, h: 260, rotation: 0 },
    { id: demoId(621), name: 'Projeksiyon-621', kind: 'free', color: '#1e293b', roomId: demoId(22), x: 580 + 210, y: 350, w: 200, h: 10, rotation: 0 },
    // 2. Kat — Çatı: büyük pencereler
    { id: demoId(700), name: 'Cam Kenarı-700', kind: 'window', roomId: demoId(30), x: 50 + 300, y: 50, w: 550, h: 12, rotation: 0 },
    { id: demoId(701), name: 'Cam Kenarı-701', kind: 'window', roomId: demoId(30), x: 50 + 600, y: 50 + 200, w: 12, h: 350, rotation: 0 },
    { id: demoId(702), name: 'Duvar-702', kind: 'wall', roomId: demoId(30), x: 50, y: 50 + 200, w: 14, h: 350, rotation: 0 },
    { id: demoId(703), name: 'Kolon-703', kind: 'column', roomId: demoId(30), x: 50 + 200, y: 50 + 200, w: 28, h: 28, rotation: 0 },
    { id: demoId(704), name: 'Kolon-704', kind: 'column', roomId: demoId(30), x: 50 + 400, y: 50 + 200, w: 28, h: 28, rotation: 0 },
    // Lounge: cam + serbest obje (şömine)
    { id: demoId(710), name: 'Cam Kenarı-710', kind: 'window', roomId: demoId(31), x: 700 + 300, y: 50 + 200, w: 12, h: 350, rotation: 0 },
    { id: demoId(711), name: 'Şömine-711', kind: 'free', color: '#991b1b', roomId: demoId(31), x: 700 + 150, y: 50 + 380, w: 80, h: 40, rotation: 0 },
  ];

  return { floors, rooms, tables, objects };
}

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
// Venue object (structural element from layout editor)
type VenueObjectKind = 'window' | 'wall' | 'column' | 'free';

interface VenueObject {
  id: string;
  name: string;
  kind: VenueObjectKind;
  color?: string;
  roomId: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
}

interface VenueModel3DProps {
  floors: Floor[];
  rooms: Room[];
  tables: Table[];
  objects?: VenueObject[];
  onTableClick?: (table: Table) => void;
  onRoomClick?: (room: Room) => void;
  onFloorSelect?: (floorId: string) => void;
  onRoomSelect?: (roomId: string) => void;
  onTableSelect?: (tableId: string) => void;
  selectedTableId?: string | null;
}

type ViewMode = 'building' | 'floor' | 'room';

interface ObjLayout3D {
  obj: VenueObject;
  cx: number; cz: number;
  w: number; d: number;
  rot: number;
}
interface TableLayout3D {
  table: Table;
  cx: number; cz: number;
  w: number; d: number;
  rot: number; isRound: boolean;
}
interface RoomLayout3D {
  room: Room; color: string;
  cx: number; cz: number;
  w: number; d: number;
  tables: TableLayout3D[];
  objects: ObjLayout3D[];
}
interface FloorLayout3D {
  floor: Floor;
  rooms: RoomLayout3D[];
  slabW: number; slabD: number;
  baseY: number;
}

// ═══════════════════════════════════════════════════════════
// Layout computation
// ═══════════════════════════════════════════════════════════
function computeLayout(floors: Floor[], rooms: Room[], tables: Table[], objects: VenueObject[] = []): FloorLayout3D[] {
  const sorted = [...floors].sort((a, b) => a.order - b.order);

  const rawLayouts = sorted.map((floor, fi) => {
    const fRooms = rooms.filter(r => r.floorId === floor.id).sort((a, b) => a.order - b.order);
    const hasCoords = fRooms.some(r => r.width != null && r.height != null && ((r.width ?? 0) > 0));

    let roomLayouts: RoomLayout3D[];
    if (hasCoords && fRooms.length > 0) {
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (const r of fRooms) {
        minX = Math.min(minX, r.x ?? 0);
        minZ = Math.min(minZ, r.y ?? 0);
        maxX = Math.max(maxX, (r.x ?? 0) + (r.width ?? 150));
        maxZ = Math.max(maxZ, (r.y ?? 0) + (r.height ?? 100));
      }
      const totalW = maxX - minX || 1;
      const totalH = maxZ - minZ || 1;
      const scale = 10 / Math.max(totalW, totalH);
      const offX = (minX + maxX) / 2;
      const offZ = (minZ + maxZ) / 2;

      roomLayouts = fRooms.map((room, ri) => {
        const rw = (room.width ?? 150) * scale;
        const rd = (room.height ?? 100) * scale;
        const cx = ((room.x ?? 0) + (room.width ?? 150) / 2 - offX) * scale;
        const cz = ((room.y ?? 0) + (room.height ?? 100) / 2 - offZ) * scale;
        const rTables = tables.filter(t => t.roomId === room.id).sort((a, b) => a.order - b.order);
        const hasTC = rTables.some(t => t.x != null && t.y != null && (t.x !== 0 || t.y !== 0));
        let tLayouts: TableLayout3D[];
        if (hasTC) {
          const rcx = (room.x ?? 0) + (room.width ?? 150) / 2;
          const rcz = (room.y ?? 0) + (room.height ?? 100) / 2;
          tLayouts = rTables.map(t => ({
            table: t,
            cx: ((t.x ?? 0) - rcx) * scale,
            cz: ((t.y ?? 0) - rcz) * scale,
            w: Math.max(0.3, (t.w ?? (t.capacity <= 2 ? 40 : 60)) * scale),
            d: Math.max(0.3, (t.h ?? 40) * scale),
            rot: t.rotation ?? 0,
            isRound: t.capacity <= 2,
          }));
        } else {
          tLayouts = autoTables(rTables, rw, rd);
        }
        // Objects in this room
        const rObjs = objects.filter(o => o.roomId === room.id);
        const rcx2 = (room.x ?? 0) + (room.width ?? 150) / 2;
        const rcz2 = (room.y ?? 0) + (room.height ?? 100) / 2;
        const oLayouts: ObjLayout3D[] = rObjs.map(o => ({
          obj: o,
          cx: ((o.x ?? 0) - rcx2) * scale,
          cz: ((o.y ?? 0) - rcz2) * scale,
          w: Math.max(0.1, (o.w ?? 60) * scale),
          d: Math.max(0.1, (o.h ?? 14) * scale),
          rot: o.rotation ?? 0,
        }));
        return { room, color: COLORS[ri % COLORS.length], cx, cz, w: rw, d: rd, tables: tLayouts, objects: oLayouts };
      });
    } else {
      // Auto-grid with varied room shapes
      const cols = Math.max(1, Math.ceil(Math.sqrt(fRooms.length)));
      const gap = 0.5;
      // Varied room dimensions — some wider, some deeper
      const shapes = fRooms.map((_, ri) => {
        const base = 2.8;
        const ratios = [1.5, 0.85, 1.15, 1.7, 1.0, 1.35];
        const r = ratios[ri % ratios.length];
        return { w: base * Math.sqrt(r), d: base / Math.sqrt(r) };
      });
      const maxCellW = Math.max(...shapes.map(s => s.w)) + gap;
      const maxCellD = Math.max(...shapes.map(s => s.d)) + gap;

      roomLayouts = fRooms.map((room, ri) => {
        const col = ri % cols;
        const row = Math.floor(ri / cols);
        const totalRows = Math.ceil(fRooms.length / cols);
        const cx = (col - (cols - 1) / 2) * maxCellW;
        const cz = (row - (totalRows - 1) / 2) * maxCellD;
        const { w, d } = shapes[ri];
        const rTables = tables.filter(t => t.roomId === room.id).sort((a, b) => a.order - b.order);
        const rObjs = objects.filter(o => o.roomId === room.id);
        // Auto-layout objects along the edge
        const oLayouts: ObjLayout3D[] = rObjs.map((o, oi) => ({
          obj: o,
          cx: -w / 2 + 0.15,
          cz: -d / 2 + 0.15 + oi * 0.35,
          w: Math.min(w * 0.8, 0.6),
          d: 0.08,
          rot: o.rotation ?? 0,
        }));
        return { room, color: COLORS[ri % COLORS.length], cx, cz, w, d, tables: autoTables(rTables, w, d), objects: oLayouts };
      });
    }

    // Compute slab from room bounding box
    let slabW = 5, slabD = 5;
    if (roomLayouts.length > 0) {
      let mnX = Infinity, mnZ = Infinity, mxX = -Infinity, mxZ = -Infinity;
      for (const rl of roomLayouts) {
        mnX = Math.min(mnX, rl.cx - rl.w / 2);
        mnZ = Math.min(mnZ, rl.cz - rl.d / 2);
        mxX = Math.max(mxX, rl.cx + rl.w / 2);
        mxZ = Math.max(mxZ, rl.cz + rl.d / 2);
      }
      slabW = mxX - mnX + 2;
      slabD = mxZ - mnZ + 2;
    }

    return { floor, rooms: roomLayouts, slabW, slabD, baseY: fi * FLOOR_GAP };
  });

  // Normalize all slabs to same size
  const maxW = Math.max(...rawLayouts.map(f => f.slabW), 5);
  const maxD = Math.max(...rawLayouts.map(f => f.slabD), 5);
  return rawLayouts.map(f => ({ ...f, slabW: maxW, slabD: maxD }));
}

function autoTables(tbls: Table[], rw: number, rd: number): TableLayout3D[] {
  if (!tbls.length) return [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(tbls.length)));
  const rows = Math.ceil(tbls.length / cols);
  const cW = (rw - 0.8) / cols;
  const cD = (rd - 0.8) / rows;
  return tbls.map((t, i) => {
    const isRound = t.capacity <= 2;
    const base = Math.min(cW * 0.4, cD * 0.4, 0.5);
    return {
      table: t,
      cx: (i % cols - (cols - 1) / 2) * cW,
      cz: (Math.floor(i / cols) - (rows - 1) / 2) * cD,
      w: isRound ? base : base * 1.3,
      d: base,
      rot: 0,
      isRound,
    };
  });
}

// ═══════════════════════════════════════════════════════════
// 3D Components
// ═══════════════════════════════════════════════════════════

function Chair3D({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, TABLE_H * 0.5, 0]} castShadow>
        <boxGeometry args={[CHAIR_SZ, 0.04, CHAIR_SZ]} />
        <meshStandardMaterial color={CHAIR_CLR} roughness={0.8} />
      </mesh>
      <mesh position={[0, TABLE_H * 0.5 + CHAIR_BACK / 2, -CHAIR_SZ / 2 + 0.02]} castShadow>
        <boxGeometry args={[CHAIR_SZ, CHAIR_BACK, 0.04]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
      </mesh>
      {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]).map(([dx, dz], i) => (
        <mesh key={i} position={[dx * (CHAIR_SZ / 2 - 0.02), TABLE_H * 0.25, dz * (CHAIR_SZ / 2 - 0.02)]}>
          <cylinderGeometry args={[0.015, 0.015, TABLE_H * 0.5, 6]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Table3DObj({
  layout, isSelected, onClick, visible,
}: {
  layout: TableLayout3D; isSelected: boolean; onClick: () => void; visible: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hov, setHov] = useState(false);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const tgt = visible ? 1 : 0;
    const s = THREE.MathUtils.lerp(ref.current.scale.x, tgt, dt * ANIM);
    ref.current.scale.setScalar(Math.max(0.001, s));
    ref.current.visible = s > 0.01;
  });

  const { table, cx, cz, w, d, rot, isRound } = layout;
  const isWindow = !!table.isWindowSide;
  const color = isSelected ? SEL_CLR : hov ? '#a07850' : WOOD;

  const chairs = useMemo(() => {
    const pos: { x: number; z: number; a: number }[] = [];
    if (isRound) {
      const r = Math.max(w, d) / 2 + CHAIR_SZ * 0.8;
      for (let i = 0; i < table.capacity; i++) {
        const angle = (i / table.capacity) * Math.PI * 2;
        pos.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r, a: angle + Math.PI });
      }
    } else {
      const sA = Math.ceil(table.capacity / 2);
      const sB = table.capacity - sA;
      for (let i = 0; i < sA; i++) {
        const sp = w / (sA + 1);
        pos.push({ x: sp * (i + 1) - w / 2, z: -d / 2 - CHAIR_SZ * 0.8, a: 0 });
      }
      for (let i = 0; i < sB; i++) {
        const sp = w / (sB + 1);
        pos.push({ x: sp * (i + 1) - w / 2, z: d / 2 + CHAIR_SZ * 0.8, a: Math.PI });
      }
    }
    return pos;
  }, [table.capacity, w, d, isRound]);

  return (
    <group
      ref={ref}
      position={[cx, 0, cz]}
      rotation={[0, (rot * Math.PI) / 180, 0]}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onPointerOver={e => { e.stopPropagation(); setHov(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHov(false); document.body.style.cursor = 'auto'; }}
    >
      {isRound ? (
        <mesh position={[0, TABLE_H, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[w / 2, w / 2, TABLE_TOP_T, 24]} />
          <meshStandardMaterial color={color} roughness={0.6} emissive={isSelected ? SEL_CLR : '#000'} emissiveIntensity={isSelected ? 0.3 : 0} />
        </mesh>
      ) : (
        <mesh position={[0, TABLE_H, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, TABLE_TOP_T, d]} />
          <meshStandardMaterial color={color} roughness={0.6} emissive={isSelected ? SEL_CLR : '#000'} emissiveIntensity={isSelected ? 0.3 : 0} />
        </mesh>
      )}
      {isRound ? (
        <mesh position={[0, TABLE_H / 2, 0]}>
          <cylinderGeometry args={[LEG_R * 1.5, LEG_R * 2, TABLE_H, 8]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
      ) : (
        ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]).map(([dx, dz], i) => (
          <mesh key={i} position={[dx * (w / 2 - 0.05), TABLE_H / 2, dz * (d / 2 - 0.05)]}>
            <cylinderGeometry args={[LEG_R, LEG_R, TABLE_H, 6]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
          </mesh>
        ))
      )}
      {/* Window side indicator */}
      {isWindow && (
        <group>
          {/* Glass panel */}
          <mesh position={[0, TABLE_H * 0.9, -d / 2 - CHAIR_SZ - 0.12]} castShadow>
            <boxGeometry args={[w + 0.4, TABLE_H * 1.6, 0.03]} />
            <meshStandardMaterial color="#7ec8e3" transparent opacity={0.28} roughness={0.05} metalness={0.6} />
          </mesh>
          {/* Window frame — top */}
          <mesh position={[0, TABLE_H * 1.7, -d / 2 - CHAIR_SZ - 0.12]}>
            <boxGeometry args={[w + 0.46, 0.04, 0.05]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
          </mesh>
          {/* Window frame — bottom */}
          <mesh position={[0, TABLE_H * 0.1, -d / 2 - CHAIR_SZ - 0.12]}>
            <boxGeometry args={[w + 0.46, 0.04, 0.05]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
          </mesh>
          {/* Window frame — left */}
          <mesh position={[-(w + 0.4) / 2 - 0.02, TABLE_H * 0.9, -d / 2 - CHAIR_SZ - 0.12]}>
            <boxGeometry args={[0.04, TABLE_H * 1.6, 0.05]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
          </mesh>
          {/* Window frame — right */}
          <mesh position={[(w + 0.4) / 2 + 0.02, TABLE_H * 0.9, -d / 2 - CHAIR_SZ - 0.12]}>
            <boxGeometry args={[0.04, TABLE_H * 1.6, 0.05]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
          </mesh>
          {/* Floor marker stripe */}
          <mesh position={[0, 0.005, -d / 2 - CHAIR_SZ * 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w + 0.5, 0.08]} />
            <meshStandardMaterial color="#38bdf8" />
          </mesh>
        </group>
      )}
      {chairs.map((ch, i) => (
        <Chair3D key={i} position={[ch.x, 0, ch.z]} rotation={ch.a} />
      ))}
      {isSelected && <pointLight position={[0, TABLE_H + 0.4, 0]} color={SEL_CLR} intensity={3} distance={2} />}
      {visible && (
        <Html position={[0, TABLE_H + 0.35, 0]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: isSelected ? SEL_CLR : '#334155',
            color: '#fff', padding: '1px 7px', borderRadius: 5,
            fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}>
            {table.name} · {table.capacity}{isWindow ? ' 🪟' : ''}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Structural objects (window/wall/column/free) ─────────
const OBJ_COLORS: Record<VenueObjectKind, string> = {
  window: '#7ec8e3', // cam rengi
  wall: '#8B6914',   // kahverengi
  column: '#9CA3AF', // gri
  free: '#A3E635',   // varsayılan yeşil
};

function StructuralObject3D({
  layout, visible,
}: {
  layout: ObjLayout3D; visible: boolean;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const tgt = visible ? 1 : 0;
    const s = THREE.MathUtils.lerp(ref.current.scale.x, tgt, dt * ANIM);
    ref.current.scale.setScalar(Math.max(0.001, s));
    ref.current.visible = s > 0.01;
  });

  const { obj, cx, cz, w, d, rot } = layout;
  const kind = obj.kind;
  const color = obj.color || OBJ_COLORS[kind];
  const isGlass = kind === 'window';

  // Height varies by kind
  const objH = kind === 'window' ? WALL_H * 0.6
    : kind === 'wall' ? WALL_H * 0.8
    : kind === 'column' ? WALL_H * 0.9
    : Math.max(0.3, d * 0.5); // free: proportional

  return (
    <group
      ref={ref}
      position={[cx, 0, cz]}
      rotation={[0, (rot * Math.PI) / 180, 0]}
    >
      {kind === 'column' ? (
        // Column: cylinder
        <mesh position={[0, objH / 2, 0]} castShadow>
          <cylinderGeometry args={[Math.max(w, d) / 2, Math.max(w, d) / 2, objH, 12]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ) : (
        // Window / Wall / Free: box
        <mesh position={[0, objH / 2, 0]} castShadow>
          <boxGeometry args={[w, objH, d]} />
          <meshStandardMaterial
            color={color}
            transparent={isGlass}
            opacity={isGlass ? 0.35 : 0.9}
            roughness={isGlass ? 0.05 : 0.7}
            metalness={isGlass ? 0.4 : 0}
          />
        </mesh>
      )}
      {/* Glass frame for windows */}
      {isGlass && (
        <>
          <mesh position={[0, objH + 0.02, 0]}>
            <boxGeometry args={[w + 0.04, 0.03, d + 0.04]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, -0.02, 0]}>
            <boxGeometry args={[w + 0.04, 0.03, d + 0.04]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.3} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ─── Room with always-visible walls ───────────────────────
function Room3D({
  layout, wallScale, showTables, selectedTableId, onRoomClick, onTableSelect,
}: {
  layout: RoomLayout3D;
  wallScale: number; // 0.15 building, 0.35 floor, 1.0 room
  showTables: boolean;
  selectedTableId?: string | null;
  onRoomClick: () => void;
  onTableSelect?: (tableId: string) => void;
}) {
  const wallRef = useRef<THREE.Group>(null);
  const [hov, setHov] = useState(false);

  useFrame((_, dt) => {
    if (!wallRef.current) return;
    wallRef.current.scale.y = THREE.MathUtils.lerp(wallRef.current.scale.y, wallScale, dt * ANIM);
  });

  const { room, color, cx, cz, w, d, tables, objects: objLayouts } = layout;

  return (
    <group position={[cx, SLAB_H / 2, cz]}>
      {/* Room floor tile */}
      <mesh
        position={[0, ROOM_FLOOR_H / 2, 0]}
        receiveShadow
        onClick={e => { e.stopPropagation(); onRoomClick(); }}
        onPointerOver={e => { e.stopPropagation(); setHov(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHov(false); document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[w, ROOM_FLOOR_H, d]} />
        <meshStandardMaterial
          color={color}
          roughness={0.5}
          emissive={hov ? color : '#000'}
          emissiveIntensity={hov ? 0.2 : 0}
        />
      </mesh>

      {/* Walls — always visible, height animated */}
      <group ref={wallRef} scale={[1, 0.15, 1]}>
        {/* Back wall */}
        <mesh position={[0, WALL_H / 2 + ROOM_FLOOR_H, -d / 2]} castShadow>
          <boxGeometry args={[w, WALL_H, WALL_T]} />
          <meshStandardMaterial color={WALL_BASE_CLR} transparent opacity={0.18} roughness={0.8} />
        </mesh>
        {/* Left wall */}
        <mesh position={[-w / 2, WALL_H / 2 + ROOM_FLOOR_H, 0]} castShadow>
          <boxGeometry args={[WALL_T, WALL_H, d]} />
          <meshStandardMaterial color={WALL_BASE_CLR} transparent opacity={0.18} roughness={0.8} />
        </mesh>
        {/* Right wall */}
        <mesh position={[w / 2, WALL_H / 2 + ROOM_FLOOR_H, 0]} castShadow>
          <boxGeometry args={[WALL_T, WALL_H, d]} />
          <meshStandardMaterial color={WALL_BASE_CLR} transparent opacity={0.18} roughness={0.8} />
        </mesh>
        {/* Front wall — with window opening */}
        <mesh position={[-w * 0.35, WALL_H / 2 + ROOM_FLOOR_H, d / 2]} castShadow>
          <boxGeometry args={[w * 0.3, WALL_H, WALL_T]} />
          <meshStandardMaterial color={WALL_BASE_CLR} transparent opacity={0.18} roughness={0.8} />
        </mesh>
        <mesh position={[w * 0.35, WALL_H / 2 + ROOM_FLOOR_H, d / 2]} castShadow>
          <boxGeometry args={[w * 0.3, WALL_H, WALL_T]} />
          <meshStandardMaterial color={WALL_BASE_CLR} transparent opacity={0.18} roughness={0.8} />
        </mesh>
        {/* Window lintel (top) */}
        <mesh position={[0, WALL_H * 0.85 + ROOM_FLOOR_H, d / 2]} castShadow>
          <boxGeometry args={[w * 0.4, WALL_H * 0.3, WALL_T]} />
          <meshStandardMaterial color={WALL_BASE_CLR} transparent opacity={0.18} roughness={0.8} />
        </mesh>
        {/* Window sill (bottom) */}
        <mesh position={[0, WALL_H * 0.2 + ROOM_FLOOR_H, d / 2]} castShadow>
          <boxGeometry args={[w * 0.4, WALL_H * 0.4, WALL_T]} />
          <meshStandardMaterial color={WALL_BASE_CLR} transparent opacity={0.18} roughness={0.8} />
        </mesh>
        {/* Window glass */}
        <mesh position={[0, WALL_H * 0.52 + ROOM_FLOOR_H, d / 2 + 0.005]}>
          <boxGeometry args={[w * 0.38, WALL_H * 0.28, 0.02]} />
          <meshStandardMaterial color={WIN_CLR} transparent opacity={0.3} roughness={0.05} metalness={0.4} />
        </mesh>

        {/* Color accent strip at top of walls */}
        <mesh position={[0, WALL_H + ROOM_FLOOR_H, -d / 2]}>
          <boxGeometry args={[w + WALL_T, 0.06, WALL_T + 0.01]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
        <mesh position={[-w / 2, WALL_H + ROOM_FLOOR_H, 0]}>
          <boxGeometry args={[WALL_T + 0.01, 0.06, d]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
        <mesh position={[w / 2, WALL_H + ROOM_FLOOR_H, 0]}>
          <boxGeometry args={[WALL_T + 0.01, 0.06, d]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
        <mesh position={[0, WALL_H + ROOM_FLOOR_H, d / 2]}>
          <boxGeometry args={[w + WALL_T, 0.06, WALL_T + 0.01]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
      </group>

      {/* Tables */}
      <group position={[0, ROOM_FLOOR_H, 0]}>
        {tables.map(tl => (
          <Table3DObj
            key={tl.table.id}
            layout={tl}
            isSelected={selectedTableId === tl.table.id}
            onClick={() => onTableSelect?.(tl.table.id)}
            visible={showTables}
          />
        ))}
      </group>

      {/* Structural objects (window, wall, column, free) */}
      <group position={[0, ROOM_FLOOR_H, 0]}>
        {objLayouts.map(ol => (
          <StructuralObject3D
            key={ol.obj.id}
            layout={ol}
            visible={showTables}
          />
        ))}
      </group>

      {/* Room label — only on hover */}
      {hov && !showTables && (
        <Html position={[0, WALL_H * wallScale + 0.3, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: color, color: '#fff',
            padding: '3px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}>
            {room.name}
            <span style={{ opacity: 0.7, marginLeft: 6, fontSize: 10 }}>
              {tables.length} Masa
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Roof ─────────────────────────────────────────────────
function Roof3D({ slabW, slabD, baseY }: { slabW: number; slabD: number; baseY: number }) {
  const geo = useMemo(() => {
    const hw = slabW / 2 + ROOF_OVERHANG;
    const shape = new THREE.Shape();
    shape.moveTo(-hw, 0);
    shape.lineTo(0, ROOF_H);
    shape.lineTo(hw, 0);
    shape.closePath();
    const depth = slabD + ROOF_OVERHANG * 2;
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  }, [slabW, slabD]);

  return (
    <group position={[0, baseY + SLAB_H / 2, -(slabD / 2 + ROOF_OVERHANG)]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={ROOF_CLR} roughness={0.65} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      {/* Ridge cap */}
      <mesh position={[0, ROOF_H - 0.03, (slabD + ROOF_OVERHANG * 2) / 2]}>
        <boxGeometry args={[0.12, 0.08, slabD + ROOF_OVERHANG * 2 + 0.2]} />
        <meshStandardMaterial color="#6b7a8a" roughness={0.5} />
      </mesh>
    </group>
  );
}

// ─── Floor Slab ───────────────────────────────────────────
function FloorSlab3D({
  layout, viewMode, isSelected, isTopFloor, selectedRoomId, internalSelectedTableId,
  onFloorClick, onRoomClick, onTableSelect,
}: {
  layout: FloorLayout3D; viewMode: ViewMode; isSelected: boolean; isTopFloor: boolean;
  selectedRoomId: string | null; internalSelectedTableId: string | null;
  onFloorClick: () => void; onRoomClick: (room: Room) => void;
  onTableSelect: (tableId: string) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hov, setHov] = useState(false);

  const targetY = viewMode === 'building' ? layout.baseY : isSelected ? 0 : layout.baseY;
  const visible = viewMode === 'building' || isSelected;

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetY, dt * ANIM);
    const ts = visible ? 1 : 0.001;
    const s = THREE.MathUtils.lerp(ref.current.scale.x, ts, dt * ANIM);
    ref.current.scale.setScalar(Math.max(0.001, s));
    ref.current.visible = s > 0.01;
  });

  // Wall scale per view mode
  const getWallScale = (roomId: string) => {
    if (viewMode === 'room' && selectedRoomId === roomId) return 1.0;
    if (viewMode === 'floor') return 0.5;
    return 1.0; // building: tam yükseklik — üst kat duvar üstüne oturur
  };

  return (
    <group ref={ref} position={[0, layout.baseY, 0]}>
      {/* Slab */}
      <mesh
        receiveShadow castShadow
        onClick={e => { if (viewMode === 'building') { e.stopPropagation(); onFloorClick(); } }}
        onPointerOver={e => { if (viewMode === 'building') { e.stopPropagation(); setHov(true); document.body.style.cursor = 'pointer'; } }}
        onPointerOut={() => { setHov(false); document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[layout.slabW, SLAB_H, layout.slabD]} />
        <meshStandardMaterial color={SLAB_CLR} roughness={0.8} emissive={hov ? '#fff' : '#000'} emissiveIntensity={hov ? 0.12 : 0} />
      </mesh>

      {/* Slab edge trim */}
      <mesh position={[0, SLAB_H / 2 + 0.01, 0]} receiveShadow>
        <boxGeometry args={[layout.slabW + 0.04, 0.02, layout.slabD + 0.04]} />
        <meshStandardMaterial color="#b0b8c1" roughness={0.7} />
      </mesh>

      {/* Floor label — only in building view */}
      {viewMode === 'building' && (
        <Html position={[0, SLAB_H + 0.6, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
            padding: '3px 12px', borderRadius: 20,
            fontSize: 12, fontWeight: 800, color: '#334155',
            whiteSpace: 'nowrap', boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
          }}>
            {layout.floor.name}
          </div>
        </Html>
      )}

      {/* Rooms */}
      {layout.rooms.map(rl => (
        <Room3D
          key={rl.room.id}
          layout={rl}
          wallScale={getWallScale(rl.room.id)}
          showTables={viewMode === 'room' && selectedRoomId === rl.room.id}
          selectedTableId={internalSelectedTableId}
          onRoomClick={() => onRoomClick(rl.room)}
          onTableSelect={onTableSelect}
        />
      ))}

      {/* Roof on top floor only (building view) */}
      {isTopFloor && viewMode === 'building' && (
        <Roof3D slabW={layout.slabW} slabD={layout.slabD} baseY={WALL_H + ROOM_FLOOR_H} />
      )}
    </group>
  );
}

// ─── Camera ───────────────────────────────────────────────
function CameraManager({
  viewMode, selectedFloor, selectedRoom, layout,
}: {
  viewMode: ViewMode;
  selectedFloor: FloorLayout3D | null;
  selectedRoom: RoomLayout3D | null;
  layout: FloorLayout3D[];
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    if (viewMode === 'building') {
      const maxY = layout.length > 0 ? (layout.length - 1) * FLOOR_GAP : 0;
      const centerY = maxY / 2;
      const dist = Math.max(8, maxY + 6);
      c.setLookAt(dist, centerY + dist * 0.65, dist, 0, centerY, 0, true);
    } else if (viewMode === 'floor' && selectedFloor) {
      const sz = Math.max(selectedFloor.slabW, selectedFloor.slabD);
      c.setLookAt(sz * 0.3, sz + 2, sz * 0.7, 0, 0, 0, true);
    } else if (viewMode === 'room' && selectedRoom) {
      const { cx, cz, w, d } = selectedRoom;
      const dist = Math.max(w, d) * 1.3;
      c.setLookAt(cx + dist, dist + 1.5, cz + dist, cx, 0.3, cz, true);
    }
  }, [viewMode, selectedFloor, selectedRoom, layout]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      smoothTime={0.5}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={1}
      maxDistance={35}
    />
  );
}

// ─── Scene ────────────────────────────────────────────────
function Scene3D({
  layout, viewMode, selectedFloorId, selectedRoomId, internalSelectedTableId,
  onFloorClick, onRoomClick, onTableSelect,
}: {
  layout: FloorLayout3D[]; viewMode: ViewMode;
  selectedFloorId: string | null; selectedRoomId: string | null;
  internalSelectedTableId: string | null;
  onFloorClick: (id: string) => void;
  onRoomClick: (room: Room) => void;
  onTableSelect: (tableId: string) => void;
}) {
  const selectedFloor = layout.find(f => f.floor.id === selectedFloorId) ?? null;
  const selectedRoom = selectedFloor?.rooms.find(r => r.room.id === selectedRoomId) ?? null;
  const topFloorId = layout.length > 0 ? layout[layout.length - 1].floor.id : null;

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <Environment preset="apartment" />
      <fog attach="fog" args={['#f0f2f5', 20, 45]} />

      <CameraManager viewMode={viewMode} selectedFloor={selectedFloor} selectedRoom={selectedRoom} layout={layout} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.95} />
      </mesh>
      <gridHelper args={[60, 60, '#e2e8f0', '#e2e8f0']} position={[0, -0.01, 0]} />

      {layout.map(fl => (
        <FloorSlab3D
          key={fl.floor.id}
          layout={fl}
          viewMode={viewMode}
          isSelected={selectedFloorId === fl.floor.id}
          isTopFloor={fl.floor.id === topFloorId}
          selectedRoomId={selectedRoomId}
          internalSelectedTableId={internalSelectedTableId}
          onFloorClick={() => onFloorClick(fl.floor.id)}
          onRoomClick={onRoomClick}
          onTableSelect={onTableSelect}
        />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════
export function VenueModel3D({
  floors: propsFloors, rooms: propsRooms, tables: propsTables, objects: propsObjects, selectedTableId,
  onFloorSelect, onRoomSelect, onTableSelect: onTableSelectProp,
}: VenueModel3DProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('building');
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [internalSelectedTableId, setInternalSelectedTableId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Sync external selectedTableId
  useEffect(() => {
    if (selectedTableId) setInternalSelectedTableId(selectedTableId);
  }, [selectedTableId]);

  // Use demo data only when NO real data exists at all
  // If real floors are provided, never mix with demo rooms/tables
  const demo = useMemo(() => getDemoData(), []);
  const hasRealData = propsFloors.length > 0;
  const floors = hasRealData ? propsFloors : demo.floors;
  const rooms = hasRealData ? propsRooms : demo.rooms;
  const tables = hasRealData ? propsTables : demo.tables;
  const objects = hasRealData ? (propsObjects ?? []) : demo.objects;

  const layout = useMemo(() => computeLayout(floors, rooms, tables, objects), [floors, rooms, tables, objects]);

  const selectedFloor = layout.find(f => f.floor.id === selectedFloorId) ?? null;
  const selectedRoom = selectedFloor?.rooms.find(r => r.room.id === selectedRoomId) ?? null;

  const handleFloorClick = (id: string) => {
    setSelectedFloorId(id);
    setViewMode('floor');
    onFloorSelect?.(id);
  };
  const handleRoomClick = (room: Room) => {
    setSelectedRoomId(room.id);
    setSelectedFloorId(room.floorId);
    setViewMode('room');
    onRoomSelect?.(room.id);
  };
  const handleTableSelect = (tableId: string) => {
    setInternalSelectedTableId(prev => prev === tableId ? null : tableId);
    onTableSelectProp?.(tableId);
  };
  const handleBack = () => {
    if (viewMode === 'room') {
      setViewMode('floor');
      setSelectedRoomId(null);
      setInternalSelectedTableId(null);
    } else if (viewMode === 'floor') {
      setViewMode('building');
      setSelectedFloorId(null);
    }
  };

  if (!floors.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
        <Building2 className="h-16 w-16 text-slate-300 mb-4" />
        <p className="text-slate-500">{t.venue.noFloors}</p>
      </div>
    );
  }

  if (!mounted) {
    return <div className="h-[500px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl" />;
  }

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height: 500 }}>
      <Canvas shadows camera={{ position: [12, 10, 12], fov: 45 }}>
        <color attach="background" args={['#f0f2f5']} />
        <Scene3D
          layout={layout}
          viewMode={viewMode}
          selectedFloorId={selectedFloorId}
          selectedRoomId={selectedRoomId}
          internalSelectedTableId={internalSelectedTableId}
          onFloorClick={handleFloorClick}
          onRoomClick={handleRoomClick}
          onTableSelect={handleTableSelect}
        />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        {viewMode !== 'building' && (
          <Button variant="outline" size="sm" onClick={handleBack} className="bg-white/90 backdrop-blur-sm shadow-sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t.common.back}
          </Button>
        )}
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm text-sm">
          <Building2 className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-slate-600 font-medium">{t.venue.buildingModel}</span>
          {selectedFloor && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-semibold">{selectedFloor.floor.name}</span>
            </>
          )}
          {selectedRoom && (
            <>
              <span className="text-slate-300">/</span>
              <span className="font-semibold" style={{ color: selectedRoom.color }}>{selectedRoom.room.name}</span>
            </>
          )}
        </div>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        <Badge variant="outline" className="bg-white/90 backdrop-blur-sm gap-1 text-xs">
          <DoorOpen className="h-3 w-3" />
          {rooms.length} {t.venue.room}
        </Badge>
        <Badge variant="outline" className="bg-white/90 backdrop-blur-sm gap-1 text-xs">
          <Armchair className="h-3 w-3" />
          {tables.length} {t.venue.table}
        </Badge>
        <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm gap-1 text-xs">
          <Users className="h-3 w-3" />
          {tables.reduce((s, tbl) => s + tbl.capacity, 0)} {t.venue.persons}
        </Badge>
      </div>

      {viewMode === 'building' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-slate-600 shadow-sm">
            {t.venue.clickFloorForDetails}
          </span>
        </div>
      )}
      {viewMode === 'floor' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-slate-600 shadow-sm">
            {t.venue.clickRoomForTables}
          </span>
        </div>
      )}
    </div>
  );
}
