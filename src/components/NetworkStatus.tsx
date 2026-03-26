import { useAppStore } from '@/store/useAppStore';

const SOURCES = [
  { key: 'satellites', label: 'CELESTRAK', icon: '🛰' },
  { key: 'flights', label: 'OPENSKY', icon: '✈' },
  { key: 'ships', label: 'AISSTREAM', icon: '🚢' },
  { key: 'earthquakes', label: 'USGS', icon: '⚡' },
];

/** 네트워크/데이터소스 연결 상태 + 마지막 갱신 시간 */
export default function NetworkStatus() {
  const lastUpdated = useAppStore((s) => s.lastUpdated);
  const activeLayers = useAppStore((s) => s.activeLayers);
  const dataCounts = useAppStore((s) => s.dataCounts);

  function timeAgo(ts: number): string {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return 'LIVE';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  return (
    <div className="fixed top-[430px] right-4 z-30 pointer-events-none">
      <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-700/30 rounded px-3 py-2 font-mono">
        <div className="text-zinc-500 text-[9px] tracking-widest mb-1">NETWORK STATUS</div>
        {SOURCES.map((src) => {
          const active = activeLayers.includes(src.key);
          const ts = lastUpdated[src.key];
          const count = dataCounts[src.key] || 0;
          return (
            <div key={src.key} className="flex items-center gap-1.5 text-[10px] py-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                active ? (ts ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400') : 'bg-zinc-600'
              }`} />
              <span className="text-zinc-500 w-16">{src.label}</span>
              <span className={`flex-1 text-right ${active ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {active ? (ts ? timeAgo(ts) : 'SYNC...') : 'OFF'}
              </span>
              {active && count > 0 && (
                <span className="text-zinc-600 w-10 text-right">{count}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
