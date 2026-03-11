import { create } from 'zustand';
import { CorrelationEngine } from '@/correlation/engine';
import type { CorrelationAlert } from '@/correlation/rules';

interface CorrelationState {
  correlations: CorrelationAlert[];
  engine: CorrelationEngine | null;
  isRunning: boolean;

  addCorrelation: (alert: CorrelationAlert) => void;
  startEngine: () => void;
  stopEngine: () => void;
  clearCorrelations: () => void;
  getEngine: () => CorrelationEngine;
}

export const useCorrelationStore = create<CorrelationState>((set, get) => ({
  correlations: [],
  engine: null,
  isRunning: false,

  addCorrelation: (alert) =>
    set((state) => {
      // 중복 방지: 같은 ruleId + 비슷한 좌표가 30초 내에 있으면 무시
      const recent = state.correlations.find(
        (c) =>
          c.ruleId === alert.ruleId &&
          Date.now() - c.timestamp < 30000 &&
          Math.abs(c.lat - alert.lat) < 0.5 &&
          Math.abs(c.lng - alert.lng) < 0.5,
      );
      if (recent) return state;

      const correlations = [alert, ...state.correlations].slice(0, 100);
      return { correlations };
    }),

  startEngine: () => {
    const existing = get().engine;
    if (existing?.isRunning) return;

    const engine = existing ?? new CorrelationEngine();
    engine.setOnCorrelation((alert) => {
      get().addCorrelation(alert);
    });
    engine.start();
    set({ engine, isRunning: true });
  },

  stopEngine: () => {
    const engine = get().engine;
    if (engine) {
      engine.stop();
    }
    set({ isRunning: false });
  },

  clearCorrelations: () => set({ correlations: [] }),

  getEngine: () => {
    return get().engine;
  },
}));
