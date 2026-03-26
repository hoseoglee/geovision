import { useState, useMemo, useCallback } from 'react';
import { useGeofenceStore } from '@/store/useGeofenceStore';
import { useAppStore } from '@/store/useAppStore';
import type { Geofence, GeofenceEvent, GeofenceShape, GeofenceTargetLayer } from '@/store/useGeofenceStore';

const COLORS = ['#FF4444', '#4DA6FF', '#FFD700', '#00FF88', '#FF69B4', '#00FFFF'];

const LAYER_OPTIONS: { value: GeofenceTargetLayer; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'flights', label: 'Flights' },
  { value: 'ships', label: 'Ships' },
  { value: 'adsb', label: 'Military' },
];

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return 'NOW';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

function getGeofenceCenter(gf: Geofence): { lat: number; lng: number } | null {
  if (gf.center) return gf.center;
  if (gf.vertices.length === 0) return null;
  const lat = gf.vertices.reduce((s, v) => s + v.lat, 0) / gf.vertices.length;
  const lng = gf.vertices.reduce((s, v) => s + v.lng, 0) / gf.vertices.length;
  return { lat, lng };
}

function GeofenceCreateForm({ onFinish, onCancel }: {
  onFinish: (name: string, color: string, layers: GeofenceTargetLayer[]) => void;
  onCancel: () => void;
}) {
  const geofences = useGeofenceStore((s) => s.geofences);
  const nextLetter = String.fromCharCode(65 + (geofences.length % 26));
  const [name, setName] = useState(`Zone ${nextLetter}`);
  const [color, setColor] = useState(COLORS[geofences.length % COLORS.length]);
  const [layers, setLayers] = useState<GeofenceTargetLayer[]>(['all']);

  const toggleLayer = (layer: GeofenceTargetLayer) => {
    if (layer === 'all') { setLayers(['all']); return; }
    const next = layers.filter((l) => l !== 'all');
    if (next.includes(layer)) {
      const filtered = next.filter((l) => l !== layer);
      setLayers(filtered.length === 0 ? ['all'] : filtered);
    } else {
      setLayers([...next, layer]);
    }
  };

  return (
    <div className="mt-2 p-2 bg-zinc-800/60 rounded border border-zinc-700/50 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-[9px] w-10 shrink-0">NAME</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 font-mono outline-none focus:border-cyan-500/50"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) onFinish(name.trim(), color, layers);
            if (e.key === 'Escape') onCancel();
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-[9px] w-10 shrink-0">COLOR</span>
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-4 h-4 rounded-sm border transition-all ${color === c ? 'border-white scale-110' : 'border-zinc-600/50 hover:border-zinc-400'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-[9px] w-10 shrink-0">TRACK</span>
        <div className="flex gap-1 flex-wrap">
          {LAYER_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => toggleLayer(opt.value)}
              className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                layers.includes(opt.value) ? 'border-cyan-500/50 text-cyan-400 bg-cyan-900/20' : 'border-zinc-700/50 text-zinc-600 hover:text-zinc-400'
              }`}>{opt.label}</button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-1.5 pt-1">
        <button onClick={onCancel} className="text-[9px] font-mono px-2 py-0.5 rounded border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors">CANCEL</button>
        <button onClick={() => name.trim() && onFinish(name.trim(), color, layers)} className="text-[9px] font-mono px-2 py-0.5 rounded border border-cyan-500/40 text-cyan-400 hover:bg-cyan-900/30 transition-colors">CREATE</button>
      </div>
    </div>
  );
}

function GeofenceRow({ gf, eventCount }: { gf: Geofence; eventCount: number }) {
  const removeGeofence = useGeofenceStore((s) => s.removeGeofence);
  const toggleGeofence = useGeofenceStore((s) => s.toggleGeofence);
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);

  const handleNavigate = () => {
    const center = getGeofenceCenter(gf);
    if (center) setCameraTarget({ latitude: center.lat, longitude: center.lng, height: gf.radiusKm ? gf.radiusKm * 5000 : 800000 });
  };

  return (
    <div className={`flex items-center gap-1.5 py-1 group ${!gf.enabled ? 'opacity-40' : ''}`}>
      <button onClick={handleNavigate} className="flex-1 min-w-0 flex items-center gap-1.5 text-left hover:text-cyan-400 transition-colors" title="Navigate">
        <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: gf.color }} />
        <span className="text-zinc-300 text-[10px] font-mono truncate">{gf.name}</span>
      </button>
      {eventCount > 0 && <span className="text-yellow-400 text-[9px] font-mono shrink-0">{'\u26A1'}{eventCount}</span>}
      <button onClick={() => toggleGeofence(gf.id)}
        className={`text-[8px] font-mono px-1 py-0.5 rounded border transition-colors shrink-0 ${gf.enabled ? 'border-green-500/40 text-green-400 hover:bg-green-900/30' : 'border-zinc-600/40 text-zinc-600 hover:bg-zinc-800/30'}`}>
        {gf.enabled ? 'ON' : 'OFF'}
      </button>
      <button onClick={() => removeGeofence(gf.id)} className="text-zinc-600 hover:text-red-400 text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove">{'\u2715'}</button>
    </div>
  );
}

function DrawingStatus() {
  const drawingMode = useGeofenceStore((s) => s.drawingMode);
  const drawingVertices = useGeofenceStore((s) => s.drawingVertices);
  const cancelDrawing = useGeofenceStore((s) => s.cancelDrawing);
  if (!drawingMode) return null;

  return (
    <div className="mt-2 p-1.5 bg-cyan-950/30 border border-cyan-500/30 rounded text-[9px] font-mono">
      <div className="flex items-center justify-between">
        <span className="text-cyan-400 animate-pulse">
          {drawingMode === 'polygon' ? `Drawing polygon — ${drawingVertices.length} vertices` : drawingVertices.length === 0 ? 'Click center point, then click to set radius.' : 'Click to set radius.'}
        </span>
        <button onClick={cancelDrawing} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-red-500/40 text-red-400 hover:bg-red-900/30 transition-colors">CANCEL</button>
      </div>
      {drawingMode === 'polygon' && <p className="text-zinc-600 text-[8px] mt-0.5">Click map to add vertices. Press FINISH when done.</p>}
    </div>
  );
}

export function GeofenceControls() {
  const geofences = useGeofenceStore((s) => s.geofences);
  const events = useGeofenceStore((s) => s.events);
  const drawingMode = useGeofenceStore((s) => s.drawingMode);
  const drawingVertices = useGeofenceStore((s) => s.drawingVertices);
  const startDrawing = useGeofenceStore((s) => s.startDrawing);
  const finishDrawing = useGeofenceStore((s) => s.finishDrawing);
  const cancelDrawing = useGeofenceStore((s) => s.cancelDrawing);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of events) counts[ev.geofenceId] = (counts[ev.geofenceId] || 0) + 1;
    return counts;
  }, [events]);

  const handleStartDraw = (shape: GeofenceShape) => { startDrawing(shape); setShowCreateForm(false); };
  const handleFinishDrawing = useCallback((name: string, color: string, layers: GeofenceTargetLayer[]) => { finishDrawing(name, color, layers); setShowCreateForm(false); }, [finishDrawing]);
  const handleCancelCreate = useCallback(() => { cancelDrawing(); setShowCreateForm(false); }, [cancelDrawing]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-zinc-400 text-[10px] font-bold tracking-widest">GEOFENCE MONITOR</h3>
        {geofences.length > 0 && <span className="bg-zinc-700/60 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded-full font-mono">{geofences.length}</span>}
      </div>

      {!drawingMode && (
        <div className="flex gap-1.5 mb-2">
          <button onClick={() => handleStartDraw('polygon')} className="text-[9px] font-mono px-2 py-0.5 rounded border border-cyan-500/40 text-cyan-400 hover:bg-cyan-900/30 transition-colors">+ Polygon</button>
          <button onClick={() => handleStartDraw('circle')} className="text-[9px] font-mono px-2 py-0.5 rounded border border-cyan-500/40 text-cyan-400 hover:bg-cyan-900/30 transition-colors">+ Circle</button>
        </div>
      )}

      <DrawingStatus />

      {drawingMode === 'polygon' && drawingVertices.length >= 3 && !showCreateForm && (
        <button onClick={() => setShowCreateForm(true)} className="mt-1.5 w-full text-[9px] font-mono px-2 py-1 rounded border border-green-500/40 text-green-400 hover:bg-green-900/30 transition-colors">
          FINISH ({drawingVertices.length} vertices) — Name & Save
        </button>
      )}
      {drawingMode === 'circle' && drawingVertices.length >= 2 && !showCreateForm && (
        <button onClick={() => setShowCreateForm(true)} className="mt-1.5 w-full text-[9px] font-mono px-2 py-1 rounded border border-green-500/40 text-green-400 hover:bg-green-900/30 transition-colors">
          FINISH Circle — Name & Save
        </button>
      )}

      {showCreateForm && <GeofenceCreateForm onFinish={handleFinishDrawing} onCancel={handleCancelCreate} />}

      {geofences.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {geofences.map((gf) => <GeofenceRow key={gf.id} gf={gf} eventCount={eventCounts[gf.id] || 0} />)}
        </div>
      )}

      {geofences.length === 0 && !drawingMode && <p className="text-zinc-600 text-[8px] font-mono mt-1">No geofences. Draw one to start monitoring.</p>}
    </div>
  );
}

function EventRow({ event }: { event: GeofenceEvent }) {
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);
  const isEnter = event.eventType === 'enter';
  const isDwell = event.eventType === 'dwell';

  return (
    <div className="px-3 py-2 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/40 transition-colors"
      onClick={() => setCameraTarget({ latitude: event.lat, longitude: event.lng, height: 200000 })}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold font-mono ${isEnter ? 'text-red-400' : isDwell ? 'text-yellow-400' : 'text-blue-400'}`}>
          {isEnter ? '\u25B6' : isDwell ? '\u25C8' : '\u25C1'} {event.eventType.toUpperCase()} {event.geofenceName}
        </span>
        <span className="text-zinc-600 text-[9px] font-mono">{timeAgo(event.timestamp)}</span>
      </div>
      <p className="text-zinc-500 text-[9px] font-mono mt-0.5">{event.entityLayer} {event.entityId}</p>
    </div>
  );
}

export function GeofenceEventPanel() {
  const [expanded, setExpanded] = useState(false);
  const events = useGeofenceStore((s) => s.events);
  const clearEvents = useGeofenceStore((s) => s.clearEvents);

  const recentCount = events.filter((e) => Date.now() - e.timestamp < 300000).length;
  const hasEnter = events.some((e) => e.eventType === 'enter' && Date.now() - e.timestamp < 60000);

  if (events.length === 0 && !expanded) return null;

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)}
        className={`fixed bottom-8 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-xs backdrop-blur-sm transition-all border ${
          hasEnter ? 'bg-red-900/80 border-red-500/60 text-red-400 animate-pulse' : 'bg-zinc-800/60 border-zinc-600/40 text-zinc-400'
        }`}>
        <span className="text-[10px]">{'\u25CE'}</span>
        <span className="font-bold tracking-wider">GEOFENCE</span>
        {recentCount > 0 && <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold ${hasEnter ? 'bg-red-600/80 text-white' : 'bg-zinc-600/80 text-white'}`}>{recentCount}</span>}
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-4 z-50 w-[380px] max-h-[400px] flex flex-col bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 rounded shadow-2xl font-mono pointer-events-auto">
      <div className="flex justify-between items-center px-3 py-2 border-b border-zinc-700/40">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-[10px]">{'\u25CE'}</span>
          <span className="text-zinc-300 text-xs font-bold tracking-widest">GEOFENCE EVENTS</span>
          {events.length > 0 && <span className="bg-zinc-700/60 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{events.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearEvents} className="text-zinc-500 hover:text-zinc-300 text-[10px] border border-zinc-700/40 px-2 py-0.5 rounded">CLEAR</button>
          <button onClick={() => setExpanded(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">{'\u2715'}</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
        {events.length === 0 ? (
          <div className="text-zinc-600 text-xs text-center py-8 font-mono">NO GEOFENCE EVENTS</div>
        ) : events.map((event) => <EventRow key={event.id} event={event} />)}
      </div>
    </div>
  );
}

export default GeofenceEventPanel;
