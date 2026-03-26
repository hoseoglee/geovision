export interface WeatherData {
  city: string;
  lat: number;
  lng: number;
  temperature: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
}

const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: 'Seoul', lat: 37.57, lng: 126.98 },
  { name: 'Tokyo', lat: 35.68, lng: 139.69 },
  { name: 'New York', lat: 40.71, lng: -74.01 },
  { name: 'London', lat: 51.51, lng: -0.13 },
  { name: 'Paris', lat: 48.86, lng: 2.35 },
  { name: 'Beijing', lat: 39.91, lng: 116.40 },
  { name: 'Sydney', lat: -33.87, lng: 151.21 },
  { name: 'Moscow', lat: 55.76, lng: 37.62 },
  { name: 'Dubai', lat: 25.20, lng: 55.27 },
  { name: 'Singapore', lat: 1.35, lng: 103.82 },
  { name: 'Los Angeles', lat: 34.05, lng: -118.24 },
  { name: 'Chicago', lat: 41.88, lng: -87.63 },
  { name: 'São Paulo', lat: -23.55, lng: -46.63 },
  { name: 'Mumbai', lat: 19.08, lng: 72.88 },
  { name: 'Cairo', lat: 30.04, lng: 31.24 },
  { name: 'Istanbul', lat: 41.01, lng: 28.98 },
  { name: 'Jakarta', lat: -6.21, lng: 106.85 },
  { name: 'Bangkok', lat: 13.76, lng: 100.50 },
  { name: 'Mexico City', lat: 19.43, lng: -99.13 },
  { name: 'Johannesburg', lat: -26.20, lng: 28.05 },
];

// in-memory cache (10분)
let cache: { data: WeatherData[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

let _lastSimulated = false;
let _lastError: string | null = null;
let _lastLatency = 0;

export function getProviderMeta() {
  return { simulated: _lastSimulated, error: _lastError, latency: _lastLatency };
}

/** weather code → 간단한 설명 (WMO 코드) */
export function weatherCodeToLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Cloudy';
  if (code <= 49) return 'Fog';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 84) return 'Showers';
  if (code <= 94) return 'Thunderstorm';
  return 'Storm';
}

/** weather code → 온도 표시용 아이콘 문자 */
export function weatherCodeToIcon(code: number): string {
  if (code === 0) return '☀';
  if (code <= 3) return '☁';
  if (code <= 49) return '🌫';
  if (code <= 59) return '🌧';
  if (code <= 69) return '🌧';
  if (code <= 79) return '❄';
  if (code <= 84) return '🌦';
  return '⛈';
}

function generateSimulationData(): WeatherData[] {
  return CITIES.map((c) => ({
    city: c.name,
    lat: c.lat,
    lng: c.lng,
    temperature: Math.round((Math.random() * 40 - 10) * 10) / 10,
    windSpeed: Math.round(Math.random() * 30 * 10) / 10,
    precipitation: Math.round(Math.random() * 5 * 10) / 10,
    weatherCode: [0, 1, 2, 3, 51, 61, 71, 80, 95][Math.floor(Math.random() * 9)],
  }));
}

/**
 * Open-Meteo API에서 20개 주요 도시의 현재 기상 데이터 조회
 */
export async function fetchWeather(): Promise<WeatherData[]> {
  // 캐시 유효하면 반환
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const _start = Date.now();
  try {
    const lats = CITIES.map((c) => c.lat).join(',');
    const lngs = CITIES.map((c) => c.lng).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,wind_speed_10m,precipitation,weather_code`;

    const res = await fetch(url);
    if (!res.ok) { _lastSimulated = true; _lastError = `HTTP ${res.status}`; _lastLatency = Date.now() - _start; return fallback(); }

    const json = await res.json();
    // Open-Meteo returns array when multiple coordinates
    const results: any[] = Array.isArray(json) ? json : [json];

    const weather: WeatherData[] = [];
    for (let i = 0; i < CITIES.length && i < results.length; i++) {
      const current = results[i]?.current;
      if (!current) continue;
      weather.push({
        city: CITIES[i].name,
        lat: CITIES[i].lat,
        lng: CITIES[i].lng,
        temperature: current.temperature_2m ?? 0,
        windSpeed: current.wind_speed_10m ?? 0,
        precipitation: current.precipitation ?? 0,
        weatherCode: current.weather_code ?? 0,
      });
    }

    if (weather.length === 0) { _lastSimulated = true; _lastError = null; _lastLatency = Date.now() - _start; return fallback(); }

    cache = { data: weather, timestamp: Date.now() };
    _lastSimulated = false; _lastError = null; _lastLatency = Date.now() - _start;
    return weather;
  } catch (e) {
    _lastSimulated = true; _lastError = e instanceof Error ? e.message : String(e); _lastLatency = Date.now() - _start;
    return fallback();
  }
}

function fallback(): WeatherData[] {
  const data = generateSimulationData();
  cache = { data, timestamp: Date.now() };
  return data;
}
