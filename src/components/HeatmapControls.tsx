import { useAppStore } from '@/store/useAppStore';

const HEATMAP_LAYERS = [
  { id: 'flights', label: 'Flights Density', icon: '✈' },
  { id: 'ships', label: 'Ships Density', icon: '🚢' },
  { id: 'earthquakes', label: 'Earthquakes Density', icon: '⚡' },
] as const;

const PALETTES = [
  { id: 'thermal', label: 'Thermal' },
  { id: 'viridis', label: 'Viridis' },
  { id: 'plasma', label: 'Plasma' },
] as const;

export default function HeatmapControls() {
  const activeHeatmaps = useAppStore((s) => s.activeHeatmaps);
  const toggleHeatmap = useAppStore((s) => s.toggleHeatmap);
  const heatmapParams = useAppStore((s) => s.heatmapParams);
  const setHeatmapParam = useAppStore((s) => s.setHeatmapParam);

  const anyActive = activeHeatmaps.length > 0;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-2">
        Heatmap Layers
      </h3>

      {/* 레이어 토글 */}
      <div className="space-y-1">
        {HEATMAP_LAYERS.map((layer) => {
          const isActive = activeHeatmaps.includes(layer.id);
          return (
            <label
              key={layer.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors
                ${isActive ? 'bg-orange-900/30 text-orange-300' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-600/40'}`}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => toggleHeatmap(layer.id)}
                className="accent-orange-500 w-3.5 h-3.5"
              />
              <span className="text-sm flex-1">
                {layer.icon} {layer.label}
              </span>
            </label>
          );
        })}
      </div>

      {/* 파라미터 슬라이더 (활성 히트맵이 있을 때만) */}
      {anyActive && (
        <div className="space-y-2 mt-2 pt-2 border-t border-zinc-700/30">
          {/* 강도 */}
          <div>
            <div className="flex justify-between text-[10px] text-zinc-400 mb-0.5">
              <span>Intensity</span>
              <span className="tabular-nums">{heatmapParams.intensity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={heatmapParams.intensity}
              onChange={(e) => setHeatmapParam('intensity', parseFloat(e.target.value))}
              className="w-full h-1 accent-orange-500"
            />
          </div>

          {/* 투명도 */}
          <div>
            <div className="flex justify-between text-[10px] text-zinc-400 mb-0.5">
              <span>Opacity</span>
              <span className="tabular-nums">{heatmapParams.opacity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={heatmapParams.opacity}
              onChange={(e) => setHeatmapParam('opacity', parseFloat(e.target.value))}
              className="w-full h-1 accent-orange-500"
            />
          </div>

          {/* 팔레트 선택 */}
          <div>
            <div className="text-[10px] text-zinc-400 mb-1">Palette</div>
            <div className="flex gap-1">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setHeatmapParam('palette', p.id)}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors
                    ${heatmapParams.palette === p.id
                      ? 'border-orange-500/60 text-orange-300 bg-orange-900/30'
                      : 'border-zinc-600/40 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
