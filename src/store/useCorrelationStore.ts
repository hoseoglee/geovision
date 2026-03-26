import { create } from 'zustand';
import { CorrelationEngine } from '@/correlation/engine';
import type { CorrelationAlert } from '@/correlation/rules';
import type { RuleDSL } from '@/correlation/ruleDSL';
import { ruleStorage } from '@/correlation/ruleStorage';
import { persistCorrelation } from './useEventStore';

interface CorrelationState {
  correlations: CorrelationAlert[]; engine: CorrelationEngine | null; isRunning: boolean; dslRules: RuleDSL[];
  addCorrelation: (alert: CorrelationAlert) => void; startEngine: () => void; stopEngine: () => void;
  clearCorrelations: () => void; getEngine: () => CorrelationEngine; refreshRules: () => void;
  addRule: (rule: RuleDSL) => void; removeRule: (id: string) => void; toggleRule: (id: string, enabled: boolean) => void;
  duplicateRule: (rule: RuleDSL) => void; importRules: (rules: RuleDSL[]) => void; exportRules: () => void;
}

export const useCorrelationStore = create<CorrelationState>((set, get) => ({
  correlations: [], engine: null, isRunning: false, dslRules: [],
  addCorrelation: (alert) => set((state) => {
    const recent = state.correlations.find((c) => c.ruleId === alert.ruleId && Date.now() - c.timestamp < 30000 && Math.abs(c.lat - alert.lat) < 0.5 && Math.abs(c.lng - alert.lng) < 0.5);
    if (recent) return state;
    persistCorrelation(alert);
    return { correlations: [alert, ...state.correlations].slice(0, 100) };
  }),
  startEngine: () => {
    const existing = get().engine; if (existing?.isRunning) return;
    const engine = existing ?? new CorrelationEngine();
    engine.setOnCorrelation((alert) => get().addCorrelation(alert));
    engine.start(); set({ engine, isRunning: true, dslRules: engine.getDSLRules() });
  },
  stopEngine: () => { const e = get().engine; if (e) e.stop(); set({ isRunning: false }); },
  clearCorrelations: () => set({ correlations: [] }),
  getEngine: () => { let e = get().engine; if (!e) { e = new CorrelationEngine(); set({ engine: e, dslRules: e.getDSLRules() }); } return e; },
  refreshRules: () => { const e = get().engine; if (e) set({ dslRules: e.getDSLRules() }); },
  addRule: (rule) => { const e = get().getEngine(); e.addRule(rule); set({ dslRules: e.getDSLRules() }); },
  removeRule: (id) => { const e = get().getEngine(); e.removeRule(id); set({ dslRules: e.getDSLRules() }); },
  toggleRule: (id, enabled) => { const e = get().getEngine(); e.toggleRule(id, enabled); set({ dslRules: e.getDSLRules() }); },
  duplicateRule: (rule) => {
    const nr: RuleDSL = { ...structuredClone(rule), id: `${rule.id}-copy-${Date.now().toString(36)}`, name: `${rule.name} (Copy)`, isBuiltin: false, triggerCount: 0, lastTriggered: null, createdAt: Date.now(), updatedAt: Date.now() };
    const e = get().getEngine(); e.addRule(nr); set({ dslRules: e.getDSLRules() });
  },
  importRules: (rules) => {
    const result = ruleStorage.importRules(JSON.stringify(rules));
    if (result.errors.length) console.warn('Import errors:', result.errors);
    const e = get().getEngine(); for (const r of result.rules) e.addRule(r); set({ dslRules: e.getDSLRules() });
  },
  exportRules: () => {
    const json = ruleStorage.exportRules(get().dslRules);
    const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `geovision-rules-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
  },
}));
