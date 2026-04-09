import { lazy, Suspense, useEffect } from 'react';
import Globe from './components/Globe';
import ControlPanel from './components/ControlPanel';
import HudOverlay from './components/HudOverlay';
import ScanLine from './components/ScanLine';
import Crosshair from './components/Crosshair';
import AlertMonitor from './components/AlertMonitor';
import InfoWarfareMonitor from './components/InfoWarfareMonitor';
import { ProviderHealthDots, SimulatedDataBanner } from './components/ProviderHealthPanel';
import { useProviderHealthMonitor } from './hooks/useProviderHealthMonitor';
import { useTimelineStore } from './store/useTimelineStore';
import { decodeClip } from './utils/clipUtils';

// Lazy-loaded provider health detail panel
const ProviderHealthDetail = lazy(() =>
  import('./components/ProviderHealthPanel').then((m) => ({ default: m.ProviderHealthDetail }))
);

// Lazy-loaded HUD panels
const DataTicker = lazy(() => import('./components/DataTicker'));
const MiniStats = lazy(() => import('./components/MiniStats'));
const WorldClock = lazy(() => import('./components/WorldClock'));
const FpsMonitor = lazy(() => import('./components/FpsMonitor'));
const NetworkStatus = lazy(() => import('./components/NetworkStatus'));
const CursorInfo = lazy(() => import('./components/CursorInfo'));
const EntityDetail = lazy(() => import('./components/EntityDetail'));
const EventLog = lazy(() => import('./components/EventLog'));
const SunPositionHUD = lazy(() => import('./components/SunPosition'));
const AlertPanel = lazy(() => import('./components/AlertPanel'));
const CorrelationPanel = lazy(() => import('./components/CorrelationPanel'));
const EventTimeline = lazy(() => import('./components/EventTimeline'));
const TimelineBar = lazy(() => import('./components/TimelineBar'));

// Lazy-loaded modals & overlays
const ISSLiveStream = lazy(() => import('./components/ISSLiveStream'));
const CCTVViewer = lazy(() => import('./components/CCTVViewer'));
const DailyBrief = lazy(() => import('./components/DailyBrief'));
const KeyboardShortcuts = lazy(() => import('./components/KeyboardShortcuts'));
const SearchModal = lazy(() => import('./components/SearchModal'));
const ExportModal = lazy(() => import('./components/ExportModal'));
const NewsClusterTimelapse = lazy(() => import('./components/NewsClusterTimelapse'));
const AreaBriefingPanel = lazy(() => import('./components/AreaBriefingPanel'));
const ViewModeToggle = lazy(() => import('./components/ViewModeToggle'));
const ChokepointAnalyticsPanel = lazy(() => import('./components/ChokepointAnalyticsPanel'));
const DarkVesselPanel = lazy(() => import('./components/DarkVesselPanel'));
const InfoWarfarePanel = lazy(() => import('./components/InfoWarfarePanel'));

// Lazy-loaded named export needs wrapper
const GeofenceEventPanel = lazy(() =>
  import('./components/GeofencePanel').then((m) => ({ default: m.GeofenceEventPanel }))
);

// Financial & Conflict Intelligence
const OilPricePanel = lazy(() => import('./components/OilPricePanel'));
const BeforeAfterToggle = lazy(() =>
  import('./components/BeforeAfterSlider').then((m) => ({ default: m.BeforeAfterToggle }))
);

export default function App() {
  useProviderHealthMonitor();

  // GEO-003: ?clip= URL 파라미터 감지 → 자동 playback 진입
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clipParam = params.get('clip');
    if (!clipParam) return;

    decodeClip(clipParam).then((payload) => {
      if (!payload) return;
      useTimelineStore.getState().enterPlaybackWithClip(payload);
      // URL에서 clip 파라미터 제거 (히스토리 클린)
      const url = new URL(window.location.href);
      url.searchParams.delete('clip');
      window.history.replaceState(null, '', url.toString());
    });
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <Globe />
      <ScanLine />
      <Crosshair />
      <ControlPanel />
      <HudOverlay />
      <ProviderHealthDots />
      <SimulatedDataBanner />
      <AlertMonitor />
      <InfoWarfareMonitor />

      <Suspense fallback={null}>
        <MiniStats />
        <WorldClock />
        <FpsMonitor />
        <NetworkStatus />
        <CursorInfo />
        <EntityDetail />
        <EventLog />
        <SunPositionHUD />
        <AlertPanel />
        <CorrelationPanel />
        <EventTimeline />
        <TimelineBar />
        <GeofenceEventPanel />
        <ProviderHealthDetail />
        <DataTicker />
      </Suspense>

      <Suspense fallback={null}>
        <ISSLiveStream />
        <CCTVViewer />
        <DailyBrief />
        <KeyboardShortcuts />
        <SearchModal />
        <ExportModal />
        <NewsClusterTimelapse />
        <AreaBriefingPanel />
        <ViewModeToggle />
        <ChokepointAnalyticsPanel />
        <DarkVesselPanel />
        <OilPricePanel />
        <BeforeAfterToggle />
        <InfoWarfarePanel />
      </Suspense>
    </main>
  );
}
