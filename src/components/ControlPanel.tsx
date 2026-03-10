

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import LayerSelector from './LayerSelector';
import FilterControls from './FilterControls';
import LandmarkNav from './LandmarkNav';
import Legend from './Legend';
import OverlaySelector from './OverlaySelector';

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
          <FilterControls />
          <div className="border-t border-gray-700/50" />
          <LandmarkNav />
          <div className="border-t border-gray-700/50" />
          <OverlaySelector />
          <div className="border-t border-gray-700/50" />
          <Legend />
        </div>

        {/* 푸터 */}
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
