/**
 * InfoWarfarePanel — 정보전 탐지 현황 패널
 * - 감지된 패턴 목록
 * - 임계값 슬라이더
 * - 패턴 유형별 아이콘
 */
import { useState } from 'react';
import { useInfoWarfareStore } from '@/store/useInfoWarfareStore';
import { infoWarfareDetector } from '@/correlation/InfoWarfareDetector';
import type { SpreadPattern } from '@/correlation/InfoWarfareDetector';

const PATTERN_ICONS: Record<SpreadPattern['patternType'], string> = {
  'simultaneous-multinode': '🔴',
  'velocity-spike':         '🟠',
  'reverse-propagation':    '🟣',
};

const PATTERN_LABELS: Record<SpreadPattern['patternType'], string> = {
  'simultaneous-multinode': '동시 다지점',
  'velocity-spike':         '속도 급등',
  'reverse-propagation':    '역방향 전파',
};

function timeAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  return `${Math.floor(d / 3600)}h`;
}

export default function InfoWarfarePanel() {
  const [open, setOpen] = useState(false);
  const patterns = useInfoWarfareStore((s) => s.patterns);
  const config = useInfoWarfareStore((s) => s.config);
  const updateConfig = useInfoWarfareStore((s) => s.updateConfig);
  const clearPatterns = useInfoWarfareStore((s) => s.clearPatterns);

  const recentPatterns = patterns.filter(
    (p) => Date.now() - p.detectedAt < 24 * 60 * 60 * 1000,
  );
  const criticalCount = recentPatterns.filter((p) => p.severity === 'critical').length;

  const handleSigmaChange = (v: number) => {
    updateConfig({ sigmaThreshold: v });
    infoWarfareDetector.updateConfig({ sigmaThreshold: v });
  };

  const handleToggle = (enabled: boolean) => {
    updateConfig({ enabled });
    infoWarfareDetector.updateConfig({ enabled });
  };

  return (
    <>
      {/* 배지 */}
      {recentPatterns.length > 0 && (
        <button
          onClick={() => setOpen((o) => !o)}
          className={`fixed bottom-[180px] right-4 z-50 flex items-center gap-1.5 px-2.5 py-1
            rounded font-mono text-xs backdrop-blur-sm transition-all border
            ${criticalCount > 0
              ? 'bg-red-900/80 border-red-500/60 text-red-300 animate-pulse'
              : 'bg-purple-900/70 border-purple-500/50 text-purple-300'
            }`}
        >
          <span>⚡</span>
          <span className="font-bold">{recentPatterns.length}</span>
          <span className="text-[9px] opacity-70">INFOWAR</span>
        </button>
      )}

      {/* 패널 */}
      {open && (
        <div
          className="fixed bottom-[218px] right-4 z-50 w-[380px] max-h-[480px]
            bg-black/90 border border-purple-500/40 rounded backdrop-blur-sm
            font-mono text-xs text-purple-100 flex flex-col overflow-hidden"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-purple-500/30 bg-purple-950/50">
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-bold">⚡ INFOWAR DETECTOR</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded ${
                  config.enabled
                    ? 'bg-green-900/60 text-green-400 border border-green-600/40'
                    : 'bg-gray-800 text-gray-500 border border-gray-600/40'
                }`}
              >
                {config.enabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleToggle(!config.enabled)}
                className="text-[9px] px-2 py-0.5 rounded bg-purple-900/60 border border-purple-600/40
                  hover:bg-purple-800/60 transition-colors"
              >
                {config.enabled ? 'OFF' : 'ON'}
              </button>
              <button
                onClick={() => { clearPatterns(); infoWarfareDetector.clear(); }}
                className="text-[9px] px-2 py-0.5 rounded bg-gray-800 border border-gray-600/40
                  hover:bg-gray-700 transition-colors"
              >
                CLEAR
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition-colors px-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 설정 슬라이더 */}
          <div className="px-3 py-2 border-b border-purple-500/20 bg-purple-950/30">
            <div className="flex items-center gap-3">
              <span className="text-purple-400 text-[10px] w-24 shrink-0">
                임계값 ({config.sigmaThreshold.toFixed(1)}σ)
              </span>
              <input
                type="range"
                min={1.0}
                max={4.0}
                step={0.1}
                value={config.sigmaThreshold}
                onChange={(e) => handleSigmaChange(parseFloat(e.target.value))}
                className="flex-1 accent-purple-500"
              />
              <div className="flex gap-1">
                {([1.5, 2.0, 3.0] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => handleSigmaChange(v)}
                    className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                      Math.abs(config.sigmaThreshold - v) < 0.05
                        ? 'bg-purple-700 border-purple-500 text-white'
                        : 'bg-gray-800 border-gray-600/40 text-gray-400 hover:border-purple-500/60'
                    }`}
                  >
                    {v}σ
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[9px] text-gray-500 mt-1">
              낮을수록 민감 (오탐 증가) · 높을수록 엄격 (탐지 감소)
            </p>
          </div>

          {/* 범례 */}
          <div className="flex gap-3 px-3 py-1.5 border-b border-purple-500/20 text-[9px] text-gray-400">
            <span>🔴 동시다지점</span>
            <span>🟠 속도급등</span>
            <span>🟣 역방향전파</span>
          </div>

          {/* 패턴 목록 */}
          <div className="flex-1 overflow-y-auto">
            {recentPatterns.length === 0 ? (
              <div className="px-3 py-6 text-center text-gray-600 text-[10px]">
                감지된 패턴 없음
              </div>
            ) : (
              recentPatterns.map((p) => (
                <PatternRow key={p.id} pattern={p} />
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PatternRow({ pattern }: { pattern: SpreadPattern }) {
  const [expanded, setExpanded] = useState(false);
  const icon = PATTERN_ICONS[pattern.patternType];
  const label = PATTERN_LABELS[pattern.patternType];
  const isCritical = pattern.severity === 'critical';

  return (
    <div
      className={`border-b cursor-pointer transition-colors ${
        isCritical
          ? 'border-red-900/40 hover:bg-red-950/30'
          : 'border-purple-900/30 hover:bg-purple-950/20'
      }`}
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <span className="text-sm mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                isCritical
                  ? 'bg-red-900/60 text-red-400 border border-red-600/40'
                  : 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40'
              }`}
            >
              {isCritical ? 'CRITICAL' : 'WARNING'}
            </span>
            <span className="text-[9px] text-gray-500">{label}</span>
            <span className="text-[9px] text-gray-600 ml-auto">{timeAgo(pattern.detectedAt)}</span>
          </div>
          <p
            className={`text-[10px] font-medium truncate ${
              isCritical ? 'text-red-300' : 'text-purple-200'
            }`}
          >
            {pattern.title}
          </p>
          {expanded && (
            <div className="mt-1.5 space-y-1">
              <p className="text-[9px] text-gray-400 leading-relaxed">{pattern.message}</p>
              <div className="flex gap-3 text-[9px] text-gray-500">
                <span>노드 {pattern.nodeCount}건</span>
                <span>{pattern.sigmaDeviation.toFixed(1)}σ</span>
                <span>{pattern.category}</span>
              </div>
              {pattern.suspiciousNodes.slice(0, 3).map((n, i) => (
                <div key={i} className="text-[9px] text-gray-600 truncate">
                  · {n.label}
                </div>
              ))}
              {pattern.suspiciousNodes.length > 3 && (
                <div className="text-[9px] text-gray-700">
                  외 {pattern.suspiciousNodes.length - 3}개 노드
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
