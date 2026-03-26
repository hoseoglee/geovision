/**
 * EventStore — IndexedDB persistence for all GeoVision events.
 *
 * Tables (collections):
 *   - alerts       : Alert events from useAlertStore
 *   - correlations : Correlation alerts from useCorrelationStore
 *   - geofence     : Geofence enter/exit/dwell events
 *
 * Features:
 *   - Auto TTL: 30-day retention, pruned on startup
 *   - Indexes: timestamp, type, severity
 *   - Write buffering: batches writes every 2s to reduce IDB pressure
 *   - Storage quota monitoring
 *   - InMemory fallback when IndexedDB unavailable
 */

export interface StoredEvent {
  id?: number;
  collection: string;
  type: string;          // alert category or correlation ruleId
  severity: string;      // critical | warning | info
  title: string;
  message: string;
  lat?: number;
  lng?: number;
  timestamp: number;
  data?: unknown;        // full original payload
}

export interface DailyCount {
  date: string;   // YYYY-MM-DD
  count: number;
}

export interface TypeCount {
  type: string;
  count: number;
}

export interface StorageInfo {
  estimatedSizeMB: number;
  recordCount: number;
  oldestTimestamp: number | null;
}

const DB_NAME = 'geovision-events';
const DB_VERSION = 1;
const STORE_NAME = 'events';
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BUFFER_INTERVAL_MS = 2000;
const WARN_SIZE_MB = 50;

interface EventStoreInterface {
  store(event: Omit<StoredEvent, 'id'>): void;
  query(collection: string, from: number, to: number): Promise<StoredEvent[]>;
  queryAll(from: number, to: number): Promise<StoredEvent[]>;
  getDailyCounts(collection: string, days: number): Promise<DailyCount[]>;
  getTypeCounts(collection: string, from: number, to: number): Promise<TypeCount[]>;
  getTopLocations(collection: string, limit: number): Promise<{ lat: number; lng: number; count: number }[]>;
  getStorageInfo(): Promise<StorageInfo>;
  prune(): Promise<number>;
  clearAll(): Promise<void>;
  isOverQuota(): Promise<boolean>;
}

// ─── InMemory Fallback ───────────────────────────────────────

class InMemoryEventStore implements EventStoreInterface {
  private records: StoredEvent[] = [];
  private nextId = 1;

  store(event: Omit<StoredEvent, 'id'>): void {
    this.records.push({ ...event, id: this.nextId++ });
  }

  async query(collection: string, from: number, to: number): Promise<StoredEvent[]> {
    return this.records.filter(
      (r) => r.collection === collection && r.timestamp >= from && r.timestamp <= to
    );
  }

  async queryAll(from: number, to: number): Promise<StoredEvent[]> {
    return this.records.filter((r) => r.timestamp >= from && r.timestamp <= to);
  }

  async getDailyCounts(collection: string, days: number): Promise<DailyCount[]> {
    const now = Date.now();
    const from = now - days * 24 * 60 * 60 * 1000;
    const filtered = this.records.filter(
      (r) => r.collection === collection && r.timestamp >= from
    );
    return aggregateDailyCounts(filtered, days);
  }

  async getTypeCounts(collection: string, from: number, to: number): Promise<TypeCount[]> {
    const filtered = this.records.filter(
      (r) => r.collection === collection && r.timestamp >= from && r.timestamp <= to
    );
    return aggregateTypeCounts(filtered);
  }

  async getTopLocations(_collection: string, _limit: number) {
    return [];
  }

  async getStorageInfo(): Promise<StorageInfo> {
    return {
      estimatedSizeMB: 0,
      recordCount: this.records.length,
      oldestTimestamp: this.records.length > 0 ? this.records[0].timestamp : null,
    };
  }

  async prune(): Promise<number> {
    const cutoff = Date.now() - RETENTION_MS;
    const before = this.records.length;
    this.records = this.records.filter((r) => r.timestamp >= cutoff);
    return before - this.records.length;
  }

  async clearAll(): Promise<void> {
    this.records = [];
  }

  async isOverQuota(): Promise<boolean> {
    return false;
  }
}

// ─── IndexedDB Implementation ────────────────────────────────

class IDBEventStore implements EventStoreInterface {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private buffer: Omit<StoredEvent, 'id'>[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.flushTimer = setInterval(() => this.flush(), BUFFER_INTERVAL_MS);
  }

  private init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('collection', 'collection', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('severity', 'severity', { unique: false });
          store.createIndex('col_ts', ['collection', 'timestamp'], { unique: false });
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
    return this.initPromise;
  }

  store(event: Omit<StoredEvent, 'id'>): void {
    this.buffer.push(event);
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);
    try {
      await this.init();
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const event of batch) {
        store.add(event);
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[EventStore] flush failed, re-queuing', e);
      this.buffer.unshift(...batch);
    }
  }

  async query(collection: string, from: number, to: number): Promise<StoredEvent[]> {
    await this.flush(); // ensure pending writes are committed
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index('col_ts');
      const range = IDBKeyRange.bound([collection, from], [collection, to]);
      const req = index.getAll(range);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async queryAll(from: number, to: number): Promise<StoredEvent[]> {
    await this.flush();
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index('timestamp');
      const range = IDBKeyRange.bound(from, to);
      const req = index.getAll(range);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getDailyCounts(collection: string, days: number): Promise<DailyCount[]> {
    const now = Date.now();
    const from = now - days * 24 * 60 * 60 * 1000;
    const records = await this.query(collection, from, now);
    return aggregateDailyCounts(records, days);
  }

  async getTypeCounts(collection: string, from: number, to: number): Promise<TypeCount[]> {
    const records = await this.query(collection, from, to);
    return aggregateTypeCounts(records);
  }

  async getTopLocations(collection: string, limit: number) {
    const now = Date.now();
    const from = now - 7 * 24 * 60 * 60 * 1000;
    const records = await this.query(collection, from, now);
    const grid = new Map<string, { lat: number; lng: number; count: number }>();
    for (const r of records) {
      if (r.lat == null || r.lng == null) continue;
      // round to 1 decimal for clustering
      const key = `${(r.lat).toFixed(1)},${(r.lng).toFixed(1)}`;
      const existing = grid.get(key);
      if (existing) {
        existing.count++;
      } else {
        grid.set(key, { lat: r.lat, lng: r.lng, count: 1 });
      }
    }
    return [...grid.values()].sort((a, b) => b.count - a.count).slice(0, limit);
  }

  async getStorageInfo(): Promise<StorageInfo> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      let recordCount = 0;
      let oldestTimestamp: number | null = null;

      const countReq = store.count();
      countReq.onsuccess = () => { recordCount = countReq.result; };

      const cursorReq = store.index('timestamp').openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) oldestTimestamp = cursor.value.timestamp;
      };

      tx.oncomplete = async () => {
        let estimatedSizeMB = 0;
        try {
          if (navigator.storage?.estimate) {
            const est = await navigator.storage.estimate();
            estimatedSizeMB = ((est.usage ?? 0) / 1024 / 1024);
          }
        } catch { /* ignore */ }
        resolve({ estimatedSizeMB, recordCount, oldestTimestamp });
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async prune(): Promise<number> {
    await this.init();
    const cutoff = Date.now() - RETENTION_MS;
    return new Promise((resolve, reject) => {
      let pruned = 0;
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const index = tx.objectStore(STORE_NAME).index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      const req = index.openCursor(range);
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          pruned++;
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve(pruned);
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll(): Promise<void> {
    this.buffer = [];
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async isOverQuota(): Promise<boolean> {
    const info = await this.getStorageInfo();
    return info.estimatedSizeMB > WARN_SIZE_MB;
  }
}

// ─── Aggregation Helpers ─────────────────────────────────────

function aggregateDailyCounts(records: StoredEvent[], days: number): DailyCount[] {
  const map = new Map<string, number>();
  // pre-fill all days
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of records) {
    const key = new Date(r.timestamp).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([date, count]) => ({ date, count }));
}

function aggregateTypeCounts(records: StoredEvent[]): TypeCount[] {
  const map = new Map<string, number>();
  for (const r of records) {
    map.set(r.type, (map.get(r.type) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Factory ─────────────────────────────────────────────────

function createEventStore(): EventStoreInterface {
  try {
    if (typeof indexedDB !== 'undefined') {
      return new IDBEventStore();
    }
  } catch { /* fallback */ }
  return new InMemoryEventStore();
}

export const eventStore = createEventStore();
export { WARN_SIZE_MB };
