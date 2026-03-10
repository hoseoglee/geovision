import { useEffect, useState } from 'react';

const CITIES = [
  { name: 'SEOUL', tz: 'Asia/Seoul' },
  { name: 'NYC', tz: 'America/New_York' },
  { name: 'LONDON', tz: 'Europe/London' },
  { name: 'TOKYO', tz: 'Asia/Tokyo' },
];

/** 세계 주요 도시 시계 */
export default function WorldClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed top-[290px] right-4 z-30 pointer-events-none">
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/30 rounded px-3 py-2 font-mono">
        <div className="text-gray-500 text-[9px] tracking-widest mb-1">WORLD TIME</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {CITIES.map((c) => {
            const time = now.toLocaleTimeString('en-US', {
              timeZone: c.tz,
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
            });
            const hour = parseInt(time.split(':')[0]);
            const isDay = hour >= 6 && hour < 18;
            return (
              <div key={c.name} className="flex items-center gap-1.5 text-[10px]">
                <span className={`w-1 h-1 rounded-full ${isDay ? 'bg-yellow-400' : 'bg-blue-500'}`} />
                <span className="text-gray-500 w-12">{c.name}</span>
                <span className="text-green-400">{time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
