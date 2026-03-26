import { useState, useEffect } from 'react';
import { AVAILABLE_LAYERS, validateRuleDSL, type RuleDSL, type RuleDSLConditionFilter } from '@/correlation/ruleDSL';
import type { AlertSeverity } from '@/store/useAlertStore';

interface RuleBuilderProps { rule?: RuleDSL; onSave: (rule: RuleDSL) => void; onCancel: () => void; }

const OPERATORS: RuleDSLConditionFilter['operator'][] = ['>=', '<=', '>', '<', '==', '!=', 'contains'];
const SEVERITIES: AlertSeverity[] = ['critical', 'warning', 'info'];

function toId(name: string): string { return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function parseVal(raw: string): number | string | boolean {
  if (raw === 'true') return true; if (raw === 'false') return false;
  const n = parseFloat(raw); if (!Number.isNaN(n) && String(n) === raw) return n; return raw;
}

export default function RuleBuilder({ rule, onSave, onCancel }: RuleBuilderProps) {
  const isEdit = !!rule;
  const [name, setName] = useState(rule?.name ?? '');
  const [description, setDescription] = useState(rule?.description ?? '');
  const [severity, setSeverity] = useState<AlertSeverity>(rule?.severity ?? 'warning');
  const [triggerLayer, setTriggerLayer] = useState(rule?.triggerLayer ?? AVAILABLE_LAYERS[0].id);
  const [targetLayer, setTargetLayer] = useState(rule?.targetLayer ?? AVAILABLE_LAYERS[0].id);
  const [spatialRadius, setSpatialRadius] = useState(rule?.spatialRadius ?? 100);
  const [cooldown, setCooldown] = useState(rule?.cooldown ?? 60);
  const [minTargetCount, setMinTargetCount] = useState(rule?.conditions?.minTargetCount ?? 1);
  const [triggerEnabled, setTriggerEnabled] = useState(!!rule?.conditions?.triggerFilter);
  const [triggerField, setTriggerField] = useState(rule?.conditions?.triggerFilter?.field ?? '');
  const [triggerOp, setTriggerOp] = useState<RuleDSLConditionFilter['operator']>(rule?.conditions?.triggerFilter?.operator ?? '>=');
  const [triggerValue, setTriggerValue] = useState(rule?.conditions?.triggerFilter?.value?.toString() ?? '');
  const [targetEnabled, setTargetEnabled] = useState(!!rule?.conditions?.targetFilter);
  const [targetField, setTargetField] = useState(rule?.conditions?.targetFilter?.field ?? '');
  const [targetOp, setTargetOp] = useState<RuleDSLConditionFilter['operator']>(rule?.conditions?.targetFilter?.operator ?? '==');
  const [targetValue, setTargetValue] = useState(rule?.conditions?.targetFilter?.value?.toString() ?? '');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onCancel]);

  function handleSave() {
    const id = isEdit ? rule!.id : toId(name);
    const tf: RuleDSLConditionFilter | undefined = triggerEnabled && triggerField.trim() ? { field: triggerField.trim(), operator: triggerOp, value: parseVal(triggerValue) } : undefined;
    const ttf: RuleDSLConditionFilter | undefined = targetEnabled && targetField.trim() ? { field: targetField.trim(), operator: targetOp, value: parseVal(targetValue) } : undefined;
    const dsl: RuleDSL = { id, name: name.trim(), description: description.trim(), enabled: rule?.enabled ?? true, severity, triggerLayer, targetLayer, spatialRadius, temporalWindow: rule?.temporalWindow ?? 300, cooldown, conditions: { triggerFilter: tf, targetFilter: ttf, minTargetCount }, triggerCount: rule?.triggerCount ?? 0, lastTriggered: rule?.lastTriggered ?? null, createdAt: rule?.createdAt ?? Date.now(), updatedAt: Date.now(), isBuiltin: rule?.isBuiltin ?? false };
    const errs = validateRuleDSL(dsl);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]); onSave(dsl);
  }

  const ic = 'w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono';
  const sc = 'bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 font-mono appearance-none cursor-pointer';
  const lc = 'text-[11px] uppercase tracking-wider text-gray-500 font-mono';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-[480px] max-h-[80vh] overflow-y-auto bg-gray-900/[.98] border border-gray-700 rounded-lg shadow-2xl font-mono">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-bold tracking-widest text-cyan-400 uppercase">{isEdit ? 'Edit Rule' : 'Rule Builder'}</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-1"><label className={lc}>Name *</label><input className={ic} placeholder="e.g. Earthquake near Nuclear Plant" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><label className={lc}>Description</label><input className={ic} placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-1"><label className={lc}>Severity</label><select className={`${sc} w-full`} value={severity} onChange={(e) => setSeverity(e.target.value as AlertSeverity)}>{SEVERITIES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}</select></div>
          <div className="pt-2">
            <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-2 border-b border-gray-700 pb-1">Sources</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className={lc}>Trigger Layer</label><select className={`${sc} w-full`} value={triggerLayer} onChange={(e) => setTriggerLayer(e.target.value)}>{AVAILABLE_LAYERS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></div>
              <div className="space-y-1"><label className={lc}>Target Layer</label><select className={`${sc} w-full`} value={targetLayer} onChange={(e) => setTargetLayer(e.target.value)}>{AVAILABLE_LAYERS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="space-y-1"><label className={lc}>Radius (km)</label><input type="number" className={ic} min={1} max={1000} value={spatialRadius} onChange={(e) => setSpatialRadius(Number(e.target.value))} /></div>
              <div className="space-y-1"><label className={lc}>Cooldown (s)</label><input type="number" className={ic} min={0} value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))} /></div>
              <div className="space-y-1"><label className={lc}>Min Targets</label><input type="number" className={ic} min={1} value={minTargetCount} onChange={(e) => setMinTargetCount(Number(e.target.value))} /></div>
            </div>
          </div>
          <div className="pt-2">
            <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-2 border-b border-gray-700 pb-1">Trigger Condition (optional)</div>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer mb-2"><input type="checkbox" checked={triggerEnabled} onChange={(e) => setTriggerEnabled(e.target.checked)} className="accent-cyan-500" />Enable</label>
            {triggerEnabled && <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div className="space-y-1"><label className={lc}>Field</label><input className={ic} placeholder="e.g. magnitude" value={triggerField} onChange={(e) => setTriggerField(e.target.value)} /></div>
              <div className="space-y-1"><label className={lc}>Op</label><select className={sc} value={triggerOp} onChange={(e) => setTriggerOp(e.target.value as RuleDSLConditionFilter['operator'])}>{OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}</select></div>
              <div className="space-y-1"><label className={lc}>Value</label><input className={ic} placeholder="e.g. 5" value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} /></div>
            </div>}
          </div>
          <div className="pt-2">
            <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-2 border-b border-gray-700 pb-1">Target Condition (optional)</div>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer mb-2"><input type="checkbox" checked={targetEnabled} onChange={(e) => setTargetEnabled(e.target.checked)} className="accent-cyan-500" />Enable</label>
            {targetEnabled && <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div className="space-y-1"><label className={lc}>Field</label><input className={ic} placeholder="e.g. status" value={targetField} onChange={(e) => setTargetField(e.target.value)} /></div>
              <div className="space-y-1"><label className={lc}>Op</label><select className={sc} value={targetOp} onChange={(e) => setTargetOp(e.target.value as RuleDSLConditionFilter['operator'])}>{OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}</select></div>
              <div className="space-y-1"><label className={lc}>Value</label><input className={ic} placeholder="e.g. active" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} /></div>
            </div>}
          </div>
          {errors.length > 0 && <div className="bg-red-900/30 border border-red-700 rounded p-2 space-y-1">{errors.map((err, i) => <p key={i} className="text-xs text-red-400 font-mono">{err}</p>)}</div>}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-700">
            <button onClick={onCancel} className="px-4 py-1.5 text-xs uppercase tracking-wider text-gray-400 border border-gray-600 rounded hover:bg-gray-800">Cancel</button>
            <button onClick={handleSave} className="px-4 py-1.5 text-xs uppercase tracking-wider text-black bg-cyan-500 rounded hover:bg-cyan-400 font-bold">Save Rule</button>
          </div>
        </div>
      </div>
    </div>
  );
}
