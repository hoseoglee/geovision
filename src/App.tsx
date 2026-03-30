import { lazy, Suspense } from 'react';
import Globe from './components/Globe';
import ControlPanel from './components/ControlPanel';
import HudOverlay from './components/HudOverlay';
import ScanLine from './components/ScanLine';
import Crosshair from './components/Crosshair';
import AlertMonitor from './components/AlertMonitor';
import { ProviderHealthDots, SimulatedDataBanner } from './components/ProviderHealthPanel';
import { useProviderHealthMonitor } from './hooks/useProviderHealthMonitor';

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

// Lazy-loaded named export needs wrapper
const GeofenceEventPanel = lazy(() =>
  import('./components/GeofencePanel').then((m) => ({ default: m.GeofenceEventPanel }))
);

export default function App() {
  useProviderHealthMonitor();

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
      </Suspense>
    </main>
  );
}
