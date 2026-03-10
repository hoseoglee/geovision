import { useAppStore } from '@/store/useAppStore';

const TYPE_LABELS: Record<string, string> = {
  satellite: 'SATELLITE',
  flight: 'AIRCRAFT',
  ship: 'VESSEL',
  earthquake: 'SEISMIC EVENT',
};

const TYPE_COLORS: Record<string, string> = {
  satellite: 'text-cyan-400',
  flight: 'text-yellow-400',
  ship: 'text-blue-400',
  earthquake: 'text-red-400',
};

const TYPE_BORDER: Record<string, string> = {
  satellite: 'border-cyan-500/40',
  flight: 'border-yellow-500/40',
  ship: 'border-blue-500/40',
  earthquake: 'border-red-500/40',
};

const LINK_LABELS: Record<string, string> = {
  satellite: 'TRACK ON N2YO',
  flight: 'VIEW ON FLIGHTRADAR24',
  ship: 'VIEW ON MARINETRAFFIC',
  earthquake: 'SEARCH ON GOOGLE',
};

/** 엔티티 클릭 시 상세 정보 패널 */
export default function EntityDetail() {
  const entity = useAppStore((s) => s.selectedEntity);
  const setSelectedEntity = useAppStore((s) => s.setSelectedEntity);

  if (!entity) return null;

  return (
    <div className={`fixed top-20 left-[310px] z-40 w-64 font-mono
      bg-gray-900/85 backdrop-blur-sm border ${TYPE_BORDER[entity.type]} rounded
      transition-all duration-300 animate-slideIn`}>
      {/* 헤더 */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700/40">
        <div>
          <div className="text-gray-500 text-[9px] tracking-widest">{TYPE_LABELS[entity.type]}</div>
          <div className={`text-sm font-bold ${TYPE_COLORS[entity.type]}`}>{entity.name}</div>
        </div>
        <button
          onClick={() => setSelectedEntity(null)}
          className="text-gray-500 hover:text-gray-300 text-xs pointer-events-auto"
        >✕</button>
      </div>
      {/* 상세 데이터 */}
      <div className="px-3 py-2 space-y-1">
        {Object.entries(entity.details).map(([key, val]) => (
          <div key={key} className="flex justify-between items-center text-[10px]">
            <span className="text-gray-500 uppercase">{key}</span>
            <span className="text-gray-300">{val}</span>
          </div>
        ))}
      </div>
      {/* 외부 사이트 링크 */}
      {entity.url && (
        <div className="px-3 py-2 border-t border-gray-700/40">
          <a
            href={entity.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-1.5 text-[10px] font-bold
              py-1.5 rounded border transition-all hover:brightness-125
              ${TYPE_COLORS[entity.type]} ${TYPE_BORDER[entity.type]} bg-gray-800/50 hover:bg-gray-700/50`}
          >
            <span>↗</span>
            <span>{entity.name?.includes('ISS') ? 'WATCH LIVE STREAM' : (LINK_LABELS[entity.type] || 'VIEW DETAILS')}</span>
          </a>
        </div>
      )}
    </div>
  );
}
