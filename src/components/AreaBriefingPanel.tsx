import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useCorrelationStore } from '@/store/useCorrelationStore';
import { generateAreaBriefing, type AreaBriefingResult } from '@/utils/areaBriefing';

const RADIUS_OPTIONS = [50, 100, 200, 500];

export default function AreaBriefingPanel() {
  const target = useAppStore((s) => s.areaBriefingTarget);
  const setTarget = useAppStore((s) => s.setAreaBriefingTarget);
  const getEngine = useCorrelationStore((s) => s.getEngine);

  const [radiusKm, setRadiusKm] = useState(100);
  const [result, setResult] = useState<AreaBriefingResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    if (!target) return;
    const engine = getEngine();
    const briefing = generateAreaBriefing(target.lat, target.lng, radiusKm, engine.spatialIndex);
    setResult(briefing);
  }, [target, radiusKm, getEngine]);

  useEffect(() => {
    if (target) generate();
    else setResult(null);
  }, [target, generate]);

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExport = () => {
    if (!result) return;
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date(result.generatedAt).toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
    a.download = `area-briefing_${ts}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!target) return null;

  return (
    <div className="absolute top-16 right-4 z-50 w-96 max-h-[80vh] flex flex-col bg-black/95 border border-cyan-500/40 rounded-sm shadow-2xl shadow-cyan-900/20 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/30 bg-cyan-950/30">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold tracking-widest text-[10px]">◉ AREA BRIEFING</span>
          {result && (
            <span className="text-cyan-600 text-[9px]">
              {new Date(result.generatedAt).toISOString().slice(11, 16)} UTC
            </span>
          )}
        </div>
        <button
          onClick={() => setTarget(null)}
          className="text-gray-500 hover:text-red-400 transition-colors text-sm leading-none px-1"
        >
          ✕
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-cyan-500/20 bg-black/40">
        <span className="text-gray-500 text-[9px] tracking-wider">RADIUS</span>
        <div className="flex gap-1">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadiusKm(r)}
              className={`px-2 py-0.5 text-[9px] border transition-colors ${
                radiusKm === r
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-900/30'
                  : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400'
              }`}
            >
              {r}km
            </button>
          ))}
        </div>
        <button
          onClick={generate}
          className="ml-auto px-2 py-0.5 text-[9px] border border-cyan-600 text-cyan-400 hover:bg-cyan-900/30 transition-colors"
        >
          ↻ REFRESH
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {!result ? (
          <div className="text-gray-600 text-center py-4">SCANNING…</div>
        ) : (
          <>
            {/* Target info */}
            <div className="border border-gray-800 bg-gray-950/50 px-2 py-1.5">
              <div className="text-cyan-600 text-[9px] tracking-wider mb-1">TARGET COORDINATES</div>
              <div className="text-cyan-300 text-[10px]">{result.locationName}</div>
            </div>

            {/* Summary */}
            <div className="border border-yellow-900/40 bg-yellow-950/10 px-2 py-1.5">
              <div className="text-yellow-600 text-[9px] tracking-wider mb-1">SITUATION SUMMARY</div>
              <div className="text-yellow-200 text-[10px] leading-relaxed">{result.summary}</div>
            </div>

            {/* Sections */}
            {result.sections.length === 0 && (
              <div className="text-gray-600 text-center py-2 text-[10px]">
                No active sensor data in this area.
              </div>
            )}
            {result.sections.map((section) => (
              <div key={section.title} className="border border-gray-800/60 bg-gray-950/30">
                <div className="flex items-center justify-between px-2 py-1 border-b border-gray-800/40 bg-gray-900/20">
                  <span className="text-green-400 text-[9px] tracking-wider">
                    {section.icon} {section.title}
                  </span>
                  <span className="text-gray-500 text-[9px]">{section.total} detected</span>
                </div>
                <div className="px-2 py-1 space-y-0.5">
                  {section.items.map((item, i) => (
                    <div key={i} className="text-gray-300 text-[9px] leading-relaxed">
                      • {item}
                    </div>
                  ))}
                  {section.total > section.count && (
                    <div className="text-gray-600 text-[9px]">
                      … +{section.total - section.count} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer actions */}
      {result && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-cyan-500/20 bg-black/40">
          <button
            onClick={handleCopy}
            className="flex-1 py-1 text-[9px] border border-gray-700 text-gray-400 hover:border-cyan-600 hover:text-cyan-400 transition-colors tracking-wider"
          >
            {copied ? '✓ COPIED' : '⎘ COPY TEXT'}
          </button>
          <button
            onClick={handleExport}
            className="flex-1 py-1 text-[9px] border border-gray-700 text-gray-400 hover:border-green-600 hover:text-green-400 transition-colors tracking-wider"
          >
            ⤓ EXPORT .TXT
          </button>
        </div>
      )}
    </div>
  );
}
