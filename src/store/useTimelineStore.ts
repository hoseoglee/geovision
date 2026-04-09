import { create } from 'zustand';
import { timeSeriesDB, type TimeSeriesRecord } from '@/storage/TimeSeriesDB';
import { useDarkVesselStore } from './useDarkVesselStore';
import { clipPayloadToEvents, type ClipPayload } from '@/utils/clipUtils';

export type PlaybackSpeed = 1 | 10 | 60 | 360;

export interface TimelineEvent {
  id: string;
  timestamp: number;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  lat?: number;
  lng?: number;
  source: 'alert' | 'correlation';
  ruleId?: string;
}

export interface DarkGapSegment {
  mmsi: string;
  shipName: string;
  gapStartTime: number;
  gapEndTime: number | null; // null = ongoing (vessel still dark)
  lastKnownLat: number;
  lastKnownLng: number;
}

interface TimelineState {
  // Mode
  mode: 'realtime' | 'playback';

  // Playback controls
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;

  // Time range (7 days)
  rangeStart: number;
  rangeEnd: number;

  // Cached events from TimeSeriesDB
  events: TimelineEvent[];

  // Density histogram (168 bins = 1 per hour for 7 days)
  density: number[];

  // Loading state
  isLoading: boolean;
  darkGapSegments: DarkGapSegment[];

  // Actions
  enterPlayback: () => Promise<void>;
  enterPlaybackWithClip: (payload: ClipPayload) => void;
  exitPlayback: () => void;
  seekTo: (timestamp: number) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  tick: () => void;
  getEventsAtTime: (timestamp: number, windowMs?: number) => TimelineEvent[];
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DENSITY_BINS = 168; // 1 per hour for 7 days

function parseRecord(record: TimeSeriesRecord, source: 'alert' | 'correlation'): TimelineEvent | null {
  const d = record.data as Record<string, unknown>;
  if (!d) return null;
  return {
    id: (d.id as string) ?? `${source}-${record.id}`,
    timestamp: record.timestamp,
    severity: (d.severity as 'critical' | 'warning' | 'info') ?? 'info',
    title: (d.title as string) ?? 'Unknown',
    message: (d.message as string) ?? '',
    lat: d.lat as number | undefined,
    lng: d.lng as number | undefined,
    source,
    ruleId: d.ruleId as string | undefined,
  };
}

function computeDensity(events: TimelineEvent[], rangeStart: number, rangeEnd: number): number[] {
  const bins = new Array<number>(DENSITY_BINS).fill(0);
  const binWidth = (rangeEnd - rangeStart) / DENSITY_BINS;
  if (binWidth <= 0) return bins;

  for (const evt of events) {
    const idx = Math.floor((evt.timestamp - rangeStart) / binWidth);
    if (idx >= 0 && idx < DENSITY_BINS) {
      bins[idx]++;
    }
  }
  return bins;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  mode: 'realtime',
  currentTime: Date.now(),
  isPlaying: false,
  playbackSpeed: 1,
  rangeStart: Date.now() - SEVEN_DAYS_MS,
  rangeEnd: Date.now(),
  events: [],
  density: new Array<number>(DENSITY_BINS).fill(0),
  isLoading: false,
  darkGapSegments: [],

  enterPlayback: async () => {
    const now = Date.now();
    const rangeStart = now - SEVEN_DAYS_MS;
    const rangeEnd = now;

    set({ isLoading: true });

    try {
      const [alertRecords, corrRecords] = await Promise.all([
        timeSeriesDB.query('alerts', rangeStart, rangeEnd),
        timeSeriesDB.query('correlations', rangeStart, rangeEnd),
      ]);

      const events: TimelineEvent[] = [];
      for (const r of alertRecords) {
        const evt = parseRecord(r, 'alert');
        if (evt) events.push(evt);
      }
      for (const r of corrRecords) {
        const evt = parseRecord(r, 'correlation');
        if (evt) events.push(evt);
      }
      events.sort((a, b) => a.timestamp - b.timestamp);

      // Load dark vessel gap segments from DarkVesselStore
      const darkGaps = useDarkVesselStore.getState().darkGaps;
      const darkGapSegments: DarkGapSegment[] = darkGaps.map((gap) => ({
        mmsi: gap.mmsi,
        shipName: gap.shipName,
        gapStartTime: gap.gapStartTime,
        gapEndTime: gap.isOngoing ? null : gap.gapStartTime + gap.gapDurationMs,
        lastKnownLat: gap.lastKnownLat,
        lastKnownLng: gap.lastKnownLng,
      }));

      const density = computeDensity(events, rangeStart, rangeEnd);

      set({
        mode: 'playback',
        currentTime: rangeEnd,
        isPlaying: false,
        rangeStart,
        rangeEnd,
        events,
        density,
        darkGapSegments,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  enterPlaybackWithClip: (payload: ClipPayload) => {
    const events: TimelineEvent[] = clipPayloadToEvents(payload);
    events.sort((a, b) => a.timestamp - b.timestamp);
    const density = computeDensity(events, payload.s, payload.e);
    set({
      mode: 'playback',
      currentTime: payload.t,
      isPlaying: false,
      rangeStart: payload.s,
      rangeEnd: payload.e,
      events,
      density,
      darkGapSegments: [],
      isLoading: false,
    });
  },

  exitPlayback: () => {
    set({
      mode: 'realtime',
      isPlaying: false,
      currentTime: Date.now(),
    });
  },

  seekTo: (timestamp: number) => {
    const { rangeStart, rangeEnd } = get();
    const clamped = Math.max(rangeStart, Math.min(rangeEnd, timestamp));
    set({ currentTime: clamped, isPlaying: false });
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  setSpeed: (speed: PlaybackSpeed) => set({ playbackSpeed: speed }),

  tick: () => {
    const { isPlaying, currentTime, playbackSpeed, rangeEnd } = get();
    if (!isPlaying) return;

    // Each tick advances by playbackSpeed * 60 seconds (1 min per tick at 1x)
    const advance = playbackSpeed * 60 * 1000;
    const next = currentTime + advance;

    if (next >= rangeEnd) {
      set({ currentTime: rangeEnd, isPlaying: false });
    } else {
      set({ currentTime: next });
    }
  },

  getEventsAtTime: (timestamp: number, windowMs = 30 * 60 * 1000) => {
    const { events } = get();
    const from = timestamp - windowMs;
    const to = timestamp;
    return events.filter((e) => e.timestamp >= from && e.timestamp <= to);
  },
}));
