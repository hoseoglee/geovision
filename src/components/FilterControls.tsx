

import { useEffect, useState } from 'react';
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
  const {
    activeFilters, setActiveFilter, toggleFilter,
    filterParams, setFilterParam,
    filterPresets, saveFilterPreset, loadFilterPreset, deleteFilterPreset,
  } = useAppStore();

  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const filter = FILTERS.find((f) => f.key === e.key);
      if (filter) {
        if (filter.id === 'normal') {
          setActiveFilter(null); // Reset all
        } else if (e.ctrlKey || e.metaKey) {
          toggleFilter(filter.id); // Ctrl/Cmd+숫자: 다중 선택
        } else {
          setActiveFilter(filter.id); // 단일 선택
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFilters, setActiveFilter, toggleFilter]);

  // 활성 필터들의 파라미터 목록 수집
  const allActiveParams = activeFilters.flatMap((f) => FILTER_PARAMS[f] || []);
  const presetNames = Object.keys(filterPresets);

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-2">
        Visual Filter
      </h3>
      <div className="grid grid-cols-3 gap-1.5">
        {FILTERS.map((filter) => {
          const isActive = filter.id === 'normal'
            ? activeFilters.length === 0
            : activeFilters.includes(filter.id);

          return (
            <button
              key={filter.id}
              onClick={(e) => {
                if (filter.id === 'normal') {
                  setActiveFilter(null);
                } else if (e.ctrlKey || e.metaKey) {
                  toggleFilter(filter.id); // Ctrl/Cmd+클릭: 다중 선택
                } else {
                  setActiveFilter(filter.id); // 일반 클릭: 단일 선택
                }
              }}
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
      {activeFilters.length > 0 && (
        <p className="text-[9px] text-gray-600 mt-1">⌘/Ctrl+Click to combine filters</p>
      )}

      {/* 파라미터 슬라이더 */}
      {allActiveParams.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-gray-700/50 pt-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Parameters {activeFilters.length > 1 && `(${activeFilters.length} filters)`}
          </h4>
          {allActiveParams.map((param) => (
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

          {/* 프리셋 저장/불러오기 */}
          <div className="mt-2 border-t border-gray-700/30 pt-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPresets ? 'Hide' : 'Presets'} ({presetNames.length})
              </button>
              <div className="flex-1" />
              <input
                type="text"
                placeholder="Name..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-20 px-1.5 py-0.5 text-[10px] bg-gray-800/60 border border-gray-700 rounded
                  text-gray-300 placeholder-gray-600 focus:border-green-600 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (presetName.trim()) {
                    saveFilterPreset(presetName.trim());
                    setPresetName('');
                  }
                }}
                disabled={!presetName.trim()}
                className="px-1.5 py-0.5 text-[10px] bg-green-800/40 border border-green-700/50 rounded
                  text-green-400 hover:bg-green-700/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>

            {showPresets && presetNames.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {presetNames.map((name) => (
                  <div key={name} className="flex items-center gap-1">
                    <button
                      onClick={() => loadFilterPreset(name)}
                      className="flex-1 text-left px-1.5 py-0.5 text-[10px] text-gray-400
                        hover:text-green-300 hover:bg-gray-800/50 rounded transition-colors truncate"
                    >
                      {name}
                    </button>
                    <button
                      onClick={() => deleteFilterPreset(name)}
                      className="px-1 text-[10px] text-gray-600 hover:text-red-400 transition-colors"
                      title="Delete preset"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
