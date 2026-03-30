import { useEffect, useRef, useCallback } from 'react';
import { useNewsClusterStore, type ClusterSpeed } from '@/store/useNewsClusterStore';
import { clusterNewsEvents } from '@/osint/NewsClusterEngine';
import { fetchOsint } from '@/providers/OsintProvider';
import { getVisibleClusterState } from '@/osint/NewsClusterEngine';

const CATEGORY_COLORS: Record<string, string> = {
  conflict: '#FF4444',
  military: '#FF6600',
  disaster: '#FF8C00',
  politics: '#9966FF',
  economy: '#33CC33',
  health: '#00CCCC',
  environment: '#66BB6A',
  general: '#AAAAAA',
};

const CATEGORY_EMOJI: Record<string, string> = {
  conflict: '⚔️', military: '🪖', disaster: '⚠️',
  politics: '🏛️', economy: '💹', health: '🏥',
  environment: '🌿', general: '📰',
};

const SPEEDS: ClusterSpeed[] = [1, 2, 4, 8];

function fmt(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

function fmtDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function NewsClusterTimelapse() {
  const panelVisible = useNewsClusterStore((s) => s.panelVisible);
  const clusters = useNewsClusterStore((s) => s.clusters);
  const selectedClusterId = useNewsClusterStore((s) => s.selectedClusterId);
  const isPlaying = useNewsClusterStore((s) => s.isPlaying);
  const currentTime = useNewsClusterStore((s) => s.currentTime);
  const playbackSpeed = useNewsClusterStore((s) => s.playbackSpeed);

  const setClusters = useNewsClusterStore((s) => s.setClusters);
  const selectCluster = useNewsClusterStore((s) => s.selectCluster);
  const togglePanel = useNewsClusterStore((s) => s.togglePanel);
  const play = useNewsClusterStore((s) => s.play);
  const pause = useNewsClusterStore((s) => s.pause);
  const seek = useNewsClusterStore((s) => s.seek);
  const setSpeed = useNewsClusterStore((s) => s.setSpeed);
  const tick = useNewsClusterStore((s) => s.tick);

  const selectedCluster = clusters.find((c) => c.id === selectedClusterId) ?? null;
  const tickRef = useRef<number | null>(null);

  // Load and cluster OSINT data
  useEffect(() => {
    fetchOsint().then((news) => {
      const clustered = clusterNewsEvents(news);
      setClusters(clustered);
    });
  }, [setClusters]);

  // Playback tick loop
  useEffect(() => {
    if (isPlaying) {
      tickRef.current = window.setInterval(tick, 500);
    } else {
      if (tickRef.current !== null) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }
    return () => {
      if (tickRef.current !== null) clearInterval(tickRef.current);
    };
  }, [isPlaying, tick]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCluster) return;
    const frac = Number(e.target.value) / 1000;
    const t = selectedCluster.startTime + frac * (selectedCluster.endTime - selectedCluster.startTime);
    seek(t);
  }, [selectedCluster, seek]);

  const sliderValue = selectedCluster
    ? ((currentTime - selectedCluster.startTime) / Math.max(1, selectedCluster.endTime - selectedCluster.startTime)) * 1000
    : 0;

  const visible = panelVisible;
  if (!visible) return null;

  const visibleState = selectedCluster
    ? getVisibleClusterState(selectedCluster, currentTime)
    : null;

  return (
    <div
      className="fixed bottom-20 right-4 z-50 w-80 bg-zinc-900/95 backdrop-blur-md border border-amber-500/40
        rounded-lg shadow-2xl flex flex-col overflow-hidden"
      style={{ maxHeight: '70vh' }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-amber-500/30 flex items-center justify-between bg-amber-950/40">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm">🌐</span>
          <span className="text-amber-300 font-mono text-xs font-bold tracking-wider uppercase">
            News Timelapse
          </span>
          {clusters.length > 0 && (
            <span className="text-amber-500/70 text-[10px] font-mono">
              {clusters.length} clusters
            </span>
          )}
        </div>
        <button
          onClick={togglePanel}
          className="text-zinc-500 hover:text-zinc-300 text-xs w-5 h-5 flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      {/* Cluster list */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2" style={{ maxHeight: '250px' }}>
        {clusters.length === 0 && (
          <p className="text-zinc-500 text-xs text-center py-4 font-mono">
            Loading clusters...
          </p>
        )}
        {clusters.map((cluster) => {
          const isSelected = cluster.id === selectedClusterId;
          const color = CATEGORY_COLORS[cluster.category] ?? '#AAAAAA';
          const emoji = CATEGORY_EMOJI[cluster.category] ?? '📰';
          const span = fmtDuration(cluster.endTime - cluster.startTime);

          return (
            <button
              key={cluster.id}
              onClick={() => selectCluster(isSelected ? null : cluster.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all
                ${isSelected
                  ? 'bg-amber-900/50 border border-amber-500/60'
                  : 'bg-zinc-800/60 border border-zinc-700/40 hover:border-zinc-500/50'
                }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate font-mono" style={{ color }}>
                  {emoji} {cluster.label}
                </span>
                <span className="text-zinc-500 text-[10px] shrink-0">
                  {cluster.events.length}건
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 font-mono">
                <span>{cluster.arcs.length}개 경로</span>
                <span>·</span>
                <span>{span}</span>
                <span>·</span>
                <span>{cluster.category}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Playback controls (only when cluster selected) */}
      {selectedCluster && (
        <div className="border-t border-amber-500/20 bg-zinc-950/60 px-3 py-2 space-y-2">
          {/* Cluster info */}
          <div className="text-[10px] font-mono text-zinc-400 truncate">
            {CATEGORY_EMOJI[selectedCluster.category]} {selectedCluster.label}
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-zinc-500">
              <span>{fmt(selectedCluster.startTime)}</span>
              <span className="text-amber-400">{fmt(currentTime)}</span>
              <span>{fmt(selectedCluster.endTime)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1000}
              value={sliderValue}
              onChange={handleSeek}
              className="w-full h-1 accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Event count indicator */}
          {visibleState && (
            <div className="flex gap-3 text-[10px] font-mono text-zinc-400">
              <span className="text-amber-300">
                📍 {visibleState.visibleEvents.length}/{selectedCluster.events.length} 이벤트
              </span>
              <span>
                ↗ {visibleState.visibleArcs.length}개 호
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Rewind */}
            <button
              onClick={() => seek(selectedCluster.startTime)}
              className="text-zinc-400 hover:text-zinc-200 text-xs px-1"
              title="처음으로"
            >
              ⏮
            </button>

            {/* Play/Pause */}
            <button
              onClick={isPlaying ? pause : play}
              className="bg-amber-600/80 hover:bg-amber-500/80 text-white text-xs
                px-3 py-1 rounded font-mono"
            >
              {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
            </button>

            {/* Speed */}
            <div className="flex gap-1 ml-auto">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-all
                    ${playbackSpeed === s
                      ? 'bg-amber-600/80 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Toggle button for ControlPanel */
export function NewsClusterButton() {
  const togglePanel = useNewsClusterStore((s) => s.togglePanel);
  const panelVisible = useNewsClusterStore((s) => s.panelVisible);
  const clusters = useNewsClusterStore((s) => s.clusters);

  return (
    <button
      onClick={togglePanel}
      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs font-mono transition-all
        ${panelVisible
          ? 'bg-amber-900/50 border border-amber-500/60 text-amber-300'
          : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 hover:border-zinc-500/50'
        }`}
    >
      <span>🌐</span>
      <span>뉴스 타임랩스</span>
      {clusters.length > 0 && (
        <span className="ml-auto text-[10px] text-amber-500/70">{clusters.length}</span>
      )}
    </button>
  );
}
