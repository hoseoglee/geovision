import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

/** 태양 위치 계산 (간략 천문학) */
function getSunPosition(date: Date): { lat: number; lng: number; altitude: number } {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  // 태양 적위 (declination)
  const declination = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  // 태양 경도 (시간 기반)
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const solarLng = (12 - hours) * 15; // 15°/hour
  // 태양 고도 (관측자 위도 0° 기준)
  const altitude = 90 - Math.abs(declination);

  return { lat: declination, lng: ((solarLng + 540) % 360) - 180, altitude };
}

/** 태양/달 위치 HUD 인디케이터 */
export default function SunPositionHUD() {
  const activeOverlays = useAppStore((s) => s.activeOverlays);
  const [sun, setSun] = useState(getSunPosition(new Date()));

  useEffect(() => {
    const id = setInterval(() => setSun(getSunPosition(new Date())), 10000);
    return () => clearInterval(id);
  }, []);

  if (!activeOverlays.includes('sunPos')) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 translate-x-32 z-30 pointer-events-none">
      <div className="bg-zinc-900/60 backdrop-blur-sm border border-yellow-500/30 rounded px-3 py-1.5 font-mono flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-400 text-sm">☀</span>
          <div>
            <div className="text-zinc-500 text-[8px] tracking-widest">SOLAR POSITION</div>
            <div className="text-yellow-400 text-[10px]">
              {sun.lat.toFixed(1)}° {sun.lat >= 0 ? 'N' : 'S'}, {sun.lng.toFixed(1)}° {sun.lng >= 0 ? 'E' : 'W'}
            </div>
          </div>
        </div>
        <div className="border-l border-zinc-700/40 pl-3">
          <div className="text-zinc-500 text-[8px] tracking-widest">ELEVATION</div>
          <div className="text-yellow-300 text-[10px]">{sun.altitude.toFixed(1)}°</div>
        </div>
      </div>
    </div>
  );
}

export { getSunPosition };
