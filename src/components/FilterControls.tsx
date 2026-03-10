

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

const FILTERS = [
  { id: 'normal', label: 'Normal', key: '1' },
  { id: 'crt', label: 'CRT', key: '2' },
  { id: 'nightvision', label: 'Night Vision', key: '3' },
  { id: 'thermal', label: 'Thermal', key: '4' },
] as const;

export default function FilterControls() {
  const { activeFilter, setActiveFilter } = useAppStore();

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

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-2">
        Visual Filter
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
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
    </div>
  );
}
