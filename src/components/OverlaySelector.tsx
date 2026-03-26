import { useAppStore } from '@/store/useAppStore';
import { getCCTVCount } from '@/providers/CCTVProvider';

const OVERLAYS = [
  { id: 'satellite', label: 'Satellite Photo', icon: '🛰' },
  { id: 'clouds', label: 'Weather/Cloud', icon: '🌧' },
  { id: 'terrain3d', label: '3D Buildings', icon: '🏔' },
  { id: 'traffic', label: 'Traffic Flow', icon: '🚗' },
  { id: 'cctv', label: 'CCTV Cameras', icon: '📹', dynamic: true },
  { id: 'terminator', label: 'Day/Night Line', icon: '🌓' },
  { id: 'nightLights', label: 'Night Lights', icon: '🌃' },
  { id: 'seaTemp', label: 'Sea Temp', icon: '🌡' },
  { id: 'cables', label: 'Submarine Cables', icon: '🔌' },
  { id: 'military', label: 'Military Bases', icon: '🎖' },
  { id: 'nuclear', label: 'Nuclear Plants', icon: '☢' },
  { id: 'ports', label: 'Major Ports', icon: '⚓' },
  { id: 'currents', label: 'Ocean Currents', icon: '🌊' },
  { id: 'sunPos', label: 'Sun Position', icon: '☀' },
  { id: 'godMode', label: 'God Mode', icon: '👁' },
  { id: 'vehicles', label: 'Vehicle Detect', icon: '🚙' },
  { id: 'adsb', label: 'Military Air', icon: '✈' },
  { id: 'weather', label: 'Weather', icon: '🌡' },
  { id: 'typhoon', label: 'Typhoons', icon: '🌀' },
  { id: 'volcano', label: 'Volcanoes', icon: '🌋' },
  { id: 'wildfire', label: 'Wildfires', icon: '🔥' },
];

export default function OverlaySelector() {
  const activeOverlays = useAppStore((s) => s.activeOverlays);
  const toggleOverlay = useAppStore((s) => s.toggleOverlay);

  return (
    <div>
      <h3 className="text-zinc-400 text-[10px] font-mono tracking-widest mb-2 uppercase">
        Intel Overlays
      </h3>
      <div className="grid grid-cols-2 gap-1">
        {OVERLAYS.map((o) => {
          const active = activeOverlays.includes(o.id);
          return (
            <button
              key={o.id}
              onClick={() => toggleOverlay(o.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors
                ${active
                  ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent'
                }`}
            >
              <span className="text-xs">{o.icon}</span>
              <span className="truncate">
                {o.label}
                {(o as any).dynamic && active && (
                  <span className="ml-1 text-[8px] text-zinc-400">({getCCTVCount()})</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
