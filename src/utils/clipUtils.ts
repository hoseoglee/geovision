/**
 * GEO-003: Playback Clip Encoding / Decoding
 * 타임라인 구간을 URL 파라미터로 직렬화하여 공유 가능한 링크를 생성한다.
 */

import type { TimelineEvent } from '@/store/useTimelineStore';

export interface ClipPayload {
  v: 1;
  s: number;     // rangeStart (ms)
  e: number;     // rangeEnd (ms)
  t: number;     // seekTo position (ms)
  ev: ClipEvent[];
}

interface ClipEvent {
  id: string;
  ts: number;
  sv: 'c' | 'w' | 'i';   // critical | warning | info
  ti: string;
  m?: string;
  la?: number;
  ln?: number;
  sr: 'a' | 'c';          // alert | correlation
  ri?: string;
}

const SEV_MAP: Record<string, 'c' | 'w' | 'i'> = { critical: 'c', warning: 'w', info: 'i' };
const SEV_RMAP: Record<string, 'critical' | 'warning' | 'info'> = { c: 'critical', w: 'warning', i: 'info' };
const SRC_MAP: Record<string, 'a' | 'c'> = { alert: 'a', correlation: 'c' };
const SRC_RMAP: Record<string, 'alert' | 'correlation'> = { a: 'alert', c: 'correlation' };

const MAX_EVENTS = 150;

/** 구간 내 이벤트를 severity 우선순위로 최대 150개 선택 */
function selectTopEvents(events: TimelineEvent[], rangeStart: number, rangeEnd: number): TimelineEvent[] {
  const inRange = events.filter(e => e.timestamp >= rangeStart && e.timestamp <= rangeEnd);
  if (inRange.length <= MAX_EVENTS) return inRange;

  const rank: Record<string, number> = { critical: 3, warning: 2, info: 1 };
  return [...inRange]
    .sort((a, b) => rank[b.severity] - rank[a.severity] || a.timestamp - b.timestamp)
    .slice(0, MAX_EVENTS);
}

function toBase64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (padded.length % 4)) % 4;
  return atob(padded + '='.repeat(pad));
}

/** 이벤트 배열 + 범위를 URL 안전 base64 문자열로 인코딩 */
export async function encodeClip(
  events: TimelineEvent[],
  rangeStart: number,
  rangeEnd: number,
  seekTo: number,
): Promise<string> {
  const selected = selectTopEvents(events, rangeStart, rangeEnd);

  const payload: ClipPayload = {
    v: 1,
    s: rangeStart,
    e: rangeEnd,
    t: seekTo,
    ev: selected.map(e => {
      const ce: ClipEvent = {
        id: e.id,
        ts: e.timestamp,
        sv: SEV_MAP[e.severity] ?? 'i',
        ti: e.title,
        sr: SRC_MAP[e.source] ?? 'a',
      };
      if (e.message) ce.m = e.message;
      if (e.lat != null) ce.la = Math.round(e.lat * 1e4) / 1e4;
      if (e.lng != null) ce.ln = Math.round(e.lng * 1e4) / 1e4;
      if (e.ruleId) ce.ri = e.ruleId;
      return ce;
    }),
  };

  const json = JSON.stringify(payload);

  // gzip 압축 시도 (CompressionStream — Chrome/Firefox/Safari 지원)
  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      const encoder = new TextEncoder();
      writer.write(encoder.encode(json));
      writer.close();

      const chunks: Uint8Array[] = [];
      const reader = cs.readable.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const total = chunks.reduce((acc, c) => acc + c.length, 0);
      const buf = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { buf.set(c, off); off += c.length; }

      const binStr = Array.from(buf, b => String.fromCharCode(b)).join('');
      return 'gz:' + toBase64url(binStr);
    } catch {
      // gzip 실패 시 폴백
    }
  }

  // 폴백: 평문 JSON base64
  return 'j:' + toBase64url(json);
}

/** URL 파라미터에서 ClipPayload 복원 */
export async function decodeClip(encoded: string): Promise<ClipPayload | null> {
  try {
    if (encoded.startsWith('gz:')) {
      const binStr = fromBase64url(encoded.slice(3));
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

      if (typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        writer.write(bytes);
        writer.close();

        const chunks: Uint8Array[] = [];
        const reader = ds.readable.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const total = chunks.reduce((acc, c) => acc + c.length, 0);
        const buf = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { buf.set(c, off); off += c.length; }

        const json = new TextDecoder().decode(buf);
        const payload = JSON.parse(json) as ClipPayload;
        if (payload.v !== 1) return null;
        return payload;
      }
    }

    if (encoded.startsWith('j:')) {
      const json = fromBase64url(encoded.slice(2));
      const payload = JSON.parse(json) as ClipPayload;
      if (payload.v !== 1) return null;
      return payload;
    }

    return null;
  } catch {
    return null;
  }
}

/** ClipPayload의 압축 이벤트를 TimelineEvent[] 로 복원 */
export function clipPayloadToEvents(payload: ClipPayload): TimelineEvent[] {
  return payload.ev.map(ce => ({
    id: ce.id,
    timestamp: ce.ts,
    severity: SEV_RMAP[ce.sv] ?? 'info',
    title: ce.ti,
    message: ce.m ?? '',
    lat: ce.la,
    lng: ce.ln,
    source: SRC_RMAP[ce.sr] ?? 'alert',
    ruleId: ce.ri,
  }));
}
