import { useState, useEffect, useMemo } from 'react';
import { useAlertStore, type Alert, type AlertSeverity } from '@/store/useAlertStore';
import { useCorrelationStore } from '@/store/useCorrelationStore';
import { useAppStore } from '@/store/useAppStore';
import { useTimelineStore } from '@/store/useTimelineStore';
import type { CorrelationAlert } from '@/correlation/rules';

interface TimelineItem {
  id: string;
  timestamp: number;
  severity: AlertSeverity;
  title: string;
  message: string;
  lat?: number;
  lng?: number;
  source: 'alert' | 'correlation';
}

const SEVERITY_DOT: Record<AlertSeverity, string> = {
  critical: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-cyan-500',
};

const SEVERITY_LINE: Record<AlertSeverity, string> = {
  critical: 'border-red-500/40',
  warning: 'border-yellow-500/40',
  info: 'border-cyan-500/40',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function alertToItem(a: Alert): TimelineItem {
  return {
    id: a.id,
    timestamp: a.timestamp,
    severity: a.severity,
    title: a.title,
    message: a.message,
    lat: a.lat,
    lng: a.lng,
    source: 'alert',
  };
}

function correlationToItem(c: CorrelationAlert): TimelineItem {
  return {
    id: c.id,
    timestamp: c.timestamp,
    severity: c.severity,
    title: c.title,
    message: c.message,
    lat: c.lat,
    lng: c.lng,
    source: 'correlation',
  };
}

export default function EventTimeline() {
  const timelineVisible = useAppStore((s) => s.timelineVisible);
  const toggleTimeline = useAppStore((s) => s.toggleTimeline);
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);
  const alerts = useAlertStore((s) => s.alerts);
  const correlations = useCorrelationStore((s) => s.correlations);
  const [, setTick] = useState(0);

  // 'T' key toggle
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 't' || e.key === 'T') {
        toggleTimeline();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleTimeline]);

  // Periodic re-render for relative times
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const items = useMemo(() => {
    const merged: TimelineItem[] = [
      ...alerts.map(alertToItem),
      ...correlations.map(correlationToItem),
    ];
    merged.sort((a, b) => b.timestamp - a.timestamp);
    return merged.slice(0, 50);
  }, [alerts, correlations]);

  const timelineMode = useTimelineStore((s) => s.mode);
  const seekTo = useTimelineStore((s) => s.seekTo);
  const enterPlayback = useTimelineStore((s) => s.enterPlayback);

  const handleItemClick = (item: TimelineItem) => {
    // Fly to location
    if (item.lat != null && item.lng != null) {
      setCameraTarget({
        latitude: item.lat,
        longitude: item.lng,
        height: 500000,
      });
    }
    // Seek timeline to event time
    if (timelineMode === 'playback') {
      seekTo(item.timestamp);
    } else {
      enterPlayback().then(() => seekTo(item.timestamp));
    }
  };

  if (!timelineVisible) return null;

  return (
    <div className="fixed top-16 left-[300px] z-50 w-[360px] max-h-[70vh] flex flex-col
      bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded shadow-2xl
      font-mono pointer-events-auto">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700/40">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-sm">&#9776;</span>
          <span className="text-gray-300 text-xs font-bold tracking-widest">EVENT TIMELINE</span>
          <span className="text-gray-600 text-[9px]">{items.length}</span>
        </div>
        <button
          onClick={toggleTimeline}
          className="text-gray-500 hover:text-gray-300 text-xs"
        >
          {'\u2715'}
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
        {items.length === 0 ? (
          <div className="text-gray-600 text-xs text-center py-8">NO EVENTS RECORDED</div>
        ) : (
          <div className="px-3 py-2">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`flex gap-2 pb-2 cursor-pointer hover:bg-gray-800/40 rounded px-1 py-1 transition-colors
                  ${item.lat != null ? '' : 'cursor-default'}`}
                onClick={() => handleItemClick(item)}
              >
                {/* Time column */}
                <div className="w-12 shrink-0 text-right">
                  <span className="text-gray-500 text-[10px]">{formatTime(item.timestamp)}</span>
                </div>

                {/* Dot + line */}
                <div className="flex flex-col items-center shrink-0">
                  <span className={`text-sm leading-none ${SEVERITY_DOT[item.severity]}`}>{'\u25CF'}</span>
                  {idx < items.length - 1 && (
                    <div className={`w-0 flex-1 border-l ${SEVERITY_LINE[item.severity]}`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold ${SEVERITY_DOT[item.severity]}`}>
                      {item.title}
                    </span>
                    <span className="text-gray-700 text-[8px]">
                      {item.source === 'correlation' ? 'CORR' : 'ALERT'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-[9px] mt-0.5 leading-snug truncate">
                    {item.message}
                  </p>
                  {item.lat != null && (
                    <span className="text-gray-700 text-[8px]">
                      {item.lat.toFixed(1)}, {item.lng!.toFixed(1)} ↗
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-gray-700/40 text-center">
        <span className="text-[8px] text-gray-600">PRESS [T] TO TOGGLE</span>
      </div>
    </div>
  );
}
