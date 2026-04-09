import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTimelineStore, type PlaybackSpeed, type DarkGapSegment, type TimelineEvent } from '@/store/useTimelineStore';
import { useAppStore } from '@/store/useAppStore';
import type { AlertSeverity } from '@/store/useAlertStore';

const SPEEDS: PlaybackSpeed[] = [1, 10, 60, 360];

// Category → marker color
const CATEGORY_COLOR: Record<string, string> = {
  earthquake: '#facc15',
  flight: '#ef4444',
  ship: '#3b82f6',
  chokepoint: '#f97316',
  satellite: '#a855f7',
  nuclear: '#84cc16',
  'information-warfare': '#ec4899',
  geofence: '#06b6d4',
  system: '#6b7280',
};

// Severity → marker half-size (px)
const SEVERITY_SIZE: Record<AlertSeverity, number> = {
  critical: 7,
  warning: 5,
  info: 3,
};

interface MarkerCluster {
  x: number;           // pixel position
  events: TimelineEvent[];
  dominantSeverity: AlertSeverity;
  dominantCategory: string;
}

/** Clusters events into 4px buckets and returns renderable marker groups */
function clusterEvents(
  events: TimelineEvent[],
  rangeStart: number,
  rangeEnd: number,
  width: number,
  severityFilter: Set<AlertSeverity>
): MarkerCluster[] {
  if (width <= 0) return [];
  const range = rangeEnd - rangeStart;
  if (range <= 0) return [];

  const filtered = events.filter((e) => severityFilter.has(e.severity));

  // Map each event to a 4px bucket
  const buckets = new Map<number, TimelineEvent[]>();
  for (const evt of filtered) {
    const xRaw = ((evt.timestamp - rangeStart) / range) * width;
    const bucket = Math.round(xRaw / 4) * 4;
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push(evt);
  }

  const severityRank: Record<AlertSeverity, number> = { critical: 3, warning: 2, info: 1 };

  return Array.from(buckets.entries()).map(([x, evts]) => {
    const dominant = evts.reduce((best, e) =>
      severityRank[e.severity] > severityRank[best.severity] ? e : best
    );
    return {
      x,
      events: evts,
      dominantSeverity: dominant.severity,
      dominantCategory: dominant.source === 'correlation' ? 'chokepoint' : (dominant as unknown as { category?: string }).category ?? 'system',
    };
  });
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hour}:${min}`;
}

function formatDateShort(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Density heat bar rendered on a canvas */
function DensityCanvas({ density, width, height }: { density: number[]; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const max = Math.max(...density, 1);
    const binWidth = width / density.length;

    for (let i = 0; i < density.length; i++) {
      const v = density[i] / max;
      if (v === 0) continue;
      // Gradient: dark → yellow → red
      const r = Math.round(255 * Math.min(v * 2, 1));
      const g = Math.round(200 * Math.max(0, 1 - v));
      const b = 0;
      const a = 0.3 + v * 0.5;
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fillRect(i * binWidth, 0, binWidth + 1, height);
    }
  }, [density, width, height]);

  return <canvas ref={canvasRef} className="absolute inset-0 rounded" style={{ width, height }} />;
}

/** Dark vessel AIS gap segments rendered as orange/red overlays on the timeline */
function DarkGapCanvas({
  darkGapSegments,
  rangeStart,
  rangeEnd,
  width,
  height,
}: {
  darkGapSegments: DarkGapSegment[];
  rangeStart: number;
  rangeEnd: number;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || !darkGapSegments.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const range = rangeEnd - rangeStart;
    if (range <= 0) return;

    for (const gap of darkGapSegments) {
      const x1 = ((gap.gapStartTime - rangeStart) / range) * width;
      const x2 = gap.gapEndTime != null
        ? ((gap.gapEndTime - rangeStart) / range) * width
        : width; // ongoing gap: extend to end of timeline

      if (x2 < 0 || x1 > width) continue;

      const gx1 = Math.max(0, x1);
      const gx2 = Math.min(width, Math.max(gx1 + 2, x2));

      // Ongoing gaps = red, resolved gaps = orange
      ctx.fillStyle = gap.gapEndTime == null
        ? 'rgba(239, 68, 68, 0.40)'
        : 'rgba(251, 146, 60, 0.30)';
      ctx.fillRect(gx1, 0, gx2 - gx1, height);

      // Dashed vertical line at gap start
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = gap.gapEndTime == null
        ? 'rgba(239, 68, 68, 0.85)'
        : 'rgba(251, 146, 60, 0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx1, 0);
      ctx.lineTo(gx1, height);
      ctx.stroke();
      ctx.restore();
    }
  }, [darkGapSegments, rangeStart, rangeEnd, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 rounded pointer-events-none"
      style={{ width, height }}
    />
  );
}

export default function TimelineBar() {
  const mode = useTimelineStore((s) => s.mode);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const playbackSpeed = useTimelineStore((s) => s.playbackSpeed);
  const rangeStart = useTimelineStore((s) => s.rangeStart);
  const rangeEnd = useTimelineStore((s) => s.rangeEnd);
  const density = useTimelineStore((s) => s.density);
  const isLoading = useTimelineStore((s) => s.isLoading);
  const darkGapSegments = useTimelineStore((s) => s.darkGapSegments);
  const events = useTimelineStore((s) => s.events);

  const enterPlayback = useTimelineStore((s) => s.enterPlayback);
  const exitPlayback = useTimelineStore((s) => s.exitPlayback);
  const seekTo = useTimelineStore((s) => s.seekTo);
  const play = useTimelineStore((s) => s.play);
  const pause = useTimelineStore((s) => s.pause);
  const setSpeed = useTimelineStore((s) => s.setSpeed);
  const tick = useTimelineStore((s) => s.tick);

  const setCameraTarget = useAppStore((s) => s.setCameraTarget);

  const sliderRef = useRef<HTMLDivElement>(null);
  const [sliderWidth, setSliderWidth] = useState(0);

  // Event marker state
  const [severityFilter, setSeverityFilter] = useState<Set<AlertSeverity>>(
    new Set<AlertSeverity>(['critical', 'warning', 'info'])
  );
  const [hoveredCluster, setHoveredCluster] = useState<{ cluster: MarkerCluster; mouseX: number; mouseY: number } | null>(null);

  const toggleSeverity = useCallback((sev: AlertSeverity) => {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  }, []);

  // Measure slider width
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => setSliderWidth(entry.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, [mode]);

  // Playback tick (1s interval)
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isPlaying, tick]);

  // Keyboard shortcut: Shift+T to toggle playback mode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.shiftKey && (e.key === 'T' || e.key === 't')) {
        if (mode === 'realtime') enterPlayback();
        else exitPlayback();
      }
      if (mode !== 'playback') return;
      if (e.key === ' ') { e.preventDefault(); isPlaying ? pause() : play(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode, isPlaying, enterPlayback, exitPlayback, play, pause]);

  const progress = useMemo(() => {
    const range = rangeEnd - rangeStart;
    if (range <= 0) return 0;
    return ((currentTime - rangeStart) / range) * 100;
  }, [currentTime, rangeStart, rangeEnd]);

  const handleSliderClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(rangeStart + pct * (rangeEnd - rangeStart));
  }, [rangeStart, rangeEnd, seekTo]);

  const handleSliderDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    handleSliderClick(e);
  }, [handleSliderClick]);

  // Day markers for the slider
  const dayMarkers = useMemo(() => {
    const markers: { pct: number; label: string }[] = [];
    const startDay = new Date(rangeStart);
    startDay.setHours(0, 0, 0, 0);
    let day = startDay.getTime() + 24 * 60 * 60 * 1000; // next midnight
    const range = rangeEnd - rangeStart;
    while (day < rangeEnd) {
      const pct = ((day - rangeStart) / range) * 100;
      markers.push({ pct, label: formatDateShort(day) });
      day += 24 * 60 * 60 * 1000;
    }
    return markers;
  }, [rangeStart, rangeEnd]);

  const visibleEvents = useTimelineStore((s) => {
    if (s.mode !== 'playback') return 0;
    return s.getEventsAtTime(s.currentTime).length;
  });

  // Compute clustered event markers
  const clusters = useMemo(
    () => clusterEvents(events, rangeStart, rangeEnd, sliderWidth, severityFilter),
    [events, rangeStart, rangeEnd, sliderWidth, severityFilter]
  );

  // Handle marker click: seekTo + optional flyTo
  const handleMarkerClick = useCallback(
    (cluster: MarkerCluster, e: React.MouseEvent) => {
      e.stopPropagation();
      const representative = cluster.events.reduce((best, ev) =>
        (ev.lat != null && ev.lng != null) ? ev : best
      );
      seekTo(representative.timestamp);
      if (representative.lat != null && representative.lng != null) {
        setCameraTarget({
          longitude: representative.lng,
          latitude: representative.lat,
          height: 500_000,
        });
      }
    },
    [seekTo, setCameraTarget]
  );

  // Realtime mode — show LIVE indicator + PLAYBACK button
  if (mode === 'realtime') {
    return (
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-2">
        {/* LIVE indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/90 border border-green-500/40 text-green-400 text-xs font-mono rounded">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          LIVE
        </div>
        {/* PLAYBACK button */}
        <button
          onClick={() => enterPlayback()}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/90 border border-cyan-500/30
            text-cyan-400 text-xs font-mono rounded hover:bg-zinc-800/90 hover:border-cyan-400/50
            transition-all disabled:opacity-50"
          title="4D Playback (Shift+T)"
        >
          <span className="text-sm">⏮</span>
          {isLoading ? 'LOADING...' : 'PLAYBACK'}
        </button>
      </div>
    );
  }

  // Playback mode — full timeline bar
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto font-mono">
      <div className="mx-2 mb-2 bg-zinc-900/95 backdrop-blur-md border border-cyan-500/30 rounded-lg
        shadow-[0_0_20px_rgba(0,200,255,0.1)]">

        {/* Top row: time display + controls */}
        <div className="flex items-center gap-3 px-3 py-1.5">
          {/* Current time */}
          <div className="text-cyan-400 text-xs whitespace-nowrap min-w-[100px]">
            {formatDateTime(currentTime)}
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-1">
            {/* Rewind 1h */}
            <button
              onClick={() => seekTo(currentTime - 3600000)}
              className="text-zinc-400 hover:text-cyan-400 text-xs px-1 transition-colors"
              title="Rewind 1h"
            >&#9664;&#9664;</button>

            {/* Play/Pause */}
            <button
              onClick={() => isPlaying ? pause() : play()}
              className="w-7 h-7 flex items-center justify-center rounded
                bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              {isPlaying ? '\u23F8' : '\u25B6'}
            </button>

            {/* Forward 1h */}
            <button
              onClick={() => seekTo(currentTime + 3600000)}
              className="text-zinc-400 hover:text-cyan-400 text-xs px-1 transition-colors"
              title="Forward 1h"
            >&#9654;&#9654;</button>
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors
                  ${playbackSpeed === s
                    ? 'bg-cyan-500/30 text-cyan-300'
                    : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Severity filter toggles */}
          <div className="flex items-center gap-0.5">
            {(['critical', 'warning', 'info'] as AlertSeverity[]).map((sev) => (
              <button
                key={sev}
                onClick={() => toggleSeverity(sev)}
                title={`Toggle ${sev} markers`}
                className={`text-[9px] px-1 py-0.5 rounded transition-colors border ${
                  severityFilter.has(sev)
                    ? sev === 'critical'
                      ? 'bg-red-500/30 border-red-500/50 text-red-300'
                      : sev === 'warning'
                      ? 'bg-yellow-500/30 border-yellow-500/50 text-yellow-300'
                      : 'bg-zinc-600/50 border-zinc-500/50 text-zinc-400'
                    : 'bg-transparent border-zinc-700/30 text-zinc-700'
                }`}
              >
                {sev === 'critical' ? '!' : sev === 'warning' ? '▲' : '·'}
              </button>
            ))}
          </div>

          {/* Slider track */}
          <div
            ref={sliderRef}
            className="flex-1 relative h-6 cursor-pointer select-none"
            onClick={handleSliderClick}
            onMouseMove={handleSliderDrag}
          >
            {/* Density heatmap */}
            <DensityCanvas density={density} width={sliderWidth} height={24} />

            {/* Dark vessel AIS gap segments */}
            {darkGapSegments.length > 0 && (
              <DarkGapCanvas
                darkGapSegments={darkGapSegments}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                width={sliderWidth}
                height={24}
              />
            )}

            {/* Track background */}
            <div className="absolute inset-0 rounded border border-zinc-700/50" />

            {/* Day markers */}
            {dayMarkers.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-zinc-600/30"
                style={{ left: `${m.pct}%` }}
              >
                <span className="absolute -top-3.5 -translate-x-1/2 text-[8px] text-zinc-600">
                  {m.label}
                </span>
              </div>
            ))}

            {/* Event markers SVG overlay */}
            {clusters.length > 0 && (
              <svg
                className="absolute inset-0 overflow-visible pointer-events-none"
                width={sliderWidth}
                height={24}
              >
                {clusters.map((cluster, i) => {
                  const color = CATEGORY_COLOR[cluster.dominantCategory] ?? '#6b7280';
                  const halfSize = SEVERITY_SIZE[cluster.dominantSeverity];
                  const cx = cluster.x;
                  const cy = 12;
                  const isCluster = cluster.events.length > 1;

                  return (
                    <g
                      key={i}
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      onClick={(e) => handleMarkerClick(cluster, e)}
                      onMouseEnter={(e) => setHoveredCluster({ cluster, mouseX: e.clientX, mouseY: e.clientY })}
                      onMouseLeave={() => setHoveredCluster(null)}
                    >
                      {isCluster ? (
                        <>
                          <circle cx={cx} cy={cy} r={halfSize + 2} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1} />
                          <text x={cx} y={cy + 3} textAnchor="middle" fontSize={8} fill={color} fontFamily="monospace">
                            {cluster.events.length}
                          </text>
                        </>
                      ) : (
                        <polygon
                          points={`${cx},${cy - halfSize} ${cx + halfSize},${cy} ${cx},${cy + halfSize} ${cx - halfSize},${cy}`}
                          fill={color}
                          fillOpacity={0.85}
                          stroke={color}
                          strokeWidth={0.5}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_6px_rgba(0,200,255,0.8)]"
              style={{ left: `${progress}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full" />
            </div>
          </div>

          {/* Event count */}
          <div className="text-zinc-500 text-[10px] whitespace-nowrap min-w-[60px] text-right">
            {visibleEvents} EVT
          </div>

          {/* Marker hover tooltip (portal-style, fixed position) */}
          {hoveredCluster && (
            <div
              className="fixed z-[100] pointer-events-none bg-zinc-900/95 border border-zinc-600/60 rounded px-2 py-1.5 text-[10px] font-mono shadow-lg"
              style={{ left: hoveredCluster.mouseX + 10, top: hoveredCluster.mouseY - 40 }}
            >
              {hoveredCluster.cluster.events.length > 1 ? (
                <>
                  <div className="text-zinc-300 font-bold">{hoveredCluster.cluster.events.length} events</div>
                  <div className="text-zinc-500">{hoveredCluster.cluster.dominantSeverity.toUpperCase()}</div>
                </>
              ) : (() => {
                const evt = hoveredCluster.cluster.events[0];
                return (
                  <>
                    <div className="text-zinc-200 font-bold max-w-[180px] truncate">{evt.title}</div>
                    <div className="text-zinc-500">{evt.severity.toUpperCase()} · {formatDateTime(evt.timestamp)}</div>
                  </>
                );
              })()}
            </div>
          )}

          {/* LIVE button */}
          <button
            onClick={exitPlayback}
            className="px-2 py-1 bg-red-500/20 border border-red-500/40 text-red-400 text-[10px]
              font-bold rounded hover:bg-red-500/30 transition-colors animate-pulse"
          >
            LIVE
          </button>
        </div>
      </div>
    </div>
  );
}

