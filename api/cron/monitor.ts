// Vercel Cron — hourly monitor: M6+ earthquake alerts + daily briefing via Telegram
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface USGSFeature {
  properties: {
    mag: number;
    place: string;
    time: number;
    tsunami: number;
  };
  geometry: {
    coordinates: [number, number, number];
  };
}

async function fetchRecentQuakes(hours: number): Promise<USGSFeature[]> {
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=5&orderby=magnitude&limit=20&starttime=${since}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.features ?? [];
  } catch {
    return [];
  }
}

function formatQuakeAlert(quakes: USGSFeature[]): string {
  const lines = quakes.map((q) => {
    const p = q.properties;
    const ts = new Date(p.time).toISOString().slice(0, 16) + 'Z';
    const tsunami = p.tsunami ? ' [TSUNAMI]' : '';
    return `M${p.mag.toFixed(1)} ${p.place} (${ts})${tsunami}`;
  });
  return `🚨 *GeoVision Critical Seismic Alert*\n\n${lines.join('\n')}\n\n_Automated alert from GeoVision monitoring_`;
}

async function sendTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch {
    // graceful skip
  }
}

async function generateBrief(): Promise<string> {
  try {
    const quakes = await fetchRecentQuakes(24);
    const m6 = quakes.filter((q) => q.properties.mag >= 6);
    const m5 = quakes.filter((q) => q.properties.mag >= 5 && q.properties.mag < 6);

    let brief = `📋 *GeoVision Daily Brief*\n📅 ${new Date().toISOString().slice(0, 10)}\n\n`;

    if (m6.length > 0) {
      brief += `🔴 *CRITICAL (M6+):*\n`;
      m6.forEach((q) => {
        brief += `  M${q.properties.mag.toFixed(1)} ${q.properties.place}\n`;
      });
      brief += '\n';
    } else {
      brief += `🟢 No critical seismic events (M6+) in 24h\n\n`;
    }

    if (m5.length > 0) {
      brief += `🟡 *WARNINGS (M5-5.9):* ${m5.length} events\n`;
      m5.slice(0, 5).forEach((q) => {
        brief += `  M${q.properties.mag.toFixed(1)} ${q.properties.place}\n`;
      });
      brief += '\n';
    }

    brief += `ℹ️ Total M5+ events: ${quakes.length}\n`;
    brief += `\n_Automated daily brief from GeoVision_`;
    return brief;
  } catch {
    return `📋 *GeoVision Daily Brief*\n⚠️ Unable to fetch data. Check system status.\n\n_Automated report_`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron auth
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Earthquake check (last 1 hour)
    const quakes = await fetchRecentQuakes(1);
    const critical = quakes.filter((q) => q.properties.mag >= 6);

    if (critical.length > 0 && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await sendTelegram(formatQuakeAlert(critical));
    }

    // 2. Daily briefing at 08:00 KST (= 23:00 UTC previous day)
    const hour = new Date().getUTCHours();
    if (hour === 23 && process.env.TELEGRAM_BOT_TOKEN) {
      const brief = await generateBrief();
      await sendTelegram(brief);
    }

    return res.status(200).json({
      ok: true,
      checked: quakes.length,
      critical: critical.length,
      hour,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
