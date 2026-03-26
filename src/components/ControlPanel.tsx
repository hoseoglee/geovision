

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useCorrelationStore } from '@/store/useCorrelationStore';
import LayerSelector from './LayerSelector';
import HeatmapControls from './HeatmapControls';
import FilterControls from './FilterControls';
import LandmarkNav from './LandmarkNav';
import Legend from './Legend';
import OverlaySelector from './OverlaySelector';

function CorrelationStatus() {
  const isRunning = useCorrelationStore((s) => s.isRunning);
  const correlations = useCorrelationStore((s) => s.correlations);
  const startEngine = useCorrelationStore((s) => s.startEngine);
  const stopEngine = useCorrelationStore((s) => s.stopEngine);

  const critCount = correlations.filter((c) => c.severity === 'critical').length;
  const warnCount = correlations.filter((c) => c.severity === 'warning').length;
  const recentCount = correlations.filter((c) => Date.now() - c.timestamp < 300000).length;

  return (
    <div>
      <h3 className="text-gray-400 text-[10px] font-bold tracking-widest mb-2">CORRELATION ENGINE</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-cyan-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-gray-400 text-[10px]">{isRunning ? 'ACTIVE' : 'IDLE'}</span>
          </div>
          <button
            onClick={() => isRunning ? stopEngine() : startEngine()}
            className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors
              ${isRunning
                ? 'border-red-500/40 text-red-400 hover:bg-red-900/30'
                : 'border-green-500/40 text-green-400 hover:bg-green-900/30'
              }`}
          >
            {isRunning ? 'STOP' : 'START'}
          </button>
        </div>
        <div className="flex gap-3 text-[9px] text-gray-500">
          <span>ACTIVE: <span className="text-cyan-400">{recentCount}</span></span>
          <span>CRIT: <span className={critCount > 0 ? 'text-red-400' : 'text-gray-600'}>{critCount}</span></span>
          <span>WARN: <span className={warnCount > 0 ? 'text-yellow-400' : 'text-gray-600'}>{warnCount}</span></span>
        </div>
        <p className="text-gray-600 text-[8px]">5 rules | 10s interval | spatial+temporal</p>
      </div>
    </div>
  );
}

export default function ControlPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const dataCounts = useAppStore((s) => s.dataCounts);

  return (
    <div className="fixed top-0 left-0 h-full z-50 flex">
      {/* 패널 본체 */}
      <div
        className={`h-full bg-gray-900/80 backdrop-blur-md border-r border-gray-700/50
          transition-all duration-300 overflow-hidden flex flex-col
          ${collapsed ? 'w-0 opacity-0' : 'w-72 opacity-100'}`}
      >
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-gray-700/50 flex-shrink-0">
          <h2 className="text-green-400 font-mono text-sm font-bold tracking-widest uppercase">
            GeoVision
          </h2>
          <p className="text-gray-500 text-[10px] mt-0.5 font-mono">
            Intelligence Control System
          </p>
        </div>

        {/* 컨트롤 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 scrollbar-thin scrollbar-thumb-gray-700">
          <LayerSelector dataCounts={dataCounts} />
          <div className="border-t border-gray-700/50" />
          <HeatmapControls />
          <div className="border-t border-gray-700/50" />
          <FilterControls />
          <div className="border-t border-gray-700/50" />
          <LandmarkNav />
          <div className="border-t border-gray-700/50" />
          <OverlaySelector />
          <div className="border-t border-gray-700/50" />
          <CorrelationStatus />
          <div className="border-t border-gray-700/50" />
          <GeofenceControls />
          <div className="border-t border-gray-700/50" />
          <Legend />
        </div>

        <div className="px-4 py-2 border-t border-gray-700/50 flex-shrink-0">
          <p className="text-gray-600 text-[10px] font-mono text-center">
            SYS ONLINE
          </p>
        </div>
      </div>

      {/* 토글 버튼 */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className={`self-start mt-3 bg-gray-900/80 backdrop-blur-md border border-gray-700/50
          text-green-400 hover:text-green-300 hover:bg-gray-800/80
          w-7 h-7 flex items-center justify-center rounded-r
          transition-all duration-200 ${collapsed ? 'ml-0' : ''}`}
        title={collapsed ? '패널 펼치기' : '패널 접기'}
      >
        <span className="text-xs font-mono">
          {collapsed ? '▶' : '◀'}
        </span>
      </button>
    </div>
  );
}
