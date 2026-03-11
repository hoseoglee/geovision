/**
 * 시간 윈도우 이벤트 버퍼
 * - 최근 5분간의 이벤트 저장
 * - 자동 정리 (5분 초과 이벤트 제거)
 */

export interface TemporalEvent {
  id: string;
  type: string;
  layer: string;
  lat: number;
  lng: number;
  timestamp: number;
  data: Record<string, unknown>;
}

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5분

export class TemporalBuffer {
  private events: TemporalEvent[] = [];
  private maxAgeMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxAgeMs = DEFAULT_MAX_AGE_MS) {
    this.maxAgeMs = maxAgeMs;
    // 30초마다 자동 정리
    this.cleanupTimer = setInterval(() => this.cleanup(), 30000);
  }

  /** 이벤트 추가 */
  addEvent(event: TemporalEvent): void {
    this.events.push(event);
    // 버퍼 크기 제한 (최대 10000개)
    if (this.events.length > 10000) {
      this.events = this.events.slice(-5000);
    }
  }

  /** 시간 창 내 이벤트 조회 (기본: 전체 버퍼) */
  getEvents(timeWindowMs?: number): TemporalEvent[] {
    const cutoff = Date.now() - (timeWindowMs ?? this.maxAgeMs);
    return this.events.filter((e) => e.timestamp >= cutoff);
  }

  /** 특정 타입의 이벤트만 조회 */
  getEventsByType(type: string, timeWindowMs?: number): TemporalEvent[] {
    const cutoff = Date.now() - (timeWindowMs ?? this.maxAgeMs);
    return this.events.filter((e) => e.type === type && e.timestamp >= cutoff);
  }

  /** 만료 이벤트 정리 */
  cleanup(): void {
    const cutoff = Date.now() - this.maxAgeMs;
    this.events = this.events.filter((e) => e.timestamp >= cutoff);
  }

  /** 이벤트 수 */
  get size(): number {
    return this.events.length;
  }

  /** 버퍼 비우기 */
  clear(): void {
    this.events = [];
  }

  /** 타이머 정리 */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.events = [];
  }
}
