import { create } from 'zustand';
import { computeDarkGaps, type DarkGapEvent } from '@/darkvessel/DarkVesselDetector';
import { checkShipGates, CHOKEPOINT_GATES } from '@/darkvessel/ChokepointGateManager';

export type { DarkGapEvent };

export interface PassageEvent {
  id: string;
  chokepointName: string;
  mmsi: string;
  shipName: string;
  shipType: string;
  timestamp: number;
  direction: 'inbound' | 'outbound';
  lat: number;
  lng: number;
}

interface ShipTrack {
  name: string;
  type: string;
  lastSeenTime: number;
  lat: number;
  lng: number;
}

const PASSAGE_LS_KEY = 'geovision-passage-events';
const PASSAGE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const CHOKEPOINT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours per ship per chokepoint

function loadPassageEvents(): PassageEvent[] {
  try {
    const raw = localStorage.getItem(PASSAGE_LS_KEY);
    if (!raw) return [];
    const all: PassageEvent[] = JSON.parse(raw);
    const cutoff = Date.now() - PASSAGE_MAX_AGE;
    return all.filter((e) => e.timestamp >= cutoff);
  } catch { return []; }
}

function savePassageEvents(events: PassageEvent[]): void {
  try {
    localStorage.setItem(PASSAGE_LS_KEY, JSON.stringify(events));
  } catch { /* ignore */ }
}

interface DarkVesselState {
  enabled: boolean;
  analyticsVisible: boolean;
  darkGaps: DarkGapEvent[];
  passageEvents: PassageEvent[];
  // Internal tracking (not exposed to React)
  _shipTracks: Map<string, ShipTrack>;
  _prevZones: Map<string, Set<string>>; // mmsi -> set of gate names ship was inside
  _chokepointCooldowns: Map<string, number>; // `${mmsi}:${gate}` -> last passage timestamp

  toggleEnabled: () => void;
  toggleAnalytics: () => void;
  updateShip: (mmsi: string, name: string, type: string, lat: number, lng: number, heading: number, speed: number) => void;
  tick: () => void;
  getPassagesByChokepoint: (chokepointName: string) => PassageEvent[];
  getDailyPassageCounts: (chokepointName: string, days: number) => { date: string; inbound: number; outbound: number }[];
}

export const useDarkVesselStore = create<DarkVesselState>((set, get) => ({
  enabled: true,
  analyticsVisible: false,
  darkGaps: [],
  passageEvents: loadPassageEvents(),
  _shipTracks: new Map(),
  _prevZones: new Map(),
  _chokepointCooldowns: new Map(),

  toggleEnabled: () => set((s) => ({ enabled: !s.enabled })),
  toggleAnalytics: () => set((s) => ({ analyticsVisible: !s.analyticsVisible })),

  updateShip: (mmsi, name, type, lat, lng, heading, speed) => {
    const state = get();
    if (!state.enabled) return;

    // Update track
    state._shipTracks.set(mmsi, { name, type, lastSeenTime: Date.now(), lat, lng });

    // Chokepoint passage detection
    if (speed < 1) return; // stationary ships don't count
    const gates = checkShipGates(lat, lng, heading);
    const prevZones = state._prevZones.get(mmsi) ?? new Set<string>();
    const newZones = new Set(gates.map((g) => g.gateName));

    const newPassages: PassageEvent[] = [];
    for (const candidate of gates) {
      if (!prevZones.has(candidate.gateName)) {
        // Ship just entered this zone
        const cooldownKey = `${mmsi}:${candidate.gateName}`;
        const lastPassage = state._chokepointCooldowns.get(cooldownKey) ?? 0;
        if (Date.now() - lastPassage < CHOKEPOINT_COOLDOWN_MS) continue;

        state._chokepointCooldowns.set(cooldownKey, Date.now());
        newPassages.push({
          id: `${mmsi}-${candidate.gateName}-${Date.now()}`,
          chokepointName: candidate.gateName,
          mmsi,
          shipName: name,
          shipType: type,
          timestamp: Date.now(),
          direction: candidate.direction,
          lat,
          lng,
        });
      }
    }

    state._prevZones.set(mmsi, newZones);

    if (newPassages.length > 0) {
      const updated = [...get().passageEvents, ...newPassages].slice(-500);
      savePassageEvents(updated);
      set({ passageEvents: updated });
    }
  },

  tick: () => {
    const state = get();
    if (!state.enabled) return;
    const darkGaps = computeDarkGaps(state._shipTracks);
    set({ darkGaps });
  },

  getPassagesByChokepoint: (chokepointName) => {
    return get().passageEvents.filter((e) => e.chokepointName === chokepointName);
  },

  getDailyPassageCounts: (chokepointName, days = 7) => {
    const events = get().passageEvents.filter((e) => e.chokepointName === chokepointName);
    const result: { date: string; inbound: number; outbound: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayEvents = events.filter((e) => new Date(e.timestamp).toISOString().slice(0, 10) === dateStr);
      result.push({
        date: dateStr,
        inbound: dayEvents.filter((e) => e.direction === 'inbound').length,
        outbound: dayEvents.filter((e) => e.direction === 'outbound').length,
      });
    }
    return result;
  },
}));

// Auto-tick every 60 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    useDarkVesselStore.getState().tick();
  }, 60000);
}

// Export gate names for UI
export { CHOKEPOINT_GATES };
