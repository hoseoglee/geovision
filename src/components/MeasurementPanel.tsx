import { useCallback } from 'react';
import {
  useMeasurementStore,
  formatDistance,
  formatArea,
} from '@/store/useMeasurementStore';
import type { MeasureMode, MeasureUnit, Measurement } from '@/store/useMeasurementStore';

const MODES: { value: Exclude<MeasureMode, null>; label: string; icon: string }[] = [
  { value: 'distance', label: 'Distance', icon: '📏' },
  { value: 'area', label: 'Area', icon: '⬡' },
  { value: 'rangeRing', label: 'Range Ring', icon: '◎' },
];

const UNITS: { value: MeasureUnit; label: string }[] = [
  { value: 'km', label: 'KM' },
  { value: 'nm', label: 'NM' },
  { value: 'mi', label: 'MI' },
];

function MeasureStatus() {
  const mode = useMeasurementStore((s) => s.mode);
  const points = useMeasurementStore((s) => s.points);
  const cancelMeasure = useMeasurementStore((s) => s.cancelMeasure);
  const finishMeasure = useMeasurementStore((s) => s.finishMeasure);
  if (!mode) return null;

  const canFinish =
    (mode === 'distance' && points.length >= 2) ||
    (mode === 'area' && points.length >= 3);

  const instructions: Record<string, string> = {
    distance: `Click points to measure. ${points.length} point${points.length !== 1 ? 's' : ''} placed.`,
    area: `Click vertices to draw polygon. ${points.length} point${points.length !== 1 ? 's' : ''} placed.`,
    rangeRing: 'Click a point to place range rings.',
  };

  return (
    <div className="mt-2 p-1.5 bg-yellow-950/30 border border-yellow-500/30 rounded text-[9px] font-mono">
      <div className="flex items-center justify-between gap-2">
        <span className="text-yellow-400 animate-pulse truncate">
          {instructions[mode]}
        </span>
        <div className="flex gap-1 shrink-0">
          {canFinish && (
            <button
              onClick={finishMeasure}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-green-500/40 text-green-400 hover:bg-green-900/30 transition-colors"
            >
              FINISH
            </button>
          )}
          <button
            onClick={cancelMeasure}
            className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-red-500/40 text-red-400 hover:bg-red-900/30 transition-colors"
          >
            CANCEL
          </button>
        </div>
      </div>
      <p className="text-zinc-600 text-[8px] mt-0.5">
        {mode === 'distance' ? 'Double-click or press FINISH to complete.' :
         mode === 'area' ? 'Min 3 points. Press FINISH to complete.' :
         'Single click to place.'}
      </p>
    </div>
  );
}

function MeasurementRow({ m }: { m: Measurement }) {
  const removeMeasurement = useMeasurementStore((s) => s.removeMeasurement);
  const unit = useMeasurementStore((s) => s.unit);

  const typeIcon = m.type === 'distance' ? '📏' : m.type === 'area' ? '⬡' : '◎';
  const resultText = m.type === 'distance'
    ? formatDistance(m.result, unit)
    : m.type === 'area'
    ? formatArea(m.result, unit)
    : 'Range Ring';

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(resultText).catch(() => {});
  }, [resultText]);

  return (
    <div className="flex items-center gap-1.5 py-1 group">
      <span className="text-[10px] shrink-0">{typeIcon}</span>
      <span className="text-zinc-300 text-[10px] font-mono flex-1 truncate">{resultText}</span>
      {m.segments && m.segments.length > 1 && (
        <span className="text-zinc-600 text-[8px] font-mono shrink-0">
          {m.segments.length} seg
        </span>
      )}
      <button
        onClick={handleCopy}
        className="text-zinc-600 hover:text-cyan-400 text-[9px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy to clipboard"
      >
        ⎘
      </button>
      <button
        onClick={() => removeMeasurement(m.id)}
        className="text-zinc-600 hover:text-red-400 text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}

export function MeasurementControls() {
  const mode = useMeasurementStore((s) => s.mode);
  const unit = useMeasurementStore((s) => s.unit);
  const measurements = useMeasurementStore((s) => s.measurements);
  const toggleMode = useMeasurementStore((s) => s.toggleMode);
  const setUnit = useMeasurementStore((s) => s.setUnit);
  const clearAll = useMeasurementStore((s) => s.clearAll);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-zinc-400 text-[10px] font-bold tracking-widest">MEASUREMENT</h3>
        {measurements.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="bg-zinc-700/60 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded-full font-mono">
              {measurements.length}
            </span>
            <button
              onClick={clearAll}
              className="text-zinc-600 hover:text-red-400 text-[9px] font-mono transition-colors"
              title="Clear all"
            >
              CLEAR
            </button>
          </div>
        )}
      </div>

      {/* 모드 버튼 */}
      <div className="flex gap-1.5 mb-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => toggleMode(m.value)}
            className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
              mode === m.value
                ? 'border-yellow-500/60 text-yellow-400 bg-yellow-900/20'
                : 'border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* 단위 선택 */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-zinc-600 text-[9px] font-mono">UNIT:</span>
        {UNITS.map((u) => (
          <button
            key={u.value}
            onClick={() => setUnit(u.value)}
            className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
              unit === u.value
                ? 'border-cyan-500/50 text-cyan-400 bg-cyan-900/20'
                : 'border-zinc-700/40 text-zinc-600 hover:text-zinc-400'
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>

      <MeasureStatus />

      {/* 측정 결과 목록 */}
      {measurements.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {measurements.map((m) => (
            <MeasurementRow key={m.id} m={m} />
          ))}
        </div>
      )}

      {measurements.length === 0 && !mode && (
        <p className="text-zinc-600 text-[8px] font-mono mt-1">
          Select a tool to start measuring. [M] to toggle.
        </p>
      )}
    </div>
  );
}

export default MeasurementControls;
