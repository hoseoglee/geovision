import { memo } from 'react';
import { useAppStore } from '@/store/useAppStore';

/** 레이어 범례 — 색상/아이콘 의미 */
export default memo(function Legend() {
  const activeLayers = useAppStore((s) => s.activeLayers);

  if (activeLayers.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-zinc-500 text-[9px] font-mono tracking-widest">LEGEND</div>

      {activeLayers.includes('satellites') && (
        <LegendSection title="SATELLITES" items={[
          { color: 'bg-cyan-400', label: 'Active Satellite' },
        ]} />
      )}

      {activeLayers.includes('flights') && (
        <LegendSection title="AIRCRAFT" items={[
          { color: 'bg-yellow-400', label: 'Active Flight' },
        ]} />
      )}

      {activeLayers.includes('ships') && (
        <LegendSection title="VESSELS" items={[
          { color: 'bg-[#4DA6FF]', label: 'Cargo' },
          { color: 'bg-orange-500', label: 'Tanker' },
          { color: 'bg-pink-400', label: 'Passenger' },
          { color: 'bg-green-300', label: 'Fishing' },
          { color: 'bg-red-500', label: 'Military' },
        ]} />
      )}

      {activeLayers.includes('earthquakes') && (
        <LegendSection title="SEISMIC" items={[
          { color: 'bg-red-400', label: 'M < 4.0' },
          { color: 'bg-red-500', label: 'M 4.0-6.0 (pulse)' },
          { color: 'bg-red-600', label: 'M > 6.0 (pulse)' },
        ]} />
      )}
    </div>
  );
})

function LegendSection({ title, items }: { title: string; items: { color: string; label: string }[] }) {
  return (
    <div>
      <div className="text-zinc-500 text-[10px] font-mono mb-0.5">{title}</div>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-[10px] py-0.5">
          <div className={`w-2 h-2 rounded-sm ${item.color}`} />
          <span className="text-zinc-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
