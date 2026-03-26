import { useRef, useState } from 'react';
import type { RuleDSL } from '@/correlation/ruleDSL';
import type { AlertSeverity } from '@/store/useAlertStore';

interface RuleManagerProps {
  rules: RuleDSL[]; onToggle: (id: string, enabled: boolean) => void; onEdit: (rule: RuleDSL) => void;
  onDelete: (id: string) => void; onDuplicate: (rule: RuleDSL) => void; onImport: (rules: RuleDSL[]) => void;
  onExport: () => void; onAdd: () => void;
}

const SEV: Record<AlertSeverity, string> = { critical: 'bg-red-600/80 text-white', warning: 'bg-yellow-600/80 text-black', info: 'bg-blue-600/80 text-white' };

function timeAgo(ts: number | null): string {
  if (ts === null) return '-';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`; const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`;
}

export default function RuleManager({ rules, onToggle, onEdit, onDelete, onDuplicate, onImport, onExport, onAdd }: RuleManagerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const p = JSON.parse(reader.result as string); onImport(Array.isArray(p) ? p : [p]); } catch {} };
    reader.readAsText(file); e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 font-mono text-gray-200 text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/60">
        <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Rules</span>
        <div className="flex gap-1">
          <button onClick={onAdd} className="px-2 py-0.5 bg-green-700/60 hover:bg-green-600/80 text-green-100 rounded text-[10px] font-bold">+ ADD</button>
          <button onClick={() => fileRef.current?.click()} className="px-2 py-0.5 bg-gray-700/60 hover:bg-gray-600/80 text-gray-300 rounded text-[10px] font-bold">IMPORT</button>
          <button onClick={onExport} className="px-2 py-0.5 bg-gray-700/60 hover:bg-gray-600/80 text-gray-300 rounded text-[10px] font-bold">EXPORT</button>
        </div>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-800/60">
        {rules.length === 0 && <div className="px-3 py-6 text-center text-gray-500 text-[11px]">No rules defined.</div>}
        {rules.map((r) => (
          <div key={r.id} className={`px-3 py-2 ${!r.enabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2">
              <button onClick={() => onToggle(r.id, !r.enabled)} className={`flex-shrink-0 w-8 h-4 rounded-full relative transition-colors ${r.enabled ? 'bg-green-600' : 'bg-gray-600'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${r.enabled ? 'left-[18px]' : 'left-[2px]'}`} />
              </button>
              <span className="font-bold text-gray-100 truncate max-w-[180px]" title={r.id}>{r.id}</span>
              <span className={`flex-shrink-0 px-1.5 py-px rounded text-[9px] font-bold uppercase ${SEV[r.severity]}`}>{r.severity === 'critical' ? 'CRIT' : r.severity === 'warning' ? 'WARN' : 'INFO'}</span>
              <span className="flex-1" />
              <span className="text-gray-400 flex-shrink-0">&times;{r.triggerCount}</span>
              <span className="text-gray-500 flex-shrink-0 w-6 text-right">{timeAgo(r.lastTriggered)}</span>
            </div>
            <div className="mt-0.5 text-[10px] text-gray-500 truncate pl-10">{r.description}</div>
            <div className="flex gap-1 mt-1 pl-10">
              <button onClick={() => onEdit(r)} className="px-1.5 py-px bg-gray-700/50 hover:bg-gray-600 text-gray-300 rounded text-[9px] font-bold">EDIT</button>
              <button onClick={() => onDuplicate(r)} className="px-1.5 py-px bg-gray-700/50 hover:bg-gray-600 text-gray-300 rounded text-[9px] font-bold">CLONE</button>
              {confirmId === r.id ? (<>
                <button onClick={() => { onDelete(r.id); setConfirmId(null); }} className="px-1.5 py-px bg-red-700 hover:bg-red-600 text-white rounded text-[9px] font-bold">CONFIRM</button>
                <button onClick={() => setConfirmId(null)} className="px-1.5 py-px bg-gray-700/50 hover:bg-gray-600 text-gray-300 rounded text-[9px] font-bold">CANCEL</button>
              </>) : (
                <button onClick={() => setConfirmId(r.id)} disabled={r.isBuiltin} className={`px-1.5 py-px rounded text-[9px] font-bold ${r.isBuiltin ? 'bg-gray-800/40 text-gray-600 cursor-not-allowed' : 'bg-gray-700/50 hover:bg-red-700/60 text-gray-300'}`} title={r.isBuiltin ? 'Cannot delete builtin' : 'Delete'}>DEL</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
