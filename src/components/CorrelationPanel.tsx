import { useState } from 'react';
import { useCorrelationStore } from '@/store/useCorrelationStore';
import { useAppStore } from '@/store/useAppStore';
import type { CorrelationAlert } from '@/correlation/rules';
import type { AlertSeverity } from '@/store/useAlertStore';
import type { RuleDSL } from '@/correlation/ruleDSL';
import RuleManager from './RuleManager';
import RuleBuilder from './RuleBuilder';

type Tab = 'alerts' | 'rules';
const SS: Record<AlertSeverity, { bg: string; text: string; icon: string; pulse: string }> = {
  critical: { bg: 'bg-red-950/80', text: 'text-red-400', icon: '\u26A0', pulse: 'animate-pulse' },
  warning: { bg: 'bg-yellow-950/60', text: 'text-yellow-400', icon: '\u25B2', pulse: '' },
  info: { bg: 'bg-blue-950/40', text: 'text-blue-400', icon: '\u25CF', pulse: '' },
};
function timeAgo(ts: number): string { const d = Math.floor((Date.now() - ts) / 1000); if (d < 10) return 'NOW'; if (d < 60) return `${d}s`; if (d < 3600) return `${Math.floor(d / 60)}m`; return `${Math.floor(d / 3600)}h`; }

function CorrelationRow({ alert, onFocus }: { alert: CorrelationAlert; onFocus: () => void }) {
  const s = SS[alert.severity];
  return (
    <div className={`px-3 py-2 border-b border-gray-800/50 flex items-start gap-2 cursor-pointer hover:brightness-125 ${s.bg}`} onClick={onFocus}>
      <span className={`text-xs mt-0.5 ${s.text} ${s.pulse}`}>{s.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <span className={`text-[10px] font-bold ${s.text}`}>[{alert.ruleId.toUpperCase()}] {alert.title}</span>
          <span className="text-gray-600 text-[9px] ml-2">{timeAgo(alert.timestamp)}</span>
        </div>
        <p className="text-gray-500 text-[9px] mt-0.5 leading-snug">{alert.message}</p>
        {alert.relatedEntities.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {alert.relatedEntities.slice(0, 4).map((e, i) => (<span key={i} className="text-[8px] bg-gray-800/60 text-gray-500 px-1 py-0.5 rounded">{e.layer}:{e.id.slice(0, 12)}</span>))}
            {alert.relatedEntities.length > 4 && <span className="text-[8px] text-gray-600">+{alert.relatedEntities.length - 4}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CorrelationPanel() {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>('alerts');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleDSL | undefined>(undefined);
  const correlations = useCorrelationStore((s) => s.correlations);
  const isRunning = useCorrelationStore((s) => s.isRunning);
  const startEngine = useCorrelationStore((s) => s.startEngine);
  const stopEngine = useCorrelationStore((s) => s.stopEngine);
  const clearCorrelations = useCorrelationStore((s) => s.clearCorrelations);
  const dslRules = useCorrelationStore((s) => s.dslRules);
  const addRule = useCorrelationStore((s) => s.addRule);
  const removeRule = useCorrelationStore((s) => s.removeRule);
  const toggleRule = useCorrelationStore((s) => s.toggleRule);
  const duplicateRule = useCorrelationStore((s) => s.duplicateRule);
  const importRules = useCorrelationStore((s) => s.importRules);
  const exportRules = useCorrelationStore((s) => s.exportRules);
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);
  const criticalCount = correlations.filter((c) => c.severity === 'critical').length;
  const activeCount = correlations.filter((c) => Date.now() - c.timestamp < 300000).length;
  const enabledRuleCount = dslRules.filter((r) => r.enabled).length;
  const handleFocus = (a: CorrelationAlert) => setCameraTarget({ latitude: a.lat, longitude: a.lng, height: 500000 });
  const handleToggleEngine = () => { if (isRunning) stopEngine(); else startEngine(); };
  const handleSaveRule = (r: RuleDSL) => { addRule(r); setBuilderOpen(false); setEditingRule(undefined); };
  const handleEditRule = (r: RuleDSL) => { setEditingRule(r); setBuilderOpen(true); };
  const handleAddRule = () => { setEditingRule(undefined); setBuilderOpen(true); };

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)} className={`fixed bottom-20 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-xs backdrop-blur-sm transition-all border ${criticalCount > 0 ? 'bg-red-900/80 border-red-500/60 text-red-400 animate-pulse' : isRunning ? 'bg-cyan-900/60 border-cyan-500/40 text-cyan-400' : 'bg-gray-800/60 border-gray-600/40 text-gray-500'}`}>
        <span className="text-[10px]">{isRunning ? '\u25C9' : '\u25CB'}</span>
        <span className="font-bold tracking-wider">CORR</span>
        {activeCount > 0 && <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold ${criticalCount > 0 ? 'bg-red-600/80 text-white' : 'bg-cyan-600/80 text-white'}`}>{activeCount}</span>}
      </button>
    );
  }
  return (
    <>
      <div className="fixed bottom-20 right-4 z-50 w-[420px] max-h-[500px] flex flex-col bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded shadow-2xl font-mono animate-slideIn pointer-events-auto">
        <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700/40">
          <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-cyan-400 animate-pulse' : 'bg-gray-600'}`} /><span className="text-gray-300 text-xs font-bold tracking-widest">CORRELATION ENGINE</span></div>
          <div className="flex items-center gap-2">
            <button onClick={handleToggleEngine} className={`text-[10px] border px-2 py-0.5 rounded transition-colors ${isRunning ? 'border-red-500/40 text-red-400 hover:bg-red-900/30' : 'border-green-500/40 text-green-400 hover:bg-green-900/30'}`}>{isRunning ? 'STOP' : 'START'}</button>
            <button onClick={() => setExpanded(false)} className="text-gray-500 hover:text-gray-300 text-xs">{'\u2715'}</button>
          </div>
        </div>
        <div className="flex border-b border-gray-800/40">
          <button onClick={() => setTab('alerts')} className={`flex-1 py-1.5 text-[10px] font-bold tracking-widest transition-colors ${tab === 'alerts' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-400'}`}>ALERTS{activeCount > 0 && <span className="ml-1 px-1 py-px bg-cyan-600/80 text-white text-[8px] rounded-full">{activeCount}</span>}</button>
          <button onClick={() => setTab('rules')} className={`flex-1 py-1.5 text-[10px] font-bold tracking-widest transition-colors ${tab === 'rules' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-400'}`}>RULES<span className="ml-1 text-[8px] text-gray-500">{enabledRuleCount}/{dslRules.length}</span></button>
        </div>
        <div className="flex gap-3 px-3 py-1.5 border-b border-gray-800/40 text-[9px] text-gray-500">
          <span>ENGINE: <span className={isRunning ? 'text-cyan-400' : 'text-gray-600'}>{isRunning ? 'ACTIVE' : 'IDLE'}</span></span>
          <span>RULES: <span className="text-gray-400">{enabledRuleCount}</span></span>
          <span>TOTAL: <span className="text-gray-400">{correlations.length}</span></span>
          <span>CRIT: <span className={criticalCount > 0 ? 'text-red-400' : 'text-gray-600'}>{criticalCount}</span></span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
          {tab === 'alerts' ? (correlations.length === 0 ? <div className="text-gray-600 text-xs text-center py-8">{isRunning ? 'MONITORING \u2014 NO CORRELATIONS DETECTED' : 'ENGINE IDLE \u2014 START TO BEGIN MONITORING'}</div> : correlations.map((a) => <CorrelationRow key={a.id} alert={a} onFocus={() => handleFocus(a)} />)) : (<RuleManager rules={dslRules} onToggle={toggleRule} onEdit={handleEditRule} onDelete={removeRule} onDuplicate={duplicateRule} onImport={importRules} onExport={exportRules} onAdd={handleAddRule} />)}
        </div>
        {tab === 'alerts' && correlations.length > 0 && (<div className="px-3 py-1.5 border-t border-gray-800/40 flex justify-end"><button onClick={clearCorrelations} className="text-gray-500 hover:text-gray-300 text-[10px] border border-gray-700/40 px-2 py-0.5 rounded">CLEAR ALL</button></div>)}
      </div>
      {builderOpen && <RuleBuilder rule={editingRule} onSave={handleSaveRule} onCancel={() => { setBuilderOpen(false); setEditingRule(undefined); }} />}
    </>
  );
}
