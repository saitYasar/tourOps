'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Bus, ChevronLeft, Users, Armchair, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════
const FLOOR_Y = 0;
const SEAT_H = 0.35;          // Koltuk oturma yüksekliği
const SEAT_BACK_H = 0.45;     // Arkalık yüksekliği
const SEAT_W = 0.28;          // Koltuk genişliği
const SEAT_D = 0.28;          // Koltuk derinliği
const ANIM = 4.5;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4'];
const SEAT_CLR = '#4b5563';     // Koyu gri (otobüs koltuğu)
const SEAT_BACK_CLR = '#374151';
const SEL_CLR = '#3b82f6';
const FRAME_CLR = '#94a3b8';    // Metal çerçeve

// Occupancy colors (matches VenueModel3D)
const SKIN_CLR = '#f0c8a0';
const MALE_CLR = '#2563eb';
const MALE_SEAT = '#bfdbfe';
const MALE_LABEL = '#1d4ed8';
const MALE_SHIRT = '#3b82f6';
const FEMALE_CLR = '#db2777';
const FEMALE_SEAT = '#fbcfe8';
const FEMALE_LABEL = '#be185d';
const FEMALE_SHIRT = '#ec4899';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
interface TransportSection {
  id: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SeatOccupant {
  clientId: number;
  clientName: string;
  gender?: 'm' | 'f' | null;
}

interface TransportSeat {
  id: number;
  name: string;
  sectionId: number;
  x: number;
  y: number;
  isObject?: boolean;
  color?: string;
  width?: number;
  height?: number;
}

interface TransportModel3DProps {
  sections: TransportSection[];
  seats: TransportSeat[];
  occupancy?: Record<number, SeatOccupant | null>;
  onSectionClick?: (sectionId: number) => void;
  onSeatClick?: (seatId: number) => void;
}

type ViewMode = 'overview' | 'section';

// Layout types
interface SeatLayout3D {
  seat: TransportSeat;
  cx: number;
  cz: number;
  occupant?: SeatOccupant | null;
}

interface SectionLayout3D {
  section: TransportSection;
  color: string;
  cx: number;
  cz: number;
  w: number;
  d: number;
  seats: SeatLayout3D[];
}

// ═══════════════════════════════════════════════════════════
// Layout computation
// ═══════════════════════════════════════════════════════════
function computeLayout(sections: TransportSection[], seats: TransportSeat[], occupancy?: Record<number, SeatOccupant | null>): SectionLayout3D[] {
  if (!sections.length) return [];

  // Find bounding box of all sections
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of sections) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.w);
    maxY = Math.max(maxY, s.y + s.h);
  }
  const totalW = maxX - minX || 1;
  const totalH = maxY - minY || 1;
  const scale = 12 / Math.max(totalW, totalH);
  const offX = (minX + maxX) / 2;
  const offY = (minY + maxY) / 2;

  const PAD = 0.6; // padding around seats inside section box

  return sections.map((section, i) => {
    const sw = section.w * scale + PAD * 2;
    const sd = section.h * scale + PAD * 2;
    // Negate both axes so 2D layout matches 3D camera view (camera at +X,+Y,+Z looking at origin)
    const cx = -(section.x + section.w / 2 - offX) * scale;
    const cz = -(section.y + section.h / 2 - offY) * scale;

    // Get seats for this section
    const sectionSeats = seats.filter(s => s.sectionId === section.id);
    const seatLayouts: SeatLayout3D[] = sectionSeats.map(seat => {
      // Convert seat coordinates (relative to section) to 3D position (relative to section center)
      const sx = -(seat.x - section.w / 2) * scale;
      const sz = -(seat.y - section.h / 2) * scale;
      return { seat, cx: sx, cz: sz, occupant: occupancy?.[seat.id] };
    });

    return {
      section,
      color: COLORS[i % COLORS.length],
      cx, cz, w: sw, d: sd,
      seats: seatLayouts,
    };
  });
}

// ═══════════════════════════════════════════════════════════
// Simple box shape helper
// ═══════════════════════════════════════════════════════════
function createBoxShape(w: number, d: number) {
  const shape = new THREE.Shape();
  const hw = w / 2, hd = d / 2;
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw, -hd);
  shape.lineTo(hw, hd);
  shape.lineTo(-hw, hd);
  shape.lineTo(-hw, -hd);
  return shape;
}

// ═══════════════════════════════════════════════════════════
// 3D Components
// ═══════════════════════════════════════════════════════════

function Seat3D({ layout, isSelected, visible }: {
  layout: SeatLayout3D;
  isSelected: boolean;
  visible: boolean;
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

  const { seat, cx, cz } = layout;

  if (seat.isObject) {
    // Render as colored box (free object)
    const objColor = seat.color || '#A3E635';
    const objW = (seat.width || 30) * 0.008;
    const objD = (seat.height || 20) * 0.008;
    return (
      <group ref={ref} position={[cx, FLOOR_Y + 0.08, cz]}>
        <mesh castShadow
          onPointerOver={(e) => { e.stopPropagation(); setHov(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHov(false); document.body.style.cursor = 'auto'; }}
        >
          <boxGeometry args={[objW, 0.15, objD]} />
          <meshStandardMaterial
            color={objColor}
            roughness={0.6}
            emissive={hov ? '#fff' : '#000'}
            emissiveIntensity={hov ? 0.15 : 0}
          />
        </mesh>
        <Html position={[0, 0.14, 0]} center distanceFactor={4} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(0,0,0,0.7)', color: '#fff',
            padding: '1px 5px', borderRadius: 3,
            fontSize: 7, fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            {seat.name}
          </div>
        </Html>
      </group>
    );
  }

  // Transport seat — like bus/plane seat
  const occupant = layout.occupant;
  const isOccupied = !!occupant;
  const isFemale = occupant?.gender === 'f';

  const seatColor = isOccupied
    ? (isFemale ? FEMALE_SEAT : MALE_SEAT)
    : isSelected ? SEL_CLR : hov ? '#6b7280' : SEAT_CLR;
  const backColor = isOccupied
    ? (isFemale ? FEMALE_CLR : MALE_CLR)
    : isSelected ? '#2563eb' : hov ? '#4b5563' : SEAT_BACK_CLR;
  const shirtColor = isFemale ? FEMALE_SHIRT : MALE_SHIRT;
  const labelBg = isFemale ? FEMALE_LABEL : MALE_LABEL;

  // Person measurements (seated on transport seat)
  const torsoH = 0.28;
  const headR = 0.06;
  const torsoY = SEAT_H + torsoH / 2 + 0.02;
  const headY = SEAT_H + torsoH + headR + 0.04;

  return (
    <group ref={ref} position={[cx, FLOOR_Y, cz]}
      onPointerOver={(e) => { e.stopPropagation(); setHov(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHov(false); document.body.style.cursor = 'auto'; }}
    >
      {/* Seat base / cushion */}
      <mesh position={[0, SEAT_H, 0]} castShadow>
        <boxGeometry args={[SEAT_W, 0.06, SEAT_D]} />
        <meshStandardMaterial color={seatColor} roughness={0.7} />
      </mesh>

      {/* Seat back */}
      <mesh position={[0, SEAT_H + SEAT_BACK_H / 2, -SEAT_D / 2 + 0.02]} castShadow>
        <boxGeometry args={[SEAT_W, SEAT_BACK_H, 0.04]} />
        <meshStandardMaterial color={backColor} roughness={0.7} />
      </mesh>

      {/* Armrests */}
      <mesh position={[-SEAT_W / 2, SEAT_H + 0.08, 0]} castShadow>
        <boxGeometry args={[0.03, 0.04, SEAT_D * 0.8]} />
        <meshStandardMaterial color={FRAME_CLR} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[SEAT_W / 2, SEAT_H + 0.08, 0]} castShadow>
        <boxGeometry args={[0.03, 0.04, SEAT_D * 0.8]} />
        <meshStandardMaterial color={FRAME_CLR} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Seat leg / pedestal */}
      <mesh position={[0, SEAT_H / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.04, SEAT_H, 8]} />
        <meshStandardMaterial color={FRAME_CLR} roughness={0.4} metalness={0.4} />
      </mesh>

      {/* ─── Seated person figure ─── */}
      {isOccupied && (
        <group>
          {/* Torso */}
          <mesh position={[0, torsoY, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.06, torsoH, 8]} />
            <meshStandardMaterial color={shirtColor} roughness={0.7} />
          </mesh>
          {/* Head */}
          <mesh position={[0, headY, 0]} castShadow>
            <sphereGeometry args={[headR, 12, 10]} />
            <meshStandardMaterial color={SKIN_CLR} roughness={0.6} />
          </mesh>
          {/* Left arm */}
          <mesh position={[-0.09, torsoY - 0.02, 0]} castShadow rotation={[0, 0, 0.2]}>
            <cylinderGeometry args={[0.02, 0.018, 0.18, 6]} />
            <meshStandardMaterial color={shirtColor} roughness={0.7} />
          </mesh>
          {/* Right arm */}
          <mesh position={[0.09, torsoY - 0.02, 0]} castShadow rotation={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.02, 0.018, 0.18, 6]} />
            <meshStandardMaterial color={shirtColor} roughness={0.7} />
          </mesh>
          {/* Name label above head */}
          <Html position={[0, headY + headR + 0.08, 0]} center distanceFactor={4} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: labelBg, color: '#fff',
              padding: '1px 6px', borderRadius: 4,
              fontSize: 8, fontWeight: 700, whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {occupant!.clientName}
            </div>
          </Html>
        </group>
      )}

      {/* Seat number label */}
      <Html position={[0, SEAT_H + SEAT_BACK_H + 0.08, -SEAT_D / 2 + 0.02]} center distanceFactor={4} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: isOccupied
            ? (isFemale ? 'rgba(219,39,119,0.85)' : 'rgba(37,99,235,0.85)')
            : isSelected ? 'rgba(37,99,235,0.9)' : 'rgba(55,65,81,0.85)',
          color: '#fff',
          padding: '0px 4px', borderRadius: 3,
          fontSize: 7, fontWeight: 600, whiteSpace: 'nowrap',
        }}>
          {seat.name}
        </div>
      </Html>
    </group>
  );
}

function Section3D({ layout, viewMode, isSelected, selectedSeatId, onClick }: {
  layout: SectionLayout3D;
  viewMode: ViewMode;
  isSelected: boolean;
  selectedSeatId: number | null;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hov, setHov] = useState(false);
  const showSeats = viewMode === 'section' && isSelected;

  useFrame((_, dt) => {
    if (!ref.current) return;
    const visible = viewMode === 'overview' || isSelected;
    const ts = visible ? 1 : 0.001;
    const s = THREE.MathUtils.lerp(ref.current.scale.x, ts, dt * ANIM);
    ref.current.scale.setScalar(Math.max(0.001, s));
    ref.current.visible = s > 0.01;
  });

  const { section, color, cx, cz, w, d, seats } = layout;
  const boxH = 1.2;

  // Simple box shape — no curves
  const bodyShape = useMemo(() => createBoxShape(w, d), [w, d]);
  const bodyExtrudeSettings = useMemo(() => ({
    depth: boxH,
    bevelEnabled: false,
  }), [boxH]);

  const capExtrudeSettings = useMemo(() => ({
    depth: 0.03,
    bevelEnabled: false,
  }), []);

  return (
    <group ref={ref} position={[cx, 0, cz]}>
      {/* Body walls */}
      <mesh
        castShadow
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHov(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHov(false); document.body.style.cursor = 'auto'; }}
      >
        <extrudeGeometry args={[bodyShape, bodyExtrudeSettings]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          opacity={0.18}
          transparent
          side={THREE.DoubleSide}
          emissive={isSelected ? color : hov ? '#fff' : '#000'}
          emissiveIntensity={isSelected ? 0.35 : hov ? 0.12 : 0}
        />
      </mesh>

      {/* Bottom cap — solid floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <extrudeGeometry args={[bodyShape, capExtrudeSettings]} />
        <meshStandardMaterial
          color={color}
          roughness={0.5}
          emissive={isSelected ? color : '#000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      {/* Top cap */}
      <mesh position={[0, boxH, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <extrudeGeometry args={[bodyShape, capExtrudeSettings]} />
        <meshStandardMaterial color={color} roughness={0.5} opacity={0.1} transparent />
      </mesh>

      {/* Section name */}
      <Html position={[0, boxH + 0.3, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
          padding: '2px 10px', borderRadius: 12,
          fontSize: 11, fontWeight: 700, color: '#334155',
          whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          border: `2px solid ${color}`,
        }}>
          {section.name}
        </div>
      </Html>

      {/* Seats */}
      {seats.map(sl => (
        <Seat3D
          key={sl.seat.id}
          layout={sl}
          isSelected={selectedSeatId === sl.seat.id}
          visible={showSeats}
        />
      ))}
    </group>
  );
}

// ─── Camera ───────────────────────────────────────────────
function CameraManager({ viewMode, selectedSection, layout }: {
  viewMode: ViewMode;
  selectedSection: SectionLayout3D | null;
  layout: SectionLayout3D[];
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    if (viewMode === 'overview') {
      // Calculate bounds
      let maxDim = 5;
      if (layout.length > 0) {
        let mnX = Infinity, mnZ = Infinity, mxX = -Infinity, mxZ = -Infinity;
        for (const s of layout) {
          mnX = Math.min(mnX, s.cx - s.w / 2);
          mnZ = Math.min(mnZ, s.cz - s.d / 2);
          mxX = Math.max(mxX, s.cx + s.w / 2);
          mxZ = Math.max(mxZ, s.cz + s.d / 2);
        }
        maxDim = Math.max(mxX - mnX, mxZ - mnZ, 5);
      }
      const dist = maxDim * 0.8 + 3;
      c.setLookAt(dist * 0.6, dist * 0.7, dist * 0.6, 0, 0, 0, true);
    } else if (viewMode === 'section' && selectedSection) {
      const { cx, cz, w, d } = selectedSection;
      const maxDim = Math.max(w, d);
      const dist = maxDim * 0.75 + 2;
      c.setLookAt(cx + dist * 0.5, dist * 0.8 + 0.5, cz + dist * 0.5, cx, 0.2, cz, true);
    }
  }, [viewMode, selectedSection, layout]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      smoothTime={0.5}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={1}
      maxDistance={30}
    />
  );
}

// ─── Scene ────────────────────────────────────────────────
function Scene3D({ layout, viewMode, selectedSectionId, selectedSeatId, onSectionClick }: {
  layout: SectionLayout3D[];
  viewMode: ViewMode;
  selectedSectionId: number | null;
  selectedSeatId: number | null;
  onSectionClick: (id: number) => void;
}) {
  const selectedSection = layout.find(s => s.section.id === selectedSectionId) ?? null;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[8, 12, 8]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={40}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <Environment preset="apartment" />
      <fog attach="fog" args={['#f0f2f5', 18, 40]} />

      <CameraManager viewMode={viewMode} selectedSection={selectedSection} layout={layout} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.95} />
      </mesh>
      <gridHelper args={[50, 50, '#e2e8f0', '#e2e8f0']} position={[0, -0.01, 0]} />

      {layout.map(sl => (
        <Section3D
          key={sl.section.id}
          layout={sl}
          viewMode={viewMode}
          isSelected={selectedSectionId === sl.section.id}
          selectedSeatId={selectedSeatId}
          onClick={() => onSectionClick(sl.section.id)}
        />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════
export function TransportModel3D({ sections, seats, occupancy, onSectionClick, onSeatClick }: TransportModel3DProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const layout = useMemo(() => computeLayout(sections, seats, occupancy), [sections, seats, occupancy]);

  // Auto-advance to section if only 1
  const autoRef = useRef(false);
  useEffect(() => {
    if (autoRef.current || layout.length === 0) return;
    if (layout.length === 1) {
      setSelectedSectionId(layout[0].section.id);
      setViewMode('section');
      autoRef.current = true;
    }
  }, [layout]);

  const selectedSection = layout.find(s => s.section.id === selectedSectionId) ?? null;

  const handleSectionClick = (id: number) => {
    setSelectedSectionId(id);
    setViewMode('section');
    onSectionClick?.(id);
  };

  const handleBack = () => {
    if (viewMode === 'section') {
      setViewMode('overview');
      setSelectedSectionId(null);
      setSelectedSeatId(null);
    }
  };

  const totalSeats = seats.filter(s => !s.isObject).length;
  const occupiedCount = occupancy ? Object.values(occupancy).filter(Boolean).length : 0;

  if (!sections.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
        <Bus className="h-16 w-16 text-slate-300 mb-4" />
        <p className="text-slate-500">{t.venue.noDataFor3D}</p>
      </div>
    );
  }

  if (!mounted) {
    return <div className="h-[500px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl" />;
  }

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height: 500 }}>
      <Canvas shadows camera={{ position: [8, 7, 8], fov: 45 }}>
        <color attach="background" args={['#f0f2f5']} />
        <Scene3D
          layout={layout}
          viewMode={viewMode}
          selectedSectionId={selectedSectionId}
          selectedSeatId={selectedSeatId}
          onSectionClick={handleSectionClick}
        />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-2 left-2 right-2 z-10 flex flex-wrap items-center gap-1.5 sm:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="outline" size="sm" onClick={handleBack} disabled={viewMode === 'overview'} className="bg-white/90 backdrop-blur-sm shadow-sm h-7 px-2 text-xs sm:h-8 sm:px-3 sm:text-sm">
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5 sm:h-4 sm:w-4 sm:mr-1" />
                {t.common.back}
              </Button>
            </span>
          </TooltipTrigger>
          {viewMode === 'overview' && <TooltipContent>{t.venue.alreadyInOverview}</TooltipContent>}
        </Tooltip>

        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 shadow-sm text-xs sm:text-sm">
          <Bus className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-500 shrink-0" />
          <span className="text-slate-600 font-medium truncate max-w-[80px] sm:max-w-none">3D {t.venue.buildingModel}</span>
          {selectedSection && (
            <>
              <span className="text-slate-300">/</span>
              <span className="font-semibold truncate max-w-[80px] sm:max-w-none" style={{ color: selectedSection.color }}>
                {selectedSection.section.name}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Badge variant="outline" className="bg-white/90 backdrop-blur-sm gap-0.5 text-[10px] sm:text-xs px-1.5 sm:px-2">
            <Box className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            {sections.length} {t.venue.sectionUnit}
          </Badge>
          <Badge variant="outline" className="bg-white/90 backdrop-blur-sm gap-0.5 text-[10px] sm:text-xs px-1.5 sm:px-2">
            <Armchair className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            {totalSeats} {t.venue.seatUnit}
          </Badge>
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm gap-0.5 text-[10px] sm:text-xs px-1.5 sm:px-2">
            <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            {occupiedCount}/{totalSeats} {t.venue.persons}
          </Badge>
        </div>
      </div>

      {viewMode === 'overview' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-slate-600 shadow-sm">
            {t.venue.clickSectionForSeats}
          </span>
        </div>
      )}
    </div>
  );
}
