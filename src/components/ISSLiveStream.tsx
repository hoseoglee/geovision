import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';

/** ISS 라이브 스트림 오버레이 — 드래그 가능한 플로팅 패널 */
export default function ISSLiveStream() {
  const show = useAppStore((s) => s.issLiveStream);
  const setShow = useAppStore((s) => s.setIssLiveStream);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 100, y: 80 });
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

  if (!show) return null;

  return (
    <div
      className="fixed z-[60] font-mono"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* 헤더 — 드래그 핸들 */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-gray-900/95 border border-yellow-500/40
          border-b-0 rounded-t cursor-move select-none"
        onMouseDown={onMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-yellow-400 text-[10px] font-bold tracking-widest">ISS LIVE STREAM</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMinimized(!minimized)}
            className="text-gray-500 hover:text-gray-300 text-xs px-1"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? '□' : '—'}
          </button>
          <button
            onClick={() => setShow(false)}
            className="text-gray-500 hover:text-red-400 text-xs px-1"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 영상 영역 */}
      {!minimized && (
        <div className="bg-black border border-yellow-500/40 border-t-0 rounded-b overflow-hidden">
          <iframe
            src="https://www.youtube.com/embed/xRPjKQtRXR8?autoplay=1&mute=1"
            width="480"
            height="270"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="block"
            title="ISS Live Stream"
          />
          <div className="flex items-center justify-between px-3 py-1 bg-gray-900/95">
            <span className="text-gray-500 text-[8px]">NASA Official • ISS HD Earth Viewing Experiment</span>
            <a
              href="https://www.n2yo.com/space-station/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400/70 hover:text-yellow-400 text-[8px]"
            >
              ↗ N2YO Tracker
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
