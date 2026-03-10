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
}

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
}));
