import { useState, useEffect, useCallback } from 'react';

interface BriefSection {
  level: 'critical' | 'warning' | 'info';
  items: string[];
}

interface BriefData {
  timestamp: number;
  sections: BriefSection[];
  summary: string;
  simulated?: boolean;
}

const LEVEL_CONFIG = {
  critical: { label: 'CRITICAL', dot: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30' },
  warning: { label: 'WARNING', dot: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  info: { label: 'SUMMARY', dot: 'bg-green-500', text: 'text-green-400', border: 'border-green-500/30' },
};

const STORAGE_KEY = 'geovision-daily-brief-seen';

function hasSeenToday(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const today = new Date().toISOString().slice(0, 10);
    return stored === today;
  } catch {
    return false;
  }
}

function markSeenToday(): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, today);
  } catch { /* ignore */ }
}

export default function DailyBrief() {
  const [visible, setVisible] = useState(() => !hasSeenToday());
  const [data, setData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(false);

  const close = useCallback(() => {
    setVisible(false);
    markSeenToday();
  }, []);

  // Keyboard toggle: 'B' key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'b' || e.key === 'B') {
        setVisible((v) => {
          if (!v) return true;
          markSeenToday();
          return false;
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Fetch briefing data when visible
  useEffect(() => {
    if (!visible || data) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch('/api/ai/daily-brief');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // Fallback: client-side simulated data
        if (!cancelled) {
          setData({
            timestamp: Date.now(),
            sections: [
              { level: 'critical', items: ['[SIMULATED] No critical seismic events (M6.0+) detected in the last 24 hours.'] },
              { level: 'warning', items: ['[SIMULATED] M5.2 earthquake near Tonga Islands.', '[SIMULATED] M5.0 earthquake near Honshu, Japan.'] },
              { level: 'info', items: ['[SIMULATED] Total tracked entities: ~12,400', '[SIMULATED] Active data sources: 5/7 online'] },
            ],
            summary: '[SIMULATED] Global situation normal. No immediate threats detected.',
            simulated: true,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible, data]);

  if (!visible) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 pointer-events-auto"
        onClick={close}
      />

      {/* Modal */}
      <div className="relative pointer-events-auto w-[480px] max-h-[80vh] overflow-y-auto
        font-mono bg-gray-900/95 backdrop-blur-md border border-green-500/40 rounded
        shadow-2xl shadow-green-900/20 animate-slideIn">

        {/* Header */}
        <div className="px-5 py-3 border-b border-green-500/30 text-center">
          <div className="text-green-400 text-xs tracking-[0.4em] font-bold">
            GEOVISION DAILY BRIEF
          </div>
          <div className="text-gray-500 text-[10px] mt-0.5">
            {dateStr} {timeStr} LOCAL
          </div>
          {data?.simulated && (
            <div className="text-yellow-500 text-[8px] mt-1 tracking-wider">
              SIMULATED DATA — API KEY NOT CONFIGURED
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-5 py-3 space-y-3">
          {loading && (
            <div className="text-center py-6">
              <span className="text-green-400 text-[10px] tracking-widest animate-pulse">
                COMPILING INTELLIGENCE BRIEF...
              </span>
            </div>
          )}

          {data && data.sections.map((section, idx) => {
            const config = LEVEL_CONFIG[section.level];
            return (
              <div key={idx} className={`border-l-2 ${config.border} pl-3`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${config.dot} ${section.level === 'critical' ? 'animate-pulse' : ''}`} />
                  <span className={`text-[10px] font-bold tracking-wider ${config.text}`}>
                    {config.label}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {section.items.map((item, i) => (
                    <li key={i} className="text-[10px] text-gray-300 leading-relaxed flex gap-1.5">
                      <span className="text-gray-600 select-none">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Summary */}
          {data?.summary && (
            <div className="mt-3 pt-3 border-t border-gray-700/40">
              <div className="text-[9px] text-gray-500 tracking-wider mb-1">ANALYST ASSESSMENT</div>
              <div className="text-[10px] text-gray-300 leading-relaxed italic">
                {data.summary}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-gray-700/40 flex items-center justify-between">
          <span className="text-[8px] text-gray-600">
            PRESS [B] TO TOGGLE
          </span>
          <button
            onClick={close}
            className="text-[10px] text-gray-500 hover:text-green-400 transition-colors
              px-3 py-1 border border-gray-700/40 hover:border-green-500/40 rounded"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}
