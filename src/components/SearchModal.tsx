import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { cities } from '@/data/landmarks';
import { CHOKEPOINTS } from '@/data/chokepoints';
import { MILITARY_BASES, NUCLEAR_PLANTS, MAJOR_PORTS } from '@/data/overlayData';

interface SearchResult {
  name: string;
  category: string;
  lat: number;
  lng: number;
  detail?: string;
}

function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = [];

  // Cities & landmarks
  for (const city of cities) {
    results.push({ name: city.name, category: 'CITY', lat: city.latitude, lng: city.longitude });
    for (const lm of city.landmarks) {
      results.push({ name: lm.name, category: 'LANDMARK', lat: lm.latitude, lng: lm.longitude, detail: city.name });
    }
  }

  // Chokepoints
  for (const cp of CHOKEPOINTS) {
    results.push({ name: cp.name, category: 'CHOKEPOINT', lat: cp.lat, lng: cp.lng, detail: cp.info });
  }

  // Military bases
  for (const base of MILITARY_BASES) {
    results.push({ name: base.name, category: 'MIL BASE', lat: base.lat, lng: base.lng, detail: `${base.country} ${base.type}` });
  }

  // Nuclear plants
  for (const plant of NUCLEAR_PLANTS) {
    results.push({ name: plant.name, category: 'NUCLEAR', lat: plant.lat, lng: plant.lng, detail: `${plant.country} ${plant.reactors}R` });
  }

  // Ports
  for (const port of MAJOR_PORTS) {
    results.push({ name: port.name, category: 'PORT', lat: port.lat, lng: port.lng, detail: `#${port.rank} ${port.country}` });
  }

  return results;
}

const CATEGORY_COLOR: Record<string, string> = {
  CITY: 'text-emerald-400',
  LANDMARK: 'text-emerald-500',
  CHOKEPOINT: 'text-orange-400',
  'MIL BASE': 'text-red-400',
  NUCLEAR: 'text-yellow-400',
  PORT: 'text-blue-400',
};

export default function SearchModal() {
  const searchVisible = useAppStore((s) => s.searchVisible);
  const toggleSearch = useAppStore((s) => s.toggleSearch);
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const searchIndex = useMemo(() => buildSearchIndex(), []);

  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setSelectedIdx(0);
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return searchIndex.slice(0, 20);
    const q = debouncedQuery.toLowerCase();
    return searchIndex
      .filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.detail?.toLowerCase().includes(q))
      .slice(0, 20);
  }, [debouncedQuery, searchIndex]);

  const selectResult = useCallback((result: SearchResult) => {
    setCameraTarget({
      latitude: result.lat,
      longitude: result.lng,
      height: 200000,
    });
    toggleSearch();
    setQuery('');
  }, [setCameraTarget, toggleSearch]);

  // Focus input on open
  useEffect(() => {
    if (searchVisible) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchVisible]);

  // Keyboard nav
  useEffect(() => {
    if (!searchVisible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIdx]) {
        e.preventDefault();
        selectResult(results[selectedIdx]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        toggleSearch();
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [searchVisible, results, selectedIdx, selectResult, toggleSearch]);

  if (!searchVisible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-center pt-[15vh] pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        onClick={() => { toggleSearch(); setQuery(''); }}
      />

      {/* Search panel */}
      <div className="relative pointer-events-auto w-[480px] max-h-[60vh] flex flex-col
        font-mono bg-zinc-900/95 backdrop-blur-md border border-emerald-500/40 rounded
        shadow-2xl shadow-emerald-900/20 animate-slideIn">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-700/40">
          <span className="text-emerald-400 text-sm">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locations, bases, ports..."
            className="flex-1 bg-transparent text-zinc-200 text-sm outline-none placeholder-zinc-600
              font-mono tracking-wide"
          />
          <span className="text-zinc-600 text-[9px] border border-zinc-700/40 px-1.5 py-0.5 rounded">ESC</span>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
          {results.length === 0 ? (
            <div className="text-zinc-600 text-xs text-center py-6">NO RESULTS FOUND</div>
          ) : (
            results.map((result, idx) => (
              <div
                key={`${result.category}-${result.name}`}
                className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors
                  ${idx === selectedIdx ? 'bg-emerald-900/30 border-l-2 border-emerald-500' : 'border-l-2 border-transparent hover:bg-zinc-800/40'}`}
                onClick={() => selectResult(result)}
                onMouseEnter={() => setSelectedIdx(idx)}
              >
                <span className={`text-[9px] font-bold w-16 shrink-0 ${CATEGORY_COLOR[result.category] ?? 'text-zinc-500'}`}>
                  {result.category}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-zinc-200 text-xs">{result.name}</span>
                  {result.detail && (
                    <span className="text-zinc-600 text-[9px] ml-2">{result.detail}</span>
                  )}
                </div>
                <span className="text-zinc-700 text-[8px] shrink-0">
                  {result.lat.toFixed(1)}, {result.lng.toFixed(1)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-1.5 border-t border-zinc-700/40 flex items-center justify-between">
          <span className="text-[8px] text-zinc-600">
            {results.length} RESULTS
          </span>
          <div className="flex gap-2 text-[8px] text-zinc-600">
            <span>↑↓ NAVIGATE</span>
            <span>ENTER SELECT</span>
            <span>/ TOGGLE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
