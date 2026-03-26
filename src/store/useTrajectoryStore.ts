import { create } from "zustand";

interface TrajectoryState {
  activeTrajectories: string[];
  showPrediction: boolean;
  predictionMinutes: number;
  historyMinutes: number;
  maxTrajectories: number;

  toggleTrajectory: (entityId: string) => void;
  enableTrajectory: (entityId: string) => void;
  disableTrajectory: (entityId: string) => void;
  clearAllTrajectories: () => void;
  setShowPrediction: (show: boolean) => void;
  setPredictionMinutes: (min: number) => void;
  setHistoryMinutes: (min: number) => void;
  isTrajectoryActive: (entityId: string) => boolean;
}

export const useTrajectoryStore = create<TrajectoryState>((set, get) => ({
  activeTrajectories: [],
  showPrediction: true,
  predictionMinutes: 30,
  historyMinutes: 120,
  maxTrajectories: 10,

  toggleTrajectory: (entityId) =>
    set((state) => {
      if (state.activeTrajectories.includes(entityId)) {
        return { activeTrajectories: state.activeTrajectories.filter((id) => id !== entityId) };
      }
      const next = [...state.activeTrajectories, entityId];
      // Evict oldest if over limit
      if (next.length > state.maxTrajectories) next.shift();
      return { activeTrajectories: next };
    }),

  enableTrajectory: (entityId) =>
    set((state) => {
      if (state.activeTrajectories.includes(entityId)) return state;
      const next = [...state.activeTrajectories, entityId];
      if (next.length > state.maxTrajectories) next.shift();
      return { activeTrajectories: next };
    }),

  disableTrajectory: (entityId) =>
    set((state) => ({
      activeTrajectories: state.activeTrajectories.filter((id) => id !== entityId),
    })),

  clearAllTrajectories: () => set({ activeTrajectories: [] }),

  setShowPrediction: (show) => set({ showPrediction: show }),
  setPredictionMinutes: (min) => set({ predictionMinutes: min }),
  setHistoryMinutes: (min) => set({ historyMinutes: min }),

  isTrajectoryActive: (entityId) => get().activeTrajectories.includes(entityId),
}));
