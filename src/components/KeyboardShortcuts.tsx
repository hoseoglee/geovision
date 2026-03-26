import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useMeasurementStore } from '@/store/useMeasurementStore';

const FILTER_KEYS: Record<string, string> = {
  '1': 'normal',
  '2': 'crt',
  '3': 'nightvision',
  '4': 'thermal',
  '5': 'flir',
  '6': 'anime',
  '7': 'cinematic',
};

const LAYER_KEYS: Record<string, string> = {
  F1: 'satellites',
  F2: 'flights',
  F3: 'ships',
  F4: 'earthquakes',
  F5: 'cctv',
};

interface ShortcutDef {
  key: string;
  description: string;
}

const SHORTCUT_LIST: ShortcutDef[] = [
  { key: '1-7', description: 'Filter presets (Normal, CRT, NightVision, Thermal, FLIR, Anime, Cinematic)' },
  { key: 'F1-F5', description: 'Data layers (Satellites, Flights, Ships, Earthquakes, CCTV)' },
  { key: 'B', description: 'Daily briefing toggle' },
  { key: 'T', description: 'Event timeline toggle' },
  { key: 'C', description: 'Correlation panel toggle' },
  { key: 'H', description: 'HUD visibility toggle' },
  { key: '/', description: 'Open search' },
  { key: 'M', description: 'Measurement mode toggle (Distance)' },
  { key: 'Escape', description: 'Close all modals/cancel measurement' },
  { key: '?', description: 'Show this help' },
];

export default function KeyboardShortcuts() {
  const setActiveFilter = useAppStore((s) => s.setActiveFilter);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const toggleHud = useAppStore((s) => s.toggleHud);
  const toggleTimeline = useAppStore((s) => s.toggleTimeline);
  const toggleSearch = useAppStore((s) => s.toggleSearch);
  const toggleMeasure = useMeasurementStore((s) => s.toggleMode);
  const cancelMeasure = useMeasurementStore((s) => s.cancelMeasure);
  const measureMode = useMeasurementStore((s) => s.mode);
  const [helpVisible, setHelpVisible] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    const key = e.key;

    // '?' for help overlay
    if (key === '?') {
      e.preventDefault();
      setHelpVisible((v) => !v);
      return;
    }

    // Escape closes help + cancels measurement + other modals
    if (key === 'Escape') {
      if (measureMode) {
        cancelMeasure();
        return;
      }
      if (helpVisible) {
        setHelpVisible(false);
        return;
      }
      return;
    }

    // 'M' for measurement mode toggle
    if (key === 'm' || key === 'M') {
      toggleMeasure('distance');
      return;
    }

    // '/' for search
    if (key === '/') {
      e.preventDefault();
      toggleSearch();
      return;
    }

    // 'H' for HUD toggle
    if (key === 'h' || key === 'H') {
      toggleHud();
      return;
    }

    // 'C' for correlation panel — handled by CorrelationPanel itself if needed
    // But we can also dispatch here for consistency
    if (key === 'c' || key === 'C') {
      // CorrelationPanel uses its own state, so we don't handle here
      return;
    }

    // Number keys 1-7 for filters
    if (FILTER_KEYS[key]) {
      setActiveFilter(FILTER_KEYS[key] === 'normal' ? null : FILTER_KEYS[key]);
      return;
    }

    // F1-F5 for data layers
    if (LAYER_KEYS[key]) {
      e.preventDefault();
      toggleLayer(LAYER_KEYS[key]);
      return;
    }
  }, [helpVisible, setActiveFilter, toggleLayer, toggleHud, toggleSearch, toggleMeasure, cancelMeasure, measureMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!helpVisible) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 pointer-events-auto"
        onClick={() => setHelpVisible(false)}
      />

      {/* Help overlay */}
      <div className="relative pointer-events-auto w-[400px]
        font-mono bg-zinc-900/95 backdrop-blur-md border border-emerald-500/40 rounded
        shadow-2xl shadow-emerald-900/20 animate-slideIn">
        {/* Header */}
        <div className="px-5 py-3 border-b border-emerald-500/30 text-center">
          <div className="text-emerald-400 text-xs tracking-[0.4em] font-bold">
            KEYBOARD SHORTCUTS
          </div>
        </div>

        {/* Shortcuts table */}
        <div className="px-5 py-3 space-y-1.5">
          {SHORTCUT_LIST.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="text-emerald-400 text-[11px] font-bold w-16 text-right shrink-0
                bg-zinc-800/60 px-1.5 py-0.5 rounded border border-zinc-700/40">
                {s.key}
              </span>
              <span className="text-zinc-400 text-[10px]">{s.description}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-zinc-700/40 text-center">
          <span className="text-[8px] text-zinc-600">PRESS [?] OR [ESC] TO CLOSE</span>
        </div>
      </div>
    </div>
  );
}
