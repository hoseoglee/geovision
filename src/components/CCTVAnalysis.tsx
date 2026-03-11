import { useState, useCallback } from 'react';
import type { CCTVData } from '@/providers/CCTVProvider';

interface AnalysisResult {
  analysis: string;
  crowdDensity: string;
  trafficLevel: string;
  weather: string;
  timestamp: number;
  simulated?: boolean;
}

const BADGE_COLORS: Record<string, string> = {
  low: 'bg-green-900/50 text-green-400 border-green-500/40',
  medium: 'bg-yellow-900/50 text-yellow-400 border-yellow-500/40',
  high: 'bg-red-900/50 text-red-400 border-red-500/40',
  normal: 'bg-green-900/50 text-green-400 border-green-500/40',
  light: 'bg-green-900/50 text-green-400 border-green-500/40',
  moderate: 'bg-yellow-900/50 text-yellow-400 border-yellow-500/40',
  heavy: 'bg-red-900/50 text-red-400 border-red-500/40',
  congested: 'bg-red-900/50 text-red-400 border-red-500/40',
  clear: 'bg-cyan-900/50 text-cyan-400 border-cyan-500/40',
  sunny: 'bg-yellow-900/50 text-yellow-300 border-yellow-500/40',
  cloudy: 'bg-gray-800/50 text-gray-400 border-gray-500/40',
  overcast: 'bg-gray-800/50 text-gray-400 border-gray-500/40',
  rainy: 'bg-blue-900/50 text-blue-400 border-blue-500/40',
  foggy: 'bg-gray-800/50 text-gray-300 border-gray-400/40',
  snowy: 'bg-white/10 text-white border-white/30',
  unknown: 'bg-gray-800/50 text-gray-500 border-gray-600/40',
};

function getBadgeClass(value: string): string {
  return BADGE_COLORS[value] ?? BADGE_COLORS['unknown'];
}

export default function CCTVAnalysis({ cctv }: { cctv: CCTVData }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Use thumbnailUrl for Windy cams, otherwise no image available for static YouTube cams
      const imageUrl = cctv.thumbnailUrl;
      if (!imageUrl) {
        // No thumbnail — request simulated analysis
        const res = await fetch('/api/ai/analyze-cctv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: 'https://placeholder.invalid/no-image.jpg',
            cameraName: cctv.name,
            location: `${cctv.city}, ${cctv.country}`,
          }),
        });

        if (!res.ok) {
          // API not available (dev mode without Vercel), use client-side simulation
          setResult({
            analysis: `[SIMULATED] ${cctv.name}: Moderate crowd activity observed. Traffic flow is normal. Weather appears clear with good visibility. No unusual incidents detected.`,
            crowdDensity: 'medium',
            trafficLevel: 'normal',
            weather: 'clear',
            timestamp: Date.now(),
            simulated: true,
          });
          return;
        }

        const data = await res.json();
        setResult(data);
        return;
      }

      const res = await fetch('/api/ai/analyze-cctv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          cameraName: cctv.name,
          location: `${cctv.city}, ${cctv.country}`,
        }),
      });

      if (!res.ok) {
        // API not available — client-side simulation fallback
        setResult({
          analysis: `[SIMULATED] ${cctv.name}: Moderate crowd activity observed. Traffic flow is normal. Weather appears clear with good visibility. No unusual incidents detected.`,
          crowdDensity: 'medium',
          trafficLevel: 'normal',
          weather: 'clear',
          timestamp: Date.now(),
          simulated: true,
        });
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch {
      // Network error — client-side simulation
      setResult({
        analysis: `[SIMULATED] ${cctv.name}: Moderate crowd activity observed. Traffic flow is normal. Weather appears clear with good visibility. No unusual incidents detected.`,
        crowdDensity: 'medium',
        trafficLevel: 'normal',
        weather: 'clear',
        timestamp: Date.now(),
        simulated: true,
      });
    } finally {
      setLoading(false);
    }
  }, [cctv]);

  return (
    <div className="border-t border-gray-700/40">
      {/* Analyze button */}
      {!result && !loading && (
        <div className="px-3 py-2">
          <button
            onClick={analyze}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold
              py-1.5 rounded border transition-all hover:brightness-125
              text-purple-400 border-purple-500/40 bg-purple-900/30 hover:bg-purple-800/40"
          >
            <span className="text-xs">◉</span>
            <span>AI ANALYZE</span>
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="px-3 py-3 text-center">
          <span className="text-purple-400 text-[10px] font-bold tracking-widest animate-pulse">
            ANALYZING FEED...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="px-3 py-2">
          <div className="text-red-400 text-[10px]">{error}</div>
          <button
            onClick={analyze}
            className="mt-1 text-[9px] text-gray-500 hover:text-gray-300 underline"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="px-3 py-2 space-y-2">
          {/* Simulated badge */}
          {result.simulated && (
            <div className="text-[8px] text-yellow-500 tracking-wider font-bold">
              ⚠ SIMULATED ANALYSIS
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            <span className={`text-[8px] px-1.5 py-0.5 rounded border ${getBadgeClass(result.crowdDensity)}`}>
              CROWD: {result.crowdDensity.toUpperCase()}
            </span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded border ${getBadgeClass(result.trafficLevel)}`}>
              TRAFFIC: {result.trafficLevel.toUpperCase()}
            </span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded border ${getBadgeClass(result.weather)}`}>
              WEATHER: {result.weather.toUpperCase()}
            </span>
          </div>

          {/* Analysis text */}
          <div className="text-[9px] text-gray-300 leading-relaxed">
            {result.analysis.replace('[SIMULATED] ', '').replace(`${cctv.name}: `, '')}
          </div>

          {/* Timestamp */}
          <div className="text-[8px] text-gray-600">
            {new Date(result.timestamp).toLocaleTimeString('en-US', { hour12: false })}
          </div>

          {/* Re-analyze button */}
          <button
            onClick={analyze}
            className="text-[9px] text-purple-500 hover:text-purple-300 underline"
          >
            RE-ANALYZE
          </button>
        </div>
      )}
    </div>
  );
}
