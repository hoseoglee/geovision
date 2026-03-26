import { useState, useMemo, memo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { fetchCCTVs, type CCTVData } from '@/providers/CCTVProvider';

const TYPE_COLORS: Record<string, string> = {
  city: 'text-emerald-400',
  landmark: 'text-amber-400',
  port: 'text-cyan-400',
  traffic: 'text-orange-400',
  webcam: 'text-purple-400',
};

export default memo(function CCTVFilter() {
  const activeOverlays = useAppStore((s) => s.activeOverlays);
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const isCCTVActive = activeOverlays.includes('cctv');
  const cctvs = isCCTVActive ? fetchCCTVs() : [];

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cctvs.forEach((c) => { counts[c.type] = (counts[c.type] || 0) + 1; });
    return counts;
  }, [cctvs]);

  const filtered = useMemo(() => {
    let list = cctvs;
    if (typeFilter) list = list.filter((c) => c.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)
      );
    }
    return list.slice(0, 20);
  }, [cctvs, typeFilter, search]);

  if (!isCCTVActive) return null;

  const flyTo = (cam: CCTVData) => {
    setCameraTarget({ latitude: cam.lat, longitude: cam.lng, height: 5000 });
  };

  return (
    <div>
      <h3 className="text-zinc-400 text-[10px] font-bold tracking-widest mb-2">
        CCTV FILTER ({cctvs.length})
      </h3>

      {/* 검색 */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search cameras..."
        className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1
          text-[10px] text-zinc-300 placeholder-zinc-600 font-mono
          focus:border-emerald-500/50 focus:outline-none mb-2"
      />

      {/* 타입 필터 */}
      <div className="flex flex-wrap gap-1 mb-2">
        <button
          onClick={() => setTypeFilter(null)}
          className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-colors
            ${!typeFilter
              ? 'border-emerald-500/50 text-emerald-400 bg-emerald-900/20'
              : 'border-zinc-700/50 text-zinc-600 hover:text-zinc-400'}`}
        >
          ALL
        </button>
        {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setTypeFilter(typeFilter === type ? null : type)}
            className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-colors
              ${typeFilter === type
                ? 'border-emerald-500/50 text-emerald-400 bg-emerald-900/20'
                : 'border-zinc-700/50 text-zinc-600 hover:text-zinc-400'}`}
          >
            {type.toUpperCase()} {count}
          </button>
        ))}
      </div>

      {/* 결과 리스트 */}
      <div className="space-y-0.5 max-h-32 overflow-y-auto scrollbar-thin">
        {filtered.map((cam) => (
          <button
            key={cam.id}
            onClick={() => flyTo(cam)}
            className="w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded
              hover:bg-zinc-800/50 transition-colors group"
          >
            <span className={`text-[8px] ${TYPE_COLORS[cam.type] || 'text-zinc-500'}`}>●</span>
            <span className="text-[9px] text-zinc-400 group-hover:text-zinc-200 truncate flex-1">
              {cam.name}
            </span>
            <span className="text-[8px] text-zinc-600 shrink-0">{cam.city}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-zinc-600 text-[9px] text-center py-2">NO MATCH</div>
        )}
        {filtered.length === 20 && (
          <div className="text-zinc-600 text-[8px] text-center py-1">
            {search || typeFilter ? 'Showing first 20' : `${cctvs.length - 20} more...`}
          </div>
        )}
      </div>
    </div>
  );
});
