import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { isAISConnected } from '@/providers/ShipProvider';

/** 우측 미니 통계 패널 — 위협 레벨 + 데이터 파이프라인 + 엔티티 카운트 */
export default function MiniStats() {
  const dataCounts = useAppStore((s) => s.dataCounts);
  const [aisLive, setAisLive] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setAisLive(isAISConnected()), 3000);
    return () => clearInterval(id);
  }, []);

  const threatLevel = dataCounts.earthquakes > 50 ? 'ELEVATED' : 'NORMAL';
  const threatColor = threatLevel === 'ELEVATED' ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="fixed top-20 right-4 z-30 w-44 pointer-events-none">
      <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-700/40 rounded p-2.5 font-mono space-y-2">
        {/* 위협 레벨 */}
        <div>
          <div className="text-gray-500 text-[9px] tracking-widest">THREAT ASSESSMENT</div>
          <div className={`text-sm font-bold ${threatColor}`}>{threatLevel}</div>
        </div>

        <div className="border-t border-gray-700/40" />

        {/* 데이터 파이프라인 */}
        <div>
          <div className="text-gray-500 text-[9px] tracking-widest mb-1">DATA PIPELINE</div>
          <PipelineRow label="CELESTRAK" value="SYNC" ok />
          <PipelineRow label="OPENSKY" value="LIVE" ok />
          <PipelineRow label="USGS" value="POLL" ok />
          <PipelineRow label="AIS" value={aisLive ? 'LIVE' : 'SIM'} ok />
          <PipelineRow label="SIGINT" value="N/A" ok={false} />
        </div>

        <div className="border-t border-gray-700/40" />

        {/* 레이어 통계 */}
        <div>
          <div className="text-gray-500 text-[9px] tracking-widest mb-1">ENTITY COUNT</div>
          <StatRow label="SAT" count={dataCounts.satellites || 0} color="text-cyan-400" />
          <StatRow label="FLT" count={dataCounts.flights || 0} color="text-yellow-400" />
          <StatRow label="SHIP" count={dataCounts.ships || 0} color="text-blue-400" />
          <StatRow label="EQ" count={dataCounts.earthquakes || 0} color="text-red-400" />
        </div>
      </div>
    </div>
  );
}

function PipelineRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex justify-between items-center text-[10px]">
      <span className="text-gray-500">{label}</span>
      <span className={ok ? 'text-green-400' : 'text-gray-600'}>{value}</span>
    </div>
  );
}

function StatRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex justify-between items-center text-[10px]">
      <span className="text-gray-500">{label}</span>
      <span className={color}>{count.toLocaleString()}</span>
    </div>
  );
}
