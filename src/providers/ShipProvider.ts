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

// --- AISstream.io WebSocket 실시간 연동 ---

let wsConnection: WebSocket | null = null;
let liveShips: Map<string, ShipData> = new Map();
let wsConnected = false;

type ShipUpdateCallback = (ships: ShipData[]) => void;
let updateCallback: ShipUpdateCallback | null = null;

export function connectAISStream(apiKey: string, onUpdate?: ShipUpdateCallback) {
  if (wsConnection) return; // 이미 연결됨

  updateCallback = onUpdate || null;
  const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
  wsConnection = ws;

  ws.onopen = () => {
    // 구독 메시지 — 전 세계 주요 해역
    const subscribeMsg = {
      APIKey: apiKey,
      BoundingBoxes: [
        // 전 세계를 넓게 커버
        [[-90, -180], [90, 180]],
      ],
      FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
    };
    ws.send(JSON.stringify(subscribeMsg));
    wsConnected = true;
    console.log('[AIS] WebSocket connected to aisstream.io');
  };

  ws.onmessage = (event) => {
    try {
      const data: AISPositionReport = JSON.parse(event.data);
      const mmsi = String(data.MetaData.MMSI);
      const meta = data.MetaData;

      // 유효한 위치인지 확인
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

      // ShipStaticData에서 선종 정보 업데이트
      if (data.Message?.ShipStaticData?.Type) {
        ship.shipType = classifyShipType(data.Message.ShipStaticData.Type);
      }

      // heading 511 = 사용 불가
      if (ship.heading === 511) ship.heading = 0;

      liveShips.set(mmsi, ship);

      // 100개 이상 모이면 콜백 (너무 자주 호출 방지)
      if (updateCallback && liveShips.size % 50 === 0) {
        updateCallback(Array.from(liveShips.values()));
      }
    } catch {
      // 파싱 실패 무시
    }
  };

  ws.onerror = (err) => {
    console.warn('[AIS] WebSocket error:', err);
    wsConnected = false;
  };

  ws.onclose = () => {
    console.log('[AIS] WebSocket closed');
    wsConnection = null;
    wsConnected = false;
    // 5초 후 재연결 시도
    setTimeout(() => {
      if (!wsConnection) connectAISStream(apiKey, updateCallback || undefined);
    }, 5000);
  };
}

export function disconnectAISStream() {
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
  { name: 'Strait of Malacca', points: [
    { lat: 1.26, lng: 103.85, heading: 310 }, { lat: 2.5, lng: 101.5, heading: 310 },
    { lat: 4.0, lng: 100.0, heading: 320 }, { lat: 5.5, lng: 98.5, heading: 330 },
  ], spread: 0.15, density: 1.2 },
  { name: 'English Channel', points: [
    { lat: 50.8, lng: 1.5, heading: 240 }, { lat: 50.2, lng: -1.5, heading: 260 },
    { lat: 49.5, lng: -5.0, heading: 240 },
  ], spread: 0.1, density: 1.0 },
  { name: 'Suez Canal', points: [
    { lat: 31.3, lng: 32.35, heading: 170 }, { lat: 30.5, lng: 32.33, heading: 175 },
    { lat: 29.5, lng: 32.9, heading: 150 },
  ], spread: 0.05, density: 0.9 },
  { name: 'East China Sea', points: [
    { lat: 31.5, lng: 122.0, heading: 200 }, { lat: 30.0, lng: 123.0, heading: 210 },
    { lat: 28.5, lng: 124.5, heading: 220 }, { lat: 27.0, lng: 126.0, heading: 210 },
  ], spread: 0.2, density: 1.1 },
  { name: 'Persian Gulf', points: [
    { lat: 26.5, lng: 56.5, heading: 310 }, { lat: 27.5, lng: 51.5, heading: 290 },
    { lat: 29.0, lng: 49.0, heading: 340 },
  ], spread: 0.1, density: 1.0 },
  { name: 'Mediterranean', points: [
    { lat: 36.0, lng: -5.3, heading: 80 }, { lat: 37.0, lng: -1.0, heading: 70 },
    { lat: 37.5, lng: 3.0, heading: 80 }, { lat: 38.0, lng: 8.0, heading: 90 },
    { lat: 36.5, lng: 16.0, heading: 70 }, { lat: 35.0, lng: 25.0, heading: 90 },
  ], spread: 0.3, density: 1.3 },
  { name: 'Busan', points: [
    { lat: 35.0, lng: 129.1, heading: 200 }, { lat: 34.5, lng: 129.5, heading: 150 },
    { lat: 33.5, lng: 130.0, heading: 130 },
  ], spread: 0.1, density: 1.0 },
  { name: 'US West Coast', points: [
    { lat: 34.0, lng: -118.6, heading: 140 }, { lat: 33.7, lng: -118.3, heading: 50 },
    { lat: 34.2, lng: -119.0, heading: 300 },
  ], spread: 0.12, density: 0.8 },
  { name: 'US East Coast', points: [
    { lat: 40.5, lng: -73.8, heading: 190 }, { lat: 40.0, lng: -73.3, heading: 140 },
    { lat: 39.0, lng: -71.5, heading: 120 },
  ], spread: 0.1, density: 0.8 },
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

// --- Public API ---

/**
 * AIS 선박 데이터를 가져옴.
 * - VITE_AISSTREAM_KEY가 있으면 → WebSocket 실시간 데이터
 * - 없으면 → 시뮬레이션 폴백
 */
export async function fetchShips(): Promise<ShipData[]> {
  const apiKey = import.meta.env.VITE_AISSTREAM_KEY;

  if (apiKey && apiKey !== 'placeholder') {
    // 라이브 데이터가 충분히 모였으면 반환
    if (liveShips.size > 0) {
      return Array.from(liveShips.values());
    }
    // 아직 연결 안 됐으면 연결 시작 + 시뮬레이션 반환
    if (!wsConnection) {
      connectAISStream(apiKey);
    }
    // 데이터가 모일 때까지 시뮬레이션으로 폴백
    return generateSimulatedShips();
  }

  return generateSimulatedShips();
}
