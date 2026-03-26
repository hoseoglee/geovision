import { useState, useRef, useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  getSelectedCCTV,
  subscribeSelectedCCTV,
  setSelectedCCTV,
  toggleFavorite,
  isFavorite,
  type CCTVData,
} from '@/providers/CCTVProvider';
import CCTVAnalysis from './CCTVAnalysis';

const TYPE_LABELS: Record<CCTVData['type'], string> = {
  traffic: 'TRAFFIC',
  city: 'CITY',
  port: 'PORT',
  landmark: 'LANDMARK',
  webcam: 'WEBCAM',
};

const TYPE_COLORS: Record<CCTVData['type'], string> = {
  traffic: 'text-amber-400',
  city: 'text-emerald-400',
  port: 'text-cyan-400',
  landmark: 'text-green-300',
  webcam: 'text-purple-400',
};

/** CCTV Live Stream overlay — draggable floating panel */
export default function CCTVViewer() {
  const cctv = useSyncExternalStore(subscribeSelectedCCTV, getSelectedCCTV, getSelectedCCTV);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 140, y: 100 });
  const [imgError, setImgError] = useState(false);
  const [size, setSize] = useState(() => {
    const w = Math.min(window.innerWidth - 32, 520);
    return { width: w, height: Math.round(w * 9 / 16) };
  });
  const [loadFailed, setLoadFailed] = useState(false);
  const [fav, setFav] = useState(() => cctv ? isFavorite(cctv.id) : false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const w = Math.min(window.innerWidth - 32, 520);
      setSize({ width: w, height: Math.round(w * 9 / 16) });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { setLoadFailed(false); }, [cctv?.id]);
  useEffect(() => { if (cctv) setFav(isFavorite(cctv.id)); }, [cctv?.id]);

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

  const isWindy = cctv.source === 'windy';
  const hasPlayer = isWindy && cctv.embedUrl?.includes('webcams.windy.com');

  return (
    <div
      className="fixed z-[60] font-mono"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Header — drag handle */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/95 border border-emerald-500/40
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
          {isWindy && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-500/30">
              WINDY
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { if (cctv) setFav(toggleFavorite(cctv.id)); }}
            className={`text-xs px-1 ${fav ? 'text-yellow-400' : 'text-zinc-500 hover:text-yellow-400'}`}
            title={fav ? 'Remove from favorites' : 'Add to favorites'}
          >
            {fav ? '★' : '☆'}
          </button>
          <button
            onClick={() => setMinimized(!minimized)}
            className="text-zinc-500 hover:text-zinc-300 text-xs px-1"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? '\u25A1' : '\u2014'}
          </button>
          <button
            onClick={() => { setSelectedCCTV(null); setImgError(false); }}
            className="text-zinc-500 hover:text-red-400 text-xs px-1"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Video/Image area */}
      {!minimized && (
        <div className="bg-black border border-emerald-500/40 border-t-0 rounded-b overflow-hidden">
          {hasPlayer ? (
            // Windy player embed (timelapse)
            <iframe
              key={cctv.id}
              src={cctv.embedUrl}
              width={size.width}
              height={size.height}
              allow="autoplay"
              className="block"
              title={`CCTV: ${cctv.name}`}
            />
          ) : isWindy && cctv.thumbnailUrl && !imgError ? (
            // Windy snapshot image
            <div className="relative">
              <img
                src={cctv.thumbnailUrl}
                alt={cctv.name}
                width={size.width}
                height={size.height}
                className="block object-cover"
                style={{ width: size.width, height: size.height }}
                onError={() => setImgError(true)}
              />
              <div className="absolute bottom-2 right-2 flex gap-1">
                <a
                  href={cctv.embedUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] px-2 py-0.5 rounded bg-purple-600/80 text-white hover:bg-purple-500 transition-colors"
                >
                  OPEN PLAYER
                </a>
              </div>
              <div className="absolute top-2 left-2 text-[8px] px-1.5 py-0.5 rounded bg-black/60 text-zinc-300">
                SNAPSHOT
              </div>
            </div>
          ) : (
            // YouTube embed (static cameras) or fallback
            <div className="relative">
              <iframe
                key={cctv.id}
                src={cctv.embedUrl}
                width={size.width}
                height={size.height}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                className="block"
                title={`CCTV: ${cctv.name}`}
              />
              {cctv.source === 'youtube' && (
                <div className="absolute top-2 left-2 text-[8px] px-1.5 py-0.5 rounded bg-black/60 text-zinc-400">
                  YOUTUBE LIVE
                </div>
              )}
            </div>
          )}
          {/* Bottom info bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/95">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-[9px]">
                {cctv.city}, {cctv.country}
              </span>
              <span className="text-zinc-600 text-[9px]">
                {cctv.lat.toFixed(3)}, {cctv.lng.toFixed(3)}
              </span>
            </div>
            <span className={`text-[8px] tracking-wider ${isWindy ? 'text-purple-400/70' : 'text-emerald-400/70'}`}>
              {isWindy ? 'WINDY' : 'LIVE'}
            </span>
          </div>
          {/* AI Analysis section */}
          <div className="bg-zinc-900/95">
            <CCTVAnalysis cctv={cctv} />
          </div>
        </div>
      )}
    </div>
  );
}
