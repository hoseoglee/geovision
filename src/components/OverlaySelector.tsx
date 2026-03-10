import { useAppStore } from '@/store/useAppStore';

const OVERLAYS = [
  { id: 'clouds', label: 'Weather Radar', icon: '🌧' },
  { id: 'terminator', label: 'Day/Night Line', icon: '🌓' },
  { id: 'nightLights', label: 'Night Lights', icon: '🌃' },
  { id: 'seaTemp', label: 'Sea Temp', icon: '🌡' },
  { id: 'cables', label: 'Submarine Cables', icon: '🔌' },
  { id: 'military', label: 'Military Bases', icon: '🎖' },
  { id: 'nuclear', label: 'Nuclear Plants', icon: '☢' },
  { id: 'ports', label: 'Major Ports', icon: '⚓' },
  { id: 'currents', label: 'Ocean Currents', icon: '🌊' },
  { id: 'sunPos', label: 'Sun Position', icon: '☀' },
];

export default function OverlaySelector() {
  const activeOverlays = useAppStore((s) => s.activeOverlays);
  const toggleOverlay = useAppStore((s) => s.toggleOverlay);

  return (
    <div>
      <h3 className="text-gray-400 text-[10px] font-mono tracking-widest mb-2 uppercase">
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
                  ? 'bg-green-900/40 text-green-300 border border-green-500/30'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-transparent'
                }`}
            >
              <span className="text-xs">{o.icon}</span>
              <span className="truncate">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
