import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useAlertStore } from '@/store/useAlertStore';
import { playAlertSound } from '@/utils/alertSound';

/** 뮤트 상태를 항상 최신 값으로 읽는 헬퍼 */
function playSoundIfNotMuted(severity: 'critical' | 'warning' | 'info') {
  if (!useAlertStore.getState().muted) {
    playAlertSound(severity);
  }
}

/**
 * 알람 모니터 — 백그라운드에서 데이터를 감시하고 특이사항 발생 시 알람 생성
 */
export default function AlertMonitor() {
  const dataCounts = useAppStore((s) => s.dataCounts);
  const lastUpdated = useAppStore((s) => s.lastUpdated);
  const fps = useAppStore((s) => s.fps);
  const activeLayers = useAppStore((s) => s.activeLayers);
  const addAlert = useAlertStore((s) => s.addAlert);

  const prevCountsRef = useRef<Record<string, number>>({});
  const lastCheckRef = useRef(0);
  const simIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // 데이터 카운트 변화 감시
  useEffect(() => {
    const prev = prevCountsRef.current;
    const now = Date.now();

    if (now - lastCheckRef.current < 3000) return;
    lastCheckRef.current = now;

    if (prev.flights && dataCounts.flights) {
      const drop = (prev.flights - dataCounts.flights) / prev.flights;
      if (drop > 0.2 && prev.flights > 100) {
        addAlert({
          severity: 'warning',
          category: 'flight',
          title: 'ADS-B Feed Anomaly',
          message: `Aircraft count dropped ${Math.round(drop * 100)}%: ${prev.flights.toLocaleString()} → ${dataCounts.flights.toLocaleString()}. Possible radar/transponder issue.`,
        });
        playSoundIfNotMuted('warning');
      }
    }

    if (prev.ships && dataCounts.ships) {
      const drop = (prev.ships - dataCounts.ships) / prev.ships;
      if (drop > 0.3 && prev.ships > 50) {
        addAlert({
          severity: 'warning',
          category: 'ship',
          title: 'AIS Signal Loss',
          message: `Vessel count dropped ${Math.round(drop * 100)}%: ${prev.ships} → ${dataCounts.ships}. Possible dark zone.`,
        });
        playSoundIfNotMuted('warning');
      }
    }

    if (!prev.satellites && dataCounts.satellites && dataCounts.satellites > 0) {
      addAlert({
        severity: 'info',
        category: 'satellite',
        title: 'Satellite Feed Online',
        message: `CelesTrak TLE data loaded: ${dataCounts.satellites.toLocaleString()} objects tracked.`,
      });
      playSoundIfNotMuted('info');
    }

    prevCountsRef.current = { ...dataCounts };
  }, [dataCounts]);

  // FPS 감시
  useEffect(() => {
    if (fps > 0 && fps < 15) {
      addAlert({
        severity: 'warning',
        category: 'system',
        title: 'Performance Degradation',
        message: `Frame rate critical: ${fps} FPS. Consider disabling overlays.`,
      });
      playSoundIfNotMuted('warning');
    }
  }, [fps]);

  // 데이터 소스 연결 끊김 감시
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = Date.now();
      for (const [source, ts] of Object.entries(lastUpdated)) {
        if (!activeLayers.includes(source)) continue;
        const elapsed = now - ts;

        if (elapsed > 120000) {
          addAlert({
            severity: 'critical',
            category: 'system',
            title: `${source.toUpperCase()} Feed Lost`,
            message: `No data from ${source} for ${Math.round(elapsed / 60000)} minutes. Connection may be down.`,
          });
          playSoundIfNotMuted('critical');
        } else if (elapsed > 60000) {
          addAlert({
            severity: 'warning',
            category: 'system',
            title: `${source.toUpperCase()} Feed Delayed`,
            message: `${source} data is ${Math.round(elapsed / 1000)}s stale.`,
          });
          playSoundIfNotMuted('warning');
        }
      }
    }, 30000);

    return () => clearInterval(checkInterval);
  }, [lastUpdated, activeLayers]);

  // 시뮬레이션 알람
  useEffect(() => {
    const SCENARIOS = [
      {
        severity: 'critical' as const,
        category: 'earthquake' as const,
        title: 'Major Seismic Event',
        messages: [
          'M6.2 earthquake detected — 142km SW of Tonga. Tsunami watch issued.',
          'M6.8 earthquake detected — Northern Japan coast. Depth: 35km.',
          'M7.1 earthquake detected — Pacific Ring of Fire. Multiple aftershocks expected.',
        ],
      },
      {
        severity: 'warning' as const,
        category: 'earthquake' as const,
        title: 'Seismic Activity',
        messages: [
          'M5.3 earthquake — Indonesia region. Monitoring for aftershocks.',
          'M5.1 earthquake swarm detected — Reykjanes Peninsula, Iceland.',
          'M5.5 earthquake — Chile coast. No tsunami threat.',
        ],
      },
      {
        severity: 'critical' as const,
        category: 'flight' as const,
        title: 'Transponder Loss',
        messages: [
          'Aircraft KE901 transponder lost — last position 34.5°N, 128.9°E. SAR protocol initiated.',
          'SQUAWK 7700 emergency — UA442 declaring fuel emergency over Atlantic.',
        ],
      },
      {
        severity: 'warning' as const,
        category: 'ship' as const,
        title: 'Maritime Anomaly',
        messages: [
          'Tanker EVER FORTUNE dark since 2h — last seen Strait of Hormuz. Possible AIS manipulation.',
          'Unusual vessel congregation detected — 12 ships within 5nm, South China Sea.',
          'MAERSK OHIO speed anomaly: 28kt in restricted zone (max 12kt).',
        ],
      },
      {
        severity: 'warning' as const,
        category: 'chokepoint' as const,
        title: 'Chokepoint Alert',
        messages: [
          'Strait of Hormuz — traffic density 40% above normal. 3 military vessels detected.',
          'Suez Canal — vessel grounding reported. Northbound traffic delayed.',
          'Taiwan Strait — military exercise notification. Commercial rerouting advised.',
        ],
      },
      {
        severity: 'critical' as const,
        category: 'nuclear' as const,
        title: 'Nuclear Facility Alert',
        messages: [
          'Zaporizhzhia NPP — seismic activity detected within 50km radius. IAEA monitoring.',
          'Elevated radiation levels reported near decommissioned facility. Investigation underway.',
        ],
      },
      {
        severity: 'info' as const,
        category: 'satellite' as const,
        title: 'Space Situational Awareness',
        messages: [
          'ISS debris avoidance maneuver scheduled — T-45 minutes.',
          'Starlink deployment: 60 new satellites entering orbit. TLE update pending.',
          'GPS SVN-74 clock anomaly detected. Backup satellite activated.',
        ],
      },
      {
        severity: 'warning' as const,
        category: 'system' as const,
        title: 'Cyber Threat',
        messages: [
          'AIS spoofing detected — 5 phantom vessels near Gibraltar. GPS jamming suspected.',
          'Anomalous ADS-B signals — possible replay attack detected over Eastern Mediterranean.',
        ],
      },
    ];

    function scheduleNext() {
      const delay = 15000 + Math.random() * 25000;
      simIntervalRef.current = setTimeout(() => {
        const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
        const message = scenario.messages[Math.floor(Math.random() * scenario.messages.length)];

        addAlert({
          severity: scenario.severity,
          category: scenario.category,
          title: scenario.title,
          message,
        });

        playSoundIfNotMuted(scenario.severity);
        scheduleNext();
      }, delay);
    }

    scheduleNext();
    return () => { if (simIntervalRef.current) clearTimeout(simIntervalRef.current); };
  }, []);

  return null;
}
