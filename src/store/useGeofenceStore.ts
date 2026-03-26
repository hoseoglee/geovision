import { create } from 'zustand';

export type GeofenceShape = 'polygon' | 'circle';
export type GeofenceTargetLayer = 'flights' | 'ships' | 'adsb' | 'all';

export interface GeofenceVertex {
  lat: number;
  lng: number;
}

export interface Geofence {
  id: string;
  name: string;
  shape: GeofenceShape;
  vertices: GeofenceVertex[];
  center?: GeofenceVertex;
  radiusKm?: number;
  color: string;
  targetLayers: GeofenceTargetLayer[];
  enabled: boolean;
  createdAt: number;
}

export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  geofenceName: string;
  entityId: string;
  entityLayer: string;
  eventType: 'enter' | 'exit' | 'dwell';
  lat: number;
  lng: number;
  timestamp: number;
}

interface GeofenceState {
  geofences: Geofence[];
  events: GeofenceEvent[];
  drawingMode: GeofenceShape | null;
  drawingVertices: GeofenceVertex[];
  addGeofence: (geofence: Omit<Geofence, 'id' | 'createdAt'>) => void;
  updateGeofence: (id: string, updates: Partial<Geofence>) => void;
  removeGeofence: (id: string) => void;
  toggleGeofence: (id: string) => void;
  startDrawing: (shape: GeofenceShape) => void;
  addVertex: (vertex: GeofenceVertex) => void;
  finishDrawing: (name: string, color: string, targetLayers: GeofenceTargetLayer[]) => void;
  cancelDrawing: () => void;
  addEvent: (event: Omit<GeofenceEvent, 'id' | 'timestamp'>) => void;
  clearEvents: () => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

const DB_NAME = 'geovision-geofences';
const DB_STORE = 'geofences';
const DB_KEY = 'all';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(DB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<Geofence[] | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(DB_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(geofences: Geofence[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(geofences, DB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function lsGet(): Geofence[] | null {
  try { const r = localStorage.getItem(DB_NAME); return r ? JSON.parse(r) : null; } catch { return null; }
}

function lsSet(g: Geofence[]) {
  try { localStorage.setItem(DB_NAME, JSON.stringify(g)); } catch { /* */ }
}

function gid(p: string): string { return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export const useGeofenceStore = create<GeofenceState>((set, get) => ({
  geofences: [],
  events: [],
  drawingMode: null,
  drawingVertices: [],

  addGeofence: (geofence) => {
    const g: Geofence = { ...geofence, id: gid('gf'), createdAt: Date.now() };
    set((s) => ({ geofences: [...s.geofences, g] }));
    get().saveToStorage();
  },
  updateGeofence: (id, updates) => {
    set((s) => ({ geofences: s.geofences.map((g) => g.id === id ? { ...g, ...updates } : g) }));
    get().saveToStorage();
  },
  removeGeofence: (id) => {
    set((s) => ({ geofences: s.geofences.filter((g) => g.id !== id) }));
    get().saveToStorage();
  },
  toggleGeofence: (id) => {
    set((s) => ({ geofences: s.geofences.map((g) => g.id === id ? { ...g, enabled: !g.enabled } : g) }));
    get().saveToStorage();
  },
  startDrawing: (shape) => {
    // 측정 모드와 상호 배제 — 순환 import 방지를 위해 lazy import
    import('./useMeasurementStore').then(({ useMeasurementStore }) => {
      useMeasurementStore.getState().cancelMeasure();
    });
    set({ drawingMode: shape, drawingVertices: [] });
  },
  addVertex: (vertex) => set((s) => ({ drawingVertices: [...s.drawingVertices, vertex] })),
  finishDrawing: (name, color, targetLayers) => {
    const { drawingMode, drawingVertices } = get();
    if (!drawingMode) return;
    if (drawingMode === 'polygon') {
      if (drawingVertices.length < 3) return;
      get().addGeofence({ name, shape: 'polygon', vertices: drawingVertices, color, targetLayers, enabled: true });
    } else {
      if (drawingVertices.length < 2) return;
      const center = drawingVertices[0], edge = drawingVertices[1];
      const R = 6371, dLat = ((edge.lat - center.lat) * Math.PI) / 180, dLng = ((edge.lng - center.lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((center.lat * Math.PI) / 180) * Math.cos((edge.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      get().addGeofence({ name, shape: 'circle', vertices: [], center, radiusKm: R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)), color, targetLayers, enabled: true });
    }
    set({ drawingMode: null, drawingVertices: [] });
  },
  cancelDrawing: () => set({ drawingMode: null, drawingVertices: [] }),
  addEvent: (event) => set((s) => ({ events: [{ ...event, id: gid('gfe'), timestamp: Date.now() }, ...s.events].slice(0, 100) })),
  clearEvents: () => set({ events: [] }),
  loadFromStorage: async () => {
    try { const d = await idbGet(); if (d) { set({ geofences: d }); return; } } catch { /* */ }
    const fb = lsGet(); if (fb) set({ geofences: fb });
  },
  saveToStorage: async () => {
    const { geofences } = get();
    try { await idbSet(geofences); } catch { lsSet(geofences); }
  },
}));
