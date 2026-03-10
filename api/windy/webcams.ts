// Vercel serverless proxy for Windy Webcams API (avoids CORS)
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const windyKey = process.env.VITE_WINDY_KEY;
  if (!windyKey) {
    return res.status(500).json({ error: 'VITE_WINDY_KEY not configured' });
  }

  // Forward query string to Windy API
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const url = `https://api.windy.com/webcams/api/v3/webcams?${qs}`;

  try {
    const response = await fetch(url, {
      headers: { 'x-windy-api-key': windyKey },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Windy API: ${response.statusText}` });
    }

    const data = await response.json();

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
