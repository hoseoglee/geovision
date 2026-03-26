import { create } from 'zustand';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory =
  | 'earthquake' | 'flight' | 'ship' | 'satellite'
  | 'chokepoint' | 'system' | 'nuclear' | 'geofence';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  timestamp: number;
  lat?: number;
  lng?: number;
  acknowledged: boolean;
}

interface AlertState {
  alerts: Alert[];
  muted: boolean;
  unacknowledgedCount: number;

  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => void;
  acknowledgeAlert: (id: string) => void;
  acknowledgeAll: () => void;
  clearOld: () => void;
  toggleMute: () => void;
}

let alertCounter = 0;

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  muted: true,
  unacknowledgedCount: 0,

  addAlert: (alert) => {
    const id = `alert-${++alertCounter}-${Date.now()}`;
    const newAlert: Alert = {
      ...alert,
      id,
      timestamp: Date.now(),
      acknowledged: false,
    };
    set((state) => {
      // 중복 방지: 같은 title이 30초 내에 있으면 무시
      const recent = state.alerts.find(
        (a) => a.title === alert.title && Date.now() - a.timestamp < 30000
      );
      if (recent) return state;

      const alerts = [newAlert, ...state.alerts].slice(0, 50); // 최대 50개
      return {
        alerts,
        unacknowledgedCount: alerts.filter((a) => !a.acknowledged).length,
      };
    });
  },

  acknowledgeAlert: (id) =>
    set((state) => {
      const alerts = state.alerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a
      );
      return {
        alerts,
        unacknowledgedCount: alerts.filter((a) => !a.acknowledged).length,
      };
    }),

  acknowledgeAll: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, acknowledged: true })),
      unacknowledgedCount: 0,
    })),

  clearOld: () =>
    set((state) => ({
      alerts: state.alerts.filter((a) => Date.now() - a.timestamp < 600000), // 10분
    })),

  toggleMute: () => set((state) => ({ muted: !state.muted })),
}));
