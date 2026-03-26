

import { useAppStore } from '@/store/useAppStore';

const LAYERS = [
  { id: 'satellites', label: 'Satellites', icon: '🛰' },
  { id: 'flights', label: 'Flights', icon: '✈' },
  { id: 'ships', label: 'Ships (AIS)', icon: '🚢' },
  { id: 'earthquakes', label: 'Earthquakes', icon: '⚡' },
  { id: 'osint', label: 'OSINT News', icon: '📰' },
] as const;

// 외부에서 데이터 카운트를 주입받을 수 있도록 props 지원
interface LayerSelectorProps {
  dataCounts?: Record<string, number>;
}

export default function LayerSelector({ dataCounts = {} }: LayerSelectorProps) {
  const { activeLayers, toggleLayer } = useAppStore();

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2">
        Data Layers
      </h3>
      {LAYERS.map((layer) => {
        const isActive = activeLayers.includes(layer.id);
        const count = dataCounts[layer.id] ?? 0;

        return (
          <label
            key={layer.id}
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors
              ${isActive ? 'bg-emerald-900/30 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
          >
            <input
              type="checkbox"
              checked={isActive}
              onChange={() => toggleLayer(layer.id)}
              className="accent-emerald-500 w-3.5 h-3.5"
            />
            <span className="text-sm flex-1">
              {layer.icon} {layer.label}
            </span>
            <span className="text-xs tabular-nums text-zinc-500">
              {count.toLocaleString()}
            </span>
          </label>
        );
      })}
    </div>
  );
}
