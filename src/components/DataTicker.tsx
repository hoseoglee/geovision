import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface TickerEvent {
  id: number;
  time: string;
  type: 'satellite' | 'flight' | 'earthquake' | 'system';
  message: string;
}

const TYPE_COLORS = {
  satellite: 'text-cyan-400',
  flight: 'text-yellow-400',
  earthquake: 'text-red-400',
  system: 'text-green-400',
};

const TYPE_PREFIX = {
  satellite: '[SAT]',
  flight: '[ADS-B]',
  earthquake: '[SEISMIC]',
  system: '[SYS]',
};

/** 하단 데이터 티커 — 실시간 이벤트 스트림 */
export default function DataTicker() {
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const idRef = useRef(0);
  const dataCounts = useAppStore((s) => s.dataCounts);
  const activeLayers = useAppStore((s) => s.activeLayers);

  // 초기 시스템 이벤트
  useEffect(() => {
    const initEvents: TickerEvent[] = [
      { id: idRef.current++, time: ts(), type: 'system', message: 'GEOVISION Intelligence System initialized' },
      { id: idRef.current++, time: ts(), type: 'system', message: 'Connecting to data feeds...' },
    ];
    setEvents(initEvents);
  }, []);

  // 레이어 변경 시 이벤트
  useEffect(() => {
    if (activeLayers.includes('satellites') && dataCounts.satellites) {
      addEvent('satellite', `CelesTrak TLE feed synced — ${dataCounts.satellites.toLocaleString()} objects tracked`);
    }
  }, [dataCounts.satellites, activeLayers]);

  useEffect(() => {
    if (activeLayers.includes('flights') && dataCounts.flights) {
      addEvent('flight', `OpenSky ADS-B feed online — ${dataCounts.flights.toLocaleString()} aircraft in flight`);
    }
  }, [dataCounts.flights, activeLayers]);

  useEffect(() => {
    if (activeLayers.includes('earthquakes') && dataCounts.earthquakes) {
      addEvent('earthquake', `USGS seismic feed active — ${dataCounts.earthquakes} events in last 24h`);
    }
  }, [dataCounts.earthquakes, activeLayers]);

  // 주기적 시뮬레이션 이벤트
  useEffect(() => {
    const messages = [
      { type: 'system' as const, msg: 'Heartbeat OK — all subsystems nominal' },
      { type: 'system' as const, msg: 'Data pipeline latency: 142ms' },
      { type: 'satellite' as const, msg: 'ISS (ZARYA) pass detected — elevation 47°' },
      { type: 'flight' as const, msg: 'High density corridor detected: KJFK-EGLL' },
      { type: 'earthquake' as const, msg: 'Monitoring Pacific Ring of Fire — normal activity' },
      { type: 'system' as const, msg: 'Encryption handshake completed — channel secure' },
      { type: 'satellite' as const, msg: 'Starlink constellation update — 234 new TLEs' },
      { type: 'flight' as const, msg: 'TCAS advisory: convergence zone detected over Atlantic' },
      { type: 'system' as const, msg: 'Geospatial index rebuilt — 0.3s' },
      { type: 'earthquake' as const, msg: 'Cascadia subduction zone — baseline normal' },
    ];

    let idx = 0;
    const interval = setInterval(() => {
      const m = messages[idx % messages.length];
      addEvent(m.type, m.msg);
      idx++;
    }, 5000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, []);

  function addEvent(type: TickerEvent['type'], message: string) {
    setEvents((prev) => {
      const next = [{ id: idRef.current++, time: ts(), type, message }, ...prev];
      return next.slice(0, 50); // 최대 50개
    });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="bg-gray-950/80 backdrop-blur-sm border-t border-green-900/50 px-4 py-1.5">
        <div className="flex items-center gap-3">
          <span className="text-green-500 text-[10px] font-mono font-bold tracking-wider flex-shrink-0 animate-pulse">
            LIVE
          </span>
          <div className="overflow-hidden flex-1">
            <div className="flex gap-6 animate-ticker font-mono text-[11px] whitespace-nowrap">
              {events.slice(0, 10).map((e) => (
                <span key={e.id} className="flex-shrink-0">
                  <span className="text-gray-600">{e.time}</span>
                  {' '}
                  <span className={TYPE_COLORS[e.type]}>{TYPE_PREFIX[e.type]}</span>
                  {' '}
                  <span className="text-gray-400">{e.message}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ts() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
