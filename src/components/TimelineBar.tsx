import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTimelineStore, type PlaybackSpeed } from '@/store/useTimelineStore';

const SPEEDS: PlaybackSpeed[] = [1, 2, 4, 8];

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

export default function TimelineBar() {
  const mode = useTimelineStore((s) => s.mode);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const playbackSpeed = useTimelineStore((s) => s.playbackSpeed);
  const rangeStart = useTimelineStore((s) => s.rangeStart);
  const rangeEnd = useTimelineStore((s) => s.rangeEnd);
  const density = useTimelineStore((s) => s.density);
  const isLoading = useTimelineStore((s) => s.isLoading);

  const enterPlayback = useTimelineStore((s) => s.enterPlayback);
  const exitPlayback = useTimelineStore((s) => s.exitPlayback);
  const seekTo = useTimelineStore((s) => s.seekTo);
  const play = useTimelineStore((s) => s.play);
  const pause = useTimelineStore((s) => s.pause);
  const setSpeed = useTimelineStore((s) => s.setSpeed);
  const tick = useTimelineStore((s) => s.tick);

  const sliderRef = useRef<HTMLDivElement>(null);
  const [sliderWidth, setSliderWidth] = useState(0);

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

  // Realtime mode — show enter button
  if (mode === 'realtime') {
    return (
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <button
          onClick={() => enterPlayback()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-1.5 bg-gray-900/90 border border-cyan-500/30
            text-cyan-400 text-xs font-mono rounded hover:bg-gray-800/90 hover:border-cyan-400/50
            transition-all disabled:opacity-50"
          title="Shift+T"
        >
          <span className="text-sm">&#9202;</span>
          {isLoading ? 'LOADING...' : 'TIMELINE'}
        </button>
      </div>
    );
  }

  // Playback mode — full timeline bar
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto font-mono">
      <div className="mx-2 mb-2 bg-gray-900/95 backdrop-blur-md border border-cyan-500/30 rounded-lg
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
              className="text-gray-400 hover:text-cyan-400 text-xs px-1 transition-colors"
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
              className="text-gray-400 hover:text-cyan-400 text-xs px-1 transition-colors"
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
                    : 'text-gray-500 hover:text-gray-300'
                  }`}
              >
                {s}x
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

            {/* Track background */}
            <div className="absolute inset-0 rounded border border-gray-700/50" />

            {/* Day markers */}
            {dayMarkers.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-gray-600/30"
                style={{ left: `${m.pct}%` }}
              >
                <span className="absolute -top-3.5 -translate-x-1/2 text-[8px] text-gray-600">
                  {m.label}
                </span>
              </div>
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_6px_rgba(0,200,255,0.8)]"
              style={{ left: `${progress}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full" />
            </div>
          </div>

          {/* Event count */}
          <div className="text-gray-500 text-[10px] whitespace-nowrap min-w-[60px] text-right">
            {visibleEvents} EVT
          </div>

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

