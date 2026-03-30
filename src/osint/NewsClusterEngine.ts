import type { OsintData } from '@/providers/OsintProvider';

export interface NewsArc {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  /** Event at destination */
  eventId: string;
  /** Timestamp of destination event */
  timestamp: number;
}

export interface NewsCluster {
  id: string;
  label: string;
  category: string;
  keywords: string[];
  events: OsintData[];    // sorted by time ascending
  arcs: NewsArc[];        // spread arcs from origin
  startTime: number;
  endTime: number;
  originLat: number;
  originLng: number;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'has', 'have', 'had', 'will', 'would', 'could', 'should', 'may', 'can',
  'its', 'it', 'this', 'that', 'over', 'after', 'before', 'amid', 'into',
  'more', 'new', 'says', 'said', 'amid', 'his', 'her', 'their',
]);

const MIN_WORD_LEN = 4;

/** Extract significant keywords from a news title */
function extractKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= MIN_WORD_LEN && !STOPWORDS.has(w));
}

/** Count shared keywords between two sets */
function sharedKeywordCount(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((w) => setB.has(w)).length;
}

const WINDOW_72H = 72 * 60 * 60 * 1000;
const MIN_SHARED_KEYWORDS = 1;
const MIN_CLUSTER_SIZE = 2;

/**
 * Cluster OSINT events by category + shared keywords + 72h window.
 * Returns clusters sorted by event count descending.
 */
export function clusterNewsEvents(events: OsintData[]): NewsCluster[] {
  // Sort by time ascending
  const sorted = [...events].sort((a, b) => a.time - b.time);

  // Union-Find for clustering
  const parent = new Array<number>(sorted.length).fill(0).map((_, i) => i);
  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }
  function union(i: number, j: number) {
    parent[find(i)] = find(j);
  }

  // Pre-compute keywords
  const keywords = sorted.map((e) => extractKeywords(e.title));

  // Connect events that share keywords + same category + within 72h
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].time - sorted[i].time > WINDOW_72H) break;
      if (sorted[i].category !== sorted[j].category) continue;
      if (sharedKeywordCount(keywords[i], keywords[j]) >= MIN_SHARED_KEYWORDS) {
        union(i, j);
      }
    }
  }

  // Group by root
  const groupMap = new Map<number, number[]>();
  for (let i = 0; i < sorted.length; i++) {
    const root = find(i);
    if (!groupMap.has(root)) groupMap.set(root, []);
    groupMap.get(root)!.push(i);
  }

  const clusters: NewsCluster[] = [];

  for (const [, indices] of groupMap) {
    if (indices.length < MIN_CLUSTER_SIZE) continue;

    const clusterEvents = indices.map((i) => sorted[i]);
    // Already sorted by time (indices from sorted array)
    clusterEvents.sort((a, b) => a.time - b.time);

    const origin = clusterEvents[0];

    // Collect arcs: from origin (or nearest prior) to each subsequent event
    const arcs: NewsArc[] = [];
    for (let k = 1; k < clusterEvents.length; k++) {
      const ev = clusterEvents[k];
      // Skip if same coordinates as origin (would be a zero-length arc)
      if (Math.abs(ev.lat - origin.lat) < 0.01 && Math.abs(ev.lng - origin.lng) < 0.01) continue;
      arcs.push({
        fromLat: origin.lat,
        fromLng: origin.lng,
        toLat: ev.lat,
        toLng: ev.lng,
        eventId: ev.id,
        timestamp: ev.time,
      });
    }

    if (arcs.length === 0) continue;

    // Determine cluster label from top keywords
    const allKeywords = clusterEvents.flatMap((e) => extractKeywords(e.title));
    const freq = new Map<string, number>();
    for (const w of allKeywords) freq.set(w, (freq.get(w) ?? 0) + 1);
    const topKeywords = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w]) => w);

    const label = topKeywords.slice(0, 2).join(' + ') || clusterEvents[0].title.slice(0, 40);

    clusters.push({
      id: `cluster-${origin.id}`,
      label,
      category: origin.category,
      keywords: topKeywords,
      events: clusterEvents,
      arcs,
      startTime: clusterEvents[0].time,
      endTime: clusterEvents[clusterEvents.length - 1].time,
      originLat: origin.lat,
      originLng: origin.lng,
    });
  }

  // Sort by size descending
  clusters.sort((a, b) => b.events.length - a.events.length);
  return clusters;
}

/**
 * Get arcs and events visible up to currentTime for a cluster.
 */
export function getVisibleClusterState(
  cluster: NewsCluster,
  currentTime: number
): {
  visibleEvents: OsintData[];
  visibleArcs: NewsArc[];
} {
  const visibleEvents = cluster.events.filter((e) => e.time <= currentTime);
  const visibleArcs = cluster.arcs.filter((a) => a.timestamp <= currentTime);
  return { visibleEvents, visibleArcs };
}
