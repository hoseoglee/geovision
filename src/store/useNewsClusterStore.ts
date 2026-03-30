import { create } from 'zustand';
import type { NewsCluster } from '@/osint/NewsClusterEngine';

export type ClusterSpeed = 1 | 2 | 4 | 8;

interface NewsClusterState {
  /** All computed clusters */
  clusters: NewsCluster[];
  /** Currently selected cluster for timelapse */
  selectedClusterId: string | null;
  /** Timelapse panel visibility */
  panelVisible: boolean;

  /** Playback state */
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: ClusterSpeed;

  /** Actions */
  setClusters: (clusters: NewsCluster[]) => void;
  selectCluster: (id: string | null) => void;
  togglePanel: () => void;
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  setSpeed: (s: ClusterSpeed) => void;
  tick: () => void;
  resetPlayback: (cluster: NewsCluster) => void;
}

export const useNewsClusterStore = create<NewsClusterState>((set, get) => ({
  clusters: [],
  selectedClusterId: null,
  panelVisible: false,
  isPlaying: false,
  currentTime: 0,
  playbackSpeed: 1,

  setClusters: (clusters) => set({ clusters }),

  selectCluster: (id) => {
    const { clusters } = get();
    const cluster = clusters.find((c) => c.id === id) ?? null;
    if (cluster) {
      set({
        selectedClusterId: id,
        currentTime: cluster.startTime,
        isPlaying: false,
      });
    } else {
      set({ selectedClusterId: null, isPlaying: false });
    }
  },

  togglePanel: () => set((s) => ({ panelVisible: !s.panelVisible })),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  seek: (t) => {
    const { clusters, selectedClusterId } = get();
    const cluster = clusters.find((c) => c.id === selectedClusterId);
    if (!cluster) return;
    const clamped = Math.max(cluster.startTime, Math.min(cluster.endTime, t));
    set({ currentTime: clamped, isPlaying: false });
  },

  setSpeed: (s) => set({ playbackSpeed: s }),

  tick: () => {
    const { isPlaying, currentTime, playbackSpeed, clusters, selectedClusterId } = get();
    if (!isPlaying) return;
    const cluster = clusters.find((c) => c.id === selectedClusterId);
    if (!cluster) return;

    // Each tick = playbackSpeed * 10 minutes of real time
    const advance = playbackSpeed * 10 * 60 * 1000;
    const next = currentTime + advance;

    if (next >= cluster.endTime) {
      set({ currentTime: cluster.endTime, isPlaying: false });
    } else {
      set({ currentTime: next });
    }
  },

  resetPlayback: (cluster) => {
    set({
      selectedClusterId: cluster.id,
      currentTime: cluster.startTime,
      isPlaying: false,
    });
  },
}));
