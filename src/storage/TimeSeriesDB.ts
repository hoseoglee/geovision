/**
 * IndexedDB wrapper for time-series data storage.
 * Collections: 'alerts', 'correlations', 'snapshots'
 * Auto-prune: alerts 7d, correlations 7d, snapshots 24h
 */

interface TimeSeriesRecord {
  id?: number;
  collection: string;
  timestamp: number;
  data: unknown;
}

const DB_NAME = 'geovision-tsdb';
const DB_VERSION = 1;
const STORE_NAME = 'timeseries';

const RETENTION_MS: Record<string, number> = {
  alerts: 7 * 24 * 60 * 60 * 1000,
  correlations: 7 * 24 * 60 * 60 * 1000,
  snapshots: 24 * 60 * 60 * 1000,
};

type InMemoryStore = Map<string, TimeSeriesRecord[]>;

class InMemoryFallback {
  private store: InMemoryStore = new Map();

  async store_record(collection: string, timestamp: number, data: unknown): Promise<void> {
    const records = this.store.get(collection) ?? [];
    records.push({ collection, timestamp, data });
    this.store.set(collection, records);
  }

  async query(collection: string, from: number, to: number): Promise<TimeSeriesRecord[]> {
    const records = this.store.get(collection) ?? [];
    return records.filter((r) => r.timestamp >= from && r.timestamp <= to);
  }

  async prune(olderThan?: number): Promise<number> {
    let pruned = 0;
    for (const [collection, records] of this.store.entries()) {
      const retention = RETENTION_MS[collection] ?? RETENTION_MS.alerts;
      const cutoff = olderThan ?? (Date.now() - retention);
      const filtered = records.filter((r) => r.timestamp >= cutoff);
      pruned += records.length - filtered.length;
      this.store.set(collection, filtered);
    }
    return pruned;
  }
}

class IndexedDBStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('collection', 'collection', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('collection_timestamp', ['collection', 'timestamp'], { unique: false });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    return this.initPromise;
  }

  async store_record(collection: string, timestamp: number, data: unknown): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add({ collection, timestamp, data });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async query(collection: string, from: number, to: number): Promise<TimeSeriesRecord[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index('collection_timestamp');
      const range = IDBKeyRange.bound([collection, from], [collection, to]);
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async prune(olderThan?: number): Promise<number> {
    await this.init();
    let pruned = 0;

    for (const collection of Object.keys(RETENTION_MS)) {
      const retention = RETENTION_MS[collection];
      const cutoff = olderThan ?? (Date.now() - retention);

      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('collection_timestamp');
        const range = IDBKeyRange.bound([collection, 0], [collection, cutoff]);
        const request = index.openCursor(range);

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            cursor.delete();
            pruned++;
            cursor.continue();
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    return pruned;
  }
}

interface TimeSeriesDBInterface {
  store_record(collection: string, timestamp: number, data: unknown): Promise<void>;
  query(collection: string, from: number, to: number): Promise<TimeSeriesRecord[]>;
  prune(olderThan?: number): Promise<number>;
}

function createTimeSeriesDB(): TimeSeriesDBInterface {
  try {
    if (typeof indexedDB !== 'undefined') {
      return new IndexedDBStore();
    }
  } catch {
    // fallback
  }
  return new InMemoryFallback();
}

export const timeSeriesDB = createTimeSeriesDB();
export type { TimeSeriesRecord };
