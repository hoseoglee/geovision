import { memo } from 'react';
import { forward } from 'mgrs';
import { useAppStore } from '@/store/useAppStore';

/** 좌하단 — 마우스 커서 좌표 + 카메라 고도 표시 */
export default memo(function CursorInfo() {
  const mouseCoords = useAppStore((s) => s.mouseCoords);
  const cameraAltitude = useAppStore((s) => s.cameraAltitude);

  function formatAlt(m: number): string {
    if (m > 1_000_000) return `${(m / 1_000_000).toFixed(1)}M km`;
    if (m > 1_000) return `${(m / 1_000).toFixed(1)} km`;
    return `${m.toFixed(0)} m`;
  }

  function formatDMS(deg: number, isLat: boolean): string {
    const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
    const abs = Math.abs(deg);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = ((abs - d - m / 60) * 3600).toFixed(1);
    return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(4, '0')}"${dir}`;
  }

  return (
    <div className="fixed bottom-12 left-[300px] z-30 pointer-events-none font-mono" style={{ contain: 'layout style paint' }}>
      <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-700/30 rounded px-3 py-2 space-y-1">
        <div className="text-zinc-500 text-[9px] tracking-widest">CURSOR POSITION</div>
        {mouseCoords ? (
          <>
            <div className="text-emerald-400 text-xs">
              {formatDMS(mouseCoords.lat, true)}  {formatDMS(mouseCoords.lng, false)}
            </div>
            <div className="text-zinc-500 text-[10px]">
              {mouseCoords.lat.toFixed(5)}°, {mouseCoords.lng.toFixed(5)}°
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-zinc-500 text-[9px] tracking-widest">MGRS</span>
              <span className="text-amber-400 text-xs">
                {(() => {
                  try {
                    return forward([mouseCoords.lng, mouseCoords.lat]);
                  } catch {
                    return '—';
                  }
                })()}
              </span>
            </div>
          </>
        ) : (
          <div className="text-zinc-600 text-xs">— NO SIGNAL —</div>
        )}
        <div className="border-t border-zinc-700/30 pt-1 mt-1">
          <div className="text-zinc-500 text-[9px] tracking-widest">CAM ALTITUDE</div>
          <div className="text-cyan-400 text-xs">{formatAlt(cameraAltitude)}</div>
        </div>
      </div>
    </div>
  );
})
