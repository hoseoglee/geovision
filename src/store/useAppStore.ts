import { create } from "zustand";

export interface CameraTarget {
  longitude: number;
  latitude: number;
  height: number;
}

export interface SelectedEntity {
  type: 'satellite' | 'flight' | 'ship' | 'earthquake';
  name: string;
  details: Record<string, string | number>;
  url?: string;
}

interface AppState {
  activeLayers: string[];
  activeOverlays: string[];
  activeFilter: string | null;
  cameraTarget: CameraTarget | null;
  dataCounts: Record<string, number>;
  mouseCoords: { lat: number; lng: number } | null;
  cameraAltitude: number;
  selectedEntity: SelectedEntity | null;
  lastUpdated: Record<string, number>;
  fps: number;
  issLiveStream: boolean;
  filterParams: Record<string, number>;
  filterPresets: Record<string, Record<string, number>>;

  toggleLayer: (layer: string) => void;
  toggleOverlay: (overlay: string) => void;
  setActiveFilter: (filter: string | null) => void;
  setCameraTarget: (target: CameraTarget | null) => void;
  setDataCounts: (layer: string, count: number) => void;
  setMouseCoords: (coords: { lat: number; lng: number } | null) => void;
  setCameraAltitude: (alt: number) => void;
  setSelectedEntity: (entity: SelectedEntity | null) => void;
  setLastUpdated: (source: string, ts: number) => void;
  setFps: (fps: number) => void;
  setIssLiveStream: (show: boolean) => void;
  setFilterParam: (key: string, value: number) => void;
  saveFilterPreset: (name: string) => void;
  loadFilterPreset: (name: string) => void;
  deleteFilterPreset: (name: string) => void;
}

// localStorage에서 프리셋 로드
const loadPresetsFromStorage = (): Record<string, Record<string, number>> => {
  try {
    const stored = localStorage.getItem('geovision-filter-presets');
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
};

const savePresetsToStorage = (presets: Record<string, Record<string, number>>) => {
  try {
    localStorage.setItem('geovision-filter-presets', JSON.stringify(presets));
  } catch { /* ignore */ }
};

export const useAppStore = create<AppState>((set) => ({
  activeLayers: [],
  activeOverlays: [],
  activeFilter: null,
  cameraTarget: null,
  dataCounts: {},
  mouseCoords: null,
  cameraAltitude: 0,
  selectedEntity: null,
  lastUpdated: {},
  fps: 0,
  issLiveStream: false,
  filterParams: {
    flirContrast: 1.8,
    flirNoise: 0.03,
    animeEdge: 1.5,
    animePastel: 0.5,
    lutSaturation: 0.85,
    lutVignette: 1.2,
    lutContrast: 1.0,
  },
  filterPresets: loadPresetsFromStorage(),

  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: state.activeLayers.includes(layer)
        ? state.activeLayers.filter((l) => l !== layer)
        : [...state.activeLayers, layer],
    })),

  toggleOverlay: (overlay) =>
    set((state) => ({
      activeOverlays: state.activeOverlays.includes(overlay)
        ? state.activeOverlays.filter((o) => o !== overlay)
        : [...state.activeOverlays, overlay],
    })),

  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  setDataCounts: (layer, count) =>
    set((state) => ({
      dataCounts: { ...state.dataCounts, [layer]: count },
    })),
  setMouseCoords: (coords) => set({ mouseCoords: coords }),
  setCameraAltitude: (alt) => set({ cameraAltitude: alt }),
  setSelectedEntity: (entity) => set({ selectedEntity: entity }),
  setLastUpdated: (source, ts) =>
    set((state) => ({
      lastUpdated: { ...state.lastUpdated, [source]: ts },
    })),
  setFps: (fps) => set({ fps }),
  setIssLiveStream: (show) => set({ issLiveStream: show }),
  setFilterParam: (key, value) =>
    set((state) => ({
      filterParams: { ...state.filterParams, [key]: value },
    })),
  saveFilterPreset: (name) =>
    set((state) => {
      const newPresets = { ...state.filterPresets, [name]: { ...state.filterParams } };
      savePresetsToStorage(newPresets);
      return { filterPresets: newPresets };
    }),
  loadFilterPreset: (name) =>
    set((state) => {
      const preset = state.filterPresets[name];
      if (!preset) return {};
      return { filterParams: { ...state.filterParams, ...preset } };
    }),
  deleteFilterPreset: (name) =>
    set((state) => {
      const { [name]: _, ...rest } = state.filterPresets;
      savePresetsToStorage(rest);
      return { filterPresets: rest };
    }),
}));
