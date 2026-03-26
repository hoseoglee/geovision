import { useState, useCallback, useEffect } from 'react';
import { useAlertStore } from '@/store/useAlertStore';
import { useCorrelationStore } from '@/store/useCorrelationStore';
import {
  type TimeRange,
  filterByTimeRange,
  downloadGlobeScreenshot,
  alertsToCSV,
  correlationsToCSV,
  downloadCSV,
  downloadJSON,
  alertsToGeoJSON,
  correlationsToGeoJSON,
  downloadGeoJSON,
  downloadMarkdownReport,
  captureGlobeScreenshot,
} from '@/utils/exportUtils';

type ExportFormat = 'screenshot' | 'csv' | 'json' | 'geojson' | 'report';
type DataSource = 'alerts' | 'correlations' | 'all';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1h': 'Last 1 Hour',
  '6h': 'Last 6 Hours',
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
};

export default function ExportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('report');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [dataSource, setDataSource] = useState<DataSource>('all');
  const [exporting, setExporting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const alerts = useAlertStore((s) => s.alerts);
  const correlations = useCorrelationStore((s) => s.correlations);

  // Keyboard shortcut: E to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const getFilteredData = useCallback(() => {
    const filteredAlerts = filterByTimeRange(alerts, timeRange);
    const filteredCorrelations = filterByTimeRange(correlations, timeRange);
    return { alerts: filteredAlerts, correlations: filteredCorrelations };
  }, [alerts, correlations, timeRange]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setLastResult(null);

    try {
      const { alerts: fa, correlations: fc } = getFilteredData();

      switch (format) {
        case 'screenshot': {
          const ok = downloadGlobeScreenshot();
          setLastResult(ok ? 'Screenshot saved' : 'Failed — globe not available');
          break;
        }
        case 'csv': {
          if (dataSource === 'alerts' || dataSource === 'all') {
            downloadCSV(alertsToCSV(fa), 'geovision-alerts');
          }
          if (dataSource === 'correlations' || dataSource === 'all') {
            downloadCSV(correlationsToCSV(fc), 'geovision-correlations');
          }
          const count = dataSource === 'all' ? fa.length + fc.length : dataSource === 'alerts' ? fa.length : fc.length;
          setLastResult(`Exported ${count} records as CSV`);
          break;
        }
        case 'json': {
          if (dataSource === 'alerts' || dataSource === 'all') {
            downloadJSON(fa, 'geovision-alerts');
          }
          if (dataSource === 'correlations' || dataSource === 'all') {
            downloadJSON(fc, 'geovision-correlations');
          }
          setLastResult('JSON export complete');
          break;
        }
        case 'geojson': {
          if (dataSource === 'alerts' || dataSource === 'all') {
            downloadGeoJSON(alertsToGeoJSON(fa), 'geovision-alerts');
          }
          if (dataSource === 'correlations' || dataSource === 'all') {
            downloadGeoJSON(correlationsToGeoJSON(fc), 'geovision-correlations');
          }
          setLastResult('GeoJSON export complete');
          break;
        }
        case 'report': {
          const screenshotDataUrl = captureGlobeScreenshot();
          // Try to fetch daily brief
          let dailyBrief = null;
          try {
            const res = await fetch('/api/ai/daily-brief');
            if (res.ok) dailyBrief = await res.json();
          } catch { /* fallback: no brief */ }

          downloadMarkdownReport({
            alerts: fa,
            correlations: fc,
            timeRange,
            screenshotDataUrl,
            dailyBrief,
          });
          setLastResult(`Intel report generated (${fa.length} alerts, ${fc.length} correlations)`);
          break;
        }
      }
    } catch (err) {
      setLastResult(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setExporting(false);
    }
  }, [format, timeRange, dataSource, getFilteredData]);

  const { alerts: previewAlerts, correlations: previewCorrelations } = getFilteredData();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-3 right-14 z-50 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/70 border border-cyan-500/30 rounded text-cyan-400 text-xs font-mono hover:bg-cyan-500/10 hover:border-cyan-400/60 transition-all"
        title="Export Data [E]"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        EXPORT
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

      {/* Modal */}
      <div className="relative w-[460px] max-h-[85vh] overflow-y-auto bg-zinc-950 border border-cyan-500/30 rounded-lg shadow-2xl shadow-cyan-500/10 font-mono text-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <h2 className="text-cyan-400 text-sm font-bold tracking-wider">INTELLIGENCE EXPORT</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-zinc-500 hover:text-cyan-400 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Data Preview */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2 text-center">
              <div className="text-lg font-bold text-amber-400">{previewAlerts.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Alerts</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2 text-center">
              <div className="text-lg font-bold text-purple-400">{previewCorrelations.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Correlations</div>
            </div>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Time Range</label>
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((tr) => (
                <button
                  key={tr}
                  onClick={() => setTimeRange(tr)}
                  className={`py-1.5 px-2 rounded text-xs transition-all ${
                    timeRange === tr
                      ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300'
                      : 'bg-zinc-900/50 border border-zinc-700/30 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {tr}
                </button>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Export Format</label>
            <div className="space-y-1">
              {([
                { key: 'report', label: 'Intelligence Report', desc: 'Markdown + screenshot + summary', icon: '📋' },
                { key: 'screenshot', label: 'Globe Screenshot', desc: 'Current 3D view as PNG', icon: '📸' },
                { key: 'csv', label: 'CSV Data', desc: 'Spreadsheet-compatible format', icon: '📊' },
                { key: 'json', label: 'JSON Data', desc: 'Structured data for analysis', icon: '🔧' },
                { key: 'geojson', label: 'GeoJSON', desc: 'GIS-compatible (QGIS, ArcGIS)', icon: '🌍' },
              ] as const).map(({ key, label, desc, icon }) => (
                <button
                  key={key}
                  onClick={() => setFormat(key)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded text-left transition-all ${
                    format === key
                      ? 'bg-cyan-500/15 border border-cyan-400/40 text-cyan-300'
                      : 'bg-zinc-900/30 border border-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <span className="text-base">{icon}</span>
                  <div>
                    <div className="text-xs font-medium">{label}</div>
                    <div className="text-[10px] text-zinc-500">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Data Source (not for screenshot/report) */}
          {format !== 'screenshot' && format !== 'report' && (
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Data Source</label>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { key: 'all', label: 'All' },
                  { key: 'alerts', label: 'Alerts' },
                  { key: 'correlations', label: 'Correlations' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setDataSource(key)}
                    className={`py-1.5 px-2 rounded text-xs transition-all ${
                      dataSource === key
                        ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300'
                        : 'bg-zinc-900/50 border border-zinc-700/30 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result message */}
          {lastResult && (
            <div className={`p-2 rounded text-xs ${
              lastResult.startsWith('Error') ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'
            }`}>
              {lastResult}
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`w-full py-2.5 rounded font-bold text-xs tracking-wider transition-all ${
              exporting
                ? 'bg-zinc-800 border border-zinc-600 text-zinc-500 cursor-wait'
                : 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400/70'
            }`}
          >
            {exporting ? 'EXPORTING...' : 'EXPORT'}
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-cyan-500/10 text-[10px] text-zinc-600 text-center">
          PRESS [E] TO TOGGLE · [ESC] TO CLOSE
        </div>
      </div>
    </div>
  );
}
