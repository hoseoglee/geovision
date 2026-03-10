import { useState, useRef, useCallback, useSyncExternalStore } from 'react';
import {
  getSelectedCCTV,
  subscribeSelectedCCTV,
  setSelectedCCTV,
  type CCTVData,
} from '@/providers/CCTVProvider';

const TYPE_LABELS: Record<CCTVData['type'], string> = {
  traffic: 'TRAFFIC',
  city: 'CITY',
  port: 'PORT',
  landmark: 'LANDMARK',
};

const TYPE_COLORS: Record<CCTVData['type'], string> = {
  traffic: 'text-amber-400',
  city: 'text-emerald-400',
  port: 'text-cyan-400',
  landmark: 'text-green-300',
};

/** CCTV Live Stream overlay — draggable floating panel */
export default function CCTVViewer() {
  const cctv = useSyncExternalStore(subscribeSelectedCCTV, getSelectedCCTV, getSelectedCCTV);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 140, y: 100 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  if (!cctv) return null;

  return (
    <div
      className="fixed z-[60] font-mono"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Header — drag handle */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-gray-900/95 border border-emerald-500/40
          border-b-0 rounded-t cursor-move select-none"
        onMouseDown={onMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-emerald-400 text-[10px] font-bold tracking-widest">
            CCTV — {cctv.name.toUpperCase()}
          </span>
          <span className={`text-[8px] px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-900/30 ${TYPE_COLORS[cctv.type]}`}>
            {TYPE_LABELS[cctv.type]}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMinimized(!minimized)}
            className="text-gray-500 hover:text-gray-300 text-xs px-1"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? '\u25A1' : '\u2014'}
          </button>
          <button
            onClick={() => setSelectedCCTV(null)}
            className="text-gray-500 hover:text-red-400 text-xs px-1"
            title="Close"
          >
            \u2715
          </button>
        </div>
      </div>

      {/* Video area */}
      {!minimized && (
        <div className="bg-black border border-emerald-500/40 border-t-0 rounded-b overflow-hidden">
          <iframe
            key={cctv.id}
            src={cctv.embedUrl}
            width="520"
            height="293"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="block"
            title={`CCTV: ${cctv.name}`}
          />
          {/* Bottom info bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900/95">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-[9px]">
                {cctv.city}, {cctv.country}
              </span>
              <span className="text-gray-600 text-[9px]">
                {cctv.lat.toFixed(3)}, {cctv.lng.toFixed(3)}
              </span>
            </div>
            <span className="text-emerald-400/70 text-[8px] tracking-wider">LIVE</span>
          </div>
        </div>
      )}
    </div>
  );
}
