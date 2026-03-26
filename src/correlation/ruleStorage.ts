import type { RuleDSL } from './ruleDSL';

const DB_NAME = 'geovision-rules';
const DB_VERSION = 1;
const STORE_NAME = 'rules';
const LS_KEY = 'geovision-custom-rules';

class RuleStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise<void>((resolve) => {
      if (typeof indexedDB === 'undefined') { resolve(); return; }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('isBuiltin', 'isBuiltin', { unique: false });
        }
      };
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onerror = () => { console.warn('IndexedDB unavailable'); resolve(); };
    });
    return this.initPromise;
  }

  async loadRules(): Promise<RuleDSL[]> {
    await this.init();
    if (!this.db) { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : []; }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as RuleDSL[]);
      req.onerror = () => reject(req.error);
    });
  }

  async saveRule(rule: RuleDSL): Promise<void> {
    await this.init();
    if (!this.db) {
      const rules = await this.loadRules();
      const idx = rules.findIndex((r) => r.id === rule.id);
      if (idx >= 0) rules[idx] = rule; else rules.push(rule);
      localStorage.setItem(LS_KEY, JSON.stringify(rules));
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(rule);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteRule(id: string): Promise<void> {
    await this.init();
    if (!this.db) {
      const rules = await this.loadRules();
      localStorage.setItem(LS_KEY, JSON.stringify(rules.filter((r) => r.id !== id)));
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveAllRules(rules: RuleDSL[]): Promise<void> {
    await this.init();
    if (!this.db) { localStorage.setItem(LS_KEY, JSON.stringify(rules)); return; }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      for (const rule of rules) tx.objectStore(STORE_NAME).put(rule);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  exportRules(rules: RuleDSL[]): string {
    return JSON.stringify(rules.filter((r) => !r.isBuiltin), null, 2);
  }

  importRules(json: string): { rules: RuleDSL[]; errors: string[] } {
    const errors: string[] = [];
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch (e) { return { rules: [], errors: [`JSON parse error: ${(e as Error).message}`] }; }
    if (!Array.isArray(parsed)) return { rules: [], errors: ['Expected array'] };
    const required: (keyof RuleDSL)[] = ['id', 'name', 'triggerLayer', 'targetLayer', 'severity', 'spatialRadius', 'temporalWindow', 'cooldown', 'conditions'];
    const valid: RuleDSL[] = [];
    const ts = Date.now();
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item || typeof item !== 'object') { errors.push(`Rule[${i}]: not an object`); continue; }
      const missing = required.filter((f) => !(f in item));
      if (missing.length) { errors.push(`Rule[${i}]: missing ${missing.join(', ')}`); continue; }
      valid.push({ ...item, isBuiltin: false, enabled: item.enabled ?? true, description: item.description ?? '', triggerCount: item.triggerCount ?? 0, lastTriggered: item.lastTriggered ?? null, createdAt: item.createdAt ?? ts, updatedAt: item.updatedAt ?? ts, conditions: { ...item.conditions, minTargetCount: item.conditions?.minTargetCount ?? 1 } });
    }
    return { rules: valid, errors };
  }

  async updateRuleStats(ruleId: string, timestamp: number): Promise<void> {
    await this.init();
    const rules = await this.loadRules();
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    rule.triggerCount += 1;
    rule.lastTriggered = timestamp;
    await this.saveRule(rule);
  }
}

export const ruleStorage = new RuleStorage();
