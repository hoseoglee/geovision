import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { shallow } from 'zustand/shallow';

/** 팔란티어 스타일 HUD 오버레이 — 코너 브래킷 + 시스템 상태 + 좌표 + 시계 */
export default function HudOverlay() {
  const [time, setTime] = useState(new Date());
  const dataCounts = useAppStore((s) => s.dataCounts, shallow);
  const activeLayers = useAppStore((s) => s.activeLayers, shallow);
  const hudVisible = useAppStore((s) => s.hudVisible);

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const totalEntities = Object.values(dataCounts).reduce((a, b) => a + b, 0);

  if (!hudVisible) return null;

  return (
    <>
      {/* 상단 분류 배너 */}
      <div className="fixed top-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <div className="bg-red-900/60 border border-red-500/40 px-8 py-0.5">
          <span className="text-red-400 font-mono text-[10px] tracking-[0.3em] font-bold">
            GEOVISION // INTELLIGENCE SURVEILLANCE SYSTEM // CLASSIFIED
          </span>
        </div>
      </div>

      {/* 좌상단 코너 브래킷 */}
      <div className="fixed top-8 left-[300px] z-30 pointer-events-none">
        <div className="border-l-2 border-t-2 border-emerald-500/40 w-16 h-16" />
      </div>

      {/* 우상단 코너 브래킷 + 시계 */}
      <div className="fixed top-8 right-4 z-30 pointer-events-none text-right">
        <div className="flex items-center justify-end gap-1.5 mb-1 font-mono">
          <span className="text-red-500 animate-pulse">●</span>
          <span className="text-red-400 font-mono text-[10px] tracking-widest">REC</span>
          <span className="text-red-300 font-mono text-[10px]">
            {time.toISOString().slice(0, 10)}
          </span>
          <span className="text-red-300 font-mono text-[10px]">
            {time.toISOString().slice(11, 19)}Z
          </span>
        </div>
        <div className="border-r-2 border-t-2 border-emerald-500/40 w-16 h-16 ml-auto" />
        <div className="mt-2 font-mono">
          <div className="text-emerald-400 text-xs tracking-wider">
            {time.toLocaleTimeString('ko-KR', { hour12: false })}
          </div>
          <div className="text-emerald-600 text-[10px]">
            UTC {time.toISOString().replace('T', ' ').slice(0, 19) + 'Z'}
          </div>
          <div className="text-zinc-500 text-[10px] mt-1">
            {time.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}
          </div>
        </div>
      </div>

      {/* 좌하단 코너 브래킷 */}
      <div className="fixed bottom-8 left-[300px] z-30 pointer-events-none">
        <div className="border-l-2 border-b-2 border-emerald-500/40 w-16 h-16" />
      </div>

      {/* 우하단 코너 브래킷 + 시스템 상태 */}
      <div className="fixed bottom-8 right-4 z-30 pointer-events-none text-right">
        <div className="font-mono mb-2">
          <div className="text-zinc-500 text-[10px]">ACTIVE FEEDS</div>
          <div className="text-emerald-400 text-xs">
            {activeLayers.length} / 4 ONLINE
          </div>
          <div className="text-zinc-500 text-[10px] mt-1">TRACKED ENTITIES</div>
          <div className="text-emerald-400 text-sm font-bold">
            {totalEntities.toLocaleString()}
          </div>
        </div>
        <div className="border-r-2 border-b-2 border-emerald-500/40 w-16 h-16 ml-auto" />
      </div>

      {/* 상단 우측 시스템 메트릭 바 */}
      <div className="fixed top-8 right-28 z-30 pointer-events-none">
        <div className="flex gap-4 font-mono text-[10px]">
          <StatusIndicator label="SAT" active={activeLayers.includes('satellites')} />
          <StatusIndicator label="ADS-B" active={activeLayers.includes('flights')} />
          <StatusIndicator label="AIS" active={activeLayers.includes('ships')} />
          <StatusIndicator label="SEISMIC" active={activeLayers.includes('earthquakes')} />
          <StatusIndicator label="SYS" active={true} />
        </div>
      </div>
    </>
  );
}

function StatusIndicator({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
      <span className={active ? 'text-emerald-500' : 'text-red-500/60'}>{label}</span>
    </div>
  );
}
