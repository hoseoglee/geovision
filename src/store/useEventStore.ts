import { create } from 'zustand';
import { eventStore, type DailyCount, type TypeCount, type StorageInfo } from '@/storage/EventStore';

interface EventStoreState {
  // analytics cache (refreshed on demand)
  dailyCounts: DailyCount[];
  typeCounts: TypeCount[];
  storageInfo: StorageInfo;
  isLoading: boolean;
  quotaWarning: boolean;

  // actions
  init: () => Promise<void>;
  refreshAnalytics: (collection?: string) => Promise<void>;
  clearAllEvents: () => Promise<void>;
}

export const useEventStore = create<EventStoreState>((set) => ({
  dailyCounts: [],
  typeCounts: [],
  storageInfo: { estimatedSizeMB: 0, recordCount: 0, oldestTimestamp: null },
  isLoading: false,
  quotaWarning: false,

  init: async () => {
    // prune old data on startup
    try {
      const pruned = await eventStore.prune();
      if (pruned > 0) console.log(`[EventStore] pruned ${pruned} expired records`);
      const overQuota = await eventStore.isOverQuota();
      if (overQuota) set({ quotaWarning: true });
    } catch (e) {
      console.warn('[EventStore] init error', e);
    }
  },

  refreshAnalytics: async (collection = 'alerts') => {
    set({ isLoading: true });
    try {
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const [dailyCounts, typeCounts, storageInfo] = await Promise.all([
        eventStore.getDailyCounts(collection, 7),
        eventStore.getTypeCounts(collection, weekAgo, now),
        eventStore.getStorageInfo(),
      ]);
      set({
        dailyCounts,
        typeCounts,
        storageInfo,
        isLoading: false,
        quotaWarning: storageInfo.estimatedSizeMB > 50,
      });
    } catch (e) {
      console.warn('[EventStore] refresh error', e);
      set({ isLoading: false });
    }
  },

  clearAllEvents: async () => {
    await eventStore.clearAll();
    set({
      dailyCounts: [],
      typeCounts: [],
      storageInfo: { estimatedSizeMB: 0, recordCount: 0, oldestTimestamp: null },
      quotaWarning: false,
    });
  },
}));

// ─── Persistence Hooks (call from other stores) ──────────────

export function persistAlert(alert: {
  category: string;
  severity: string;
  title: string;
  message: string;
  lat?: number;
  lng?: number;
  timestamp: number;
}) {
  eventStore.store({
    collection: 'alerts',
    type: alert.category,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    lat: alert.lat,
    lng: alert.lng,
    timestamp: alert.timestamp,
  });
}

export function persistCorrelation(corr: {
  ruleId: string;
  severity: string;
  title: string;
  message: string;
  lat: number;
  lng: number;
  timestamp: number;
}) {
  eventStore.store({
    collection: 'correlations',
    type: corr.ruleId,
    severity: corr.severity,
    title: corr.title,
    message: corr.message,
    lat: corr.lat,
    lng: corr.lng,
    timestamp: corr.timestamp,
  });
}

export function persistGeofenceEvent(evt: {
  geofenceId: string;
  geofenceName: string;
  entityId: string;
  entityLayer: string;
  eventType: string;
  lat: number;
  lng: number;
  timestamp: number;
}) {
  eventStore.store({
    collection: 'geofence',
    type: evt.eventType,
    severity: evt.eventType === 'enter' ? 'warning' : 'info',
    title: `${evt.eventType.toUpperCase()}: ${evt.geofenceName}`,
    message: `${evt.entityLayer}/${evt.entityId}`,
    lat: evt.lat,
    lng: evt.lng,
    timestamp: evt.timestamp,
  });
}
