import { useEffect, useState, useRef } from 'react';
import { behavioralProfiler, type BehavioralProfile, type ProfileAnomaly } from '@/behavioral';

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
  entityId: string;
  entityType: 'flight' | 'ship' | 'adsb';
  isTracking: boolean;
}

// ── 성숙도 배지 ────────────────────────────────────────────────────────────
function MaturityBadge({ totalPoints }: { totalPoints: number }) {
  if (totalPoints < 50) {
    return (
      <span className="text-[8px] px-1.5 py-0.5 rounded border border-amber-500/40
        bg-amber-900/30 text-amber-400 tracking-wider">
        LEARNING
      </span>
    );
  }
  if (totalPoints < 200) {
    return (
      <span className="text-[8px] px-1.5 py-0.5 rounded border border-cyan-500/40
        bg-cyan-900/30 text-cyan-400 tracking-wider">
        BUILDING
      </span>
    );
  }
  return (
    <span className="text-[8px] px-1.5 py-0.5 rounded border border-green-500/40
      bg-green-900/30 text-green-400 tracking-wider">
      MATURE
    </span>
  );
}

// ── 이상 심각도 색상 ───────────────────────────────────────────────────────
function severityColor(severity: ProfileAnomaly['severity']): string {
  switch (severity) {
    case 'high':   return 'text-red-400';
    case 'medium': return 'text-yellow-400';
    case 'low':    return 'text-zinc-400';
  }
}

// ── 속도 시각화 바 ─────────────────────────────────────────────────────────
function SpeedBar({
  speedMean,
  speedStddev,
  speedMin,
  speedMax,
}: {
  speedMean: number;
  speedStddev: number;
  speedMin: number;
  speedMax: number;
}) {
  const range = speedMax - speedMin || 1;
  const meanPct  = ((speedMean - speedMin) / range) * 100;
  const sigma1Lo = Math.max(0, ((speedMean - speedStddev - speedMin) / range) * 100);
  const sigma1Hi = Math.min(100, ((speedMean + speedStddev - speedMin) / range) * 100);
  const sigma2Lo = Math.max(0, ((speedMean - 2 * speedStddev - speedMin) / range) * 100);
  const sigma2Hi = Math.min(100, ((speedMean + 2 * speedStddev - speedMin) / range) * 100);

  return (
    <div className="relative h-3 bg-zinc-800 rounded overflow-hidden mt-1.5 mb-1">
      {/* 2σ 범위 */}
      <div
        className="absolute top-0 h-full bg-cyan-900/40 rounded"
        style={{ left: `${sigma2Lo}%`, width: `${sigma2Hi - sigma2Lo}%` }}
      />
      {/* 1σ 범위 */}
      <div
        className="absolute top-0 h-full bg-cyan-700/40 rounded"
        style={{ left: `${sigma1Lo}%`, width: `${sigma1Hi - sigma1Lo}%` }}
      />
      {/* 평균선 */}
      <div
        className="absolute top-0 h-full w-0.5 bg-cyan-400"
        style={{ left: `${meanPct}%` }}
      />
    </div>
  );
}

// ── 24시간 활동 히트맵 ────────────────────────────────────────────────────
function ActivityHeatmap({ activeHours }: { activeHours: number[] }) {
  const maxVal = Math.max(...activeHours, 1);
  const peakHour = activeHours.indexOf(Math.max(...activeHours));

  return (
    <div>
      <div className="flex items-end gap-px mt-1.5" style={{ height: '24px' }}>
        {activeHours.map((count, hour) => {
          const heightPx = Math.round((count / maxVal) * 16);
          // 활동량에 따라 밝기 조절
          const intensity = count / maxVal;
          const barColor =
            intensity > 0.8 ? 'bg-cyan-300' :
            intensity > 0.6 ? 'bg-cyan-400' :
            intensity > 0.4 ? 'bg-cyan-500' :
            intensity > 0.2 ? 'bg-cyan-700' :
            count > 0        ? 'bg-zinc-600' :
                               'bg-zinc-800';

          return (
            <div
              key={hour}
              className="flex-1 flex items-end"
              title={`${hour.toString().padStart(2, '0')}:00Z — ${count} pts`}
              style={{ height: '16px' }}
            >
              <div
                className={`w-full rounded-sm ${barColor}`}
                style={{ height: `${Math.max(heightPx, count > 0 ? 2 : 1)}px` }}
              />
            </div>
          );
        })}
      </div>
      {/* 시간 눈금 (0, 6, 12, 18, 23) */}
      <div className="flex mt-0.5" style={{ fontSize: '7px', color: '#52525b' }}>
        {[0, 6, 12, 18, 23].map((h) => (
          <span
            key={h}
            className="absolute"
            style={{ left: `${(h / 23) * 100}%`, transform: 'translateX(-50%)' }}
          >
            {h.toString().padStart(2, '0')}
          </span>
        ))}
        {/* peak 레이블 */}
        <span className="ml-auto text-[8px] text-cyan-500">
          PEAK {peakHour.toString().padStart(2, '0')}:00Z
        </span>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function BehavioralProfilePanel({ entityId, entityType, isTracking }: Props) {
  const [profile, setProfile] = useState<BehavioralProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [anomalies, setAnomalies] = useState<ProfileAnomaly[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 프로파일 로드 + 갱신 ────────────────────────────────────────────────
  useEffect(() => {
    if (!isTracking) return;

    setLoading(true);

    // 저장된 프로파일 즉시 로드
    const saved = behavioralProfiler.loadProfile(entityId);
    if (saved) {
      setProfile(saved);
      setLoading(false);
    }

    // 최신 데이터로 갱신
    behavioralProfiler.refreshProfile(entityId).then((p) => {
      if (p) setProfile(p);
      setLoading(false);
    });

    // 30초마다 자동 갱신
    intervalRef.current = setInterval(async () => {
      const p = await behavioralProfiler.refreshProfile(entityId);
      if (p) setProfile(p);
    }, 30_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [entityId, isTracking]);

  // ── elapsed 업데이트 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - profile.lastUpdated) / 1000));
    }, 1000);
    setElapsed(Math.floor((Date.now() - profile.lastUpdated) / 1000));
    return () => clearInterval(tick);
  }, [profile?.lastUpdated]);

  // ── 이상 탐지 (프로파일 갱신 시마다) ────────────────────────────────────
  useEffect(() => {
    if (!profile) return setAnomalies([]);
    // 현재 값 없이는 이상 탐지 불가 — 빈 배열 유지
    setAnomalies([]);
  }, [profile]);

  // ── 케이스 1: 추적 비활성 ───────────────────────────────────────────────
  if (!isTracking && !profile) {
    return (
      <div className="font-mono px-0 py-3 flex flex-col items-center text-center gap-2">
        <div className="text-[11px] text-zinc-400 tracking-widest">TRACKING REQUIRED</div>
        <div className="text-zinc-600 text-[18px]">◎</div>
        <div className="text-[10px] text-zinc-500 leading-relaxed max-w-[200px]">
          Enable trajectory tracking to build a behavioral fingerprint for this entity.
        </div>
      </div>
    );
  }

  // ── 케이스 2: 로딩 중 ──────────────────────────────────────────────────
  if (!profile && loading) {
    return (
      <div className="font-mono py-3 flex flex-col items-center gap-1.5">
        <div className="text-[10px] text-cyan-400 tracking-widest animate-pulse">
          PROFILER INITIALIZING...
        </div>
        <div className="text-[9px] text-zinc-500 animate-pulse">
          Collecting trajectory data...
        </div>
      </div>
    );
  }

  // ── 케이스 3: 프로파일 없음 (추적 중이나 데이터 부족) ──────────────────
  if (!profile) {
    return (
      <div className="font-mono py-3 flex flex-col items-center gap-1.5">
        <div className="text-[10px] text-zinc-500 tracking-widest">NO PROFILE YET</div>
        <div className="text-[9px] text-zinc-600 text-center max-w-[200px]">
          Requires at least 20 trajectory points to compute fingerprint.
        </div>
      </div>
    );
  }

  // ── 케이스 4: 프로파일 보유 ─────────────────────────────────────────────
  const totalGeohashVisits = Object.values(profile.geohashHits).reduce((a, b) => a + b, 0);

  return (
    <div className="font-mono text-[10px]">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
          BEHAVIORAL FINGERPRINT
        </span>
        <div className="flex items-center gap-1.5">
          <MaturityBadge totalPoints={profile.totalPoints} />
          <span className="text-zinc-500 text-[9px]">{profile.totalPoints} samples</span>
        </div>
      </div>

      {/* ── 이상 탐지 섹션 ── */}
      {anomalies.length > 0 && (
        <div className="border-t border-zinc-700/30 pt-2 mt-2">
          <div className="text-[9px] text-red-400 tracking-widest uppercase mb-1 flex items-center gap-1">
            <span>⚠</span>
            <span>ANOMALIES DETECTED</span>
          </div>
          <div className="space-y-1">
            {anomalies.map((a, i) => (
              <div key={i} className={`text-[10px] ${severityColor(a.severity)} leading-tight`}>
                <span className="uppercase text-[9px] opacity-70">[{a.type}] </span>
                {a.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 속도 프로파일 ── */}
      <div className="border-t border-zinc-700/30 pt-2 mt-2">
        <div className="text-[9px] text-zinc-500 tracking-widest uppercase mb-1">
          SPEED PROFILE
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[13px] text-zinc-200 font-bold">
            {profile.speedMean.toFixed(0)}
            <span className="text-[9px] text-zinc-500 ml-0.5">kts avg</span>
          </span>
          <span className="text-[10px] text-zinc-400">
            ±{profile.speedStddev.toFixed(0)} σ
          </span>
          <span className="text-[10px] text-zinc-500">
            {profile.speedMin.toFixed(0)}–{profile.speedMax.toFixed(0)} kts
          </span>
        </div>
        <SpeedBar
          speedMean={profile.speedMean}
          speedStddev={profile.speedStddev}
          speedMin={profile.speedMin}
          speedMax={profile.speedMax}
        />
        <div className="flex justify-between text-[8px] text-zinc-600 mt-0.5">
          <span>{profile.speedMin.toFixed(0)}</span>
          <span className="text-cyan-700">μ±1σ / μ±2σ</span>
          <span>{profile.speedMax.toFixed(0)}</span>
        </div>
      </div>

      {/* ── 고도 프로파일 (ship 제외) ── */}
      {profile.entityType !== 'ship' && (
        <div className="border-t border-zinc-700/30 pt-2 mt-2">
          <div className="text-[9px] text-zinc-500 tracking-widest uppercase mb-1">
            ALTITUDE PROFILE
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[13px] text-zinc-200 font-bold">
              {(profile.altitudeMean / 1000).toFixed(1)}
              <span className="text-[9px] text-zinc-500 ml-0.5">k m avg</span>
            </span>
            <span className="text-[10px] text-zinc-400">
              ±{(profile.altitudeStddev / 1000).toFixed(1)}k m σ
            </span>
          </div>
        </div>
      )}

      {/* ── 활동 시간대 ── */}
      <div className="border-t border-zinc-700/30 pt-2 mt-2">
        <div className="text-[9px] text-zinc-500 tracking-widest uppercase mb-1">
          ACTIVITY PATTERN (UTC)
        </div>
        <div className="relative">
          <ActivityHeatmap activeHours={profile.activeHours} />
        </div>
      </div>

      {/* ── 방문 구역 ── */}
      <div className="border-t border-zinc-700/30 pt-2 mt-2">
        <div className="text-[9px] text-zinc-500 tracking-widest uppercase mb-1">
          FREQUENT ZONES
        </div>
        <div className="text-[10px] text-zinc-400 mb-1.5">
          <span className="text-cyan-400">{profile.topGeohashes.length}</span>
          <span> zones cover 80% of activity</span>
        </div>
        <div className="space-y-0.5">
          {profile.topGeohashes.slice(0, 5).map((gh) => {
            const count = profile.geohashHits[gh] ?? 0;
            const pct = totalGeohashVisits > 0
              ? Math.round((count / totalGeohashVisits) * 100)
              : 0;
            return (
              <div key={gh} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[9px] text-zinc-600 font-mono">{gh}</span>
                  {/* 비율 바 */}
                  <div className="flex-1 h-1 bg-zinc-800 rounded overflow-hidden" style={{ width: '40px' }}>
                    <div
                      className="h-full bg-cyan-600 rounded"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-[9px] text-zinc-500 shrink-0">
                  {count}×
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 마지막 갱신 ── */}
      <div className="border-t border-zinc-700/30 pt-2 mt-2">
        <div className="text-[9px] text-zinc-600 tracking-wider">
          UPDATED {elapsed}s ago
        </div>
      </div>

    </div>
  );
}
