import { create } from 'zustand';

export type ProviderStatus = 'healthy' | 'degraded' | 'error' | 'simulated' | 'offline';

export interface ProviderHealth {
  status: ProviderStatus;
  lastSuccess: number | null;
  lastError: string | null;
  dataCount: number;
  isSimulated: boolean;
  /** ms since last successful fetch */
  latency: number | null;
}

export const PROVIDER_KEYS = [
  'satellites', 'flights', 'ships', 'earthquakes', 'adsb',
  'weather', 'typhoon', 'volcano', 'wildfire', 'cctv',
] as const;

export type ProviderKey = typeof PROVIDER_KEYS[number];

export const PROVIDER_LABELS: Record<ProviderKey, string> = {
  satellites: 'CELESTRAK',
  flights: 'OPENSKY',
  ships: 'AISSTREAM',
  earthquakes: 'USGS',
  adsb: 'ADS-B XCHG',
  weather: 'OPEN-METEO',
  typhoon: 'TYPHOON',
  volcano: 'VOLCANO',
  wildfire: 'FIRMS',
  cctv: 'CCTV',
};

export const PROVIDER_ICONS: Record<ProviderKey, string> = {
  satellites: '🛰',
  flights: '✈',
  ships: '🚢',
  earthquakes: '⚡',
  adsb: '🎖',
  weather: '🌤',
  typhoon: '🌀',
  volcano: '🌋',
  wildfire: '🔥',
  cctv: '📹',
};

const defaultHealth = (): ProviderHealth => ({
  status: 'offline',
  lastSuccess: null,
  lastError: null,
  dataCount: 0,
  isSimulated: false,
  latency: null,
});

interface ProviderHealthState {
  health: Record<ProviderKey, ProviderHealth>;
  detailOpen: boolean;
  /** Event log entries for status changes */
  events: ProviderHealthEvent[];

  reportSuccess: (key: ProviderKey, count: number, latency: number, simulated?: boolean) => void;
  reportError: (key: ProviderKey, error: string) => void;
  setOffline: (key: ProviderKey) => void;
  toggleDetail: () => void;
}

export interface ProviderHealthEvent {
  id: number;
  timestamp: number;
  provider: ProviderKey;
  oldStatus: ProviderStatus;
  newStatus: ProviderStatus;
  message: string;
}

let eventId = 0;

export const useProviderHealthStore = create<ProviderHealthState>((set) => ({
  health: Object.fromEntries(
    PROVIDER_KEYS.map((k) => [k, defaultHealth()])
  ) as Record<ProviderKey, ProviderHealth>,
  detailOpen: false,
  events: [],

  reportSuccess: (key, count, latency, simulated = false) =>
    set((state) => {
      const prev = state.health[key];
      const newStatus: ProviderStatus = simulated ? 'simulated' : 'healthy';
      const events = [...state.events];

      if (prev.status !== newStatus) {
        events.push({
          id: ++eventId,
          timestamp: Date.now(),
          provider: key,
          oldStatus: prev.status,
          newStatus,
          message: simulated
            ? `${PROVIDER_LABELS[key]} switched to simulated data`
            : `${PROVIDER_LABELS[key]} connection restored`,
        });
        // Keep last 50 events
        if (events.length > 50) events.shift();
      }

      return {
        events,
        health: {
          ...state.health,
          [key]: {
            status: newStatus,
            lastSuccess: Date.now(),
            lastError: null,
            dataCount: count,
            isSimulated: simulated,
            latency,
          },
        },
      };
    }),

  reportError: (key, error) =>
    set((state) => {
      const prev = state.health[key];
      const newStatus: ProviderStatus = prev.lastSuccess
        ? 'degraded' // had data before, now failing
        : 'error';   // never had data
      const events = [...state.events];

      if (prev.status !== newStatus) {
        events.push({
          id: ++eventId,
          timestamp: Date.now(),
          provider: key,
          oldStatus: prev.status,
          newStatus,
          message: `${PROVIDER_LABELS[key]} fetch failed: ${error}`,
        });
        if (events.length > 50) events.shift();
      }

      return {
        events,
        health: {
          ...state.health,
          [key]: {
            ...prev,
            status: newStatus,
            lastError: error,
          },
        },
      };
    }),

  setOffline: (key) =>
    set((state) => {
      const prev = state.health[key];
      if (prev.status === 'offline') return state;

      const events = [...state.events];
      events.push({
        id: ++eventId,
        timestamp: Date.now(),
        provider: key,
        oldStatus: prev.status,
        newStatus: 'offline',
        message: `${PROVIDER_LABELS[key]} layer deactivated`,
      });
      if (events.length > 50) events.shift();

      return {
        events,
        health: {
          ...state.health,
          [key]: { ...defaultHealth() },
        },
      };
    }),

  toggleDetail: () => set((s) => ({ detailOpen: !s.detailOpen })),
}));
