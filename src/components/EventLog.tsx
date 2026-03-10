import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface LogEntry {
  id: number;
  time: string;
  type: 'SAT' | 'ADS-B' | 'AIS' | 'SEISMIC' | 'SYS';
  message: string;
  severity: 'info' | 'warn' | 'critical';
}

const TYPE_COLORS: Record<string, string> = {
  SAT: 'text-cyan-400',
  'ADS-B': 'text-yellow-400',
  AIS: 'text-blue-400',
  SEISMIC: 'text-red-400',
  SYS: 'text-green-400',
};

const SEVERITY_BG: Record<string, string> = {
  info: '',
  warn: 'bg-yellow-900/20',
  critical: 'bg-red-900/30',
};

const TEMPLATES: { type: LogEntry['type']; msg: string; sev: LogEntry['severity'] }[] = [
  { type: 'SAT', msg: 'Starlink constellation update — {n} TLEs', sev: 'info' },
  { type: 'SAT', msg: 'ISS pass predicted over {city}', sev: 'info' },
  { type: 'SAT', msg: 'GPS satellite SVN-{n} maneuver detected', sev: 'warn' },
  { type: 'ADS-B', msg: 'TCAS advisory: convergence zone over {area}', sev: 'warn' },
  { type: 'ADS-B', msg: 'Transponder loss: {call} last seen {area}', sev: 'critical' },
  { type: 'ADS-B', msg: 'Flight {call} altitude deviation +{n}ft', sev: 'info' },
  { type: 'AIS', msg: 'Vessel {name} entered strait of Malacca', sev: 'info' },
  { type: 'AIS', msg: 'AIS dark zone detected — {area}', sev: 'warn' },
  { type: 'AIS', msg: 'Tanker {name} speed anomaly {n}kt', sev: 'warn' },
  { type: 'SEISMIC', msg: 'M{mag} earthquake — {area}', sev: 'critical' },
  { type: 'SEISMIC', msg: 'Aftershock swarm detected — {area}', sev: 'warn' },
  { type: 'SYS', msg: 'Data pipeline sync completed — {n}ms', sev: 'info' },
  { type: 'SYS', msg: 'Encryption handshake — channel secure', sev: 'info' },
  { type: 'SYS', msg: 'Geospatial index rebuilt — {n}s', sev: 'info' },
];

const FILLS = {
  city: ['Seoul', 'Tokyo', 'London', 'NYC', 'Dubai'],
  area: ['Pacific', 'Atlantic', 'Mediterranean', 'South China Sea', 'Indian Ocean'],
  call: ['KE901', 'UA442', 'BA117', 'SQ321', 'EK773'],
  name: ['EVER GIVEN', 'MAERSK OHIO', 'MSC GÜLSÜN', 'CMA CGM MARCO POLO'],
};

function genEvent(id: number): LogEntry {
  const tmpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  let msg = tmpl.msg
    .replace('{n}', String(Math.floor(Math.random() * 500) + 10))
    .replace('{mag}', (3 + Math.random() * 4).toFixed(1))
    .replace('{city}', FILLS.city[Math.floor(Math.random() * FILLS.city.length)])
    .replace('{area}', FILLS.area[Math.floor(Math.random() * FILLS.area.length)])
    .replace('{call}', FILLS.call[Math.floor(Math.random() * FILLS.call.length)])
    .replace('{name}', FILLS.name[Math.floor(Math.random() * FILLS.name.length)]);
  const now = new Date();
  return {
    id,
    time: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type: tmpl.type,
    message: msg,
    severity: tmpl.sev,
  };
}

/** 최근 이벤트 로그 패널 */
export default function EventLog() {
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    Array.from({ length: 8 }, (_, i) => genEvent(i))
  );
  const [nextId, setNextId] = useState(8);
  const activeLayers = useAppStore((s) => s.activeLayers);

  useEffect(() => {
    const id = setInterval(() => {
      setNextId((prev) => {
        const newId = prev + 1;
        setLogs((prevLogs) => [genEvent(newId), ...prevLogs.slice(0, 11)]);
        return newId;
      });
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed bottom-10 right-4 z-30 w-52 pointer-events-none">
      <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-700/30 rounded font-mono">
        <div className="px-3 py-1.5 border-b border-gray-700/30">
          <div className="text-gray-500 text-[9px] tracking-widest">EVENT LOG</div>
        </div>
        <div className="max-h-36 overflow-hidden px-2 py-1 space-y-0.5">
          {logs.map((log) => (
            <div key={log.id} className={`text-[9px] px-1 py-0.5 rounded ${SEVERITY_BG[log.severity]}`}>
              <span className="text-gray-600">{log.time}</span>{' '}
              <span className={TYPE_COLORS[log.type]}>[{log.type}]</span>{' '}
              <span className="text-gray-400">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
