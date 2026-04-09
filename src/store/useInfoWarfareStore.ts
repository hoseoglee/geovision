import { create } from 'zustand';
import type { SpreadPattern, InfoWarfareConfig } from '@/correlation/InfoWarfareDetector';
import { DEFAULT_IW_CONFIG } from '@/correlation/InfoWarfareDetector';

interface InfoWarfareState {
  patterns: SpreadPattern[];
  config: InfoWarfareConfig;
  addPatterns: (patterns: SpreadPattern[]) => void;
  updateConfig: (patch: Partial<InfoWarfareConfig>) => void;
  clearPatterns: () => void;
}

const PATTERN_TTL = 24 * 60 * 60 * 1000; // 24시간

export const useInfoWarfareStore = create<InfoWarfareState>((set) => ({
  patterns: [],
  config: { ...DEFAULT_IW_CONFIG },

  addPatterns: (incoming) =>
    set((state) => {
      const now = Date.now();
      const existing = state.patterns.filter((p) => now - p.detectedAt < PATTERN_TTL);
      const existingIds = new Set(existing.map((p) => p.id));
      const fresh = incoming.filter((p) => !existingIds.has(p.id));
      return { patterns: [...fresh, ...existing].slice(0, 100) };
    }),

  updateConfig: (patch) =>
    set((state) => ({ config: { ...state.config, ...patch } })),

  clearPatterns: () => set({ patterns: [] }),
}));
