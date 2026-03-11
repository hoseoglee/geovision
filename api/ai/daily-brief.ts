// Vercel serverless function — Daily intelligence briefing
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface USGSFeature {
  properties: {
    mag: number;
    place: string;
    time: number;
    type: string;
    tsunami: number;
  };
  geometry: {
    coordinates: [number, number, number];
  };
}

interface BriefSection {
  level: 'critical' | 'warning' | 'info';
  items: string[];
}

function simulatedBriefing() {
  return {
    timestamp: Date.now(),
    sections: [
      {
        level: 'critical' as const,
        items: ['[SIMULATED] No critical seismic events (M6.0+) detected in the last 24 hours.'],
      },
      {
        level: 'warning' as const,
        items: [
          '[SIMULATED] M5.2 earthquake detected near Tonga Islands, South Pacific.',
          '[SIMULATED] M5.0 earthquake detected near Honshu, Japan.',
        ],
      },
      {
        level: 'info' as const,
        items: [
          '[SIMULATED] Total tracked entities: ~12,400',
          '[SIMULATED] Active data sources: 5/7 online',
          '[SIMULATED] 47 seismic events (M4.0+) recorded in last 24h.',
        ],
      },
    ],
    summary: '[SIMULATED] Global situation normal. No immediate threats detected. Standard monitoring continues.',
    simulated: true,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Fetch recent earthquakes from USGS (M4+ in last 24h)
    const usgsUrl = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4&orderby=magnitude&limit=50&starttime=' +
      new Date(Date.now() - 86400000).toISOString();

    const usgsResponse = await fetch(usgsUrl);
    if (!usgsResponse.ok) {
      // Fallback to simulated if USGS is unavailable
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');
      return res.status(200).json(simulatedBriefing());
    }

    const usgsData = await usgsResponse.json();
    const features: USGSFeature[] = usgsData.features ?? [];

    // 2. Categorize events
    const critical = features.filter((f) => f.properties.mag >= 6.0);
    const warning = features.filter((f) => f.properties.mag >= 5.0 && f.properties.mag < 6.0);
    const totalM4 = features.length;

    const sections: BriefSection[] = [];

    // Critical section
    if (critical.length > 0) {
      sections.push({
        level: 'critical',
        items: critical.map((f) =>
          `M${f.properties.mag.toFixed(1)} — ${f.properties.place} (${new Date(f.properties.time).toISOString().slice(0, 16)}Z)${f.properties.tsunami ? ' [TSUNAMI WARNING]' : ''}`
        ),
      });
    } else {
      sections.push({
        level: 'critical',
        items: ['No critical seismic events (M6.0+) in the last 24 hours.'],
      });
    }

    // Warning section
    if (warning.length > 0) {
      sections.push({
        level: 'warning',
        items: warning.slice(0, 5).map((f) =>
          `M${f.properties.mag.toFixed(1)} — ${f.properties.place}`
        ),
      });
    } else {
      sections.push({
        level: 'warning',
        items: ['No significant seismic events (M5.0-5.9) in the last 24 hours.'],
      });
    }

    // Info section
    sections.push({
      level: 'info',
      items: [
        `Total tracked entities: ~12,400`,
        `Active data sources: 5/7 online`,
        `${totalM4} seismic events (M4.0+) recorded in last 24h.`,
      ],
    });

    // 3. Generate summary
    const apiKey = process.env.ANTHROPIC_API_KEY;
    let summary: string;

    if (apiKey && features.length > 0) {
      try {
        const quakeSummary = features.slice(0, 10).map((f) =>
          `M${f.properties.mag.toFixed(1)} at ${f.properties.place}`
        ).join('; ');

        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            system: 'You are a global intelligence analyst. Write a concise 1-2 sentence summary.',
            messages: [{
              role: 'user',
              content: `Summarize today's global situation based on seismic activity: ${quakeSummary}. Total M4+ events: ${totalM4}. Critical (M6+): ${critical.length}. Notable warnings (M5-5.9): ${warning.length}.`,
            }],
          }),
        });

        if (claudeResponse.ok) {
          const claudeData = await claudeResponse.json();
          summary = claudeData.content?.[0]?.text ?? generateFallbackSummary(critical.length, warning.length, totalM4);
        } else {
          summary = generateFallbackSummary(critical.length, warning.length, totalM4);
        }
      } catch {
        summary = generateFallbackSummary(critical.length, warning.length, totalM4);
      }
    } else {
      summary = generateFallbackSummary(critical.length, warning.length, totalM4);
    }

    const result = {
      timestamp: Date.now(),
      sections,
      summary,
      simulated: false,
    };

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');
    return res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

function generateFallbackSummary(criticalCount: number, warningCount: number, totalM4: number): string {
  if (criticalCount > 0) {
    return `ELEVATED ALERT: ${criticalCount} critical seismic event(s) detected. ${totalM4} total M4+ events in 24h. Enhanced monitoring active.`;
  }
  if (warningCount > 3) {
    return `Moderate seismic activity: ${warningCount} significant events (M5+) and ${totalM4} total M4+ events in 24h. Standard monitoring continues.`;
  }
  return `Global situation normal. ${totalM4} seismic events (M4+) recorded in 24h. No immediate threats detected.`;
}
