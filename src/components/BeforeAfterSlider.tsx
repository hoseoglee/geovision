import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

interface ConflictZone {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  zoom: number;
  beforeDate: string;
  afterDate: string;
  description: string;
}

const CONFLICT_ZONES: ConflictZone[] = [
  {
    id: 'gaza',
    name: 'Gaza Strip',
    country: 'Palestine',
    lat: 31.35,
    lng: 34.45,
    zoom: 11,
    beforeDate: '2023-09-01',
    afterDate: '2024-03-15',
    description: 'Before/after Oct 7 conflict — northern Gaza destruction',
  },
  {
    id: 'bakhmut',
    name: 'Bakhmut, Ukraine',
    country: 'Ukraine',
    lat: 48.60,
    lng: 38.00,
    zoom: 12,
    beforeDate: '2022-06-01',
    afterDate: '2023-06-01',
    description: 'Before/after Battle of Bakhmut — urban destruction',
  },
  {
    id: 'mariupol',
    name: 'Mariupol, Ukraine',
    country: 'Ukraine',
    lat: 47.10,
    lng: 37.55,
    zoom: 12,
    beforeDate: '2022-01-01',
    afterDate: '2022-06-01',
    description: 'Before/after Siege of Mariupol',
  },
  {
    id: 'khartoum',
    name: 'Khartoum, Sudan',
    country: 'Sudan',
    lat: 15.55,
    lng: 32.53,
    zoom: 11,
    beforeDate: '2023-03-01',
    afterDate: '2023-10-01',
    description: 'Before/after Sudan civil war — capital destruction',
  },
  {
    id: 'hodeidah',
    name: 'Hodeidah Port, Yemen',
    country: 'Yemen',
    lat: 14.80,
    lng: 42.95,
    zoom: 12,
    beforeDate: '2024-01-01',
    afterDate: '2024-04-01',
    description: 'Before/after US/UK strikes on Houthi infrastructure',
  },
];

// ---------------------------------------------------------------------------
// Tile utilities
// ---------------------------------------------------------------------------

function lonLatToTile(lon: number, lat: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}

function getTileUrl(date: string, z: number, x: number, y: number): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible/${z}/${y}/${x}.jpg`;
}

/** Returns URLs for a 2×2 tile grid centred on (lat, lng). */
function getTileGrid(zone: ConflictZone, date: string): string[] {
  const { x: cx, y: cy } = lonLatToTile(zone.lng, zone.lat, zone.zoom);
  const urls: string[] = [];
  // 2×2: top-left = (cx-0, cy-0), top-right = (cx+1, cy), bottom-left = (cx, cy+1), bottom-right = (cx+1, cy+1)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      urls.push(getTileUrl(date, zone.zoom, cx + col, cy + row));
    }
  }
  return urls;
}

// ---------------------------------------------------------------------------
// Main slider component
// ---------------------------------------------------------------------------

interface SliderViewProps {
  zone: ConflictZone;
}

function SliderView({ zone }: SliderViewProps) {
  const [sliderX, setSliderX] = useState(50); // 0–100 percent
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const beforeUrls = getTileGrid(zone, zone.beforeDate);
  const afterUrls = getTileGrid(zone, zone.afterDate);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderX(Math.min(100, Math.max(0, rawPct)));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const rawPct = ((touch.clientX - rect.left) / rect.width) * 100;
    setSliderX(Math.min(100, Math.max(0, rawPct)));
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  // Reset slider to 50% when zone changes
  useEffect(() => {
    setSliderX(50);
  }, [zone.id]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: 280,
        height: 280,
        overflow: 'hidden',
        cursor: 'ew-resize',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* AFTER layer — full (base) */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 140px',
            gridTemplateRows: '140px 140px',
            width: 280,
            height: 280,
          }}
        >
          {afterUrls.map((url, i) => (
            <img
              key={`after-${zone.id}-${i}`}
              src={url}
              width={140}
              height={140}
              style={{ display: 'block', objectFit: 'cover' }}
              loading="lazy"
              alt=""
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.background = '#1a1f2e';
              }}
            />
          ))}
        </div>
      </div>

      {/* BEFORE layer — clipped to left portion */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: `inset(0 ${100 - sliderX}% 0 0)`,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 140px',
            gridTemplateRows: '140px 140px',
            width: 280,
            height: 280,
          }}
        >
          {beforeUrls.map((url, i) => (
            <img
              key={`before-${zone.id}-${i}`}
              src={url}
              width={140}
              height={140}
              style={{ display: 'block', objectFit: 'cover' }}
              loading="lazy"
              alt=""
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.background = '#1a1f2e';
              }}
            />
          ))}
        </div>
      </div>

      {/* Vertical divider */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 2,
          background: 'rgba(255,255,255,0.9)',
          left: `${sliderX}%`,
          cursor: 'ew-resize',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={(e) => {
          e.preventDefault();
          dragging.current = true;
        }}
      >
        {/* Drag handle knob */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 28,
            height: 28,
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
            color: '#333',
            fontWeight: 'bold',
            pointerEvents: 'none',
          }}
        >
          ⟺
        </div>
      </div>

      {/* BEFORE label */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          fontSize: 10,
          background: 'rgba(0,0,0,0.72)',
          color: '#fff',
          padding: '1px 5px',
          borderRadius: 3,
          pointerEvents: 'none',
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
        }}
      >
        BEFORE {zone.beforeDate}
      </div>

      {/* AFTER label */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          fontSize: 10,
          background: 'rgba(0,0,0,0.72)',
          color: '#fb923c',
          padding: '1px 5px',
          borderRadius: 3,
          pointerEvents: 'none',
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
        }}
      >
        AFTER {zone.afterDate}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BeforeAfterSlider — floating panel
// ---------------------------------------------------------------------------

export function BeforeAfterSlider() {
  const [visible, setVisible] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(CONFLICT_ZONES[0].id);

  const setCameraTarget = useAppStore((s) => s.setCameraTarget);

  const selectedZone = CONFLICT_ZONES.find((z) => z.id === selectedZoneId) ?? CONFLICT_ZONES[0];

  const handleNavigate = () => {
    setCameraTarget({
      longitude: selectedZone.lng,
      latitude: selectedZone.lat,
      height: 50000,
    });
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        right: 340,
        transform: 'translateY(-50%)',
        zIndex: 35,
        width: 300,
        background: 'rgba(10,14,26,0.96)',
        border: '1px solid rgba(56,189,248,0.25)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        overflow: 'hidden',
        fontFamily: 'monospace',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderBottom: '1px solid rgba(56,189,248,0.15)',
          background: 'rgba(56,189,248,0.06)',
        }}
      >
        <span style={{ color: '#38bdf8', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>
          🛰 BEFORE/AFTER INTEL
        </span>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: 14,
            cursor: 'pointer',
            lineHeight: 1,
            padding: '0 2px',
          }}
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Zone selector */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
        <label style={{ color: '#94a3b8', fontSize: 10, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
          ZONE
        </label>
        <select
          value={selectedZoneId}
          onChange={(e) => setSelectedZoneId(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(30,41,59,0.9)',
            border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: 4,
            color: '#e2e8f0',
            fontSize: 11,
            padding: '4px 6px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {CONFLICT_ZONES.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name} ({z.country})
            </option>
          ))}
        </select>

        <p
          style={{
            margin: '6px 0 0',
            color: '#64748b',
            fontSize: 10,
            lineHeight: 1.4,
          }}
        >
          {selectedZone.description}
        </p>
      </div>

      {/* Tile slider */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
        <SliderView key={selectedZone.id} zone={selectedZone} />
        <p
          style={{
            margin: '6px 0 0',
            color: '#475569',
            fontSize: 9,
            textAlign: 'center',
            letterSpacing: '0.05em',
          }}
        >
          NASA GIBS · MODIS Terra TrueColor · Drag divider to compare
        </p>
      </div>

      {/* Navigate footer */}
      <div
        style={{
          padding: '7px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#38bdf8',
              display: 'inline-block',
              boxShadow: '0 0 6px #38bdf8',
            }}
          />
          <span style={{ color: '#94a3b8', fontSize: 10 }}>Navigate to location</span>
        </div>
        <button
          onClick={handleNavigate}
          style={{
            background: 'rgba(56,189,248,0.12)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 4,
            color: '#38bdf8',
            fontSize: 10,
            padding: '3px 8px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.22)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.12)';
          }}
          title="Fly to location"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BeforeAfterToggle — small floating toggle button
// ---------------------------------------------------------------------------

interface BeforeAfterToggleProps {
  /** Optional extra style overrides for positioning */
  style?: React.CSSProperties;
}

export function BeforeAfterToggle({ style }: BeforeAfterToggleProps) {
  const [active, setActive] = useState(false);

  return (
    <>
      <button
        onClick={() => setActive((v) => !v)}
        title="Before/After Satellite Comparison"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          background: active ? 'rgba(56,189,248,0.2)' : 'rgba(15,23,42,0.85)',
          border: `1px solid ${active ? 'rgba(56,189,248,0.6)' : 'rgba(56,189,248,0.2)'}`,
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 16,
          boxShadow: active ? '0 0 10px rgba(56,189,248,0.3)' : 'none',
          transition: 'all 0.15s',
          ...style,
        }}
      >
        🛰
      </button>
      {active && <BeforeAfterSliderStandalone onClose={() => setActive(false)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Standalone version driven by toggle (separate visibility state)
// ---------------------------------------------------------------------------

interface BeforeAfterSliderStandaloneProps {
  onClose: () => void;
}

function BeforeAfterSliderStandalone({ onClose }: BeforeAfterSliderStandaloneProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(CONFLICT_ZONES[0].id);
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);

  const selectedZone = CONFLICT_ZONES.find((z) => z.id === selectedZoneId) ?? CONFLICT_ZONES[0];

  const handleNavigate = () => {
    setCameraTarget({
      longitude: selectedZone.lng,
      latitude: selectedZone.lat,
      height: 50000,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        right: 340,
        transform: 'translateY(-50%)',
        zIndex: 35,
        width: 300,
        background: 'rgba(10,14,26,0.96)',
        border: '1px solid rgba(56,189,248,0.25)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        overflow: 'hidden',
        fontFamily: 'monospace',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderBottom: '1px solid rgba(56,189,248,0.15)',
          background: 'rgba(56,189,248,0.06)',
        }}
      >
        <span style={{ color: '#38bdf8', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>
          🛰 BEFORE/AFTER INTEL
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: 14,
            cursor: 'pointer',
            lineHeight: 1,
            padding: '0 2px',
          }}
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Zone selector */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
        <label
          style={{
            color: '#94a3b8',
            fontSize: 10,
            letterSpacing: '0.08em',
            display: 'block',
            marginBottom: 4,
          }}
        >
          ZONE
        </label>
        <select
          value={selectedZoneId}
          onChange={(e) => setSelectedZoneId(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(30,41,59,0.9)',
            border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: 4,
            color: '#e2e8f0',
            fontSize: 11,
            padding: '4px 6px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {CONFLICT_ZONES.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name} ({z.country})
            </option>
          ))}
        </select>

        <p
          style={{
            margin: '6px 0 0',
            color: '#64748b',
            fontSize: 10,
            lineHeight: 1.4,
          }}
        >
          {selectedZone.description}
        </p>
      </div>

      {/* Tile slider */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
        <SliderView key={selectedZone.id} zone={selectedZone} />
        <p
          style={{
            margin: '6px 0 0',
            color: '#475569',
            fontSize: 9,
            textAlign: 'center',
            letterSpacing: '0.05em',
          }}
        >
          NASA GIBS · MODIS Terra TrueColor · Drag divider to compare
        </p>
      </div>

      {/* Navigate footer */}
      <div
        style={{
          padding: '7px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#38bdf8',
              display: 'inline-block',
              boxShadow: '0 0 6px #38bdf8',
            }}
          />
          <span style={{ color: '#94a3b8', fontSize: 10 }}>Navigate to location</span>
        </div>
        <button
          onClick={handleNavigate}
          style={{
            background: 'rgba(56,189,248,0.12)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 4,
            color: '#38bdf8',
            fontSize: 10,
            padding: '3px 8px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.22)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.12)';
          }}
          title="Fly to location"
        >
          →
        </button>
      </div>
    </div>
  );
}
