import Globe from './components/Globe';
import ControlPanel from './components/ControlPanel';
import HudOverlay from './components/HudOverlay';
import DataTicker from './components/DataTicker';
import MiniStats from './components/MiniStats';
import ScanLine from './components/ScanLine';
import Crosshair from './components/Crosshair';
import CursorInfo from './components/CursorInfo';
import EntityDetail from './components/EntityDetail';
import WorldClock from './components/WorldClock';
import EventLog from './components/EventLog';
import FpsMonitor from './components/FpsMonitor';
import NetworkStatus from './components/NetworkStatus';
import SunPositionHUD from './components/SunPosition';
import AlertMonitor from './components/AlertMonitor';
import AlertPanel from './components/AlertPanel';
import ISSLiveStream from './components/ISSLiveStream';
import CCTVViewer from './components/CCTVViewer';
import CorrelationPanel from './components/CorrelationPanel';
import DailyBrief from './components/DailyBrief';
import EventTimeline from './components/EventTimeline';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import SearchModal from './components/SearchModal';
import ExportModal from './components/ExportModal';
import TimelineBar from './components/TimelineBar';

export default function App() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <Globe />
      <ScanLine />
      <Crosshair />
      <ControlPanel />
      <HudOverlay />
      <MiniStats />
      <WorldClock />
      <FpsMonitor />
      <NetworkStatus />
      <CursorInfo />
      <EntityDetail />
      <EventLog />
      <SunPositionHUD />
      <AlertMonitor />
      <AlertPanel />
      <ISSLiveStream />
      <CCTVViewer />
      <CorrelationPanel />
      <DailyBrief />
      <EventTimeline />
      <KeyboardShortcuts />
      <SearchModal />
      <ExportModal />
      <TimelineBar />
      <DataTicker />
    </main>
  );
}
