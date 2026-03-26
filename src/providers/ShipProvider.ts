export interface ShipData {
  mmsi: string;
  name: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  shipType: 'cargo' | 'tanker' | 'passenger' | 'fishing' | 'military';
}

// AIS 메시지 타입 (aisstream.io WebSocket)
interface AISPositionReport {
  MessageType: string;
  Message: {
    PositionReport?: {
      Latitude: number;
      Longitude: number;
      TrueHeading: number;
      Sog: number; // Speed Over Ground (knots)
      NavigationalStatus: number;
    };
    ShipStaticData?: {
      Name: string;
      Type: number;
      MmsiString: string; // Use this if available
    };
  };
  MetaData: {
    MMSI: number;
    ShipName: string;
    latitude: number;
    longitude: number;
    time_utc: string;
  };
}

// AIS ship type code → 우리 분류
function classifyShipType(aisType: number): ShipData['shipType'] {
  if (aisType >= 70 && aisType <= 79) return 'cargo';
  if (aisType >= 80 && aisType <= 89) return 'tanker';
  if (aisType >= 60 && aisType <= 69) return 'passenger';
  if (aisType === 30) return 'fishing';
  if (aisType >= 35 && aisType <= 39) return 'military';
  if (aisType >= 50 && aisType <= 59) return 'military'; // pilot, SAR, enforcement
  return 'cargo'; // default
}

// --- localStorage 캐시 ---
const LS_KEY = 'geovision_ais_cache';
const LS_MAX_AGE = 30 * 60 * 1000; // 30분

function loadCachedShips(): Map<string, ShipData> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Map();
    const { ts, ships } = JSON.parse(raw);
    if (Date.now() - ts > LS_MAX_AGE) return new Map();
    const map = new Map<string, ShipData>();
    for (const s of ships) map.set(s.mmsi, s);
    console.log(`[AIS] Loaded ${map.size} cached ships from localStorage`);
    return map;
  } catch { return new Map(); }
}

function saveCachedShips(ships: Map<string, ShipData>) {
  try {
    if (ships.size === 0) return;
    const arr = Array.from(ships.values());
    localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), ships: arr }));
  } catch { /* quota 초과 무시 */ }
}

// --- AISstream.io WebSocket 실시간 연동 ---

let wsConnection: WebSocket | null = null;
let liveShips: Map<string, ShipData> = loadCachedShips();
let wsConnected = false;
let reconnectAttempts = 0;
let lastMessageTime = 0;
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;
let saveCacheInterval: ReturnType<typeof setInterval> | null = null;

type ShipUpdateCallback = (ships: ShipData[]) => void;
let updateCallback: ShipUpdateCallback | null = null;

export function connectAISStream(apiKey: string, onUpdate?: ShipUpdateCallback) {
  if (wsConnection && wsConnection.readyState <= 1) return; // CONNECTING or OPEN

  updateCallback = onUpdate || null;

  try {
    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    wsConnection = ws;

    ws.onopen = () => {
      const subscribeMsg = {
        APIKey: apiKey,
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      };
      ws.send(JSON.stringify(subscribeMsg));
      wsConnected = true;
      reconnectAttempts = 0;
      lastMessageTime = Date.now();
      console.log(`[AIS] WebSocket connected (cached: ${liveShips.size} ships)`);

      // 헬스체크: 60초 동안 메시지 없으면 재연결
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      healthCheckInterval = setInterval(() => {
        if (Date.now() - lastMessageTime > 60000 && wsConnection) {
          console.warn('[AIS] No data for 60s, reconnecting...');
          wsConnection.close();
        }
      }, 15000);

      // 30초마다 localStorage에 캐시 저장
      if (saveCacheInterval) clearInterval(saveCacheInterval);
      saveCacheInterval = setInterval(() => saveCachedShips(liveShips), 30000);
    };

    let msgCount = 0;
    ws.onmessage = (event) => {
      try {
        lastMessageTime = Date.now();
        const data: AISPositionReport = JSON.parse(event.data as string);
        const mmsi = String(data.MetaData.MMSI);
        const meta = data.MetaData;

        if (!meta.latitude || !meta.longitude ||
            meta.latitude === 0 || meta.longitude === 0 ||
            meta.latitude < -90 || meta.latitude > 90 ||
            meta.longitude < -180 || meta.longitude > 180) {
          return;
        }

        const existing = liveShips.get(mmsi);
        const posReport = data.Message?.PositionReport;

        const ship: ShipData = {
          mmsi,
          name: meta.ShipName?.trim() || existing?.name || mmsi,
          lat: meta.latitude,
          lng: meta.longitude,
          heading: posReport?.TrueHeading ?? existing?.heading ?? 0,
          speed: posReport?.Sog ?? existing?.speed ?? 0,
          shipType: existing?.shipType || 'cargo',
        };

        if (data.Message?.ShipStaticData?.Type) {
          ship.shipType = classifyShipType(data.Message.ShipStaticData.Type);
        }

        if (ship.heading === 511) ship.heading = 0;
        liveShips.set(mmsi, ship);
        msgCount++;

        // 로그: 처음 500개, 이후 1000개 단위
        if (msgCount === 100 || msgCount === 500 || msgCount % 1000 === 0) {
          console.log(`[AIS] ${msgCount} messages received, ${liveShips.size} unique ships`);
        }
      } catch {
        // 파싱 실패 무시
      }
    };

    ws.onerror = () => {
      console.warn('[AIS] WebSocket error');
      wsConnected = false;
    };

    ws.onclose = () => {
      console.log(`[AIS] WebSocket closed, ${liveShips.size} ships cached`);
      wsConnection = null;
      wsConnected = false;
      if (healthCheckInterval) { clearInterval(healthCheckInterval); healthCheckInterval = null; }
      if (saveCacheInterval) { clearInterval(saveCacheInterval); saveCacheInterval = null; }
      // 끊길 때 캐시 저장
      saveCachedShips(liveShips);

      // 지수 백오프 재연결 (최대 60초)
      reconnectAttempts++;
      const delay = Math.min(5000 * Math.pow(1.5, reconnectAttempts - 1), 60000);
      console.log(`[AIS] Reconnecting in ${(delay / 1000).toFixed(0)}s (attempt ${reconnectAttempts})`);
      setTimeout(() => {
        if (!wsConnection) connectAISStream(apiKey, updateCallback || undefined);
      }, delay);
    };
  } catch (err) {
    console.error('[AIS] Failed to create WebSocket:', err);
    wsConnected = false;
  }
}

export function disconnectAISStream() {
  saveCachedShips(liveShips);
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
    wsConnected = false;
    liveShips.clear();
  }
}

export function isAISConnected(): boolean {
  return wsConnected;
}

export function getLiveShipCount(): number {
  return liveShips.size;
}

// --- 시뮬레이션 폴백 (API 키 없을 때) ---

interface LanePoint { lat: number; lng: number; heading: number; }
interface ShippingLane { name: string; points: LanePoint[]; spread: number; density: number; }

const SHIPPING_LANES: ShippingLane[] = [
  // 아시아
  { name: 'Strait of Malacca', points: [
    { lat: 1.26, lng: 103.85, heading: 310 }, { lat: 2.5, lng: 101.5, heading: 310 },
    { lat: 4.0, lng: 100.0, heading: 320 }, { lat: 5.5, lng: 98.5, heading: 330 },
  ], spread: 0.2, density: 2.5 },
  { name: 'East China Sea', points: [
    { lat: 31.5, lng: 122.0, heading: 200 }, { lat: 30.0, lng: 123.0, heading: 210 },
    { lat: 28.5, lng: 124.5, heading: 220 }, { lat: 27.0, lng: 126.0, heading: 210 },
  ], spread: 0.3, density: 2.0 },
  { name: 'South China Sea', points: [
    { lat: 21.0, lng: 114.0, heading: 210 }, { lat: 15.0, lng: 112.0, heading: 200 },
    { lat: 10.0, lng: 109.0, heading: 220 }, { lat: 5.0, lng: 106.0, heading: 240 },
  ], spread: 0.5, density: 2.5 },
  { name: 'Busan-Japan', points: [
    { lat: 35.0, lng: 129.1, heading: 200 }, { lat: 34.5, lng: 129.5, heading: 150 },
    { lat: 33.5, lng: 130.0, heading: 130 }, { lat: 34.8, lng: 135.4, heading: 70 },
  ], spread: 0.2, density: 1.5 },
  { name: 'Tokyo Bay', points: [
    { lat: 35.6, lng: 139.8, heading: 180 }, { lat: 35.3, lng: 139.9, heading: 170 },
    { lat: 34.8, lng: 140.0, heading: 160 },
  ], spread: 0.15, density: 1.2 },
  { name: 'Taiwan Strait', points: [
    { lat: 25.5, lng: 119.5, heading: 210 }, { lat: 24.0, lng: 118.5, heading: 200 },
    { lat: 22.5, lng: 117.5, heading: 220 },
  ], spread: 0.2, density: 1.5 },
  { name: 'Bay of Bengal', points: [
    { lat: 13.0, lng: 80.3, heading: 250 }, { lat: 12.0, lng: 76.0, heading: 270 },
    { lat: 10.0, lng: 72.0, heading: 290 },
  ], spread: 0.4, density: 1.2 },
  { name: 'India West Coast', points: [
    { lat: 19.0, lng: 72.8, heading: 200 }, { lat: 15.0, lng: 73.5, heading: 180 },
    { lat: 10.0, lng: 76.0, heading: 150 },
  ], spread: 0.3, density: 1.0 },
  // 중동
  { name: 'Persian Gulf', points: [
    { lat: 26.5, lng: 56.5, heading: 310 }, { lat: 27.5, lng: 51.5, heading: 290 },
    { lat: 29.0, lng: 49.0, heading: 340 }, { lat: 26.0, lng: 50.5, heading: 180 },
  ], spread: 0.15, density: 2.0 },
  { name: 'Red Sea', points: [
    { lat: 12.6, lng: 43.3, heading: 340 }, { lat: 16.0, lng: 41.5, heading: 350 },
    { lat: 20.0, lng: 39.0, heading: 340 }, { lat: 24.0, lng: 37.0, heading: 330 },
    { lat: 27.5, lng: 34.5, heading: 340 },
  ], spread: 0.15, density: 1.5 },
  { name: 'Suez Canal', points: [
    { lat: 31.3, lng: 32.35, heading: 170 }, { lat: 30.5, lng: 32.33, heading: 175 },
    { lat: 29.5, lng: 32.9, heading: 150 },
  ], spread: 0.05, density: 1.2 },
  // 유럽
  { name: 'English Channel', points: [
    { lat: 50.8, lng: 1.5, heading: 240 }, { lat: 50.2, lng: -1.5, heading: 260 },
    { lat: 49.5, lng: -5.0, heading: 240 },
  ], spread: 0.12, density: 1.5 },
  { name: 'Mediterranean', points: [
    { lat: 36.0, lng: -5.3, heading: 80 }, { lat: 37.0, lng: -1.0, heading: 70 },
    { lat: 37.5, lng: 3.0, heading: 80 }, { lat: 38.0, lng: 8.0, heading: 90 },
    { lat: 36.5, lng: 16.0, heading: 70 }, { lat: 35.0, lng: 25.0, heading: 90 },
  ], spread: 0.4, density: 2.5 },
  { name: 'North Sea', points: [
    { lat: 51.5, lng: 3.5, heading: 0 }, { lat: 53.5, lng: 4.5, heading: 10 },
    { lat: 56.0, lng: 5.0, heading: 20 }, { lat: 58.5, lng: 3.5, heading: 350 },
  ], spread: 0.3, density: 1.8 },
  { name: 'Baltic Sea', points: [
    { lat: 54.5, lng: 10.0, heading: 60 }, { lat: 56.0, lng: 12.5, heading: 40 },
    { lat: 58.0, lng: 18.0, heading: 50 }, { lat: 59.5, lng: 24.0, heading: 60 },
  ], spread: 0.2, density: 1.3 },
  { name: 'Gibraltar-W.Africa', points: [
    { lat: 36.0, lng: -5.5, heading: 200 }, { lat: 33.0, lng: -8.0, heading: 210 },
    { lat: 28.0, lng: -13.0, heading: 200 }, { lat: 14.5, lng: -17.5, heading: 190 },
  ], spread: 0.3, density: 1.0 },
  // 미주
  { name: 'US East Coast', points: [
    { lat: 40.5, lng: -73.8, heading: 190 }, { lat: 38.0, lng: -74.5, heading: 180 },
    { lat: 36.0, lng: -75.5, heading: 190 }, { lat: 32.0, lng: -79.5, heading: 210 },
    { lat: 29.0, lng: -80.0, heading: 200 },
  ], spread: 0.2, density: 1.5 },
  { name: 'Gulf of Mexico', points: [
    { lat: 29.5, lng: -89.5, heading: 180 }, { lat: 28.0, lng: -90.0, heading: 200 },
    { lat: 26.0, lng: -93.0, heading: 250 }, { lat: 27.0, lng: -97.0, heading: 180 },
  ], spread: 0.3, density: 1.3 },
  { name: 'US West Coast', points: [
    { lat: 47.5, lng: -122.5, heading: 190 }, { lat: 37.8, lng: -122.5, heading: 180 },
    { lat: 34.0, lng: -118.6, heading: 140 }, { lat: 32.7, lng: -117.2, heading: 180 },
  ], spread: 0.15, density: 1.2 },
  { name: 'Panama Canal', points: [
    { lat: 9.4, lng: -79.9, heading: 150 }, { lat: 9.0, lng: -79.5, heading: 120 },
    { lat: 8.9, lng: -79.0, heading: 90 },
  ], spread: 0.05, density: 1.0 },
  // 대양 횡단
  { name: 'Trans-Pacific', points: [
    { lat: 35.0, lng: 140.0, heading: 80 }, { lat: 38.0, lng: 160.0, heading: 80 },
    { lat: 40.0, lng: 180.0, heading: 80 }, { lat: 38.0, lng: -160.0, heading: 90 },
    { lat: 36.0, lng: -140.0, heading: 100 }, { lat: 34.0, lng: -120.0, heading: 100 },
  ], spread: 0.8, density: 1.5 },
  { name: 'Trans-Atlantic', points: [
    { lat: 50.0, lng: -5.0, heading: 270 }, { lat: 48.0, lng: -20.0, heading: 260 },
    { lat: 44.0, lng: -40.0, heading: 260 }, { lat: 41.0, lng: -60.0, heading: 270 },
    { lat: 40.5, lng: -74.0, heading: 270 },
  ], spread: 0.6, density: 1.3 },
  { name: 'Cape of Good Hope', points: [
    { lat: -34.5, lng: 18.5, heading: 90 }, { lat: -35.0, lng: 22.0, heading: 70 },
    { lat: -33.0, lng: 28.0, heading: 50 }, { lat: -30.0, lng: 32.0, heading: 30 },
  ], spread: 0.3, density: 1.0 },
  // 오세아니아
  { name: 'Australia East', points: [
    { lat: -33.8, lng: 151.3, heading: 180 }, { lat: -27.5, lng: 153.5, heading: 0 },
    { lat: -20.0, lng: 149.0, heading: 340 },
  ], spread: 0.2, density: 0.8 },
  { name: 'Singapore-Australia', points: [
    { lat: 1.3, lng: 104.0, heading: 160 }, { lat: -5.0, lng: 108.0, heading: 150 },
    { lat: -12.0, lng: 115.0, heading: 170 }, { lat: -20.0, lng: 118.0, heading: 200 },
  ], spread: 0.4, density: 1.0 },
];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PREFIXES = ['EVER', 'MAERSK', 'MSC', 'CMA CGM', 'COSCO', 'OOCL', 'HAPAG', 'ONE', 'HMM', 'PACIFIC', 'OCEAN', 'STAR', 'GOLDEN', 'HYUNDAI'];
const SUFFIXES = ['FORTUNE', 'GLORY', 'HARMONY', 'SPIRIT', 'VICTORY', 'PIONEER', 'TRADER', 'EXPRESS', 'CROWN', 'DIAMOND', 'PEARL', 'ACE', 'TITAN', 'HORIZON'];
const TYPES: ShipData['shipType'][] = ['cargo','cargo','cargo','cargo','tanker','tanker','tanker','fishing','fishing','passenger','military'];

function generateSimulatedShips(): ShipData[] {
  const timeSeed = Math.floor(Date.now() / 30000);
  const rand = mulberry32(timeSeed);
  const totalDensity = SHIPPING_LANES.reduce((s, l) => s + l.density, 0);
  const ships: ShipData[] = [];
  let idx = 0;

  for (const lane of SHIPPING_LANES) {
    const count = Math.round((lane.density / totalDensity) * 250);
    for (let i = 0; i < count; i++) {
      const pts = lane.points;
      const segCount = pts.length - 1;
      const t = rand();
      const si = Math.min(Math.floor(t * segCount), segCount - 1);
      const st = t * segCount - si;
      const p0 = pts[si], p1 = pts[si + 1];
      const shipType = TYPES[Math.floor(rand() * TYPES.length)];

      ships.push({
        mmsi: `${440 + Math.floor(rand() * 200)}${String(Math.floor(rand() * 900000) + 100000)}`,
        name: `${PREFIXES[Math.floor(rand() * PREFIXES.length)]} ${SUFFIXES[Math.floor(rand() * SUFFIXES.length)]}`,
        lat: +(p0.lat + (p1.lat - p0.lat) * st + (rand() - 0.5) * 2 * lane.spread).toFixed(4),
        lng: +(p0.lng + (p1.lng - p0.lng) * st + (rand() - 0.5) * 2 * lane.spread).toFixed(4),
        heading: +((p0.heading + (p1.heading - p0.heading) * st + (rand() - 0.5) * 20 + 360) % 360).toFixed(1),
        speed: +(5 + rand() * 20).toFixed(1),
        shipType,
      });
      idx++;
    }
  }
  return ships;
}

// --- Provider Meta ---
let _lastSimulated = false;
let _lastError: string | null = null;
let _lastLatency = 0;

export function getProviderMeta() {
  return { simulated: _lastSimulated, error: _lastError, latency: _lastLatency };
}

// --- Public API ---

/**
 * AIS 선박 데이터를 가져옴.
 * - VITE_AISSTREAM_KEY가 있으면 → WebSocket 실시간 데이터 (캐시 포함)
 * - 없으면 → 시뮬레이션 폴백
 */
export async function fetchShips(): Promise<ShipData[]> {
  const _start = Date.now();
  const apiKey = import.meta.env.VITE_AISSTREAM_KEY;

  if (apiKey && apiKey !== 'placeholder') {
    // WebSocket 연결 시작 (아직 안 됐으면)
    if (!wsConnection || wsConnection.readyState > 1) {
      connectAISStream(apiKey);
    }

    // 라이브 데이터가 있으면 반환 (연결 끊겨도 캐시 유지)
    if (liveShips.size > 0) {
      _lastSimulated = false; _lastError = null; _lastLatency = Date.now() - _start;
      return Array.from(liveShips.values());
    }

    // 데이터가 모일 때까지 시뮬레이션으로 폴백
    _lastSimulated = true; _lastError = null; _lastLatency = Date.now() - _start;
    return generateSimulatedShips();
  }

  _lastSimulated = true; _lastError = null; _lastLatency = Date.now() - _start;
  return generateSimulatedShips();
}
