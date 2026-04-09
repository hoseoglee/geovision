export interface PositionRecord {
  id?: number;
  entityId: string;
  entityType: 'flight' | 'ship' | 'adsb';
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  speed: number;
  timestamp: number;
}

const DB_NAME = 'geovision-trajectories';
const DB_VERSION = 1;
const STORE_NAME = 'positions';
const LS_KEY = 'geovision-trajectory-positions';
const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours for 4D playback
const MAX_RECORDS_PER_ENTITY = 500;

class TrajectoryDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise<void>((resolve) => {
      if (typeof indexedDB === 'undefined') { resolve(); return; }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('entityId', 'entityId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('entityId_timestamp', ['entityId', 'timestamp'], { unique: false });
        }
      };
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onerror = () => { console.warn('IndexedDB unavailable for trajectories'); resolve(); };
    });
    return this.initPromise;
  }

  private lsLoad(): PositionRecord[] {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private lsSave(records: PositionRecord[]): void {
    localStorage.setItem(LS_KEY, JSON.stringify(records));
  }

  async addPositions(records: PositionRecord[]): Promise<void> {
    if (!records.length) return;
    await this.init();
    if (!this.db) {
      const all = this.lsLoad();
      for (const r of records) all.push({ ...r, id: Date.now() + Math.random() });
      // enforce per-entity limit
      const byEntity = new Map<string, PositionRecord[]>();
      for (const r of all) {
        if (!byEntity.has(r.entityId)) byEntity.set(r.entityId, []);
        byEntity.get(r.entityId)!.push(r);
      }
      const trimmed: PositionRecord[] = [];
      for (const [, recs] of byEntity) {
        recs.sort((a, b) => a.timestamp - b.timestamp);
        trimmed.push(...recs.slice(-MAX_RECORDS_PER_ENTITY));
      }
      this.lsSave(trimmed);
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const r of records) {
        const { id: _, ...rest } = r;
        store.add(rest);
      }
      tx.oncomplete = () => { this.enforceEntityLimits(records); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  private async enforceEntityLimits(records: PositionRecord[]): Promise<void> {
    if (!this.db) return;
    const entityIds = [...new Set(records.map((r) => r.entityId))];
    for (const entityId of entityIds) {
      const all = await this.queryByEntity(entityId);
      if (all.length > MAX_RECORDS_PER_ENTITY) {
        const toDelete = all.slice(0, all.length - MAX_RECORDS_PER_ENTITY);
        const tx = this.db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const r of toDelete) if (r.id != null) store.delete(r.id);
        await new Promise<void>((res) => { tx.oncomplete = () => res(); });
      }
    }
  }

  private queryByEntity(entityId: string): Promise<PositionRecord[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index('entityId');
      const req = index.getAll(entityId);
      req.onsuccess = () => {
        const results = (req.result as PositionRecord[]).sort((a, b) => a.timestamp - b.timestamp);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getHistory(entityId: string, maxAge: number = DEFAULT_MAX_AGE): Promise<PositionRecord[]> {
    await this.init();
    const cutoff = Date.now() - maxAge;
    if (!this.db) {
      return this.lsLoad()
        .filter((r) => r.entityId === entityId && r.timestamp >= cutoff)
        .sort((a, b) => a.timestamp - b.timestamp);
    }
    const all = await this.queryByEntity(entityId);
    return all.filter((r) => r.timestamp >= cutoff);
  }

  async getSnapshotAtTime(timestamp: number): Promise<PositionRecord[]> {
    await this.init();
    if (!this.db) {
      const all = this.lsLoad();
      const byEntity = new Map<string, PositionRecord>();
      for (const r of all) {
        if (r.timestamp <= timestamp) {
          const prev = byEntity.get(r.entityId);
          if (!prev || r.timestamp > prev.timestamp) {
            byEntity.set(r.entityId, r);
          }
        }
      }
      return Array.from(byEntity.values());
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(timestamp);
      const req = index.getAll(range);
      req.onsuccess = () => {
        const records = req.result as PositionRecord[];
        const byEntity = new Map<string, PositionRecord>();
        for (const r of records) {
          const prev = byEntity.get(r.entityId);
          if (!prev || r.timestamp > prev.timestamp) {
            byEntity.set(r.entityId, r);
          }
        }
        resolve(Array.from(byEntity.values()));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async cleanup(): Promise<void> {
    await this.init();
    const cutoff = Date.now() - DEFAULT_MAX_AGE;
    if (!this.db) {
      this.lsSave(this.lsLoad().filter((r) => r.timestamp >= cutoff));
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      const cursor = index.openCursor(range);
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) { c.delete(); c.continue(); }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearEntity(entityId: string): Promise<void> {
    await this.init();
    if (!this.db) {
      this.lsSave(this.lsLoad().filter((r) => r.entityId !== entityId));
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const index = tx.objectStore(STORE_NAME).index('entityId');
      const cursor = index.openCursor(IDBKeyRange.only(entityId));
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) { c.delete(); c.continue(); }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) { localStorage.removeItem(LS_KEY); return; }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Detect AIS signal gaps for a ship entity.
   * Returns gaps between consecutive position records exceeding the threshold.
   * A null gapEndTime indicates an ongoing gap (vessel still dark).
   */
  async detectGaps(
    entityId: string,
    thresholdMs: number = 30 * 60 * 1000
  ): Promise<Array<{ gapStartTime: number; gapEndTime: number | null; durationMs: number }>> {
    const records = await this.getHistory(entityId);
    if (records.length < 2) {
      // Check for ongoing gap from a single record
      if (records.length === 1) {
        const gap = Date.now() - records[0].timestamp;
        if (gap >= thresholdMs) {
          return [{ gapStartTime: records[0].timestamp, gapEndTime: null, durationMs: gap }];
        }
      }
      return [];
    }

    const gaps: Array<{ gapStartTime: number; gapEndTime: number | null; durationMs: number }> = [];

    for (let i = 1; i < records.length; i++) {
      const gap = records[i].timestamp - records[i - 1].timestamp;
      if (gap >= thresholdMs) {
        gaps.push({
          gapStartTime: records[i - 1].timestamp,
          gapEndTime: records[i].timestamp,
          durationMs: gap,
        });
      }
    }

    // Check for ongoing gap (last record to now)
    const lastRecord = records[records.length - 1];
    const ongoingGap = Date.now() - lastRecord.timestamp;
    if (ongoingGap >= thresholdMs) {
      gaps.push({
        gapStartTime: lastRecord.timestamp,
        gapEndTime: null,
        durationMs: ongoingGap,
      });
    }

    return gaps;
  }
}

export const trajectoryDB = new TrajectoryDB();
