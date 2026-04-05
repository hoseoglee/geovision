import { useAppStore } from '@/store/useAppStore';

type ViewMode = 'google3d' | 'aerial' | 'label' | 'road';

const MODES: { id: ViewMode; label: string }[] = [
  { id: 'google3d', label: 'GOOGLE 3D' },
  { id: 'aerial', label: 'AERIAL' },
  { id: 'label', label: 'LABEL' },
  { id: 'road', label: 'ROAD' },
];

export default function ViewModeToggle() {
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);

  return (
    <div className="fixed bottom-12 right-4 z-30 flex flex-col items-end gap-1">
      <span className="text-zinc-600 text-[8px] tracking-widest font-mono mb-0.5">VIEW MODE</span>
      {MODES.map(({ id, label }) => {
        const active = viewMode === id;
        return (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            className={[
              'font-mono text-[9px] tracking-widest border px-2 py-1 rounded cursor-pointer transition-colors',
              active
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                : 'bg-zinc-900/60 border-zinc-700/30 text-zinc-500 hover:text-zinc-300',
            ].join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
