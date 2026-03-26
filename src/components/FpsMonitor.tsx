import { memo, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

/** FPS 모니터 — 프레임 레이트 + 미니 그래프 */
export default memo(function FpsMonitor() {
  const setFps = useAppStore((s) => s.setFps);
  const [displayFps, setDisplayFps] = useState(60);
  const [history, setHistory] = useState<number[]>(Array(30).fill(60));
  const frameRef = useRef<number>(0);
  const lastRef = useRef(performance.now());
  const countRef = useRef(0);

  useEffect(() => {
    let running = true;

    function measure() {
      if (!running) return;
      countRef.current++;
      const now = performance.now();
      if (now - lastRef.current >= 500) {
        const fps = Math.round(countRef.current / ((now - lastRef.current) / 1000));
        countRef.current = 0;
        lastRef.current = now;
        setDisplayFps(fps);
        setFps(fps);
        setHistory((prev) => [...prev.slice(1), fps]);
      }
      frameRef.current = requestAnimationFrame(measure);
    }

    frameRef.current = requestAnimationFrame(measure);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [setFps]);

  const fpsColor = displayFps >= 50 ? 'text-emerald-400' : displayFps >= 30 ? 'text-yellow-400' : 'text-red-400';
  const barColor = displayFps >= 50 ? 'bg-emerald-500/60' : displayFps >= 30 ? 'bg-yellow-500/60' : 'bg-red-500/60';

  return (
    <div className="fixed top-[370px] right-4 z-30 pointer-events-none" style={{ contain: 'layout style paint' }}>
      <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-700/30 rounded px-3 py-2 font-mono">
        <div className="flex items-center justify-between mb-1">
          <span className="text-zinc-500 text-[9px] tracking-widest">FPS</span>
          <span className={`text-sm font-bold ${fpsColor}`}>{displayFps}</span>
        </div>
        <div className="flex items-end gap-[1px] h-4">
          {history.map((f, i) => (
            <div
              key={i}
              className={`flex-1 ${barColor} rounded-t-[1px] transition-all duration-200`}
              style={{ height: `${Math.min(100, (f / 70) * 100)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
})
