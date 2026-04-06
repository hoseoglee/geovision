import { useState, useEffect } from 'react';
import { useDarkVesselStore, type DarkGapEvent } from '@/store/useDarkVesselStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

function formatCoord(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr} ${lngStr}`;
}

function truncateMmsi(mmsi: string): string {
  return mmsi.length > 9 ? mmsi.slice(0, 9) : mmsi;
}

// ─── Dark Vessel Row ──────────────────────────────────────────────────────────

function DarkVesselRow({ gap }: { gap: DarkGapEvent }) {
  const duration = gap.isOngoing
    ? Date.now() - gap.gapStartTime
    : gap.gapDurationMs;

  const coords = gap.isOngoing
    ? formatCoord(gap.lastKnownLat, gap.lastKnownLng)
    : gap.resumeLat != null && gap.resumeLng != null
    ? formatCoord(gap.resumeLat, gap.resumeLng)
    : formatCoord(gap.lastKnownLat, gap.lastKnownLng);

  return (
    <div className="border-b border-zinc-700/40 py-1.5 px-2 hover:bg-zinc-800/60 transition-colors">
      {/* Ship name + status badge */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-bold text-cyan-300 tracking-wide truncate max-w-[120px]">
          {gap.shipName || 'UNKNOWN'}
        </span>
        {gap.isOngoing ? (
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            <span className="text-[8px] font-bold text-red-400 tracking-widest">DARK</span>
          </span>
        ) : (
          <span className="text-[8px] font-bold text-amber-400 tracking-widest shrink-0">RESUMED</span>
        )}
      </div>

      {/* MMSI + ship type */}
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[8px] text-zinc-500 font-mono">MMSI {truncateMmsi(gap.mmsi)}</span>
        <span className="text-[8px] text-zinc-600">·</span>
        <span className="text-[8px] text-zinc-500 uppercase truncate">{gap.shipType || 'UNKNOWN'}</span>
      </div>

      {/* Duration + coords */}
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[8px] text-zinc-400 font-mono">
          GAP <span className={gap.isOngoing ? 'text-red-400' : 'text-amber-400'}>{formatDuration(duration)}</span>
        </span>
        <span className="text-[8px] text-zinc-500 font-mono">{coords}</span>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function DarkVesselPanel() {
  const { darkGaps, analyticsVisible, toggleAnalytics } = useDarkVesselStore();
  const [collapsed, setCollapsed] = useState(true);

  // Auto-expand when events appear
  useEffect(() => {
    if (darkGaps.length > 0 && collapsed) {
      setCollapsed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkGaps.length]);

  const ongoingCount = darkGaps.filter((g) => g.isOngoing).length;
  const hasEvents = darkGaps.length > 0;

  return (
    <div
      className="fixed bottom-16 left-4 z-50 w-64 font-mono select-none"
      style={{ userSelect: 'none' }}
    >
      {/* ── Header / toggle bar ── */}
      <div
        className="flex items-center justify-between px-2 py-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-t cursor-pointer hover:bg-zinc-800/90 transition-colors"
        style={{ borderRadius: collapsed ? '4px' : '4px 4px 0 0' }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {/* Collapse chevron */}
          <span className="text-zinc-500 text-[10px]">{collapsed ? '▶' : '▼'}</span>
          <span className="text-[10px] font-bold tracking-widest text-zinc-300 uppercase">
            Dark Vessels
          </span>
        </div>

        {/* Count badge */}
        <div className="flex items-center gap-1.5">
          {hasEvents && (
            <span
              className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[9px] font-bold ${
                ongoingCount > 0
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {darkGaps.length}
            </span>
          )}
          {ongoingCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
      </div>

      {/* ── Expanded panel body ── */}
      {!collapsed && (
        <div className="bg-zinc-900/90 backdrop-blur-md border border-t-0 border-zinc-700/50 rounded-b">
          {/* Vessel list */}
          {darkGaps.length === 0 ? (
            <div className="px-3 py-3 text-center text-[9px] text-zinc-600 tracking-widest uppercase">
              No dark events detected
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
              {darkGaps.map((gap) => (
                <DarkVesselRow key={gap.id} gap={gap} />
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-zinc-700/40 mx-2" />

          {/* Chokepoint analytics toggle */}
          <div className="p-2">
            <button
              onClick={toggleAnalytics}
              className={`w-full text-[9px] font-bold tracking-widest uppercase py-1.5 px-2 rounded border transition-colors ${
                analyticsVisible
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30'
                  : 'bg-zinc-800/60 border-zinc-600/50 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-300'
              }`}
            >
              {analyticsVisible ? '◉' : '◎'} Chokepoint Analytics
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
