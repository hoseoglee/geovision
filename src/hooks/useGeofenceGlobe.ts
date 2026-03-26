import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useGeofenceStore } from '@/store/useGeofenceStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useCorrelationStore } from '@/store/useCorrelationStore';
import { GeofenceMonitor, type GeofenceDef } from '@/correlation/geofenceMonitor';
import type { SpatialEntity } from '@/correlation/SpatialIndex';

const monitor = new GeofenceMonitor();

export function useGeofenceGlobe(viewerRef: React.MutableRefObject<Cesium.Viewer | null>) {
  const entitiesRef = useRef<Cesium.Entity[]>([]);
  const previewRef = useRef<Cesium.Entity[]>([]);
  const drawingMode = useGeofenceStore((s) => s.drawingMode);
  const addVertex = useGeofenceStore((s) => s.addVertex);
  const geofences = useGeofenceStore((s) => s.geofences);
  const drawingVertices = useGeofenceStore((s) => s.drawingVertices);
  const addEvent = useGeofenceStore((s) => s.addEvent);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !drawingMode) return;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const ray = viewer.camera.getPickRay(click.position);
      if (!ray) return;
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (!cartesian) return;
      const carto = Cesium.Cartographic.fromCartesian(cartesian);
      addVertex({ lat: Cesium.Math.toDegrees(carto.latitude), lng: Cesium.Math.toDegrees(carto.longitude) });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    return () => { handler.destroy(); };
  }, [drawingMode, addVertex, viewerRef]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    for (const e of entitiesRef.current) viewer.entities.remove(e);
    entitiesRef.current = [];
    for (const gf of geofences) {
      const color = Cesium.Color.fromCssColorString(gf.color);
      const fill = color.withAlpha(0.15);
      const outline = color.withAlpha(gf.enabled ? 0.7 : 0.2);
      const lbl = { text: gf.name, font: '10px monospace', fillColor: color, style: Cesium.LabelStyle.FILL_AND_OUTLINE, outlineWidth: 2, outlineColor: Cesium.Color.BLACK, scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 5e6, 0.3), show: false, disableDepthTestDistance: Number.POSITIVE_INFINITY };
      if (gf.shape === 'polygon' && gf.vertices.length >= 3) {
        entitiesRef.current.push(viewer.entities.add({ name: gf.name, polygon: { hierarchy: new Cesium.PolygonHierarchy(gf.vertices.map(v => Cesium.Cartesian3.fromDegrees(v.lng, v.lat))), material: fill, outline: true, outlineColor: outline, outlineWidth: 2, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND }, label: { ...lbl, verticalOrigin: Cesium.VerticalOrigin.CENTER, horizontalOrigin: Cesium.HorizontalOrigin.CENTER } }));
      } else if (gf.shape === 'circle' && gf.center && gf.radiusKm) {
        entitiesRef.current.push(viewer.entities.add({ name: gf.name, position: Cesium.Cartesian3.fromDegrees(gf.center.lng, gf.center.lat), ellipse: { semiMajorAxis: gf.radiusKm * 1000, semiMinorAxis: gf.radiusKm * 1000, material: fill, outline: true, outlineColor: outline, outlineWidth: 2, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND }, label: { ...lbl, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -12) } }));
      }
    }
  }, [geofences, viewerRef]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    for (const e of previewRef.current) viewer.entities.remove(e);
    previewRef.current = [];
    if (!drawingMode || drawingVertices.length === 0) return;
    for (const v of drawingVertices) {
      previewRef.current.push(viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(v.lng, v.lat), point: { pixelSize: 6, color: Cesium.Color.CYAN, outlineColor: Cesium.Color.WHITE, outlineWidth: 1, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: Number.POSITIVE_INFINITY } }));
    }
    if (drawingMode === 'polygon' && drawingVertices.length >= 2) {
      previewRef.current.push(viewer.entities.add({ polyline: { positions: drawingVertices.map(v => Cesium.Cartesian3.fromDegrees(v.lng, v.lat)), width: 2, material: Cesium.Color.CYAN.withAlpha(0.8), clampToGround: true } }));
    }
    if (drawingMode === 'circle' && drawingVertices.length >= 2) {
      const c = drawingVertices[0], ed = drawingVertices[1];
      const dLat = (ed.lat - c.lat) * Math.PI / 180, dLng = (ed.lng - c.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(c.lat * Math.PI / 180) * Math.cos(ed.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const rm = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      previewRef.current.push(viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(c.lng, c.lat), ellipse: { semiMajorAxis: rm, semiMinorAxis: rm, material: Cesium.Color.CYAN.withAlpha(0.15), outline: true, outlineColor: Cesium.Color.CYAN.withAlpha(0.7), outlineWidth: 2, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND } }));
    }
  }, [drawingMode, drawingVertices, viewerRef]);

  useEffect(() => {
    const engine = useCorrelationStore.getState().engine;
    if (!engine) return;
    useGeofenceStore.getState().loadFromStorage();
    const interval = setInterval(() => {
      const gfs = useGeofenceStore.getState().geofences;
      if (gfs.length === 0) return;
      const allEntities: SpatialEntity[] = [];
      for (const layer of ['flights', 'ships', 'adsb']) allEntities.push(...engine.spatialIndex.getByLayer(layer));
      if (allEntities.length === 0) return;
      const defs: GeofenceDef[] = gfs.map(g => ({ id: g.id, name: g.name, shape: g.shape, vertices: g.vertices, center: g.center, radiusKm: g.radiusKm, color: g.color, targetLayers: g.targetLayers, enabled: g.enabled }));
      const events = monitor.evaluate(defs, allEntities);
      for (const evt of events) {
        addEvent({ geofenceId: evt.geofenceId, geofenceName: evt.geofenceName, entityId: evt.entityId, entityLayer: evt.entityLayer, eventType: evt.eventType, lat: evt.lat, lng: evt.lng });
        useAlertStore.getState().addAlert({ severity: evt.eventType === 'enter' ? 'warning' : 'info', category: 'geofence', title: `GEOFENCE ${evt.eventType.toUpperCase()}`, message: `${evt.entityLayer} ${evt.entityId} ${evt.eventType === 'enter' ? 'entered' : 'exited'} ${evt.geofenceName}`, lat: evt.lat, lng: evt.lng });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [addEvent]);
}
