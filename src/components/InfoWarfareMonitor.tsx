/**
 * InfoWarfareMonitor — 헤드리스 컴포넌트
 * OSINT 데이터를 주기적으로 가져와 InfoWarfareDetector에 공급한다.
 * 감지된 패턴을 useInfoWarfareStore와 useAlertStore에 동시에 기록한다.
 */
import { useEffect, useRef } from 'react';
import { fetchOsint } from '@/providers/OsintProvider';
import { infoWarfareDetector } from '@/correlation/InfoWarfareDetector';
import { useInfoWarfareStore } from '@/store/useInfoWarfareStore';
import { useAlertStore } from '@/store/useAlertStore';

const POLL_INTERVAL = 15 * 60 * 1000; // 15분 (OSINT 캐시 TTL=15min에 맞춤)

export default function InfoWarfareMonitor() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function run() {
      try {
        const items = await fetchOsint();
        // 설정 동기화
        const config = useInfoWarfareStore.getState().config;
        infoWarfareDetector.updateConfig(config);

        const newPatterns = infoWarfareDetector.analyze(items);
        if (newPatterns.length === 0) return;

        // Store에 저장
        useInfoWarfareStore.getState().addPatterns(newPatterns);

        // AlertStore로 알림 발생
        for (const p of newPatterns) {
          useAlertStore.getState().addAlert({
            severity: p.severity,
            category: 'information-warfare',
            title: p.title,
            message: p.message,
            lat: p.suspiciousNodes[0]?.lat,
            lng: p.suspiciousNodes[0]?.lng,
          });
        }
      } catch (e) {
        console.warn('[InfoWarfare] 분석 실패:', e);
      }
    }

    run();
    timerRef.current = setInterval(run, POLL_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return null;
}
