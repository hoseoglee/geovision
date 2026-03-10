

import { useEffect, useState, useCallback } from 'react';
import { useAppStore, type CameraTarget } from '@/store/useAppStore';
import { cities, type City } from '@/data/landmarks';

const NAV_KEYS = ['q', 'w', 'e', 'r', 't'] as const;

export default function LandmarkNav() {
  const { setCameraTarget } = useAppStore();
  const [selectedCityIdx, setSelectedCityIdx] = useState(0);
  const [selectedLandmarkIdx, setSelectedLandmarkIdx] = useState(-1);

  const city: City = cities[selectedCityIdx];
  const landmarks = city.landmarks;

  const flyTo = useCallback(
    (lat: number, lng: number) => {
      const target: CameraTarget = {
        latitude: lat,
        longitude: lng,
        height: 2000,
      };
      setCameraTarget(target);
    },
    [setCameraTarget]
  );

  // 도시 변경 시 랜드마크 선택 초기화 & 도시로 이동
  const handleCityChange = useCallback(
    (idx: number) => {
      setSelectedCityIdx(idx);
      setSelectedLandmarkIdx(-1);
      const c = cities[idx];
      flyTo(c.latitude, c.longitude);
    },
    [flyTo]
  );

  // 랜드마크 선택
  const handleLandmarkSelect = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= landmarks.length) return;
      setSelectedLandmarkIdx(idx);
      const lm = landmarks[idx];
      flyTo(lm.latitude, lm.longitude);
    },
    [landmarks, flyTo]
  );

  // Q/W/E/R/T 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const keyIdx = NAV_KEYS.indexOf(e.key.toLowerCase() as (typeof NAV_KEYS)[number]);
      if (keyIdx !== -1 && keyIdx < landmarks.length) {
        handleLandmarkSelect(keyIdx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [landmarks, handleLandmarkSelect]);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-2">
        Landmark Nav
      </h3>

      {/* 도시 드롭다운 */}
      <select
        value={selectedCityIdx}
        onChange={(e) => handleCityChange(Number(e.target.value))}
        className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-2 py-1.5
          focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30"
      >
        {cities.map((c, i) => (
          <option key={c.name} value={i}>
            {c.name}
          </option>
        ))}
      </select>

      {/* 랜드마크 목록 */}
      <div className="space-y-1">
        {landmarks.map((lm, i) => {
          const isActive = selectedLandmarkIdx === i;
          const shortcutKey = NAV_KEYS[i]?.toUpperCase();

          return (
            <button
              key={lm.name}
              onClick={() => handleLandmarkSelect(i)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center gap-2
                ${
                  isActive
                    ? 'bg-green-600/30 text-green-300'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`}
            >
              {shortcutKey && (
                <kbd
                  className={`text-[10px] w-4 h-4 flex items-center justify-center rounded border
                    ${isActive ? 'border-green-500 text-green-400' : 'border-gray-600 text-gray-500'}`}
                >
                  {shortcutKey}
                </kbd>
              )}
              <span className="flex-1 truncate">{lm.name}</span>
            </button>
          );
        })}
      </div>

      {/* 현재 위치 표시 */}
      <div className="text-[10px] text-gray-600 pt-1 border-t border-gray-800">
        {selectedLandmarkIdx >= 0
          ? `${city.name} / ${landmarks[selectedLandmarkIdx].name}`
          : city.name}
      </div>
    </div>
  );
}
