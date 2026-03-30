import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useEventStore } from '@/store/useEventStore';
import type { DailyCount, TypeCount } from '@/storage/EventStore';
import CorrelationTimeline from './CorrelationTimeline';

// ─── Mini Bar Chart (Canvas) ──────────────────────────────────

function BarChart({ data, height = 60 }: { data: DailyCount[]; height?: number }) {
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

    const max = Math.max(...data.map((d) => d.count), 1);
    const barW = Math.max(Math.floor((w - (data.length - 1) * 2) / data.length), 4);
    const gap = 2;

    data.forEach((d, i) => {
      const barH = (d.count / max) * (h - 16);
      const x = i * (barW + gap);
      const y = h - barH - 12;

      // bar
      ctx.fillStyle = d.count > 0 ? 'rgba(34,211,238,0.6)' : 'rgba(63,63,70,0.4)';
      ctx.fillRect(x, y, barW, barH);

      // label (day)
      ctx.fillStyle = '#71717a';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(d.date.slice(8), x + barW / 2, h - 2);

      // count on top if > 0
      if (d.count > 0) {
        ctx.fillStyle = '#a1a1aa';
        ctx.fillText(String(d.count), x + barW / 2, y - 2);
      }
    });
  }, [data, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height }}
      className="block"
    />
  );
}

// ─── Type Distribution ────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  earthquake: '#ef4444',
  flight: '#eab308',
  ship: '#3b82f6',
  satellite: '#06b6d4',
  chokepoint: '#a855f7',
  nuclear: '#f97316',
  geofence: '#10b981',
  system: '#6b7280',
};

function TypeBars({ data }: { data: TypeCount[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div className="space-y-1">
      {data.slice(0, 6).map((d) => (
        <div key={d.type} className="flex items-center gap-2 text-[9px]">
          <span className="w-16 text-zinc-400 truncate uppercase">{d.type}</span>
          <div className="flex-1 h-2 bg-zinc-800 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${(d.count / total) * 100}%`,
                backgroundColor: TYPE_COLORS[d.type] ?? '#71717a',
              }}
            />
          </div>
          <span className="text-zinc-500 w-6 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Storage Info ─────────────────────────────────────────────

function StorageStatus({ onClear }: { onClear: () => void }) {
  const storageInfo = useEventStore((s) => s.storageInfo);
  const quotaWarning = useEventStore((s) => s.quotaWarning);
  const [confirming, setConfirming] = useState(false);

  const handleClear = () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    onClear();
    setConfirming(false);
  };

  return (
    <div className="flex items-center justify-between text-[9px]">
      <div className="space-x-2 text-zinc-500">
        <span>{storageInfo.recordCount.toLocaleString()} records</span>
        <span className={quotaWarning ? 'text-red-400' : ''}>
          {storageInfo.estimatedSizeMB.toFixed(1)}MB
        </span>
      </div>
      <button
        onClick={handleClear}
        className={`px-1.5 py-0.5 rounded border transition-colors ${
          confirming
            ? 'border-red-500/60 text-red-400 bg-red-900/20'
            : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
        }`}
      >
        {confirming ? 'CONFIRM?' : 'CLEAR'}
      </button>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────

type TabKey = 'alerts' | 'correlations' | 'geofence';

export default memo(function AnalyticsDashboard() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('alerts');
  const dailyCounts = useEventStore((s) => s.dailyCounts);
  const typeCounts = useEventStore((s) => s.typeCounts);
  const storageInfo = useEventStore((s) => s.storageInfo);
  const refreshAnalytics = useEventStore((s) => s.refreshAnalytics);
  const clearAllEvents = useEventStore((s) => s.clearAllEvents);
  const init = useEventStore((s) => s.init);

  // init on mount
  useEffect(() => {
    init();
  }, [init]);

  // refresh when tab changes or expanded
  useEffect(() => {
    if (expanded) refreshAnalytics(activeTab);
  }, [expanded, activeTab, refreshAnalytics]);

  // auto-refresh every 30s when expanded
  useEffect(() => {
    if (!expanded) return;
    const id = setInterval(() => refreshAnalytics(activeTab), 30000);
    return () => clearInterval(id);
  }, [expanded, activeTab, refreshAnalytics]);

  const handleClear = useCallback(async () => {
    await clearAllEvents();
    await refreshAnalytics(activeTab);
  }, [clearAllEvents, refreshAnalytics, activeTab]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'alerts', label: 'ALERTS' },
    { key: 'correlations', label: 'CORR' },
    { key: 'geofence', label: 'FENCE' },
  ];

  return (
    <div>
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between group"
      >
        <h3 className="text-zinc-400 text-[10px] font-bold tracking-widest">
          EVENT ANALYTICS
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-zinc-600 text-[9px]">
            {storageInfo.recordCount > 0 ? `${storageInfo.recordCount.toLocaleString()} events` : 'no data'}
          </span>
          <span className="text-zinc-600 text-[10px] group-hover:text-zinc-400 transition-colors">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 space-y-3">
          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  activeTab === t.key
                    ? 'border-cyan-500/40 text-cyan-400 bg-cyan-900/20'
                    : 'border-zinc-700/50 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 7-Day Frequency */}
          <div>
            <p className="text-zinc-500 text-[8px] mb-1 tracking-wider">7-DAY FREQUENCY</p>
            {dailyCounts.length > 0 ? (
              <BarChart data={dailyCounts} />
            ) : (
              <p className="text-zinc-600 text-[9px] italic">No data yet</p>
            )}
          </div>

          {/* Type Distribution */}
          <div>
            <p className="text-zinc-500 text-[8px] mb-1 tracking-wider">TYPE DISTRIBUTION</p>
            {typeCounts.length > 0 ? (
              <TypeBars data={typeCounts} />
            ) : (
              <p className="text-zinc-600 text-[9px] italic">No data yet</p>
            )}
          </div>

          {/* Storage */}
          <div>
            <p className="text-zinc-500 text-[8px] mb-1 tracking-wider">STORAGE</p>
            <StorageStatus onClear={handleClear} />
          </div>

          {/* Cross-collection correlation timeline */}
          <CorrelationTimeline />
        </div>
      )}
    </div>
  );
});
