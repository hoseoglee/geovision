import { useState, useRef, useEffect, useCallback } from 'react';
import { useDarkVesselStore, CHOKEPOINT_GATES } from '@/store/useDarkVesselStore';

// ─── Dual Bar Chart (Canvas): inbound=cyan, outbound=amber ───────────────────

function DualBarChart({
  data,
  height = 70
}: {
  data: { date: string; inbound: number; outbound: number }[];
  height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const max = Math.max(...data.map((d) => d.inbound + d.outbound), 1);
    const barGroupW = (w - (data.length - 1) * 2) / data.length;
    const barW = Math.max(Math.floor((barGroupW - 1) / 2), 2);
    const gap = 2;

    data.forEach((d, i) => {
      const x = i * (barGroupW + gap);
      const inH = (d.inbound / max) * (h - 16);
      const outH = (d.outbound / max) * (h - 16);

      // inbound bar (cyan)
      ctx.fillStyle = d.inbound > 0 ? 'rgba(34,211,238,0.7)' : 'rgba(63,63,70,0.3)';
      ctx.fillRect(x, h - inH - 12, barW, inH);

      // outbound bar (amber)
      ctx.fillStyle = d.outbound > 0 ? 'rgba(251,191,36,0.7)' : 'rgba(63,63,70,0.3)';
      ctx.fillRect(x + barW + 1, h - outH - 12, barW, outH);

      // date label (last 2 chars = day)
      ctx.fillStyle = '#52525b';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(d.date.slice(8), x + barGroupW / 2, h - 2);
    });
  }, [data, height]);

  return <canvas ref={canvasRef} style={{ width: '100%', height }} className="block" />;
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export default function ChokepointAnalyticsPanel() {
  const analyticsVisible = useDarkVesselStore((s) => s.analyticsVisible);
  const passageEvents = useDarkVesselStore((s) => s.passageEvents);
  const toggleAnalytics = useDarkVesselStore((s) => s.toggleAnalytics);
  const getDailyPassageCounts = useDarkVesselStore((s) => s.getDailyPassageCounts);

  const [selectedChokepoint, setSelectedChokepoint] = useState<string>(CHOKEPOINT_GATES[0].name);

  // Today's counts per chokepoint
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCounts = CHOKEPOINT_GATES.map((gate) => {
    const events = passageEvents.filter(
      (e) => e.chokepointName === gate.name && new Date(e.timestamp).toISOString().slice(0, 10) === todayStr
    );
    return {
      name: gate.name,
      color: gate.color,
      inbound: events.filter((e) => e.direction === 'inbound').length,
      outbound: events.filter((e) => e.direction === 'outbound').length,
      total: events.length,
    };
  });

  const dailyData = getDailyPassageCounts(selectedChokepoint, 7);
  const selectedGate = CHOKEPOINT_GATES.find((g) => g.name === selectedChokepoint);

  if (!analyticsVisible) return null;

  return (
    <div
      className="fixed right-4 bottom-20 z-50 w-80 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-sm shadow-2xl"
      style={{ fontFamily: 'monospace' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-400 text-[10px] font-bold tracking-widest">CHOKEPOINT ANALYTICS</span>
        </div>
        <button
          onClick={toggleAnalytics}
          className="text-zinc-500 hover:text-zinc-300 text-xs leading-none"
        >
          ✕
        </button>
      </div>

      {/* Chokepoint Grid */}
      <div className="px-3 py-2 border-b border-zinc-700/30">
        <p className="text-zinc-500 text-[9px] tracking-widest mb-2">TODAY PASSAGE COUNT</p>
        <div className="grid grid-cols-2 gap-1">
          {todayCounts.map((cp) => (
            <button
              key={cp.name}
              onClick={() => setSelectedChokepoint(cp.name)}
              className={`text-left px-2 py-1.5 rounded-sm border transition-colors text-[9px]
                ${selectedChokepoint === cp.name
                  ? 'border-cyan-500/50 bg-cyan-900/20'
                  : 'border-zinc-700/40 hover:border-zinc-600/50 bg-zinc-800/30'
                }`}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: cp.color }}
                />
                <span className="text-zinc-300 truncate font-bold" style={{ maxWidth: '88px' }}>
                  {cp.name.replace('Strait of ', '').replace(' Canal', '').replace(' Strait', '')}
                </span>
              </div>
              <div className="flex gap-2 text-[8px]">
                <span className="text-cyan-400">↑{cp.inbound}</span>
                <span className="text-amber-400">↓{cp.outbound}</span>
                <span className="text-zinc-500">={cp.total}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Daily Trend Chart */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-zinc-500 text-[9px] tracking-widest">7-DAY TREND</p>
          <div className="flex gap-3 text-[8px]">
            <span className="text-cyan-400">▬ INBOUND</span>
            <span className="text-amber-400">▬ OUTBOUND</span>
          </div>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: selectedGate?.color ?? '#fff' }}
          />
          <span className="text-zinc-300 text-[9px] font-bold">{selectedChokepoint}</span>
        </div>
        {dailyData.some((d) => d.inbound > 0 || d.outbound > 0) ? (
          <DualBarChart data={dailyData} height={70} />
        ) : (
          <div className="h-[70px] flex items-center justify-center">
            <span className="text-zinc-600 text-[9px]">NO PASSAGE DATA YET</span>
          </div>
        )}
      </div>

      {/* Recent passages */}
      <div className="px-3 pb-2 border-t border-zinc-700/30 pt-2">
        <p className="text-zinc-500 text-[9px] tracking-widest mb-1.5">RECENT PASSAGES — {selectedChokepoint.split(' ').slice(-1)[0].toUpperCase()}</p>
        <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
          {passageEvents
            .filter((e) => e.chokepointName === selectedChokepoint)
            .slice(-6)
            .reverse()
            .map((e) => (
              <div key={e.id} className="flex items-center justify-between text-[8px] text-zinc-500">
                <span className="truncate text-zinc-400" style={{ maxWidth: '120px' }}>
                  {e.shipName || e.mmsi}
                </span>
                <span className={e.direction === 'inbound' ? 'text-cyan-400' : 'text-amber-400'}>
                  {e.direction === 'inbound' ? '↑ IN' : '↓ OUT'}
                </span>
                <span>{new Date(e.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          {passageEvents.filter((e) => e.chokepointName === selectedChokepoint).length === 0 && (
            <p className="text-zinc-600 text-[8px]">Waiting for passage events...</p>
          )}
        </div>
      </div>
    </div>
  );
}
