/** Web Audio API 기반 알람 사운드 — 외부 파일 불필요 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** CRITICAL 알람 — 긴급 경고음 (삐삐삐) */
export function playCriticalAlarm() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, now + i * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.15);

    osc.start(now + i * 0.2);
    osc.stop(now + i * 0.2 + 0.15);
  }
}

/** WARNING 알람 — 경고 톤 (두 번 비프) */
export function playWarningBeep() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.1, now + i * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.25 + 0.2);

    osc.start(now + i * 0.25);
    osc.stop(now + i * 0.25 + 0.2);
  }
}

/** INFO 알림 — 부드러운 차임 */
export function playInfoChime() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, now);
  osc.frequency.setValueAtTime(659, now + 0.1);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.start(now);
  osc.stop(now + 0.3);
}

/** 심각도에 따른 사운드 재생 */
export function playAlertSound(severity: 'critical' | 'warning' | 'info') {
  switch (severity) {
    case 'critical': return playCriticalAlarm();
    case 'warning': return playWarningBeep();
    case 'info': return playInfoChime();
  }
}
