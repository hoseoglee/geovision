import { useEffect, useRef, useCallback } from 'react';
import { useFinancialStore } from '@/store/useFinancialStore';
import { fetchOilPrices } from '@/providers/OilPriceProvider';
import { useTimelineStore } from '@/store/useTimelineStore';

// ── 상수 ──────────────────────────────────────────────────────────────────────
const CHART_W = 280;
const CHART_H = 100;
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30분

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────
function fmt(price: number) {
  return `$${price.toFixed(2)}`;
}

function fmtPct(pct: number) {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

/** history: [timestamp, price][] → SVG path d 속성 문자열 */
function buildPath(history: [number, number][], minTs: number, maxTs: number, minP: number, maxP: number): string {
  if (history.length < 2) return '';
  const rangeTs = maxTs - minTs || 1;
  const rangeP = maxP - minP || 1;

  return history
    .map(([ts, price], i) => {
      const x = ((ts - minTs) / rangeTs) * CHART_W;
      // Y 축: 높은 가격이 위 → 뒤집기
      const y = CHART_H - ((price - minP) / rangeP) * CHART_H;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** timestamp → chart X 좌표 */
function tsToX(ts: number, minTs: number, maxTs: number): number {
  const rangeTs = maxTs - minTs || 1;
  return ((ts - minTs) / rangeTs) * CHART_W;
}

// ── 로딩 스켈레톤 ─────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-2 px-3 pb-3">
      <div className="h-4 bg-zinc-700 rounded w-3/4" />
      <div className="h-4 bg-zinc-700 rounded w-1/2" />
      <div className="h-24 bg-zinc-700 rounded mt-2" />
    </div>
  );
}

// ── 가격 행 ───────────────────────────────────────────────────────────────────
function PriceRow({ label, price, changePercent }: { label: string; price: number; changePercent: number }) {
  const isUp = changePercent >= 0;
  const arrow = isUp ? '▲' : '▼';
  const color = isUp ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="flex items-center justify-between py-1 px-3">
      <span className="text-xs font-mono tracking-widest text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono font-semibold text-zinc-100">{fmt(price)}</span>
        <span className={`text-xs font-mono ${color}`}>
          {arrow} {fmtPct(changePercent)}
        </span>
      </div>
    </div>
  );
}

// ── SVG 차트 ─────────────────────────────────────────────────────────────────
function OilChart({
  brentHistory,
  wtiHistory,
  timelineCursor,
}: {
  brentHistory: [number, number][];
  wtiHistory: [number, number][];
  timelineCursor: number | null;
}) {
  // 공통 Y 범위 (두 시리즈 합산)
  const allPrices = [...brentHistory.map(([, p]) => p), ...wtiHistory.map(([, p]) => p)];
  const minP = Math.min(...allPrices) * 0.995;
  const maxP = Math.max(...allPrices) * 1.005;

  // 공통 X 범위 (Brent 기준, WTI도 같은 90일)
  const allTs = [...brentHistory.map(([t]) => t), ...wtiHistory.map(([t]) => t)];
  const minTs = Math.min(...allTs);
  const maxTs = Math.max(...allTs);

  const brentPath = buildPath(brentHistory, minTs, maxTs, minP, maxP);
  const wtiPath = buildPath(wtiHistory, minTs, maxTs, minP, maxP);

  // 타임라인 커서 X 좌표 (playback 중일 때만)
  const cursorX =
    timelineCursor !== null && timelineCursor >= minTs && timelineCursor <= maxTs
      ? tsToX(timelineCursor, minTs, maxTs)
      : null;

  // 날짜 레이블 (X 축 양끝)
  const startLabel = new Date(minTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = new Date(maxTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // 가격 레이블 (Y 축 최고/최저)
  const topLabel = `$${maxP.toFixed(0)}`;
  const botLabel = `$${minP.toFixed(0)}`;

  return (
    <div className="px-3 pb-2">
      <svg
        width={CHART_W}
        height={CHART_H + 20}
        className="overflow-visible"
        style={{ display: 'block' }}
      >
        {/* 배경 그리드 선 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = ratio * CHART_H;
          return (
            <line
              key={ratio}
              x1={0}
              y1={y}
              x2={CHART_W}
              y2={y}
              stroke="#3f3f46"
              strokeWidth={0.5}
              strokeDasharray="3 3"
            />
          );
        })}

        {/* WTI 선 (파랑) */}
        <path d={wtiPath} fill="none" stroke="#3B82F6" strokeWidth={1.5} strokeLinejoin="round">
          <title>WTI</title>
        </path>

        {/* Brent 선 (주황) */}
        <path d={brentPath} fill="none" stroke="#F97316" strokeWidth={1.5} strokeLinejoin="round">
          <title>Brent</title>
        </path>

        {/* 타임라인 커서 수직선 */}
        {cursorX !== null && (
          <line
            x1={cursorX}
            y1={0}
            x2={cursorX}
            y2={CHART_H}
            stroke="#EF4444"
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
        )}

        {/* Y 축 레이블 */}
        <text x={CHART_W + 3} y={6} fontSize={8} fill="#71717a" dominantBaseline="middle">
          {topLabel}
        </text>
        <text x={CHART_W + 3} y={CHART_H - 4} fontSize={8} fill="#71717a" dominantBaseline="middle">
          {botLabel}
        </text>

        {/* X 축 레이블 */}
        <text x={0} y={CHART_H + 14} fontSize={8} fill="#71717a">
          {startLabel}
        </text>
        <text x={CHART_W} y={CHART_H + 14} fontSize={8} fill="#71717a" textAnchor="end">
          {endLabel}
        </text>
      </svg>

      {/* 범례 */}
      <div className="flex items-center gap-3 mt-1">
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-orange-500" />
          <span className="text-xs text-zinc-500 font-mono">BRENT</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-blue-500" />
          <span className="text-xs text-zinc-500 font-mono">WTI</span>
        </div>
        <span className="text-xs text-zinc-600 font-mono">90D</span>
      </div>
    </div>
  );
}

// ── 메인 패널 ─────────────────────────────────────────────────────────────────
export function OilPricePanel() {
  const { oilPrice, isLoading, showOilPanel, setOilPrice, setLoading, setShowOilPanel } =
    useFinancialStore();

  const timelineMode = useTimelineStore((s) => s.mode);
  const timelineCurrent = useTimelineStore((s) => s.currentTime);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOilPrices();
      setOilPrice(data);
    } finally {
      setLoading(false);
    }
  }, [setOilPrice, setLoading]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  if (!showOilPanel) return null;

  // 타임라인 플레이백 중일 때만 커서 전달
  const cursor = timelineMode === 'playback' ? timelineCurrent : null;

  return (
    <div
      className="fixed bottom-20 right-4 z-[35] w-[320px] bg-zinc-900/95 border border-zinc-700/50 rounded-lg shadow-2xl backdrop-blur-sm"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/50">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm">💰</span>
          <span className="text-xs font-bold tracking-widest text-amber-400/90 uppercase">
            Commodity Intel
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 데이터 소스 배지 */}
          {oilPrice && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono tracking-wider border ${
                oilPrice.simulated
                  ? 'text-yellow-400/70 border-yellow-700/50 bg-yellow-900/20'
                  : 'text-emerald-400/70 border-emerald-700/50 bg-emerald-900/20'
              }`}
            >
              {oilPrice.source}
            </span>
          )}
          {/* 닫기 버튼 */}
          <button
            onClick={() => setShowOilPanel(false)}
            className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* 타임라인 동기화 인디케이터 */}
      {timelineMode === 'playback' && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-900/20 border-b border-red-800/30">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] text-red-400 tracking-widest font-mono">
            SYNC · TIMELINE PLAYBACK
          </span>
        </div>
      )}

      {/* 콘텐츠 */}
      {isLoading && !oilPrice ? (
        <LoadingSkeleton />
      ) : oilPrice ? (
        <>
          {/* 가격 행 */}
          <div className="pt-2 pb-1">
            <PriceRow
              label="BRENT"
              price={oilPrice.brent.price}
              changePercent={oilPrice.brent.changePercent}
            />
            <PriceRow
              label="WTI  "
              price={oilPrice.wti.price}
              changePercent={oilPrice.wti.changePercent}
            />
          </div>

          {/* 구분선 */}
          <div className="border-t border-zinc-800 mx-3 mb-2" />

          {/* 차트 */}
          <OilChart
            brentHistory={oilPrice.brent.history}
            wtiHistory={oilPrice.wti.history}
            timelineCursor={cursor}
          />

          {/* 상관관계 힌트 */}
          <div className="px-3 pb-2">
            <p className="text-[9px] text-zinc-600 font-mono tracking-wide">
              <span className="text-zinc-500">●</span> Hover conflict events on globe to correlate
            </p>
          </div>
        </>
      ) : (
        <div className="px-3 py-4 text-center">
          <span className="text-xs text-zinc-500 font-mono tracking-widest">LOADING...</span>
        </div>
      )}
    </div>
  );
}

// ── 토글 버튼 (ControlPanel에서 사용) ────────────────────────────────────────
export function OilPricePanelToggle() {
  const { showOilPanel, toggleOilPanel } = useFinancialStore();

  return (
    <button
      onClick={toggleOilPanel}
      title="Commodity Intel"
      className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
        showOilPanel
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
          : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-100 border border-zinc-700/50 hover:border-zinc-500/50'
      }`}
    >
      🛢
    </button>
  );
}
