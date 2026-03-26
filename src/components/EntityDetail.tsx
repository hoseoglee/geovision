import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTrajectoryStore } from '@/store/useTrajectoryStore';

// ── 타입별 UI 매핑 ──
const TYPE_LABELS: Record<string, string> = {
  satellite: 'SATELLITE',
  flight: 'AIRCRAFT',
  ship: 'VESSEL',
  earthquake: 'SEISMIC EVENT',
  adsb: 'MILITARY AIRCRAFT',
  chokepoint: 'CHOKEPOINT',
  cable: 'SUBMARINE CABLE',
  military_base: 'MILITARY BASE',
  nuclear_plant: 'NUCLEAR FACILITY',
  port: 'MAJOR PORT',
  current: 'OCEAN CURRENT',
  sun: 'SUN POSITION',
};

const TYPE_COLORS: Record<string, string> = {
  satellite: 'text-cyan-400',
  flight: 'text-yellow-400',
  ship: 'text-blue-400',
  earthquake: 'text-red-400',
  adsb: 'text-red-400',
  chokepoint: 'text-orange-400',
  cable: 'text-purple-400',
  military_base: 'text-red-300',
  nuclear_plant: 'text-green-400',
  port: 'text-sky-400',
  current: 'text-teal-400',
  sun: 'text-yellow-300',
};

const TYPE_BORDER: Record<string, string> = {
  satellite: 'border-cyan-500/40',
  flight: 'border-yellow-500/40',
  ship: 'border-blue-500/40',
  earthquake: 'border-red-500/40',
  adsb: 'border-red-500/40',
  chokepoint: 'border-orange-500/40',
  cable: 'border-purple-500/40',
  military_base: 'border-red-500/40',
  nuclear_plant: 'border-green-500/40',
  port: 'border-sky-500/40',
  current: 'border-teal-500/40',
  sun: 'border-yellow-500/40',
};

const LINK_LABELS: Record<string, string> = {
  satellite: 'TRACK ON N2YO',
  flight: 'VIEW ON FLIGHTRADAR24',
  ship: 'VIEW ON MARINETRAFFIC',
  earthquake: 'SEARCH ON GOOGLE',
  adsb: 'TRACK ON ADS-B EXCHANGE',
};

// ── 뉴스 검색 유틸리티 ──
interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
}

/** Google News RSS를 프록시 없이 사용 가능한 뉴스 소스들의 URL 생성 */
function buildNewsSearchUrl(query: string): string {
  return `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
}

function buildGoogleNewsRssUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

/** RSS XML → NewsItem[] 파싱 */
function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const entries = doc.querySelectorAll('item');
  entries.forEach((item, idx) => {
    if (idx >= 5) return; // 최대 5개
    const title = item.querySelector('title')?.textContent || '';
    const link = item.querySelector('link')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const source = item.querySelector('source')?.textContent || '';
    if (title && link) {
      items.push({
        title: title.replace(/ - .*$/, '').trim(), // 소스 이름 제거
        link,
        source,
        pubDate: pubDate ? formatRelativeTime(pubDate) : '',
      });
    }
  });
  return items;
}

/** 상대 시간 포맷 (예: "2시간 전") */
function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/** 엔티티 클릭 시 상세 정보 + 관련 뉴스 패널 */
export default function EntityDetail() {
  const entity = useAppStore((s) => s.selectedEntity);
  const setSelectedEntity = useAppStore((s) => s.setSelectedEntity);
  const setIssLiveStream = useAppStore((s) => s.setIssLiveStream);

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(false);
  const [showNews, setShowNews] = useState(false);

  // 뉴스 검색 키워드
  const newsQuery = entity?.newsQuery || entity?.name || '';

  // 뉴스 패치
  const fetchNews = useCallback(async (query: string) => {
    if (!query) return;
    setNewsLoading(true);
    setNewsError(false);
    setNewsItems([]);

    try {
      const rssUrl = buildGoogleNewsRssUrl(query);
      const res = await fetch(rssUrl);
      if (!res.ok) throw new Error('RSS fetch failed');
      const xml = await res.text();
      const items = parseRssItems(xml);
      setNewsItems(items);
      if (items.length === 0) setNewsError(true);
    } catch {
      // RSS가 CORS로 막힐 수 있음 → fallback으로 링크만 제공
      setNewsError(true);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  // 엔티티 변경 시 뉴스 상태 초기화
  useEffect(() => {
    setNewsItems([]);
    setNewsError(false);
    setShowNews(false);
  }, [entity?.name, entity?.type]);

  // Trajectory store
  const toggleTrajectory = useTrajectoryStore((s) => s.toggleTrajectory);
  const activeTrajectories = useTrajectoryStore((s) => s.activeTrajectories);

  if (!entity) return null;

  const isISS = entity.name?.includes('ISS');
  const typeColor = TYPE_COLORS[entity.type] || 'text-zinc-300';
  const typeBorder = TYPE_BORDER[entity.type] || 'border-zinc-500/40';

  // Compute trajectory entity ID from selected entity
  const canTrack = ['flight', 'ship', 'adsb'].includes(entity.type);
  let trajectoryEntityId = '';
  if (entity.type === 'flight') {
    const cs = String(entity.details.CALLSIGN || entity.name || '').trim();
    trajectoryEntityId = `flight-${cs}`;
  } else if (entity.type === 'ship') {
    trajectoryEntityId = `ship-${entity.details.MMSI || ''}`;
  } else if (entity.type === 'adsb') {
    trajectoryEntityId = `adsb-${entity.details.HEX || ''}`;
  }
  const isTracking = canTrack && activeTrajectories.includes(trajectoryEntityId);

  const handleNewsToggle = () => {
    if (!showNews) {
      setShowNews(true);
      if (newsItems.length === 0 && !newsLoading) {
        fetchNews(newsQuery);
      }
    } else {
      setShowNews(false);
    }
  };

  return (
    <div className={`fixed top-20 left-[310px] z-40 w-72 font-mono
      bg-zinc-900/90 backdrop-blur-sm border ${isISS ? 'border-yellow-500/60' : typeBorder} rounded
      transition-all duration-300 animate-slideIn max-h-[85vh] flex flex-col`}>
      {/* 헤더 */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-zinc-700/40 shrink-0">
        <div className="min-w-0">
          <div className="text-zinc-500 text-[9px] tracking-widest">
            {isISS ? 'SPACE STATION' : TYPE_LABELS[entity.type] || entity.type.toUpperCase()}
          </div>
          <div className={`text-sm font-bold truncate ${isISS ? 'text-yellow-400' : typeColor}`}>
            {entity.name}
          </div>
        </div>
        <button
          onClick={() => setSelectedEntity(null)}
          className="text-zinc-500 hover:text-zinc-300 text-xs pointer-events-auto ml-2 shrink-0"
        >✕</button>
      </div>

      {/* 상세 데이터 */}
      <div className="px-3 py-2 space-y-1 shrink-0">
        {Object.entries(entity.details).map(([key, val]) => (
          <div key={key} className="flex justify-between items-center text-[10px] gap-2">
            <span className="text-zinc-500 uppercase shrink-0">{key}</span>
            <span className="text-zinc-300 text-right truncate">{val}</span>
          </div>
        ))}
      </div>

      {/* ISS: 라이브 스트림 버튼 */}
      {isISS && (
        <div className="px-3 py-2 border-t border-zinc-700/40 space-y-1.5 shrink-0">
          <button
            onClick={() => setIssLiveStream(true)}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold
              py-1.5 rounded border transition-all hover:brightness-125
              text-yellow-400 border-yellow-500/60 bg-yellow-900/30 hover:bg-yellow-800/40"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            <span>WATCH LIVE STREAM</span>
          </button>
          <a
            href="https://www.n2yo.com/space-station/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold
              py-1.5 rounded border transition-all hover:brightness-125
              text-cyan-400 border-cyan-500/40 bg-zinc-800/50 hover:bg-zinc-700/50"
          >
            <span>↗</span>
            <span>TRACK ON N2YO</span>
          </a>
        </div>
      )}

      {/* 기타 엔티티: 외부 사이트 링크 */}
      {!isISS && entity.url && (
        <div className="px-3 py-2 border-t border-zinc-700/40 shrink-0">
          <a
            href={entity.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-1.5 text-[10px] font-bold
              py-1.5 rounded border transition-all hover:brightness-125
              ${typeColor} ${typeBorder} bg-zinc-800/50 hover:bg-zinc-700/50`}
          >
            <span>↗</span>
            <span>{LINK_LABELS[entity.type] || 'VIEW DETAILS'}</span>
          </a>
        </div>
      )}

      {/* ── 궤적 추적 토글 ── */}
      {canTrack && trajectoryEntityId && (
        <div className="px-3 py-2 border-t border-zinc-700/40 shrink-0">
          <button
            onClick={() => toggleTrajectory(trajectoryEntityId)}
            className={`w-full flex items-center justify-center gap-1.5 text-[10px] font-bold
              py-1.5 rounded border transition-all hover:brightness-125
              ${isTracking
                ? 'text-emerald-400 border-emerald-500/60 bg-emerald-900/30 hover:bg-emerald-800/40'
                : 'text-zinc-400 border-zinc-600/40 bg-zinc-800/50 hover:bg-zinc-700/50'
              }`}
          >
            <span>{isTracking ? '◉' : '◎'}</span>
            <span>{isTracking ? 'TRACKING TRAJECTORY' : 'SHOW TRAJECTORY'}</span>
          </button>
        </div>
      )}

      {/* ── 관련 뉴스 섹션 ── */}
      <div className="border-t border-zinc-700/40 shrink-0">
        <button
          onClick={handleNewsToggle}
          className="w-full flex items-center justify-between px-3 py-2
            text-[10px] font-bold tracking-wider text-zinc-400 hover:text-zinc-200
            transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span className="text-amber-400">📰</span>
            <span>RELATED NEWS</span>
          </span>
          <span className={`transition-transform duration-200 ${showNews ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
      </div>

      {/* 뉴스 콘텐츠 (펼침) */}
      {showNews && (
        <div className="overflow-y-auto max-h-56 scrollbar-thin">
          {newsLoading && (
            <div className="px-3 py-3 text-center">
              <div className="text-[10px] text-zinc-500 animate-pulse">SCANNING NEWS FEEDS...</div>
            </div>
          )}

          {/* 인라인 뉴스 결과 */}
          {newsItems.length > 0 && (
            <div className="px-3 py-1 space-y-1.5">
              {newsItems.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-1.5 rounded bg-zinc-800/50 hover:bg-zinc-700/60
                    border border-zinc-700/30 hover:border-zinc-600/50
                    transition-all group"
                >
                  <div className="text-[10px] text-zinc-200 leading-tight group-hover:text-white
                    line-clamp-2">
                    {item.title}
                  </div>
                  <div className="flex justify-between mt-0.5 text-[8px] text-zinc-500">
                    <span className="truncate max-w-[60%]">{item.source}</span>
                    <span>{item.pubDate}</span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* RSS 실패 시 → Google News 직접 링크 + 추가 소스 */}
          {(newsError || (!newsLoading && newsItems.length === 0)) && (
            <div className="px-3 py-2 space-y-1.5">
              <div className="text-[9px] text-zinc-500 text-center mb-1">
                SEARCH NEWS SOURCES
              </div>
              <a
                href={buildNewsSearchUrl(newsQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded
                  bg-zinc-800/50 hover:bg-zinc-700/60 border border-zinc-700/30
                  hover:border-amber-500/30 transition-all text-[10px] text-zinc-300 hover:text-white"
              >
                <span className="text-amber-400 shrink-0">G</span>
                <span className="truncate">Google News</span>
                <span className="ml-auto text-zinc-500">↗</span>
              </a>
              <a
                href={`https://www.reuters.com/search/news?query=${encodeURIComponent(newsQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded
                  bg-zinc-800/50 hover:bg-zinc-700/60 border border-zinc-700/30
                  hover:border-orange-500/30 transition-all text-[10px] text-zinc-300 hover:text-white"
              >
                <span className="text-orange-400 shrink-0">R</span>
                <span className="truncate">Reuters</span>
                <span className="ml-auto text-zinc-500">↗</span>
              </a>
              <a
                href={`https://apnews.com/search?q=${encodeURIComponent(newsQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded
                  bg-zinc-800/50 hover:bg-zinc-700/60 border border-zinc-700/30
                  hover:border-blue-500/30 transition-all text-[10px] text-zinc-300 hover:text-white"
              >
                <span className="text-blue-400 shrink-0">AP</span>
                <span className="truncate">AP News</span>
                <span className="ml-auto text-zinc-500">↗</span>
              </a>
              <a
                href={`https://twitter.com/search?q=${encodeURIComponent(newsQuery)}&f=live`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded
                  bg-zinc-800/50 hover:bg-zinc-700/60 border border-zinc-700/30
                  hover:border-sky-500/30 transition-all text-[10px] text-zinc-300 hover:text-white"
              >
                <span className="text-sky-400 shrink-0">X</span>
                <span className="truncate">X / Twitter (Live)</span>
                <span className="ml-auto text-zinc-500">↗</span>
              </a>
            </div>
          )}

          {/* 하단 Google News 전체 검색 링크 */}
          {newsItems.length > 0 && (
            <div className="px-3 py-2 border-t border-zinc-700/20">
              <a
                href={buildNewsSearchUrl(newsQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-[9px]
                  text-zinc-500 hover:text-amber-400 transition-colors"
              >
                <span>VIEW ALL ON GOOGLE NEWS ↗</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
