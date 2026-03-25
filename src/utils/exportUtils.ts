/**
 * GeoVision Export Utilities
 * - Globe screenshot capture (CesiumJS canvas)
 * - Alert/Correlation data export (CSV, JSON, GeoJSON)
 * - Markdown intelligence report generation
 */

import type { Alert } from '@/store/useAlertStore';
import type { CorrelationAlert } from '@/correlation/rules';

// ── Time range helpers ──

export type TimeRange = '1h' | '6h' | '24h' | '7d';

const TIME_RANGE_MS: Record<TimeRange, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

export function getTimeRangeMs(range: TimeRange): number {
  return TIME_RANGE_MS[range];
}

export function filterByTimeRange<T extends { timestamp: number }>(
  items: T[],
  range: TimeRange,
): T[] {
  const cutoff = Date.now() - TIME_RANGE_MS[range];
  return items.filter((item) => item.timestamp >= cutoff);
}

// ── File download helper ──

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function timestampedFilename(prefix: string, ext: string): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${ts}.${ext}`;
}

// ── Globe Screenshot ──

export function captureGlobeScreenshot(): string | null {
  const viewer = (window as any).__cesiumViewer;
  if (!viewer) return null;

  try {
    const canvas = viewer.scene.canvas as HTMLCanvasElement;
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export function downloadGlobeScreenshot() {
  const dataUrl = captureGlobeScreenshot();
  if (!dataUrl) return false;

  const byteString = atob(dataUrl.split(',')[1]);
  const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });
  downloadBlob(blob, timestampedFilename('geovision-capture', 'png'));
  return true;
}

// ── CSV Export ──

export function alertsToCSV(alerts: Alert[]): string {
  const header = 'id,severity,category,title,message,timestamp,lat,lng,acknowledged';
  const rows = alerts.map((a) =>
    [
      a.id,
      a.severity,
      a.category,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.message.replace(/"/g, '""')}"`,
      new Date(a.timestamp).toISOString(),
      a.lat ?? '',
      a.lng ?? '',
      a.acknowledged,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export function correlationsToCSV(correlations: CorrelationAlert[]): string {
  const header = 'id,ruleId,ruleName,severity,title,message,lat,lng,timestamp,relatedCount';
  const rows = correlations.map((c) =>
    [
      c.id,
      c.ruleId,
      c.ruleName,
      c.severity,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.message.replace(/"/g, '""')}"`,
      c.lat,
      c.lng,
      new Date(c.timestamp).toISOString(),
      c.relatedEntities.length,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export function downloadCSV(data: string, prefix: string) {
  const blob = new Blob(['\uFEFF' + data], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, timestampedFilename(prefix, 'csv'));
}

// ── JSON Export ──

export function downloadJSON(data: unknown, prefix: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, timestampedFilename(prefix, 'json'));
}

// ── GeoJSON Export ──

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat] per RFC 7946
  };
  properties: Record<string, unknown>;
}

export function alertsToGeoJSON(alerts: Alert[]): object {
  const features: GeoJSONFeature[] = alerts
    .filter((a) => a.lat != null && a.lng != null)
    .map((a) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [a.lng!, a.lat!],
      },
      properties: {
        id: a.id,
        severity: a.severity,
        category: a.category,
        title: a.title,
        message: a.message,
        timestamp: new Date(a.timestamp).toISOString(),
        acknowledged: a.acknowledged,
      },
    }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function correlationsToGeoJSON(correlations: CorrelationAlert[]): object {
  const features: GeoJSONFeature[] = correlations.map((c) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [c.lng, c.lat],
    },
    properties: {
      id: c.id,
      ruleId: c.ruleId,
      ruleName: c.ruleName,
      severity: c.severity,
      title: c.title,
      message: c.message,
      timestamp: new Date(c.timestamp).toISOString(),
      relatedEntities: c.relatedEntities,
    },
  }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function downloadGeoJSON(data: object, prefix: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/geo+json' });
  downloadBlob(blob, timestampedFilename(prefix, 'geojson'));
}

// ── Markdown Intelligence Report ──

export interface ReportData {
  alerts: Alert[];
  correlations: CorrelationAlert[];
  timeRange: TimeRange;
  screenshotDataUrl?: string | null;
  dailyBrief?: {
    sections: { level: string; items: string[] }[];
    summary: string;
  } | null;
}

export function generateMarkdownReport(data: ReportData): string {
  const now = new Date();
  const rangeLabel = { '1h': '1 Hour', '6h': '6 Hours', '24h': '24 Hours', '7d': '7 Days' }[data.timeRange];

  const criticalAlerts = data.alerts.filter((a) => a.severity === 'critical');
  const warningAlerts = data.alerts.filter((a) => a.severity === 'warning');
  const infoAlerts = data.alerts.filter((a) => a.severity === 'info');

  let md = `# GeoVision Intelligence Report\n\n`;
  md += `**Generated**: ${now.toISOString().replace('T', ' ').slice(0, 19)} UTC\n`;
  md += `**Time Range**: Last ${rangeLabel}\n`;
  md += `**Total Alerts**: ${data.alerts.length} | **Correlations**: ${data.correlations.length}\n\n`;
  md += `---\n\n`;

  // Executive Summary
  md += `## Executive Summary\n\n`;
  if (data.dailyBrief?.summary) {
    md += `${data.dailyBrief.summary}\n\n`;
  } else {
    if (criticalAlerts.length > 0) {
      md += `**ELEVATED**: ${criticalAlerts.length} critical event(s) detected. Enhanced monitoring recommended.\n\n`;
    } else if (warningAlerts.length > 0) {
      md += `**MODERATE**: ${warningAlerts.length} warning-level event(s). Standard monitoring active.\n\n`;
    } else {
      md += `**NORMAL**: No significant threats detected in the reporting period.\n\n`;
    }
  }

  // Daily Brief sections
  if (data.dailyBrief?.sections?.length) {
    md += `## Daily Intelligence Brief\n\n`;
    for (const section of data.dailyBrief.sections) {
      const icon = section.level === 'critical' ? '🔴' : section.level === 'warning' ? '🟡' : '🟢';
      md += `### ${icon} ${section.level.toUpperCase()}\n\n`;
      for (const item of section.items) {
        md += `- ${item}\n`;
      }
      md += `\n`;
    }
  }

  // Screenshot reference
  if (data.screenshotDataUrl) {
    md += `## Globe Capture\n\n`;
    md += `![GeoVision Globe Capture](geovision-capture.png)\n\n`;
  }

  // Alert Summary Table
  if (data.alerts.length > 0) {
    md += `## Alert Summary\n\n`;
    md += `| Severity | Count |\n|----------|-------|\n`;
    md += `| 🔴 Critical | ${criticalAlerts.length} |\n`;
    md += `| 🟡 Warning | ${warningAlerts.length} |\n`;
    md += `| 🟢 Info | ${infoAlerts.length} |\n\n`;

    // Critical alerts detail
    if (criticalAlerts.length > 0) {
      md += `### Critical Alerts\n\n`;
      for (const a of criticalAlerts) {
        md += `- **${a.title}** — ${a.message} `;
        md += `(${new Date(a.timestamp).toISOString().slice(0, 19)}Z`;
        if (a.lat != null && a.lng != null) {
          md += `, ${a.lat.toFixed(2)}°N ${a.lng.toFixed(2)}°E`;
        }
        md += `)\n`;
      }
      md += `\n`;
    }

    // Warning alerts detail
    if (warningAlerts.length > 0) {
      md += `### Warning Alerts\n\n`;
      for (const a of warningAlerts.slice(0, 20)) {
        md += `- **${a.title}** — ${a.message} (${new Date(a.timestamp).toISOString().slice(0, 19)}Z)\n`;
      }
      if (warningAlerts.length > 20) {
        md += `- ... and ${warningAlerts.length - 20} more\n`;
      }
      md += `\n`;
    }
  }

  // Correlation Events
  if (data.correlations.length > 0) {
    md += `## Correlation Analysis\n\n`;
    md += `${data.correlations.length} correlation event(s) detected.\n\n`;
    for (const c of data.correlations.slice(0, 20)) {
      md += `### ${c.severity === 'critical' ? '🔴' : c.severity === 'warning' ? '🟡' : '🟢'} ${c.title}\n\n`;
      md += `- **Rule**: ${c.ruleName} (\`${c.ruleId}\`)\n`;
      md += `- **Location**: ${c.lat.toFixed(2)}°N, ${c.lng.toFixed(2)}°E\n`;
      md += `- **Time**: ${new Date(c.timestamp).toISOString().slice(0, 19)}Z\n`;
      md += `- **Message**: ${c.message}\n`;
      if (c.relatedEntities.length > 0) {
        md += `- **Related Entities**: ${c.relatedEntities.length} (${[...new Set(c.relatedEntities.map((e) => e.layer))].join(', ')})\n`;
      }
      md += `\n`;
    }
    if (data.correlations.length > 20) {
      md += `> ... and ${data.correlations.length - 20} more correlation events\n\n`;
    }
  }

  // Footer
  md += `---\n\n`;
  md += `*Report generated by GeoVision Intelligence Platform*\n`;
  md += `*https://geovision-ten.vercel.app*\n`;

  return md;
}

export function downloadMarkdownReport(data: ReportData) {
  const md = generateMarkdownReport(data);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, timestampedFilename('geovision-intel-report', 'md'));

  // Also download screenshot separately if available
  if (data.screenshotDataUrl) {
    downloadGlobeScreenshot();
  }
}
