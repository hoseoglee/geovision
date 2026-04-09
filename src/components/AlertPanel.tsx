import { useState } from 'react';
import { useAlertStore, type Alert, type AlertSeverity } from '@/store/useAlertStore';

const SEVERITY_STYLE: Record<AlertSeverity, { bg: string; border: string; text: string; icon: string; pulse: string }> = {
  critical: {
    bg: 'bg-red-950/80',
    border: 'border-red-500/60',
    text: 'text-red-400',
    icon: '🚨',
    pulse: 'animate-pulse',
  },
  warning: {
    bg: 'bg-yellow-950/60',
    border: 'border-yellow-500/40',
    text: 'text-yellow-400',
    icon: '⚠️',
    pulse: '',
  },
  info: {
    bg: 'bg-blue-950/40',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    icon: 'ℹ️',
    pulse: '',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  earthquake: 'SEISMIC',
  flight: 'ADS-B',
  ship: 'AIS',
  satellite: 'SAT',
  chokepoint: 'CHOKE',
  system: 'SYS',
  nuclear: 'NUCLEAR',
  geofence: 'GEOFENCE',
  'information-warfare': 'INFOWAR',
};

/** 알람 카테고리와 메시지로부터 관련 외부 사이트 URL 생성 */
function getAlertUrl(alert: Alert): string | null {
  const msg = alert.message;
  switch (alert.category) {
    case 'earthquake': {
      // "M6.2 earthquake detected — 142km SW of Tonga" → 구글 검색
      const match = msg.match(/M[\d.]+\s+earthquake[^.—]*/i);
      return `https://www.google.com/search?q=${encodeURIComponent(match?.[0] || alert.title)}`;
    }
    case 'flight': {
      // "Aircraft KE901 transponder lost" or "SQUAWK 7700 — UA442"
      const callsign = msg.match(/(?:Aircraft\s+|—\s*)([A-Z]{2,3}\d{1,4})/)?.[1];
      if (callsign) return `https://www.flightradar24.com/${callsign}`;
      return `https://www.google.com/search?q=${encodeURIComponent(alert.title + ' ' + msg.slice(0, 60))}`;
    }
    case 'ship': {
      // "Tanker EVER FORTUNE dark since..." or "MAERSK OHIO speed anomaly"
      const vessel = msg.match(/(?:Tanker|Vessel|MAERSK|EVER)\s+([A-Z][A-Z\s]{2,20}?)(?:\s+dark|\s+speed|\s+AIS)/)?.[0]?.trim();
      if (vessel) return `https://www.marinetraffic.com/en/ais/index/search/all?keyword=${encodeURIComponent(vessel)}`;
      return `https://www.google.com/search?q=${encodeURIComponent(alert.title + ' maritime')}`;
    }
    case 'satellite':
      return `https://www.n2yo.com/`;
    case 'nuclear':
      return `https://www.google.com/search?q=${encodeURIComponent(alert.title + ' ' + msg.slice(0, 60))}`;
    case 'chokepoint': {
      // "Strait of Hormuz — traffic density..."
      const strait = msg.match(/(Strait of \w+|Suez Canal|Taiwan Strait|Panama Canal)/)?.[1];
      return `https://www.google.com/search?q=${encodeURIComponent(strait || alert.title)}`;
    }
    default:
      return null;
  }
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return 'NOW';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

/** 알람 알림 배지 — 항상 보이는 작은 인디케이터 */
function AlertBadge({ count, hasCritical, onClick }: { count: number; hasCritical: boolean; onClick: () => void }) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`fixed top-8 left-[155px] z-50 flex items-center gap-1.5 px-2.5 py-1
        rounded font-mono text-xs backdrop-blur-sm transition-all
        ${hasCritical
          ? 'bg-red-900/80 border border-red-500/60 text-red-400 animate-pulse'
          : 'bg-yellow-900/60 border border-yellow-500/40 text-yellow-400'
        }`}
    >
      <span>{hasCritical ? '🚨' : '⚠️'}</span>
      <span className="font-bold">{count}</span>
      <span className="text-[9px] opacity-70">ALERT{count > 1 ? 'S' : ''}</span>
    </button>
  );
}

/** 알람 패널 — 전체 알람 목록 */
export default function AlertPanel() {
  const [expanded, setExpanded] = useState(false);
  const alerts = useAlertStore((s) => s.alerts);
  const unacknowledgedCount = useAlertStore((s) => s.unacknowledgedCount);
  const muted = useAlertStore((s) => s.muted);
  const acknowledgeAlert = useAlertStore((s) => s.acknowledgeAlert);
  const acknowledgeAll = useAlertStore((s) => s.acknowledgeAll);
  const toggleMute = useAlertStore((s) => s.toggleMute);

  const hasCritical = alerts.some((a) => !a.acknowledged && a.severity === 'critical');

  return (
    <>
      <AlertBadge count={unacknowledgedCount} hasCritical={hasCritical} onClick={() => setExpanded(!expanded)} />

      {/* 최신 미확인 알람 토스트 (최대 3개) */}
      {!expanded && (
        <div className="fixed top-16 left-[300px] z-40 space-y-1.5 pointer-events-auto" style={{ width: '360px' }}>
          {alerts
            .filter((a) => !a.acknowledged)
            .slice(0, 3)
            .map((alert) => (
              <AlertToast key={alert.id} alert={alert} onAck={() => acknowledgeAlert(alert.id)} />
            ))}
        </div>
      )}

      {/* 확장된 알람 패널 */}
      {expanded && (
        <div className="fixed top-16 left-[300px] z-50 w-[420px] max-h-[500px] flex flex-col
          bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 rounded shadow-2xl
          font-mono animate-slideIn pointer-events-auto">
          {/* 헤더 */}
          <div className="flex justify-between items-center px-3 py-2 border-b border-zinc-700/40">
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-sm">🚨</span>
              <span className="text-zinc-300 text-xs font-bold tracking-widest">ALERT CENTER</span>
              {unacknowledgedCount > 0 && (
                <span className="bg-red-600/80 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {unacknowledgedCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? '🔇' : '🔊'}
              </button>
              <button
                onClick={acknowledgeAll}
                className="text-zinc-500 hover:text-emerald-400 text-[10px] border border-zinc-700/40 px-2 py-0.5 rounded"
              >
                ACK ALL
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 알람 목록 */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
            {alerts.length === 0 ? (
              <div className="text-zinc-600 text-xs text-center py-8">NO ACTIVE ALERTS</div>
            ) : (
              alerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} onAck={() => acknowledgeAlert(alert.id)} />
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}

function AlertToast({ alert, onAck }: { alert: Alert; onAck: () => void }) {
  const style = SEVERITY_STYLE[alert.severity];
  const url = getAlertUrl(alert);

  const handleClick = () => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`${style.bg} ${style.border} border rounded px-3 py-2 ${style.pulse}
      flex items-start gap-2 shadow-lg transition-all ${url ? 'cursor-pointer hover:brightness-125' : ''}`}
      onClick={handleClick}
    >
      <span className="text-sm mt-0.5">{style.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <span className={`text-[10px] font-bold ${style.text}`}>
            [{CATEGORY_LABELS[alert.category] || alert.category}] {alert.title}
          </span>
          <span className="text-zinc-600 text-[9px] ml-2">{timeAgo(alert.timestamp)}</span>
        </div>
        <p className="text-zinc-400 text-[10px] mt-0.5 leading-snug">{alert.message}</p>
        {url && <span className="text-zinc-600 text-[8px] mt-0.5">↗ CLICK TO VIEW</span>}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onAck(); }} className="text-zinc-600 hover:text-emerald-400 text-[10px] mt-0.5 shrink-0" title="Acknowledge">
        ✓
      </button>
    </div>
  );
}

function AlertRow({ alert, onAck }: { alert: Alert; onAck: () => void }) {
  const style = SEVERITY_STYLE[alert.severity];
  const url = getAlertUrl(alert);

  const handleClick = () => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`px-3 py-2 border-b border-zinc-800/50 flex items-start gap-2
      ${alert.acknowledged ? 'opacity-40' : ''} ${!alert.acknowledged ? style.bg : ''}
      ${url ? 'cursor-pointer hover:brightness-125' : ''}`}
      onClick={handleClick}
    >
      <span className="text-xs mt-0.5">{style.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <span className={`text-[10px] font-bold ${alert.acknowledged ? 'text-zinc-600' : style.text}`}>
            [{CATEGORY_LABELS[alert.category] || alert.category}] {alert.title}
          </span>
          <div className="flex items-center gap-1.5">
            {url && <span className="text-zinc-600 text-[8px]">↗</span>}
            <span className="text-zinc-600 text-[9px]">{timeAgo(alert.timestamp)}</span>
          </div>
        </div>
        <p className="text-zinc-500 text-[9px] mt-0.5 leading-snug">{alert.message}</p>
      </div>
      {!alert.acknowledged && (
        <button onClick={(e) => { e.stopPropagation(); onAck(); }} className="text-zinc-600 hover:text-emerald-400 text-[10px] mt-0.5 shrink-0">✓</button>
      )}
    </div>
  );
}
