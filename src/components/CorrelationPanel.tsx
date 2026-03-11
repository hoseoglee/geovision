import { useState } from 'react';
import { useCorrelationStore } from '@/store/useCorrelationStore';
import { useAppStore } from '@/store/useAppStore';
import type { CorrelationAlert } from '@/correlation/rules';
import type { AlertSeverity } from '@/store/useAlertStore';

const SEVERITY_STYLE: Record<AlertSeverity, { bg: string; border: string; text: string; icon: string; pulse: string }> = {
  critical: {
    bg: 'bg-red-950/80',
    border: 'border-red-500/60',
    text: 'text-red-400',
    icon: '\u26A0',
    pulse: 'animate-pulse',
  },
  warning: {
    bg: 'bg-yellow-950/60',
    border: 'border-yellow-500/40',
    text: 'text-yellow-400',
    icon: '\u25B2',
    pulse: '',
  },
  info: {
    bg: 'bg-blue-950/40',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    icon: '\u25CF',
    pulse: '',
  },
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return 'NOW';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

function CorrelationRow({ alert, onFocus }: { alert: CorrelationAlert; onFocus: () => void }) {
  const style = SEVERITY_STYLE[alert.severity];

  return (
    <div
      className={`px-3 py-2 border-b border-gray-800/50 flex items-start gap-2 cursor-pointer
        hover:brightness-125 ${style.bg}`}
      onClick={onFocus}
    >
      <span className={`text-xs mt-0.5 ${style.text} ${style.pulse}`}>{style.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <span className={`text-[10px] font-bold ${style.text}`}>
            [{alert.ruleId.toUpperCase()}] {alert.title}
          </span>
          <span className="text-gray-600 text-[9px] ml-2">{timeAgo(alert.timestamp)}</span>
        </div>
        <p className="text-gray-500 text-[9px] mt-0.5 leading-snug">{alert.message}</p>
        {alert.relatedEntities.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {alert.relatedEntities.slice(0, 4).map((e, i) => (
              <span key={i} className="text-[8px] bg-gray-800/60 text-gray-500 px-1 py-0.5 rounded">
                {e.layer}:{e.id.slice(0, 12)}
              </span>
            ))}
            {alert.relatedEntities.length > 4 && (
              <span className="text-[8px] text-gray-600">+{alert.relatedEntities.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CorrelationPanel() {
  const [expanded, setExpanded] = useState(false);
  const correlations = useCorrelationStore((s) => s.correlations);
  const isRunning = useCorrelationStore((s) => s.isRunning);
  const startEngine = useCorrelationStore((s) => s.startEngine);
  const stopEngine = useCorrelationStore((s) => s.stopEngine);
  const clearCorrelations = useCorrelationStore((s) => s.clearCorrelations);
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);

  const criticalCount = correlations.filter((c) => c.severity === 'critical').length;
  const activeCount = correlations.filter((c) => Date.now() - c.timestamp < 300000).length;

  const handleFocus = (alert: CorrelationAlert) => {
    setCameraTarget({
      latitude: alert.lat,
      longitude: alert.lng,
      height: 500000,
    });
  };

  const handleToggleEngine = () => {
    if (isRunning) {
      stopEngine();
    } else {
      startEngine();
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`fixed bottom-20 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1.5
          rounded font-mono text-xs backdrop-blur-sm transition-all border
          ${criticalCount > 0
            ? 'bg-red-900/80 border-red-500/60 text-red-400 animate-pulse'
            : isRunning
              ? 'bg-cyan-900/60 border-cyan-500/40 text-cyan-400'
              : 'bg-gray-800/60 border-gray-600/40 text-gray-500'
          }`}
      >
        <span className="text-[10px]">{isRunning ? '\u25C9' : '\u25CB'}</span>
        <span className="font-bold tracking-wider">CORR</span>
        {activeCount > 0 && (
          <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold
            ${criticalCount > 0 ? 'bg-red-600/80 text-white' : 'bg-cyan-600/80 text-white'}`}>
            {activeCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[400px] max-h-[450px] flex flex-col
      bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded shadow-2xl
      font-mono animate-slideIn pointer-events-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700/40">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-cyan-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-gray-300 text-xs font-bold tracking-widest">CORRELATION ENGINE</span>
          {activeCount > 0 && (
            <span className="bg-cyan-600/80 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleEngine}
            className={`text-[10px] border px-2 py-0.5 rounded transition-colors
              ${isRunning
                ? 'border-red-500/40 text-red-400 hover:bg-red-900/30'
                : 'border-green-500/40 text-green-400 hover:bg-green-900/30'
              }`}
          >
            {isRunning ? 'STOP' : 'START'}
          </button>
          <button
            onClick={clearCorrelations}
            className="text-gray-500 hover:text-gray-300 text-[10px] border border-gray-700/40 px-2 py-0.5 rounded"
          >
            CLEAR
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="text-gray-500 hover:text-gray-300 text-xs"
          >
            {'\u2715'}
          </button>
        </div>
      </div>

      {/* 상태 바 */}
      <div className="flex gap-3 px-3 py-1.5 border-b border-gray-800/40 text-[9px] text-gray-500">
        <span>ENGINE: <span className={isRunning ? 'text-cyan-400' : 'text-gray-600'}>{isRunning ? 'ACTIVE' : 'IDLE'}</span></span>
        <span>RULES: <span className="text-gray-400">5</span></span>
        <span>TOTAL: <span className="text-gray-400">{correlations.length}</span></span>
        <span>CRIT: <span className={criticalCount > 0 ? 'text-red-400' : 'text-gray-600'}>{criticalCount}</span></span>
      </div>

      {/* 코릴레이션 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
        {correlations.length === 0 ? (
          <div className="text-gray-600 text-xs text-center py-8">
            {isRunning ? 'MONITORING — NO CORRELATIONS DETECTED' : 'ENGINE IDLE — START TO BEGIN MONITORING'}
          </div>
        ) : (
          correlations.map((alert) => (
            <CorrelationRow key={alert.id} alert={alert} onFocus={() => handleFocus(alert)} />
          ))
        )}
      </div>
    </div>
  );
}
