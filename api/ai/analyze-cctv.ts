// Vercel serverless function — CCTV VLM analysis via Claude Haiku Vision
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory rate limiter (per serverless instance)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

function simulatedResponse(cameraName: string) {
  return {
    analysis: `[SIMULATED] ${cameraName}: Moderate crowd activity observed. Traffic flow is normal. Weather appears clear with good visibility. No unusual incidents detected.`,
    crowdDensity: 'medium',
    trafficLevel: 'normal',
    weather: 'clear',
    timestamp: Date.now(),
    simulated: true,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl, cameraName = 'Unknown Camera', location = 'Unknown' } = req.body ?? {};

  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  // Rate limit check
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 10 requests per minute.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // No API key — return simulated response
  if (!apiKey) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(simulatedResponse(cameraName));
  }

  try {
    // 1. Fetch image and convert to base64
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      return res.status(502).json({ error: `Failed to fetch image: ${imgResponse.status}` });
    }

    const arrayBuffer = await imgResponse.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // Detect media type
    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
    const mediaType = contentType.startsWith('image/') ? contentType : 'image/jpeg';

    // 2. Call Claude Haiku Vision API
    const prompt = `Analyze this CCTV feed from ${cameraName} at ${location}. Report: 1) crowd density (low/medium/high), 2) traffic level, 3) weather conditions visible, 4) any notable observations. Keep it under 100 words.`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: 'You are a CCTV surveillance analyst. Analyze the image concisely.',
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    if (!claudeResponse.ok) {
      const errBody = await claudeResponse.text();
      return res.status(502).json({ error: `Claude API error: ${claudeResponse.status}`, detail: errBody });
    }

    const claudeData = await claudeResponse.json();
    const analysisText = claudeData.content?.[0]?.text ?? 'No analysis returned.';

    // 3. Parse structured fields from the analysis text
    const crowdMatch = analysisText.match(/crowd\s*density[:\s]*(low|medium|high)/i);
    const trafficMatch = analysisText.match(/traffic[:\s]*(low|light|normal|moderate|heavy|high|congested)/i);
    const weatherMatch = analysisText.match(/weather[:\s]*(clear|cloudy|overcast|rainy|foggy|snowy|sunny|partly\s*cloudy)/i);

    const result = {
      analysis: analysisText,
      crowdDensity: crowdMatch?.[1]?.toLowerCase() ?? 'unknown',
      trafficLevel: trafficMatch?.[1]?.toLowerCase() ?? 'unknown',
      weather: weatherMatch?.[1]?.toLowerCase() ?? 'unknown',
      timestamp: Date.now(),
      simulated: false,
    };

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
