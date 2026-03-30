import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { eventStore } from '@/storage/EventStore';
import type { StoredEvent } from '@/storage/EventStore';
import { useAppStore } from '@/store/useAppStore';

// ─── Types ───────────────────────────────────────────────────────

type Period = '1d' | '3d' | '7d';

interface EventCluster {
  id: string;
  events: StoredEvent[];
  fromTs: number;
  toTs: number;
  collections: string[];
  centroid?: { lat: number; lng: number };
}

interface Bucket {
  fromTs: number;
  toTs: number;
  counts: Record<string, number>;
}

interface DragState {
  startX: number;
  currentX: number;
}

// ─── Constants ───────────────────────────────────────────────────

const LANE_H = 22;
const LABEL_W = 52;
const AXIS_H = 14;
const PAD_TOP = 4;
const PAD_RIGHT = 8;
// Individual event dots shown only when view range ≤ this threshold
const BUCKET_THRESHOLD_MS = 6 * 3600 * 1000;
const DRAG_THRESHOLD_PX = 8;
const MIN_ZOOM_MS = 5 * 60 * 1000; // 5 minutes

const COLLECTION_ORDER = ['alerts', 'correlations', 'geofence'] as const;
type Collection = typeof COLLECTION_ORDER[number];

const COLLECTION_COLORS: Record<string, string> = {
  alerts: '#ef4444',
  correlations: '#a855f7',
  geofence: '#10b981',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  warning: '#eab308',
  info: '#22d3ee',
};

const PERIOD_MS: Record<Period, number> = {
  '1d': 24 * 3600 * 1000,
  '3d': 3 * 24 * 3600 * 1000,
  '7d': 7 * 24 * 3600 * 1000,
};

// ─── Helpers ─────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Returns bucket size in ms based on the view range. */
function getBucketMs(rangeMs: number): number {
  if (rangeMs <= 4 * 3600 * 1000) return 15 * 60 * 1000;   // ≤4h  → 15-min buckets
  if (rangeMs <= 24 * 3600 * 1000) return 30 * 60 * 1000;  // ≤1d  → 30-min buckets
  if (rangeMs <= 72 * 3600 * 1000) return 2 * 3600 * 1000; // ≤3d  → 2-hr buckets
  return 6 * 3600 * 1000;                                    // >3d  → 6-hr buckets
}

/** Groups events into fixed-width time buckets for aggregate rendering. */
function bucketEvents(
  events: StoredEvent[],
  bucketMs: number,
  fromTs: number,
  toTs: number,
): Bucket[] {
  const result: Bucket[] = [];
  const start = Math.floor(fromTs / bucketMs) * bucketMs;
  for (let t = start; t < toTs; t += bucketMs) {
    const counts: Record<string, number> = { alerts: 0, correlations: 0, geofence: 0 };
    for (const e of events) {
      if (e.timestamp >= t && e.timestamp < t + bucketMs && e.collection in counts) {
        counts[e.collection]++;
      }
    }
    result.push({ fromTs: t, toTs: t + bucketMs, counts });
  }
  return result;
}

// ─── Cluster Detection ───────────────────────────────────────────

function detectClusters(
  events: StoredEvent[],
  timeWindowMs: number,
  spatialRadiusKm: number,
): EventCluster[] {
  if (events.length < 2) return [];

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const visited = new Set<number>();
  const clusters: EventCluster[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (visited.has(i)) continue;
    const anchor = sorted[i];
    const group: number[] = [i];

    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].timestamp - anchor.timestamp > timeWindowMs) break;
      if (visited.has(j)) continue;
      const cand = sorted[j];
      if (cand.collection === anchor.collection) continue;
      if (
        anchor.lat != null && anchor.lng != null &&
        cand.lat != null && cand.lng != null
      ) {
        if (haversineKm(anchor.lat, anchor.lng, cand.lat, cand.lng) > spatialRadiusKm) continue;
      }
      group.push(j);
    }

    if (group.length < 2) continue;

    const groupEvents = group.map((idx) => sorted[idx]);
    group.forEach((idx) => visited.add(idx));
    const collections = [...new Set(groupEvents.map((e) => e.collection))];
    const fromTs = Math.min(...groupEvents.map((e) => e.timestamp));
    const toTs = Math.max(...groupEvents.map((e) => e.timestamp));
    const withCoords = groupEvents.filter((e) => e.lat != null && e.lng != null);
    const centroid =
      withCoords.length > 0
        ? {
            lat: withCoords.reduce((s, e) => s + e.lat!, 0) / withCoords.length,
            lng: withCoords.reduce((s, e) => s + e.lng!, 0) / withCoords.length,
          }
        : undefined;

    clusters.push({
      id: `c-${fromTs}-${i}`,
      events: groupEvents,
      fromTs,
      toTs,
      collections,
      centroid,
    });
  }
  return clusters;
}

// ─── Canvas Renderer ─────────────────────────────────────────────

function renderTimeline(
  canvas: HTMLCanvasElement,
  events: StoredEvent[],
  clusters: EventCluster[],
  fromTs: number,
  toTs: number,
  selectedCluster: EventCluster | null,
  hoveredEvent: StoredEvent | null,
  buckets: Bucket[] | null,
  dragOverlay: { x1: number; x2: number } | null,
) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const totalH = LANE_H * 3 + AXIS_H + PAD_TOP;
  canvas.width = w * dpr;
  canvas.height = totalH * dpr;
  canvas.style.height = `${totalH}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, totalH);

  const timeRange = Math.max(toTs - fromTs, 1);
  const plotW = w - LABEL_W - PAD_RIGHT;
  const toX = (ts: number) => LABEL_W + ((ts - fromTs) / timeRange) * plotW;
  const laneY = (idx: number) => PAD_TOP + idx * LANE_H + LANE_H / 2;

  // Lane separator lines
  ctx.strokeStyle = 'rgba(63,63,70,0.35)';
  ctx.lineWidth = 0.5;
  COLLECTION_ORDER.forEach((_, i) => {
    const y = PAD_TOP + (i + 1) * LANE_H;
    ctx.beginPath();
    ctx.moveTo(LABEL_W, y);
    ctx.lineTo(w - PAD_RIGHT, y);
    ctx.stroke();
  });

  // Cluster highlights + connection lines
  clusters.forEach((cluster) => {
    const x1 = Math.max(toX(cluster.fromTs) - 3, LABEL_W);
    const x2 = Math.min(toX(cluster.toTs) + 3, w - PAD_RIGHT);
    const rectW = Math.max(x2 - x1, 10);
    const isSelected = selectedCluster?.id === cluster.id;

    ctx.fillStyle = isSelected ? 'rgba(234,179,8,0.18)' : 'rgba(234,179,8,0.06)';
    ctx.fillRect(x1, PAD_TOP, rectW, LANE_H * 3);

    ctx.strokeStyle = isSelected ? 'rgba(234,179,8,0.75)' : 'rgba(234,179,8,0.28)';
    ctx.lineWidth = isSelected ? 1.5 : 0.75;
    ctx.strokeRect(x1, PAD_TOP, rectW, LANE_H * 3);

    if (cluster.events.length >= 2) {
      const pts = cluster.events
        .map((e) => {
          const laneIdx = COLLECTION_ORDER.indexOf(e.collection as Collection);
          if (laneIdx < 0) return null;
          return { x: toX(e.timestamp), y: laneY(laneIdx) };
        })
        .filter((p): p is { x: number; y: number } => p !== null);

      if (pts.length >= 2) {
        ctx.strokeStyle = isSelected ? 'rgba(234,179,8,0.55)' : 'rgba(234,179,8,0.18)';
        ctx.lineWidth = 0.75;
        ctx.setLineDash([2, 4]);
        for (let i = 1; i < pts.length; i++) {
          ctx.beginPath();
          ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
          ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }
  });

  // Lane labels
  COLLECTION_ORDER.forEach((col, i) => {
    ctx.fillStyle = COLLECTION_COLORS[col];
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(col.slice(0, 4).toUpperCase(), LABEL_W - 4, laneY(i) + 3);
  });

  if (buckets) {
    // ── Bucket (aggregate) mode: histogram bars per lane ──
    const maxCount = Math.max(...buckets.flatMap((b) => Object.values(b.counts)), 1);
    const bucketW = buckets.length > 0
      ? Math.max((toX(buckets[0].toTs) - toX(buckets[0].fromTs)) - 1, 1)
      : 4;

    buckets.forEach((bucket) => {
      const bx = toX(bucket.fromTs);
      if (bx + bucketW < LABEL_W || bx > w - PAD_RIGHT) return;
      COLLECTION_ORDER.forEach((col, laneIdx) => {
        const count = bucket.counts[col] ?? 0;
        if (count === 0) return;
        const barH = Math.max((count / maxCount) * (LANE_H - 5), 2);
        const laneTop = PAD_TOP + laneIdx * LANE_H;
        ctx.fillStyle = (COLLECTION_COLORS[col] ?? '#71717a') + 'aa';
        ctx.fillRect(
          Math.max(bx, LABEL_W),
          laneTop + LANE_H - barH - 2,
          Math.min(bucketW, w - PAD_RIGHT - Math.max(bx, LABEL_W)),
          barH,
        );
      });
    });
  } else {
    // ── Individual event dots ──
    const byCollection = new Map<string, StoredEvent[]>(
      COLLECTION_ORDER.map((c) => [c, []]),
    );
    for (const e of events) byCollection.get(e.collection)?.push(e);

    COLLECTION_ORDER.forEach((col, laneIdx) => {
      const cy = laneY(laneIdx);
      for (const e of byCollection.get(col) ?? []) {
        const cx = toX(e.timestamp);
        if (cx < LABEL_W || cx > w - PAD_RIGHT) continue;
        const isHovered = hoveredEvent?.id === e.id;
        const r = isHovered ? 5 : 3.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = SEVERITY_COLORS[e.severity] ?? COLLECTION_COLORS[col];
        ctx.fill();
        if (isHovered) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    });
  }

  // Time axis
  const axisY = PAD_TOP + LANE_H * 3 + 2;
  ctx.strokeStyle = 'rgba(63,63,70,0.6)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(LABEL_W, axisY);
  ctx.lineTo(w - PAD_RIGHT, axisY);
  ctx.stroke();

  const totalMs = toTs - fromTs;
  const tickMs =
    totalMs <= PERIOD_MS['1d'] ? 2 * 3600 * 1000
    : totalMs <= PERIOD_MS['3d'] ? 12 * 3600 * 1000
    : 24 * 3600 * 1000;

  const tickStart = Math.ceil(fromTs / tickMs) * tickMs;
  ctx.fillStyle = '#52525b';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(63,63,70,0.5)';
  ctx.lineWidth = 0.5;
  for (let t = tickStart; t <= toTs; t += tickMs) {
    const x = toX(t);
    if (x < LABEL_W || x > w - PAD_RIGHT) continue;
    ctx.beginPath();
    ctx.moveTo(x, axisY);
    ctx.lineTo(x, axisY + 3);
    ctx.stroke();
    const d = new Date(t);
    const label =
      totalMs <= PERIOD_MS['1d']
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : `${d.getMonth() + 1}/${d.getDate()}`;
    ctx.fillText(label, x, axisY + 11);
  }

  // Drag selection overlay (drawn last, on top)
  if (dragOverlay) {
    const ox1 = Math.max(Math.min(dragOverlay.x1, dragOverlay.x2), LABEL_W);
    const ox2 = Math.min(Math.max(dragOverlay.x1, dragOverlay.x2), w - PAD_RIGHT);
    if (ox2 > ox1) {
      ctx.fillStyle = 'rgba(34,211,238,0.08)';
      ctx.fillRect(ox1, PAD_TOP, ox2 - ox1, LANE_H * 3);
      ctx.strokeStyle = 'rgba(34,211,238,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(ox1, PAD_TOP, ox2 - ox1, LANE_H * 3);
      ctx.setLineDash([]);
    }
  }
}

// ─── Hit Testing ─────────────────────────────────────────────────

function hitTestEvent(
  mx: number,
  my: number,
  events: StoredEvent[],
  fromTs: number,
  toTs: number,
  plotW: number,
): StoredEvent | null {
  const timeRange = Math.max(toTs - fromTs, 1);
  const toX = (ts: number) => LABEL_W + ((ts - fromTs) / timeRange) * plotW;
  const laneY = (idx: number) => PAD_TOP + idx * LANE_H + LANE_H / 2;

  let closest: StoredEvent | null = null;
  let minDist = 9;
  for (const e of events) {
    const laneIdx = COLLECTION_ORDER.indexOf(e.collection as Collection);
    if (laneIdx < 0) continue;
    const d = Math.hypot(mx - toX(e.timestamp), my - laneY(laneIdx));
    if (d < minDist) { minDist = d; closest = e; }
  }
  return closest;
}

function hitTestBucket(
  mx: number,
  buckets: Bucket[],
  fromTs: number,
  toTs: number,
  plotW: number,
): Bucket | null {
  const timeRange = Math.max(toTs - fromTs, 1);
  const toX = (ts: number) => LABEL_W + ((ts - fromTs) / timeRange) * plotW;
  for (const b of buckets) {
    const x1 = toX(b.fromTs);
    const x2 = toX(b.toTs);
    if (mx >= x1 && mx <= x2) return b;
  }
  return null;
}

function hitTestCluster(
  mx: number,
  my: number,
  clusters: EventCluster[],
  fromTs: number,
  toTs: number,
  plotW: number,
  canvasW: number,
): EventCluster | null {
  const timeRange = Math.max(toTs - fromTs, 1);
  const toX = (ts: number) => LABEL_W + ((ts - fromTs) / timeRange) * plotW;

  for (const cluster of clusters) {
    const x1 = Math.max(toX(cluster.fromTs) - 3, LABEL_W);
    const x2 = Math.min(toX(cluster.toTs) + 3, canvasW - PAD_RIGHT);
    const rectW = Math.max(x2 - x1, 10);
    if (mx >= x1 && mx <= x1 + rectW && my >= PAD_TOP && my <= PAD_TOP + LANE_H * 3) {
      return cluster;
    }
  }
  return null;
}

// ─── Main Component ──────────────────────────────────────────────

export default memo(function CorrelationTimeline() {
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<Period>('1d');
  const [customRange, setCustomRange] = useState<{ from: number; to: number } | null>(null);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeWindowMin, setTimeWindowMin] = useState(5);
  const [spatialRadiusKm, setSpatialRadiusKm] = useState(500);
  const [selectedCluster, setSelectedCluster] = useState<EventCluster | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<StoredEvent | null>(null);
  const [hoveredBucket, setHoveredBucket] = useState<Bucket | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);

  const { fromTs, toTs } = useMemo(() => {
    if (customRange) return { fromTs: customRange.from, toTs: customRange.to };
    const now = Date.now();
    return { fromTs: now - PERIOD_MS[period], toTs: now };
  }, [period, customRange]);

  const rangeMs = toTs - fromTs;
  const useBuckets = rangeMs > BUCKET_THRESHOLD_MS;

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await eventStore.queryAll(fromTs, toTs);
      setEvents(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [fromTs, toTs]);

  useEffect(() => {
    if (expanded) loadEvents();
  }, [expanded, loadEvents]);

  const clusters = useMemo(
    () => detectClusters(events, timeWindowMin * 60 * 1000, spatialRadiusKm),
    [events, timeWindowMin, spatialRadiusKm],
  );

  const buckets = useMemo(() => {
    if (!useBuckets || events.length === 0) return null;
    return bucketEvents(events, getBucketMs(rangeMs), fromTs, toTs);
  }, [useBuckets, events, rangeMs, fromTs, toTs]);

  const dragOverlay = useMemo((): { x1: number; x2: number } | null => {
    if (!dragState) return null;
    return { x1: dragState.startX, x2: dragState.currentX };
  }, [dragState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !expanded) return;
    renderTimeline(canvas, events, clusters, fromTs, toTs, selectedCluster, hoveredEvent, buckets, dragOverlay);
  }, [events, clusters, fromTs, toTs, selectedCluster, hoveredEvent, buckets, dragOverlay, expanded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      if (expanded) renderTimeline(canvas, events, clusters, fromTs, toTs, selectedCluster, hoveredEvent, buckets, dragOverlay);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [events, clusters, fromTs, toTs, selectedCluster, hoveredEvent, buckets, dragOverlay, expanded]);

  const getPlotW = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? canvas.clientWidth - LABEL_W - PAD_RIGHT : 0;
  }, []);

  /** Convert canvas x coordinate to timestamp. */
  const xToTs = useCallback((x: number) => {
    const plotW = getPlotW();
    return fromTs + ((x - LABEL_W) / Math.max(plotW, 1)) * (toTs - fromTs);
  }, [fromTs, toTs, getPlotW]);

  // ── Click handler (shared between mouseup-as-click and regular clicks) ──
  const handleClickAt = useCallback((mx: number, my: number, canvasW: number) => {
    const plotW = getPlotW();

    if (useBuckets && buckets) {
      // In bucket mode: clicking a bucket zooms into its time range
      const bucket = hitTestBucket(mx, buckets, fromTs, toTs, plotW);
      if (bucket) {
        setCustomRange({ from: bucket.fromTs, to: bucket.toTs });
        return;
      }
    } else {
      // Individual event mode: fly to event
      const ev = hitTestEvent(mx, my, events, fromTs, toTs, plotW);
      if (ev?.lat != null && ev?.lng != null) {
        setCameraTarget({ latitude: ev.lat, longitude: ev.lng, height: 1_500_000 });
        return;
      }
    }

    // Cluster click → select & fly centroid
    const cluster = hitTestCluster(mx, my, clusters, fromTs, toTs, plotW, canvasW);
    setSelectedCluster((prev) => (prev?.id === cluster?.id ? null : cluster ?? null));
    if (cluster?.centroid) {
      setCameraTarget({
        latitude: cluster.centroid.lat,
        longitude: cluster.centroid.lng,
        height: 3_000_000,
      });
    }
  }, [useBuckets, buckets, events, clusters, fromTs, toTs, getPlotW, setCameraTarget]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    setDragState({ startX: mx, currentX: mx });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (dragState) {
        setDragState((prev) => prev ? { ...prev, currentX: mx } : null);
        setHoveredEvent(null);
        setHoveredBucket(null);
        setTooltip(null);
        return;
      }

      if (useBuckets && buckets) {
        const bucket = hitTestBucket(mx, buckets, fromTs, toTs, getPlotW());
        setHoveredBucket(bucket);
        if (bucket) {
          const total = Object.values(bucket.counts).reduce((s, c) => s + c, 0);
          const d = new Date(bucket.fromTs);
          const label = `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${total} events`;
          setTooltip({ x: mx, y: my, label });
        } else {
          setTooltip(null);
        }
      } else {
        const ev = hitTestEvent(mx, my, events, fromTs, toTs, getPlotW());
        setHoveredEvent(ev);
        if (ev) {
          const label = ev.title + (ev.lat != null ? ` · ${ev.lat.toFixed(1)}°, ${ev.lng?.toFixed(1)}°` : '');
          setTooltip({ x: mx, y: my, label });
        } else {
          setTooltip(null);
        }
      }
    },
    [dragState, useBuckets, buckets, events, fromTs, toTs, getPlotW],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragState) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dragDist = Math.abs(mx - dragState.startX);

      if (dragDist >= DRAG_THRESHOLD_PX) {
        // Drag zoom: convert x coords to timestamps
        const t1 = xToTs(Math.min(dragState.startX, mx));
        const t2 = xToTs(Math.max(dragState.startX, mx));
        if (t2 - t1 >= MIN_ZOOM_MS) {
          setCustomRange({ from: Math.max(t1, fromTs), to: Math.min(t2, toTs) });
        }
      } else {
        // Click
        handleClickAt(dragState.startX, my, e.currentTarget.clientWidth);
      }

      setDragState(null);
    },
    [dragState, fromTs, toTs, xToTs, handleClickAt],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredEvent(null);
    setHoveredBucket(null);
    setTooltip(null);
    if (dragState) setDragState(null);
  }, [dragState]);

  const flyToEvent = useCallback(
    (e: StoredEvent) => {
      if (e.lat != null && e.lng != null) {
        setCameraTarget({ latitude: e.lat, longitude: e.lng, height: 1_500_000 });
      }
    },
    [setCameraTarget],
  );

  const resetZoom = useCallback(() => {
    setCustomRange(null);
    setSelectedCluster(null);
  }, []);

  return (
    <div>
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between group mt-3 pt-3 border-t border-zinc-800"
      >
        <h3 className="text-zinc-400 text-[10px] font-bold tracking-widest">
          CORRELATION TIMELINE
        </h3>
        <div className="flex items-center gap-2">
          {clusters.length > 0 && (
            <span className="text-yellow-400/70 text-[9px]">{clusters.length} clusters</span>
          )}
          <span className="text-zinc-600 text-[10px] group-hover:text-zinc-400 transition-colors">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {/* Period selector + controls */}
          <div className="flex items-center gap-1 flex-wrap">
            {(['1d', '3d', '7d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setCustomRange(null); }}
                disabled={!!customRange}
                className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  !customRange && period === p
                    ? 'border-cyan-500/40 text-cyan-400 bg-cyan-900/20'
                    : 'border-zinc-700/50 text-zinc-500 hover:text-zinc-300 disabled:opacity-40'
                }`}
              >
                {p}
              </button>
            ))}
            {customRange && (
              <button
                onClick={resetZoom}
                className="text-[9px] font-mono px-2 py-0.5 rounded border border-amber-500/40 text-amber-400 bg-amber-900/20 hover:bg-amber-900/30 transition-colors"
                title="Reset to period view"
              >
                ↩ RESET
              </button>
            )}
            {useBuckets && !customRange && (
              <span className="text-[8px] text-zinc-600 italic ml-1">bucket view · drag to zoom</span>
            )}
            {!useBuckets && !customRange && (
              <span className="text-[8px] text-zinc-600 italic ml-1">drag to zoom</span>
            )}
            <button
              onClick={loadEvents}
              title="Refresh"
              className="ml-auto text-[9px] font-mono px-2 py-0.5 rounded border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ↻
            </button>
          </div>

          {/* Canvas area */}
          <div className="relative bg-zinc-900/40 rounded overflow-hidden">
            {loading ? (
              <div
                className="flex items-center justify-center text-zinc-600 text-[9px]"
                style={{ height: LANE_H * 3 + AXIS_H + PAD_TOP }}
              >
                loading…
              </div>
            ) : events.length === 0 ? (
              <div
                className="flex items-center justify-center text-zinc-600 text-[9px] italic"
                style={{ height: LANE_H * 3 + AXIS_H + PAD_TOP }}
              >
                no events in period
              </div>
            ) : (
              <>
                <canvas
                  ref={canvasRef}
                  style={{ width: '100%', display: 'block' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  className={dragState ? 'cursor-ew-resize' : 'cursor-crosshair'}
                />
                {tooltip && !dragState && (
                  <div
                    className="absolute z-10 pointer-events-none bg-zinc-900/95 border border-zinc-700/60 rounded px-2 py-1 text-[8px] max-w-[180px] shadow-lg"
                    style={{ left: tooltip.x + 10, top: Math.max(tooltip.y - 24, 0) }}
                  >
                    <p className="text-zinc-200 truncate">{tooltip.label}</p>
                    {useBuckets && (
                      <p className="text-zinc-500 mt-0.5">click to zoom in</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Threshold controls */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-2 text-[9px]">
              <span className="text-zinc-500 w-[52px] shrink-0">TIME WIN</span>
              <input
                type="range"
                min={1} max={30} value={timeWindowMin}
                onChange={(e) => setTimeWindowMin(Number(e.target.value))}
                className="flex-1 h-1 accent-yellow-400"
              />
              <span className="text-zinc-400 w-8 text-right shrink-0">{timeWindowMin}m</span>
            </div>
            <div className="flex items-center gap-2 text-[9px]">
              <span className="text-zinc-500 w-[52px] shrink-0">SPATIAL R</span>
              <input
                type="range"
                min={100} max={2000} step={100} value={spatialRadiusKm}
                onChange={(e) => setSpatialRadiusKm(Number(e.target.value))}
                className="flex-1 h-1 accent-yellow-400"
              />
              <span className="text-zinc-400 w-8 text-right shrink-0">{spatialRadiusKm}k</span>
            </div>
          </div>

          {/* Summary row */}
          <div className="text-[9px] text-zinc-600 flex items-center gap-3 flex-wrap">
            <span>{events.length.toLocaleString()} events</span>
            {useBuckets && (
              <span className="text-zinc-700">
                {getBucketMs(rangeMs) / 60000 >= 60
                  ? `${getBucketMs(rangeMs) / 3600000}h`
                  : `${getBucketMs(rangeMs) / 60000}m`} buckets
              </span>
            )}
            {clusters.length > 0 && (
              <span className="text-yellow-400/70">{clusters.length} correlated clusters</span>
            )}
            {clusters.length === 0 && events.length > 0 && (
              <span className="text-zinc-700 italic">no clusters detected</span>
            )}
            {customRange && (
              <span className="text-amber-400/70">
                {new Date(customRange.from).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {new Date(customRange.to).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Selected cluster detail */}
          {selectedCluster && (
            <div className="border border-yellow-500/25 rounded p-2 bg-yellow-950/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-yellow-400/90 text-[9px] font-bold tracking-wider">
                  CLUSTER · {selectedCluster.events.length} events
                </span>
                <button
                  onClick={() => setSelectedCluster(null)}
                  className="text-zinc-600 hover:text-zinc-400 text-[10px] leading-none"
                >
                  ✕
                </button>
              </div>

              <p className="text-zinc-500 text-[8px]">
                {new Date(selectedCluster.fromTs).toLocaleString([], {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
                {' → '}
                {new Date(selectedCluster.toTs).toLocaleString([], {
                  hour: '2-digit', minute: '2-digit',
                })}
                {' '}
                <span className="text-zinc-600">
                  ({Math.round((selectedCluster.toTs - selectedCluster.fromTs) / 60000)}m span)
                </span>
              </p>

              <div className="flex gap-1 flex-wrap">
                {selectedCluster.collections.map((c) => (
                  <span
                    key={c}
                    className="text-[8px] px-1.5 py-0.5 rounded font-mono"
                    style={{
                      backgroundColor: `${COLLECTION_COLORS[c] ?? '#71717a'}22`,
                      color: COLLECTION_COLORS[c] ?? '#a1a1aa',
                      border: `1px solid ${COLLECTION_COLORS[c] ?? '#71717a'}40`,
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div className="space-y-0.5 max-h-28 overflow-y-auto pr-0.5">
                {selectedCluster.events.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => flyToEvent(e)}
                    className={`flex items-start gap-1.5 px-1 py-0.5 rounded text-[8px] ${
                      e.lat != null ? 'cursor-pointer hover:bg-zinc-800/60' : ''
                    }`}
                  >
                    <span
                      className="shrink-0 w-1.5 h-1.5 rounded-full mt-[3px]"
                      style={{ backgroundColor: SEVERITY_COLORS[e.severity] ?? '#71717a' }}
                    />
                    <span className="text-zinc-300 truncate flex-1">{e.title}</span>
                    <span
                      className="shrink-0 text-[7px] font-mono uppercase"
                      style={{ color: COLLECTION_COLORS[e.collection] ?? '#71717a' }}
                    >
                      {e.collection.slice(0, 4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
