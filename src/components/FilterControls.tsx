

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

const FILTERS = [
  { id: 'normal', label: 'Normal', key: '1' },
  { id: 'crt', label: 'CRT', key: '2' },
  { id: 'nightvision', label: 'Night Vision', key: '3' },
  { id: 'thermal', label: 'Thermal', key: '4' },
  { id: 'flir', label: 'FLIR', key: '5' },
  { id: 'anime', label: 'Anime', key: '6' },
  { id: 'lut', label: 'Cinematic', key: '7' },
] as const;

const FILTER_PARAMS: Record<string, { key: string; label: string; min: number; max: number; step: number; default: number }[]> = {
  flir: [
    { key: 'flirContrast', label: 'Contrast', min: 0.5, max: 3.0, step: 0.1, default: 1.8 },
    { key: 'flirNoise', label: 'Noise', min: 0.0, max: 0.1, step: 0.005, default: 0.03 },
  ],
  anime: [
    { key: 'animeEdge', label: 'Edge', min: 0.5, max: 3.0, step: 0.1, default: 1.5 },
    { key: 'animePastel', label: 'Pastel', min: 0.0, max: 1.0, step: 0.05, default: 0.5 },
  ],
  lut: [
    { key: 'lutSaturation', label: 'Saturation', min: 0.0, max: 1.5, step: 0.05, default: 0.85 },
    { key: 'lutVignette', label: 'Vignette', min: 0.0, max: 2.0, step: 0.1, default: 1.2 },
    { key: 'lutContrast', label: 'Contrast', min: 0.5, max: 2.0, step: 0.1, default: 1.0 },
  ],
};

export default function FilterControls() {
  const { activeFilter, setActiveFilter, filterParams, setFilterParam } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // input/textarea 등에서 입력 중이면 무시
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const filter = FILTERS.find((f) => f.key === e.key);
      if (filter) {
        // 같은 필터를 다시 누르면 해제 (normal 제외)
        setActiveFilter(
          activeFilter === filter.id && filter.id !== 'normal'
            ? 'normal'
            : filter.id
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFilter, setActiveFilter]);

  const activeFilterParams = activeFilter ? FILTER_PARAMS[activeFilter] : undefined;

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-2">
        Visual Filter
      </h3>
      <div className="grid grid-cols-3 gap-1.5">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.id || (!activeFilter && filter.id === 'normal');

          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-2 py-1.5 rounded text-xs font-medium transition-all border
                ${
                  isActive
                    ? 'bg-green-600/30 border-green-500 text-green-300 shadow-[0_0_8px_rgba(34,197,94,0.2)]'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
            >
              <span>{filter.label}</span>
              <kbd className="ml-1 text-[10px] opacity-50">{filter.key}</kbd>
            </button>
          );
        })}
      </div>
      {activeFilterParams && (
        <div className="mt-3 space-y-2 border-t border-gray-700/50 pt-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Parameters
          </h4>
          {activeFilterParams.map((param) => (
            <div key={param.key} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-16 shrink-0">{param.label}</span>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={filterParams[param.key] ?? param.default}
                onChange={(e) => setFilterParam(param.key, parseFloat(e.target.value))}
                className="flex-1 h-1 accent-green-500 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[10px] text-gray-500 w-8 text-right">
                {(filterParams[param.key] ?? param.default).toFixed(param.step < 0.01 ? 3 : 1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
