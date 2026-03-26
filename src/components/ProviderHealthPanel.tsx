import { memo, useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  useProviderHealthStore,
  PROVIDER_KEYS,
  PROVIDER_LABELS,
  PROVIDER_ICONS,
  type ProviderKey,
  type ProviderStatus,
} from '@/store/useProviderHealthStore';
import { shallow } from 'zustand/shallow';

const STATUS_COLORS: Record<ProviderStatus, string> = {
  healthy: 'bg-emerald-400',
  degraded: 'bg-yellow-400',
  error: 'bg-red-500',
  simulated: 'bg-purple-400',
  offline: 'bg-zinc-600',
};

const STATUS_PULSE: Record<ProviderStatus, string> = {
  healthy: 'animate-pulse',
  degraded: 'animate-pulse',
  error: '',
  simulated: '',
  offline: '',
};

const STATUS_TEXT: Record<ProviderStatus, string> = {
  healthy: 'LIVE',
  degraded: 'DEGRADED',
  error: 'ERROR',
  simulated: 'SIM',
  offline: 'OFF',
};

const STATUS_TEXT_COLOR: Record<ProviderStatus, string> = {
  healthy: 'text-emerald-400',
  degraded: 'text-yellow-400',
  error: 'text-red-400',
  simulated: 'text-purple-400',
  offline: 'text-zinc-600',
};

function timeAgo(ts: number | null): string {
  if (!ts) return '—';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'now';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

/** Provider Health Dot Bar — 10 dots at top of HUD */
export const ProviderHealthDots = memo(function ProviderHealthDots() {
  const health = useProviderHealthStore((s) => s.health, shallow);
  const toggleDetail = useProviderHealthStore((s) => s.toggleDetail);
  const hudVisible = useAppStore((s) => s.hudVisible);
  // Force re-render every 5s for time-based staleness
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  if (!hudVisible) return null;

  return (
    <div
      className="fixed top-[52px] right-28 z-30 cursor-pointer"
      onClick={toggleDetail}
      title="Click for provider health details"
    >
      <div className="flex gap-2 font-mono text-[9px]">
        {PROVIDER_KEYS.map((key) => {
          const h = health[key];
          return (
            <div key={key} className="flex flex-col items-center gap-0.5">
              <div
                className={`w-2 h-2 rounded-full ${STATUS_COLORS[h.status]} ${STATUS_PULSE[h.status]}`}
              />
              <span className={`${STATUS_TEXT_COLOR[h.status]} leading-none`}>
                {key === 'satellites' ? 'SAT' :
                 key === 'flights' ? 'FLT' :
                 key === 'ships' ? 'AIS' :
                 key === 'earthquakes' ? 'EQ' :
                 key === 'adsb' ? 'MIL' :
                 key === 'weather' ? 'WX' :
                 key === 'typhoon' ? 'TY' :
                 key === 'volcano' ? 'VOL' :
                 key === 'wildfire' ? 'FIRE' :
                 'CAM'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/** Detail panel — expanded view */
export const ProviderHealthDetail = memo(function ProviderHealthDetail() {
  const health = useProviderHealthStore((s) => s.health, shallow);
  const detailOpen = useProviderHealthStore((s) => s.detailOpen);
  const toggleDetail = useProviderHealthStore((s) => s.toggleDetail);
  // Tick for time-ago updates
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!detailOpen) return;
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, [detailOpen]);

  if (!detailOpen) return null;

  return (
    <div className="fixed top-[80px] right-4 z-40 w-72 pointer-events-auto">
      <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-lg font-mono shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/40">
          <div className="text-zinc-400 text-[10px] tracking-widest">
            PROVIDER HEALTH MONITOR
          </div>
          <button
            onClick={toggleDetail}
            className="text-zinc-500 hover:text-zinc-300 text-xs"
          >
            ✕
          </button>
        </div>

        {/* Provider rows */}
        <div className="px-2 py-1.5 space-y-0.5 max-h-[400px] overflow-y-auto">
          {PROVIDER_KEYS.map((key) => (
            <ProviderRow key={key} providerKey={key} health={health[key]} />
          ))}
        </div>

        {/* Legend */}
        <div className="px-3 py-1.5 border-t border-zinc-700/40 flex gap-3 text-[8px]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> LIVE
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> DEGRADED
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> ERROR
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> SIM
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" /> OFF
          </span>
        </div>
      </div>
    </div>
  );
});

function ProviderRow({
  providerKey,
  health,
}: {
  providerKey: ProviderKey;
  health: { status: ProviderStatus; lastSuccess: number | null; lastError: string | null; dataCount: number; latency: number | null };
}) {
  return (
    <div className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-zinc-800/50 text-[10px]">
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[health.status]} ${STATUS_PULSE[health.status]}`} />

      {/* Icon + label */}
      <span className="text-zinc-500 w-4 text-center">{PROVIDER_ICONS[providerKey]}</span>
      <span className="text-zinc-400 w-16 truncate">{PROVIDER_LABELS[providerKey]}</span>

      {/* Status text */}
      <span className={`w-14 text-center ${STATUS_TEXT_COLOR[health.status]}`}>
        {STATUS_TEXT[health.status]}
      </span>

      {/* Last update */}
      <span className="text-zinc-600 w-8 text-right">
        {timeAgo(health.lastSuccess)}
      </span>

      {/* Data count */}
      <span className="text-zinc-500 w-10 text-right">
        {health.dataCount > 0 ? health.dataCount.toLocaleString() : '—'}
      </span>
    </div>
  );
}

/** Simulated Data Banner — shows when any active provider is in simulation mode */
export const SimulatedDataBanner = memo(function SimulatedDataBanner() {
  const health = useProviderHealthStore((s) => s.health, shallow);
  const activeLayers = useAppStore((s) => s.activeLayers, shallow);
  const activeOverlays = useAppStore((s) => s.activeOverlays, shallow);
  const hudVisible = useAppStore((s) => s.hudVisible);

  if (!hudVisible) return null;

  // Check if any active layer/overlay is running simulated data
  const simProviders: string[] = [];
  for (const key of PROVIDER_KEYS) {
    if (health[key].isSimulated) {
      // Only show if the layer/overlay is actually active
      const isActive =
        activeLayers.includes(key) ||
        activeOverlays.includes(key);
      if (isActive) {
        simProviders.push(PROVIDER_LABELS[key]);
      }
    }
  }

  if (simProviders.length === 0) return null;

  return (
    <div className="fixed top-7 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-purple-900/70 border border-purple-500/50 px-4 py-1 rounded animate-pulse">
        <span className="text-purple-300 font-mono text-[10px] tracking-wider font-bold">
          ⚠ SIMULATED DATA: {simProviders.join(', ')}
        </span>
      </div>
    </div>
  );
});
