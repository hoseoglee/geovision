

import { useEffect, useRef, useCallback, useState } from 'react';
import * as Cesium from 'cesium';
import { useAppStore } from '@/store/useAppStore';
import type { SatelliteData } from '@/providers/SatelliteProvider';
import { propagateSatellite } from '@/providers/SatelliteProvider';
import type { FlightData } from '@/providers/FlightProvider';
import type { MilAircraftData } from '@/providers/AdsbProvider';
import type { ShipData } from '@/providers/ShipProvider';
import { fetchSatellites } from '@/providers/SatelliteProvider';
import { fetchFlights } from '@/providers/FlightProvider';
import { fetchEarthquakes } from '@/providers/EarthquakeProvider';
import { fetchShips, connectAISStream, disconnectAISStream, isAISConnected } from '@/providers/ShipProvider';
import { fetchCCTVs, setSelectedCCTV, bootstrapWindyCams, subscribeAllCCTVs, type CCTVData } from '@/providers/CCTVProvider';
import { fetchMilAircraft } from '@/providers/AdsbProvider';
import { fetchWeather, weatherCodeToIcon } from '@/providers/WeatherProvider';
import { fetchTyphoons } from '@/providers/TyphoonProvider';
import { fetchVolcanoes } from '@/providers/VolcanoProvider';
import { fetchWildfires } from '@/providers/WildfireProvider';
import { fetchOsint, type OsintData, escapeHtml, sanitizeUrl } from '@/providers/OsintProvider';
import { CHOKEPOINTS } from '@/data/chokepoints';
import {
  SUBMARINE_CABLES, MILITARY_BASES, NUCLEAR_PLANTS, MAJOR_PORTS, OCEAN_CURRENTS,
} from '@/data/overlayData';
import { getSunPosition } from '@/components/SunPosition';
import { useCorrelationStore } from '@/store/useCorrelationStore';
import { useTimelineStore } from '@/store/useTimelineStore';
import { useNewsClusterStore } from '@/store/useNewsClusterStore';
import { getVisibleClusterState } from '@/osint/NewsClusterEngine';
import type { SpatialEntity } from '@/correlation/SpatialIndex';
import crtShader from '@/filters/crt';
import nightVisionShader from '@/filters/nightVision';
import thermalShader from '@/filters/thermal';
import flirShader from '@/filters/flir';
import animeShader from '@/filters/anime';
import lutShader from '@/filters/lut';
import { createHeatmapPrimitive, createHaloPrimitive, precisionForAltitude, aggregatePoints, type HeatmapPoint } from '@/layers/HeatmapLayer';
import { AnomalyHaloDetector } from '@/layers/AnomalyHaloDetector';
import { useGeofenceGlobe } from "@/hooks/useGeofenceGlobe";
import { useMeasurementGlobe } from "@/hooks/useMeasurementGlobe";
import { trajectoryDB, TrajectoryRenderer, type PositionRecord } from '@/trajectory';
import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { behavioralProfiler } from '@/behavioral';

const FILTER_SHADERS: Record<string, string> = {
  crt: crtShader,
  nightVision: nightVisionShader,
  thermal: thermalShader,
  flir: flirShader,
  anime: animeShader,
  lut: lutShader,
};

// 비행기 아이콘 SVG — 밝은 노란색, 큰 삼각형
const AIRPLANE_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 10,24 16,20 22,24" fill="#FFD700" stroke="#FFF" stroke-width="1"/><polygon points="6,14 16,10 26,14 16,12" fill="#FFD700" stroke="#FFF" stroke-width="0.5"/></svg>`)}`;

// 위성 아이콘 — 밝은 시안 다이아몬드
const SATELLITE_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill="#00FFFF" stroke="#FFF" stroke-width="0.5" opacity="0.9"/></svg>`)}`;

// ISS 전용 아이콘 — 크고 눈에 띄는 금색 마커
const ISS_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="#FFD700" stroke-width="2" opacity="0.6"/><circle cx="20" cy="20" r="8" fill="#FFD700" stroke="#FFF" stroke-width="1.5"/><line x1="2" y1="20" x2="38" y2="20" stroke="#FFD700" stroke-width="2" opacity="0.8"/><line x1="20" y1="8" x2="20" y2="32" stroke="#FFD700" stroke-width="1" opacity="0.5"/></svg>`)}`;

// CCTV 표시 — 녹색 점 (카메라 아이콘 제거, PointPrimitiveCollection 사용)

// 선박 아이콘 — 밝은 파란색 삼각형 (위를 향하는 뱃머리)
const SHIP_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><polygon points="10,2 4,16 10,13 16,16" fill="#4DA6FF" stroke="#FFF" stroke-width="0.8"/></svg>`)}`;

const SHIP_TYPE_COLORS: Record<string, Cesium.Color> = {
  cargo: Cesium.Color.fromCssColorString('#4DA6FF'),
  tanker: Cesium.Color.fromCssColorString('#FF8C00'),
  passenger: Cesium.Color.fromCssColorString('#FF69B4'),
  fishing: Cesium.Color.fromCssColorString('#90EE90'),
  military: Cesium.Color.fromCssColorString('#FF4444'),
};

type PrimitiveRef = Cesium.PointPrimitiveCollection | Cesium.BillboardCollection | null;

type BillboardMeta = {
  type: 'satellite';
  data: SatelliteData;
} | {
  type: 'flight';
  data: FlightData;
} | {
  type: 'ship';
  data: ShipData;
} | {
  type: 'adsb';
  data: MilAircraftData;
};

interface TooltipState {
  x: number;
  y: number;
  lines: string[];
  color: string;
}

export default function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const stageRef = useRef<Cesium.PostProcessStage | Cesium.PostProcessStageComposite | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [windyCamsVersion, setWindyCamsVersion] = useState(0);
  const lastMouseUpdateRef = useRef(0);

  // Billboard → 데이터 매핑 (호버/클릭용)
  const billboardDataMap = useRef<Map<any, BillboardMeta>>(new Map());
  // 호버 시 궤도/항적 엔티티
  const hoverTrailRef = useRef<Cesium.Entity[]>([]);

  // Primitive 기반 레이어 참조 (Entity 대신 → 성능 대폭 향상)
  const satPrimitiveRef = useRef<PrimitiveRef>(null);
  const flightPrimitiveRef = useRef<Cesium.BillboardCollection | null>(null);
  const shipPrimitiveRef = useRef<Cesium.BillboardCollection | null>(null);
  const earthquakeEntitiesRef = useRef<Cesium.Entity[]>([]);
  const quakeAnimFrameRef = useRef<number>(0);
  const issEntitiesRef = useRef<Cesium.Entity[]>([]);
  const overlayEntitiesRef = useRef<Cesium.Entity[]>([]);
  const overlayImageryRef = useRef<Cesium.ImageryLayer[]>([]);
  const buildingsTilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const cctvPrimitiveRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const cctvLabelCollRef = useRef<Cesium.LabelCollection | null>(null);
  // CCTV LOD: FOV/썸네일 엔티티 (저고도에서만 동적 생성)
  const cctvFovEntitiesRef = useRef<Cesium.Entity[]>([]);
  const cctvThumbnailEntitiesRef = useRef<Cesium.Entity[]>([]);
  // CCTV Billboard → CCTVData 매핑 (클릭 핸들링)
  const cctvBillboardDataRef = useRef<Map<any, CCTVData>>(new Map());
  // CCTV 카메라 이동 리스너 해제 함수
  const cctvCameraListenerRef = useRef<(() => void) | null>(null);
  const adsbPrimitiveRef = useRef<Cesium.BillboardCollection | null>(null);
  const adsbLabelCollRef = useRef<Cesium.LabelCollection | null>(null);

  // Phase 1 — 데이터 강화 레이어
  const weatherBillboardRef = useRef<Cesium.BillboardCollection | null>(null);
  const weatherLabelRef = useRef<Cesium.LabelCollection | null>(null);
  const typhoonEntitiesRef = useRef<Cesium.Entity[]>([]);
  const typhoonBillboardRef = useRef<Cesium.BillboardCollection | null>(null);
  const volcanoEntitiesRef = useRef<Cesium.Entity[]>([]);
  const wildfirePointsRef = useRef<Cesium.PointPrimitiveCollection | null>(null);

  // OSINT 뉴스 마커
  const osintEntitiesRef = useRef<Cesium.Entity[]>([]);

  // News Cluster Timelapse arcs & markers
  const clusterArcEntitiesRef = useRef<Cesium.Entity[]>([]);
  const clusterMarkerEntitiesRef = useRef<Cesium.Entity[]>([]);

  // Timeline playback markers
  const timelineMarkersRef = useRef<Cesium.Entity[]>([]);

  // Trajectory tracking
  const trajectoryRendererRef = useRef<TrajectoryRenderer | null>(null);
  const trajectoryEntityMapRef = useRef<Map<string, { lat: number; lng: number; altitude: number; heading: number; speed: number; entityType: 'flight' | 'ship' | 'adsb' }>>(new Map());

  const activeFilters = useAppStore((s) => s.activeFilters);
  const filterParams = useAppStore((s) => s.filterParams);
  const activeOverlays = useAppStore((s) => s.activeOverlays);
  const cameraTarget = useAppStore((s) => s.cameraTarget);
  const activeLayers = useAppStore((s) => s.activeLayers);
  const setDataCounts = useAppStore((s) => s.setDataCounts);
  const setMouseCoords = useAppStore((s) => s.setMouseCoords);
  const setCameraAltitude = useAppStore((s) => s.setCameraAltitude);
  const setSelectedEntity = useAppStore((s) => s.setSelectedEntity);
  const setLastUpdated = useAppStore((s) => s.setLastUpdated);

  const clearEntities = useCallback((entities: Cesium.Entity[], viewer: Cesium.Viewer) => {
    for (const e of entities) {
      viewer.entities.remove(e);
    }
    entities.length = 0;
  }, []);

  const removePrimitive = useCallback((ref: React.MutableRefObject<PrimitiveRef>, viewer: Cesium.Viewer) => {
    if (ref.current) {
      viewer.scene.primitives.remove(ref.current);
      ref.current = null;
    }
  }, []);

  // Cesium Viewer 초기화
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const token = import.meta.env.VITE_CESIUM_TOKEN;
    const hasValidToken = token && token !== 'placeholder';

    if (hasValidToken) {
      Cesium.Ion.defaultAccessToken = token;
    }

    const viewer = new Cesium.Viewer(containerRef.current, {
      timeline: false,
      animation: false,
      homeButton: false,
      geocoder: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      imageryProvider: hasValidToken ? undefined : false as any,
      requestRenderMode: true,
      maximumRenderTimeChange: 0.5,
    });

    // Expose viewer for debugging
    (window as any).__cesiumViewer = viewer;

    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a1628');

    // 대기권 글로우 효과
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 2.0e-4;

    viewerRef.current = viewer;

    // Initialize trajectory renderer & DB
    trajectoryRendererRef.current = new TrajectoryRenderer(viewer);
    trajectoryDB.init();

    // 데이터 업데이트 시 렌더 요청
    const requestRender = () => viewer.scene.requestRender();
    viewer.clock.onTick.addEventListener(requestRender);

    if (hasValidToken) {
      (async () => {
        try {
          const tileset = await Cesium.createGooglePhotorealistic3DTileset();
          viewer.scene.primitives.add(tileset);
        } catch (e) {
          console.warn('Google 3D Tiles not available:', e);
        }
      })();
    } else {
      const cartoProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        credit: new Cesium.Credit('© OpenStreetMap contributors © CARTO'),
        minimumLevel: 0,
        maximumLevel: 18,
      });
      viewer.imageryLayers.addImageryProvider(cartoProvider);
    }

    // 호버 시 라벨/툴팁 표시 + 마우스 좌표 추적
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    let lastPicked: Cesium.Entity | null = null;
    handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
      // 이전 라벨 숨기기
      if (lastPicked?.label) {
        lastPicked.label.show = new Cesium.ConstantProperty(false);
        lastPicked = null;
      }
      const picked = viewer.scene.pick(movement.endPosition);

      // Entity 라벨 (초크포인트, 오버레이 등)
      if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity && picked.id.label) {
        picked.id.label.show = new Cesium.ConstantProperty(true);
        lastPicked = picked.id;
      }

      // 이전 호버 궤도/항적 제거
      for (const e of hoverTrailRef.current) viewer.entities.remove(e);
      hoverTrailRef.current = [];

      // Billboard 툴팁 + 궤도/항적 (위성, 항공기, 선박)
      if (Cesium.defined(picked) && picked.primitive && !(picked.id instanceof Cesium.Entity)) {
        const meta = billboardDataMap.current.get(picked.primitive);
        if (meta) {
          const sx = movement.endPosition.x;
          const sy = movement.endPosition.y;
          let lines: string[] = [];
          let color = '#00FFFF';

          if (meta.type === 'satellite') {
            const d = meta.data;
            color = '#00FFFF';
            lines = [
              `🛰 ${d.name}`,
              `NORAD: ${d.noradId}`,
              `ALT: ${d.alt.toFixed(0)} km`,
              `${d.lat.toFixed(2)}°, ${d.lng.toFixed(2)}°`,
            ];
            // 위성 궤도 그리기 (±45분, 1분 간격)
            if (d.satrec) {
              const orbitPoints: Cesium.Cartesian3[] = [];
              const now = Date.now();
              for (let m = -45; m <= 45; m++) {
                const t = new Date(now + m * 60000);
                const pos = propagateSatellite(d.satrec, t);
                if (pos) {
                  orbitPoints.push(Cesium.Cartesian3.fromDegrees(pos.lng, pos.lat, pos.alt * 1000));
                }
              }
              if (orbitPoints.length > 2) {
                // 과거 궤도 (점선, 어두운 색)
                const pastIdx = 45; // index 0~44 = past, 45 = now, 46~90 = future
                const pastPoints = orbitPoints.slice(0, pastIdx + 1);
                const futurePoints = orbitPoints.slice(pastIdx);
                if (pastPoints.length > 1) {
                  hoverTrailRef.current.push(viewer.entities.add({
                    polyline: {
                      positions: pastPoints,
                      width: 1.5,
                      material: new Cesium.PolylineDashMaterialProperty({
                        color: Cesium.Color.CYAN.withAlpha(0.3),
                        dashLength: 8,
                      }),
                    },
                  }));
                }
                if (futurePoints.length > 1) {
                  hoverTrailRef.current.push(viewer.entities.add({
                    polyline: {
                      positions: futurePoints,
                      width: 2,
                      material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.2,
                        color: Cesium.Color.CYAN.withAlpha(0.6),
                      }),
                    },
                  }));
                }
              }
            }
          } else if (meta.type === 'flight') {
            const d = meta.data;
            color = '#FFD700';
            lines = [
              `✈ ${d.callsign || 'N/A'}`,
              `ALT: ${d.altitude.toFixed(0)} m`,
              `SPD: ${(d.velocity * 3.6).toFixed(0)} km/h`,
              `HDG: ${d.heading.toFixed(0)}°`,
            ];
            // 항공기 항적 그리기 (heading 기반 전방 투영)
            const headRad = (d.heading || 0) * Math.PI / 180;
            const spdKmPerMin = (d.velocity || 250) * 0.06; // m/s → km/min
            const trailPoints: Cesium.Cartesian3[] = [];
            const futurePoints: Cesium.Cartesian3[] = [];
            // 후방 항적 (5분)
            for (let m = -5; m <= 0; m++) {
              const dist = spdKmPerMin * m; // negative = backward
              const dlat = (dist * Math.cos(headRad)) / 111;
              const dlng = (dist * Math.sin(headRad)) / (111 * Math.cos(d.lat * Math.PI / 180));
              trailPoints.push(Cesium.Cartesian3.fromDegrees(d.lng + dlng, d.lat + dlat, d.altitude || 10000));
            }
            // 전방 투영 (10분)
            for (let m = 0; m <= 10; m++) {
              const dist = spdKmPerMin * m;
              const dlat = (dist * Math.cos(headRad)) / 111;
              const dlng = (dist * Math.sin(headRad)) / (111 * Math.cos(d.lat * Math.PI / 180));
              futurePoints.push(Cesium.Cartesian3.fromDegrees(d.lng + dlng, d.lat + dlat, d.altitude || 10000));
            }
            if (trailPoints.length > 1) {
              hoverTrailRef.current.push(viewer.entities.add({
                polyline: {
                  positions: trailPoints,
                  width: 1.5,
                  material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.YELLOW.withAlpha(0.3),
                    dashLength: 8,
                  }),
                },
              }));
            }
            if (futurePoints.length > 1) {
              hoverTrailRef.current.push(viewer.entities.add({
                polyline: {
                  positions: futurePoints,
                  width: 2,
                  material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.2,
                    color: Cesium.Color.YELLOW.withAlpha(0.6),
                  }),
                },
              }));
            }
          } else if (meta.type === 'ship') {
            const d = meta.data;
            color = '#4DA6FF';
            lines = [
              `🚢 ${d.name}`,
              `MMSI: ${d.mmsi}`,
              `TYPE: ${d.shipType.toUpperCase()}`,
              `SPD: ${d.speed.toFixed(1)} kn`,
              `HDG: ${d.heading.toFixed(0)}°`,
            ];
            // 선박 항적 그리기 (heading 기반)
            const headRad = (d.heading || 0) * Math.PI / 180;
            const spdKmPerMin = (d.speed || 10) * 1.852 / 60; // knots → km/min
            const trailPoints: Cesium.Cartesian3[] = [];
            const futurePoints: Cesium.Cartesian3[] = [];
            // 후방 항적 (15분)
            for (let m = -15; m <= 0; m++) {
              const dist = spdKmPerMin * m;
              const dlat = (dist * Math.cos(headRad)) / 111;
              const dlng = (dist * Math.sin(headRad)) / (111 * Math.cos(d.lat * Math.PI / 180));
              trailPoints.push(Cesium.Cartesian3.fromDegrees(d.lng + dlng, d.lat + dlat, 0));
            }
            // 전방 투영 (30분)
            for (let m = 0; m <= 30; m++) {
              const dist = spdKmPerMin * m;
              const dlat = (dist * Math.cos(headRad)) / 111;
              const dlng = (dist * Math.sin(headRad)) / (111 * Math.cos(d.lat * Math.PI / 180));
              futurePoints.push(Cesium.Cartesian3.fromDegrees(d.lng + dlng, d.lat + dlat, 0));
            }
            if (trailPoints.length > 1) {
              hoverTrailRef.current.push(viewer.entities.add({
                polyline: {
                  positions: trailPoints,
                  width: 1.5,
                  material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.fromCssColorString('#4DA6FF').withAlpha(0.3),
                    dashLength: 8,
                  }),
                  clampToGround: true,
                },
              }));
            }
            if (futurePoints.length > 1) {
              hoverTrailRef.current.push(viewer.entities.add({
                polyline: {
                  positions: futurePoints,
                  width: 2,
                  material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.2,
                    color: Cesium.Color.fromCssColorString('#4DA6FF').withAlpha(0.6),
                  }),
                  clampToGround: true,
                },
              }));
            }
          }
          setTooltip({ x: sx, y: sy, lines, color });
        } else {
          setTooltip(null);
        }
      } else {
        setTooltip(null);
      }

      // 마우스 좌표 추적 (throttled — 50ms)
      const now = performance.now();
      if (now - lastMouseUpdateRef.current > 50) {
        lastMouseUpdateRef.current = now;
        const ray = viewer.camera.getPickRay(movement.endPosition);
        if (ray) {
          const pos = viewer.scene.globe.pick(ray, viewer.scene);
          if (pos) {
            const carto = Cesium.Cartographic.fromCartesian(pos);
            setMouseCoords({
              lat: Cesium.Math.toDegrees(carto.latitude),
              lng: Cesium.Math.toDegrees(carto.longitude),
            });
          }
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // 클릭 → 상세 정보 + 외부 사이트 연결
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const picked = viewer.scene.pick(click.position);

      // CCTV Billboard 클릭 — BillboardCollection 기반 카메라
      if (Cesium.defined(picked) && picked.primitive) {
        const cctvData = cctvBillboardDataRef.current.get(picked.primitive);
        if (cctvData) {
          setSelectedCCTV(cctvData);
          return;
        }
      }

      // Billboard 클릭 (위성, 항공기, 선박)
      if (Cesium.defined(picked) && picked.primitive && !(picked.id instanceof Cesium.Entity)) {
        const meta = billboardDataMap.current.get(picked.primitive);
        if (meta) {
          if (meta.type === 'satellite') {
            const d = meta.data;
            const isISS = d.noradId === '25544';
            setSelectedEntity({
              type: 'satellite',
              name: isISS ? 'ISS (International Space Station)' : d.name,
              details: {
                NORAD_ID: d.noradId,
                ALTITUDE: `${d.alt.toFixed(1)} km`,
                LAT: d.lat.toFixed(4),
                LNG: d.lng.toFixed(4),
                ...(isISS ? { CREW: '7 astronauts', SPEED: '~27,600 km/h' } : {}),
              },
              url: isISS
                ? 'https://www.youtube.com/watch?v=xRPjKQtRXR8'
                : `https://www.n2yo.com/satellite/?s=${d.noradId}`,
              newsQuery: isISS ? 'ISS International Space Station' : `${d.name} satellite`,
            });
          } else if (meta.type === 'flight') {
            const d = meta.data;
            const cs = d.callsign.trim();
            setSelectedEntity({
              type: 'flight',
              name: cs || 'Unknown',
              details: {
                CALLSIGN: cs || 'N/A',
                ALTITUDE: `${d.altitude.toFixed(0)} m`,
                SPEED: `${(d.velocity * 3.6).toFixed(0)} km/h`,
                HEADING: `${d.heading.toFixed(0)}°`,
                LAT: d.lat.toFixed(4),
                LNG: d.lng.toFixed(4),
              },
              url: cs ? `https://www.flightradar24.com/${cs}` : undefined,
              newsQuery: cs ? `${cs} flight` : undefined,
            });
          } else if (meta.type === 'ship') {
            const d = meta.data;
            setSelectedEntity({
              type: 'ship',
              name: d.name,
              details: {
                MMSI: d.mmsi,
                TYPE: d.shipType.toUpperCase(),
                SPEED: `${d.speed.toFixed(1)} kn`,
                HEADING: `${d.heading.toFixed(0)}°`,
                LAT: d.lat.toFixed(4),
                LNG: d.lng.toFixed(4),
              },
              url: `https://www.marinetraffic.com/en/ais/details/ships/mmsi:${d.mmsi}`,
              newsQuery: `${d.name} vessel ship`,
            });
          } else if (meta.type === 'adsb') {
            const d = meta.data;
            const trailCount = adsbTrailRef.current.get(d.callsign || d.hex)?.length || 0;
            setSelectedEntity({
              type: 'adsb',
              name: d.callsign || d.hex,
              details: {
                TYPE: d.type,
                CALLSIGN: d.callsign || 'N/A',
                HEX: d.hex,
                ALTITUDE: `FL${Math.round(d.altitude / 100)} (${d.altitude.toLocaleString()} ft)`,
                SPEED: `${d.speed} kn (${Math.round(d.speed * 1.852)} km/h)`,
                HEADING: `${d.heading.toFixed(0)}°`,
                SQUAWK: d.squawk || 'N/A',
                CATEGORY: d.category || 'N/A',
                TRAIL: `${trailCount} points`,
                LAT: d.lat.toFixed(4),
                LNG: d.lng.toFixed(4),
              },
              url: d.hex ? `https://globe.adsbexchange.com/?icao=${d.hex}` : undefined,
              newsQuery: `${d.callsign || d.hex} military aircraft`,
            });
          }
          return;
        }
      }

      // Entity 클릭 (모든 오버레이 타입)
      if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity) {
        const entity = picked.id;

        // CCTV 카메라
        const cctvData = entity?.properties?.cctvData?.getValue(Cesium.JulianDate.now());
        if (cctvData) {
          setSelectedCCTV(cctvData);
          return;
        }

        const desc = entity.description?.getValue(Cesium.JulianDate.now()) || '';
        const name = entity.name || 'Unknown';
        const overlayType = (entity as any)._overlayType;
        const overlayData = (entity as any)._overlayData;

        // ── 오버레이 타입별 핸들링 ──
        if (overlayType === 'cable' && overlayData) {
          setSelectedEntity({
            type: 'cable',
            name: overlayData.name,
            details: { TYPE: 'SUBMARINE CABLE', LENGTH: `${overlayData.points.length} segments` },
            newsQuery: `${overlayData.name} submarine cable`,
          });
        } else if (overlayType === 'military_base' && overlayData) {
          setSelectedEntity({
            type: 'military_base',
            name: overlayData.name,
            details: {
              TYPE: overlayData.type.toUpperCase(),
              COUNTRY: overlayData.country,
              LAT: overlayData.lat.toFixed(3),
              LNG: overlayData.lng.toFixed(3),
            },
            newsQuery: `${overlayData.name} military base ${overlayData.country}`,
          });
        } else if (overlayType === 'nuclear_plant' && overlayData) {
          setSelectedEntity({
            type: 'nuclear_plant',
            name: overlayData.name,
            details: {
              STATUS: overlayData.status.toUpperCase(),
              REACTORS: `${overlayData.reactors} units`,
              COUNTRY: overlayData.country,
              LAT: overlayData.lat.toFixed(3),
              LNG: overlayData.lng.toFixed(3),
            },
            newsQuery: `${overlayData.name} nuclear plant`,
          });
        } else if (overlayType === 'port' && overlayData) {
          setSelectedEntity({
            type: 'port',
            name: overlayData.name,
            details: {
              RANK: `#${overlayData.rank} worldwide`,
              COUNTRY: overlayData.country,
              LAT: overlayData.lat.toFixed(3),
              LNG: overlayData.lng.toFixed(3),
            },
            newsQuery: `${overlayData.name} port shipping`,
          });
        } else if (overlayType === 'current' && overlayData) {
          setSelectedEntity({
            type: 'current',
            name: overlayData.name,
            details: {
              TYPE: overlayData.warm ? 'WARM CURRENT' : 'COLD CURRENT',
            },
            newsQuery: `${overlayData.name} ocean current climate`,
          });
        } else if ((entity as any)._chokepoint) {
          const cp = (entity as any)._chokepoint;
          setSelectedEntity({
            type: 'chokepoint',
            name: cp.name,
            details: { TYPE: cp.type.toUpperCase(), LAT: cp.lat.toFixed(3), LNG: cp.lng.toFixed(3), INFO: cp.info },
            newsQuery: `${cp.name} shipping geopolitics`,
          });
        } else if (desc.includes('Depth:')) {
          const parts = desc.replace(/<[^>]*>/g, '|').split('|').filter(Boolean).map(s => s.trim());
          const mag = parts[0] || '';
          const place = parts[1] || '';
          const depth = parts[2] || '';
          const time = parts[3] || '';
          setSelectedEntity({
            type: 'earthquake',
            name,
            details: {
              MAGNITUDE: mag,
              LOCATION: place,
              DEPTH: depth.replace('Depth: ', ''),
              TIME: time.replace('Time: ', ''),
            },
            url: `https://www.google.com/search?q=${encodeURIComponent(name)}`,
            newsQuery: `earthquake ${place || name}`,
          });
        }
      } else {
        setSelectedEntity(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 카메라 고도 추적
    viewer.camera.changed.addEventListener(() => {
      const carto = viewer.camera.positionCartographic;
      setCameraAltitude(carto.height);
    });
    // 초기 고도
    setCameraAltitude(viewer.camera.positionCartographic.height);

    // 전략 초크포인트 마커
    for (const cp of CHOKEPOINTS) {
      const color = cp.type === 'strait' ? Cesium.Color.ORANGE.withAlpha(0.8)
        : cp.type === 'canal' ? Cesium.Color.YELLOW.withAlpha(0.8)
        : cp.type === 'cape' ? Cesium.Color.CYAN.withAlpha(0.8)
        : Cesium.Color.RED.withAlpha(0.8);

      const entity = viewer.entities.add({
        name: cp.name,
        position: Cesium.Cartesian3.fromDegrees(cp.lng, cp.lat, 0),
        point: {
          pixelSize: 10,
          color,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
          outlineWidth: 2,
          scaleByDistance: new Cesium.NearFarScalar(1e5, 2.0, 1e7, 0.6),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `◆ ${cp.name}`,
          font: '10px monospace',
          fillColor: color,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          outlineColor: Cesium.Color.BLACK,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -12),
          scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 5e6, 0.3),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e6),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      (entity as any)._chokepoint = cp;
    }

    // --- 지평선 오클루전 컬링: 지구 반대편(카메라 음영 반구) 아이콘 숨기기 ---
    // 지구를 구체(반지름 = WGS84 적도 반지름)로 근사하여 카메라→아이템 광선이
    // 지구와 교차하면 숨김 처리한다. 고도가 높은 위성도 정확히 처리된다.
    const EARTH_R = Cesium.Ellipsoid.WGS84.maximumRadius; // ≈ 6378137 m
    let lastOcclusionMs = 0;

    const isHorizonVisible = (cam: Cesium.Cartesian3, item: Cesium.Cartesian3): boolean => {
      const dx = item.x - cam.x, dy = item.y - cam.y, dz = item.z - cam.z;
      const dist2 = dx*dx + dy*dy + dz*dz;
      if (dist2 === 0) return true;
      const dist = Math.sqrt(dist2);
      const nx = dx/dist, ny = dy/dist, nz = dz/dist;
      // 카메라→아이템 방향 광선과 지구 구체 교차 검사
      // 방정식: |c + t*n|² = R²  →  t² + 2(c·n)t + (|c|² - R²) = 0
      const cdot = cam.x*nx + cam.y*ny + cam.z*nz;
      const cSq = cam.x*cam.x + cam.y*cam.y + cam.z*cam.z;
      const discriminant = cdot*cdot - cSq + EARTH_R*EARTH_R;
      if (discriminant < 0) return true; // 광선이 지구에 닿지 않음
      const tHit = -cdot - Math.sqrt(discriminant);
      if (tHit < 0) return true; // 교차점이 카메라 뒤 (카메라가 지구 안에 있을 때)
      return tHit >= dist; // 아이템이 교차점보다 가까우면 가시
    };

    const applyHorizonOcclusion = () => {
      const now = performance.now();
      if (now - lastOcclusionMs < 100) return; // 100ms throttle
      lastOcclusionMs = now;

      const cam = viewer.camera.position;

      // BillboardCollection 기반 프리미티브 (위성, 항공기, 선박, 군용기, 태풍, 날씨)
      const billboardColls: (Cesium.BillboardCollection | null)[] = [
        satPrimitiveRef.current instanceof Cesium.BillboardCollection
          ? satPrimitiveRef.current
          : null,
        flightPrimitiveRef.current,
        shipPrimitiveRef.current,
        adsbPrimitiveRef.current,
        typhoonBillboardRef.current,
        weatherBillboardRef.current,
      ];
      for (const coll of billboardColls) {
        if (!coll) continue;
        for (let i = 0; i < coll.length; i++) {
          const bb = coll.get(i);
          if (bb.position) {
            bb.show = isHorizonVisible(cam, bb.position);
          }
        }
      }

      // PointPrimitiveCollection 기반 프리미티브 (CCTV, 산불)
      const pointColls: (Cesium.PointPrimitiveCollection | null)[] = [
        cctvPrimitiveRef.current,
        wildfirePointsRef.current,
      ];
      for (const coll of pointColls) {
        if (!coll) continue;
        for (let i = 0; i < coll.length; i++) {
          const pt = coll.get(i);
          if (pt.position) {
            pt.show = isHorizonVisible(cam, pt.position);
          }
        }
      }

      // Entity 기반 아이템: 지진, 화산, OSINT 마커
      for (const entityList of [
        earthquakeEntitiesRef.current,
        volcanoEntitiesRef.current,
        osintEntitiesRef.current,
      ]) {
        for (const entity of entityList) {
          if (!entity.position) continue;
          const pos = entity.position.getValue(viewer.clock.currentTime);
          if (pos) {
            entity.show = isHorizonVisible(cam, pos);
          }
        }
      }
    };

    viewer.scene.postRender.addEventListener(applyHorizonOcclusion);

    return () => {
      viewer.scene.postRender.removeEventListener(applyHorizonOcclusion);
      for (const e of hoverTrailRef.current) viewer.entities.remove(e);
      hoverTrailRef.current = [];
      handler.destroy();
      if (!viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
    };
  }, []);


  // Geofence system
  useGeofenceGlobe(viewerRef);
  // Measurement tools
  useMeasurementGlobe(viewerRef);
  // 위성 데이터 — PointPrimitiveCollection (Entity 대신, 성능 10배↑)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!activeLayers.includes('satellites')) {
      removePrimitive(satPrimitiveRef, viewer);
      setDataCounts('satellites', 0);
      return;
    }

    let cancelled = false;
    (async () => {
      const sats = await fetchSatellites();
      if (cancelled || !viewerRef.current) return;

      // 기존 위성 billboard 매핑 정리
      if (satPrimitiveRef.current && satPrimitiveRef.current instanceof Cesium.BillboardCollection) {
        for (let i = 0; i < satPrimitiveRef.current.length; i++) {
          billboardDataMap.current.delete(satPrimitiveRef.current.get(i));
        }
      }
      removePrimitive(satPrimitiveRef, viewer);

      const billboards = new Cesium.BillboardCollection({ scene: viewer.scene });

      // 이전 ISS 엔티티 정리
      for (const e of issEntitiesRef.current) viewer.entities.remove(e);
      issEntitiesRef.current = [];

      // 전체 위성 표시 (PointPrimitive라서 10K+도 가능)
      const subset = sats.slice(0, 2000);
      for (const sat of subset) {
        const isISS = sat.noradId === '25544';
        const bb = billboards.add({
          position: Cesium.Cartesian3.fromDegrees(sat.lng, sat.lat, sat.alt * 1000),
          image: isISS ? ISS_SVG : SATELLITE_SVG,
          width: isISS ? 36 : 12,
          height: isISS ? 36 : 12,
          scaleByDistance: isISS
            ? new Cesium.NearFarScalar(5e5, 2.0, 1e8, 0.6)
            : new Cesium.NearFarScalar(1e6, 1.5, 5e7, 0.4),
        });
        billboardDataMap.current.set(bb, { type: 'satellite', data: sat });

        // ISS 전용: 항상 보이는 라벨 + 글로우 링
        if (isISS) {
          const issPos = Cesium.Cartesian3.fromDegrees(sat.lng, sat.lat, sat.alt * 1000);
          const labelEntity = viewer.entities.add({
            name: 'ISS',
            position: issPos,
            label: {
              text: '  ISS',
              font: '12px monospace',
              fillColor: Cesium.Color.fromCssColorString('#FFD700'),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              pixelOffset: new Cesium.Cartesian2(18, 0),
              scaleByDistance: new Cesium.NearFarScalar(5e5, 1.2, 1e8, 0.5),
              show: true,
            },
          });
          issEntitiesRef.current.push(labelEntity);

          // 글로우 펄스 엔티티
          const glowEntity = viewer.entities.add({
            position: issPos,
            ellipse: {
              semiMinorAxis: 80000,
              semiMajorAxis: 80000,
              height: sat.alt * 1000,
              material: Cesium.Color.fromCssColorString('#FFD700').withAlpha(0.15),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString('#FFD700').withAlpha(0.4),
              outlineWidth: 1,
            },
          });
          issEntitiesRef.current.push(glowEntity);
        }
      }

      viewer.scene.primitives.add(billboards);
      satPrimitiveRef.current = billboards;
      setDataCounts('satellites', sats.length);
      setLastUpdated('satellites', Date.now());
    })();

    return () => { cancelled = true; };
  }, [activeLayers, removePrimitive, setDataCounts]);

  // 항공기 — Billboard + heading 회전 + 15초 주기 갱신
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!activeLayers.includes('flights')) {
      if (flightPrimitiveRef.current) {
        viewer.scene.primitives.remove(flightPrimitiveRef.current);
        flightPrimitiveRef.current = null;
      }
      setDataCounts('flights', 0);
      return;
    }

    let cancelled = false;

    async function updateFlights() {
      const flights = await fetchFlights();
      if (cancelled || !viewerRef.current) return;

      // 기존 항공기 billboard 매핑 정리
      if (flightPrimitiveRef.current) {
        for (let i = 0; i < flightPrimitiveRef.current.length; i++) {
          billboardDataMap.current.delete(flightPrimitiveRef.current.get(i));
        }
        viewer.scene.primitives.remove(flightPrimitiveRef.current);
      }

      const billboards = new Cesium.BillboardCollection({ scene: viewer.scene });

      let count = 0;
      for (const f of flights) {
        if (f.onGround) continue;
        const bb = billboards.add({
          position: Cesium.Cartesian3.fromDegrees(f.lng, f.lat, (f.altitude || 10000)),
          image: AIRPLANE_SVG,
          width: 20,
          height: 20,
          rotation: -Cesium.Math.toRadians(f.heading || 0),
          alignedAxis: Cesium.Cartesian3.UNIT_Z,
          scaleByDistance: new Cesium.NearFarScalar(5e4, 2.5, 5e6, 0.5),
        });
        billboardDataMap.current.set(bb, { type: 'flight', data: f });
        count++;
      }

      viewer.scene.primitives.add(billboards);
      flightPrimitiveRef.current = billboards;
      setDataCounts('flights', count);
      setLastUpdated('flights', Date.now());

      // Record flight positions for trajectory
      const now = Date.now();
      const posRecords: PositionRecord[] = [];
      for (const f of flights) {
        if (f.onGround || !f.callsign) continue;
        const eid = `flight-${f.callsign.trim()}`;
        trajectoryEntityMapRef.current.set(eid, {
          lat: f.lat, lng: f.lng, altitude: f.altitude || 10000,
          heading: f.heading || 0, speed: f.velocity || 0, entityType: 'flight',
        });
        if (useTrajectoryStore.getState().activeTrajectories.some((id) => id === eid)) {
          posRecords.push({ entityId: eid, entityType: 'flight', lat: f.lat, lng: f.lng, altitude: f.altitude || 10000, heading: f.heading || 0, speed: f.velocity || 0, timestamp: now });
        }
      }
      if (posRecords.length) {
        trajectoryDB.addPositions(posRecords);
        // 이미 저장된 프로파일이 있는 엔티티만 백그라운드 갱신 (신규는 패널에서 온디맨드 로드)
        for (const r of posRecords) {
          if (behavioralProfiler.loadProfile(r.entityId)) behavioralProfiler.refreshProfile(r.entityId);
        }
      }
    }

    // 초기 로드 + 15초마다 갱신
    updateFlights();
    const interval = setInterval(updateFlights, 15000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [activeLayers, setDataCounts]);

  // 선박(AIS) — Billboard + heading 회전 + WebSocket 실시간 업데이트
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!activeLayers.includes('ships')) {
      if (shipPrimitiveRef.current) {
        viewer.scene.primitives.remove(shipPrimitiveRef.current);
        shipPrimitiveRef.current = null;
      }
      disconnectAISStream();
      setDataCounts('ships', 0);
      return;
    }

    let cancelled = false;
    let refreshInterval: ReturnType<typeof setInterval>;

    function renderShips(ships: import('@/providers/ShipProvider').ShipData[]) {
      if (cancelled || !viewerRef.current) return;
      // 기존 선박 billboard 매핑 정리
      if (shipPrimitiveRef.current) {
        for (let i = 0; i < shipPrimitiveRef.current.length; i++) {
          billboardDataMap.current.delete(shipPrimitiveRef.current.get(i));
        }
        viewer.scene.primitives.remove(shipPrimitiveRef.current);
      }

      const billboards = new Cesium.BillboardCollection({ scene: viewer.scene });
      for (const ship of ships) {
        const color = SHIP_TYPE_COLORS[ship.shipType] || Cesium.Color.fromCssColorString('#4DA6FF');
        const bb = billboards.add({
          position: Cesium.Cartesian3.fromDegrees(ship.lng, ship.lat, 0),
          image: SHIP_SVG,
          width: 14,
          height: 14,
          rotation: -Cesium.Math.toRadians(ship.heading || 0),
          alignedAxis: Cesium.Cartesian3.UNIT_Z,
          scaleByDistance: new Cesium.NearFarScalar(5e4, 2.0, 5e6, 0.5),
          color,
        });
        billboardDataMap.current.set(bb, { type: 'ship', data: ship });
      }
      viewer.scene.primitives.add(billboards);
      shipPrimitiveRef.current = billboards;
      setDataCounts('ships', ships.length);
      setLastUpdated('ships', Date.now());

      // Record ship positions for trajectory
      const now = Date.now();
      const posRecords: PositionRecord[] = [];
      for (const s of ships) {
        const eid = `ship-${s.mmsi}`;
        trajectoryEntityMapRef.current.set(eid, {
          lat: s.lat, lng: s.lng, altitude: 0,
          heading: s.heading || 0, speed: s.speed || 0, entityType: 'ship',
        });
        if (useTrajectoryStore.getState().activeTrajectories.some((id) => id === eid)) {
          posRecords.push({ entityId: eid, entityType: 'ship', lat: s.lat, lng: s.lng, altitude: 0, heading: s.heading || 0, speed: s.speed || 0, timestamp: now });
        }
      }
      if (posRecords.length) {
        trajectoryDB.addPositions(posRecords);
        // 이미 저장된 프로파일이 있는 엔티티만 백그라운드 갱신 (신규는 패널에서 온디맨드 로드)
        for (const r of posRecords) {
          if (behavioralProfiler.loadProfile(r.entityId)) behavioralProfiler.refreshProfile(r.entityId);
        }
      }
    }

    // 초기 로드
    (async () => {
      const ships = await fetchShips();
      renderShips(ships);
    })();

    // AIS WebSocket 연결 시 10초마다 갱신
    const apiKey = import.meta.env.VITE_AISSTREAM_KEY;
    if (apiKey && apiKey !== 'placeholder') {
      connectAISStream(apiKey);
      refreshInterval = setInterval(async () => {
        const ships = await fetchShips();
        renderShips(ships);
      }, 5000);
    }

    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
    };
  }, [activeLayers, setDataCounts]);

  // 지진 — 펄스 링 애니메이션 + Entity (개수 적으므로 Entity OK)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!activeLayers.includes('earthquakes')) {
      clearEntities(earthquakeEntitiesRef.current, viewer);
      cancelAnimationFrame(quakeAnimFrameRef.current);
      setDataCounts('earthquakes', 0);
      return;
    }

    let cancelled = false;
    (async () => {
      const quakes = await fetchEarthquakes();
      if (cancelled || !viewerRef.current) return;

      clearEntities(earthquakeEntitiesRef.current, viewer);

      for (const q of quakes) {
        const intensity = Math.min(1, q.magnitude / 8);
        const baseSize = Math.max(5, q.magnitude * 4);
        const color = Cesium.Color.fromHsl(0.0, 1.0, 0.5 + intensity * 0.3, 0.8);
        const pos = Cesium.Cartesian3.fromDegrees(q.lng, q.lat, 0);

        // 중심점
        const quakeName = `M${q.magnitude.toFixed(1)} - ${q.place}`;
        const quakeTime = new Date(q.time).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
        const quakeDesc = `<b>M${q.magnitude}</b><br/>${q.place}<br/>Depth: ${q.depth} km<br/>Time: ${quakeTime}`;
        const entity = viewer.entities.add({
          name: quakeName,
          position: pos,
          point: {
            pixelSize: baseSize,
            color,
            outlineColor: Cesium.Color.RED.withAlpha(0.5),
            outlineWidth: 1,
          },
          label: {
            text: `M${q.magnitude.toFixed(1)}`,
            font: '11px monospace',
            fillColor: Cesium.Color.RED,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 1e7, 0.2),
            show: false,
          },
          description: quakeDesc,
        });
        earthquakeEntitiesRef.current.push(entity);

        // 펄스 글로우 (규모 4+ 지진) — 큰 포인트로 글로우 효과
        if (q.magnitude >= 4.0) {
          const glowEntity = viewer.entities.add({
            name: quakeName,
            position: pos,
            description: quakeDesc,
            point: {
              pixelSize: new Cesium.CallbackProperty(() => {
                const t = (Date.now() % 2000) / 2000;
                return baseSize * 2 + Math.sin(t * Math.PI * 2) * baseSize;
              }, false) as any,
              color: new Cesium.CallbackProperty(() => {
                const t = (Date.now() % 2000) / 2000;
                const alpha = 0.15 + Math.sin(t * Math.PI * 2) * 0.1;
                return Cesium.Color.RED.withAlpha(alpha);
              }, false) as any,
            },
          });
          earthquakeEntitiesRef.current.push(glowEntity);
        }
      }
      setDataCounts('earthquakes', quakes.length);
      setLastUpdated('earthquakes', Date.now());
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(quakeAnimFrameRef.current);
    };
  }, [activeLayers, clearEntities, setDataCounts]);

  // PostProcessStage 적용/해제 (다중 필터 합성 지원)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (stageRef.current) {
      viewer.scene.postProcessStages.remove(stageRef.current);
      stageRef.current = null;
    }

    // 유효한 필터만 추출
    const validFilters = activeFilters.filter((f) => FILTER_SHADERS[f]);
    if (validFilters.length === 0) return;

    const buildUniforms = (filterName: string): Record<string, number> => {
      const u: Record<string, number> = {};
      if (filterName === 'flir') {
        u.u_contrast = filterParams.flirContrast ?? 1.8;
        u.u_noise = filterParams.flirNoise ?? 0.03;
      } else if (filterName === 'anime') {
        u.u_edgeStrength = filterParams.animeEdge ?? 1.5;
        u.u_pastelMix = filterParams.animePastel ?? 0.5;
      } else if (filterName === 'lut') {
        u.u_saturation = filterParams.lutSaturation ?? 0.85;
        u.u_vignette = filterParams.lutVignette ?? 1.2;
        u.u_contrast = filterParams.lutContrast ?? 1.0;
      }
      return u;
    };

    if (validFilters.length === 1) {
      // 단일 필터: 기존 방식
      const uniforms = buildUniforms(validFilters[0]);
      const stage = new Cesium.PostProcessStage({
        fragmentShader: FILTER_SHADERS[validFilters[0]],
        uniforms: Object.keys(uniforms).length > 0 ? uniforms : undefined,
      });
      viewer.scene.postProcessStages.add(stage);
      stageRef.current = stage;
    } else {
      // 다중 필터: PostProcessStageComposite 체인
      const stages = validFilters.map((filterName) => {
        const uniforms = buildUniforms(filterName);
        return new Cesium.PostProcessStage({
          fragmentShader: FILTER_SHADERS[filterName],
          uniforms: Object.keys(uniforms).length > 0 ? uniforms : undefined,
        });
      });
      const composite = new Cesium.PostProcessStageComposite({
        stages,
        inputPreviousStageTexture: true, // 이전 스테이지 결과를 다음 입력으로
      });
      viewer.scene.postProcessStages.add(composite);
      stageRef.current = composite;
    }
  }, [activeFilters, filterParams]);

  // 카메라 이동
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !cameraTarget) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        cameraTarget.longitude,
        cameraTarget.latitude,
        cameraTarget.height,
      ),
      duration: 2.0,
    });
  }, [cameraTarget]);

  // ── 인텔 오버레이 렌더링 ──
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // 기존 오버레이 정리
    for (const e of overlayEntitiesRef.current) {
      viewer.entities.remove(e);
    }
    overlayEntitiesRef.current = [];
    for (const layer of overlayImageryRef.current) {
      viewer.imageryLayers.remove(layer);
    }
    overlayImageryRef.current = [];
    // CCTV 포인트/라벨 컬렉션 — 토글 시 show/hide (destroy 대신)
    if (!activeOverlays.includes('cctv')) {
      if (cctvPrimitiveRef.current) { cctvPrimitiveRef.current.show = false; viewer.scene.requestRender(); }
      if (cctvLabelCollRef.current) cctvLabelCollRef.current.show = false;
      // FOV/썸네일 엔티티 + 카메라 리스너는 비활성 시 정리
      for (const e of cctvFovEntitiesRef.current) viewer.entities.remove(e);
      cctvFovEntitiesRef.current = [];
      for (const e of cctvThumbnailEntitiesRef.current) viewer.entities.remove(e);
      cctvThumbnailEntitiesRef.current = [];
      if (cctvCameraListenerRef.current) {
        cctvCameraListenerRef.current();
        cctvCameraListenerRef.current = null;
      }
    }

    // 0. 위성사진 베이스맵 토글
    if (activeOverlays.includes('satellite')) {
      // 기존 CartoDB dark 베이스 레이어를 숨기고 위성사진 추가
      if (viewer.imageryLayers.length > 0) {
        viewer.imageryLayers.get(0).show = false;
      }
      const satProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: new Cesium.Credit('Esri, Maxar, Earthstar Geographics'),
        minimumLevel: 0,
        maximumLevel: 19,
      });
      const satLayer = viewer.imageryLayers.addImageryProvider(satProvider, 1);
      overlayImageryRef.current.push(satLayer);
    } else {
      // 위성사진 꺼졌으면 CartoDB 베이스 다시 표시
      if (viewer.imageryLayers.length > 0) {
        viewer.imageryLayers.get(0).show = true;
      }
    }

    // 1. 구름/기상 레이더 — RainViewer 타일
    if (activeOverlays.includes('clouds')) {
      (async () => {
        try {
          const resp = await fetch('https://api.rainviewer.com/public/weather-maps.json');
          const data = await resp.json();
          const ts = data.radar?.past?.[data.radar.past.length - 1]?.path;
          if (ts && viewerRef.current) {
            const provider = new Cesium.UrlTemplateImageryProvider({
              url: `https://tilecache.rainviewer.com${ts}/256/{z}/{x}/{y}/2/1_1.png`,
              credit: new Cesium.Credit('RainViewer'),
              minimumLevel: 1,
              maximumLevel: 6,
            });
            const layer = viewer.imageryLayers.addImageryProvider(provider);
            layer.alpha = 0.6;
            overlayImageryRef.current.push(layer);
          }
          // After the radar layer, also try satellite infrared
          const satIR = data.satellite?.infrared;
          if (satIR && satIR.length > 0) {
            const irPath = satIR[satIR.length - 1]?.path;
            if (irPath) {
              const irProvider = new Cesium.UrlTemplateImageryProvider({
                url: `https://tilecache.rainviewer.com${irPath}/256/{z}/{x}/{y}/0/0_1.png`,
                credit: new Cesium.Credit('RainViewer Satellite'),
                minimumLevel: 1,
                maximumLevel: 6,
              });
              const irLayer = viewer.imageryLayers.addImageryProvider(irProvider);
              irLayer.alpha = 0.5;
              overlayImageryRef.current.push(irLayer);
            }
          }
        } catch { /* 무시 */ }
      })();
    }

    // 2. 주야 경계선 (Terminator)
    if (activeOverlays.includes('terminator')) {
      const sun = getSunPosition(new Date());
      const termPoints: Cesium.Cartesian3[] = [];
      for (let lng = -180; lng <= 180; lng += 3) {
        // 태양 고도 0° 선 계산
        const lngRad = (lng - sun.lng) * Math.PI / 180;
        const decRad = sun.lat * Math.PI / 180;
        const lat = Math.atan(-Math.cos(lngRad) / Math.tan(decRad)) * 180 / Math.PI;
        termPoints.push(Cesium.Cartesian3.fromDegrees(lng, lat, 50000));
      }

      const termEntity = viewer.entities.add({
        polyline: {
          positions: termPoints,
          width: 2,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.3,
            color: Cesium.Color.YELLOW.withAlpha(0.6),
          }),
          clampToGround: false,
        },
      });
      overlayEntitiesRef.current.push(termEntity);

      // 밤 영역 (terminator 아래/위를 반투명으로)
      const nightPoints: Cesium.Cartesian3[] = [];
      for (let lng = -180; lng <= 180; lng += 5) {
        const lngRad = (lng - sun.lng) * Math.PI / 180;
        const decRad = sun.lat * Math.PI / 180;
        const lat = Math.atan(-Math.cos(lngRad) / Math.tan(decRad)) * 180 / Math.PI;
        nightPoints.push(Cesium.Cartesian3.fromDegrees(lng, lat, 0));
      }
      // 남쪽으로 닫기 (declination이 양수면 북반구가 밤)
      const nightSide = sun.lat >= 0 ? -90 : 90;
      nightPoints.push(Cesium.Cartesian3.fromDegrees(180, nightSide, 0));
      nightPoints.push(Cesium.Cartesian3.fromDegrees(-180, nightSide, 0));

      const nightEntity = viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(nightPoints),
          material: Cesium.Color.BLACK.withAlpha(0.35),
          height: 0,
        },
      });
      overlayEntitiesRef.current.push(nightEntity);
    }

    // 3. 야간 조명 (NASA Black Marble 2017)
    if (activeOverlays.includes('nightLights')) {
      const provider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
        credit: new Cesium.Credit('NASA EOSDIS'),
        minimumLevel: 1,
        maximumLevel: 8,
      });
      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.alpha = 0.7;
      overlayImageryRef.current.push(layer);
    }

    // 4. 해수면 온도 — NASA GIBS
    if (activeOverlays.includes('seaTemp')) {
      const today = new Date().toISOString().split('T')[0];
      const provider = new Cesium.UrlTemplateImageryProvider({
        url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GHRSST_L4_MUR_Sea_Surface_Temperature/default/${today}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
        credit: new Cesium.Credit('NASA EOSDIS GIBS'),
        minimumLevel: 1,
        maximumLevel: 7,
      });
      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.alpha = 0.5;
      overlayImageryRef.current.push(layer);
    }

    // 5. 해저 케이블
    if (activeOverlays.includes('cables')) {
      for (const cable of SUBMARINE_CABLES) {
        const positions = cable.points.map(([lng, lat]) =>
          Cesium.Cartesian3.fromDegrees(lng, lat, 0)
        );
        const cableColor = Cesium.Color.fromCssColorString(cable.color);
        // 클릭 가능한 폴리라인
        const entity = viewer.entities.add({
          name: cable.name,
          polyline: {
            positions,
            width: 3,
            material: new Cesium.PolylineDashMaterialProperty({
              color: cableColor.withAlpha(0.7),
              dashLength: 12,
            }),
            clampToGround: true,
          },
        });
        (entity as any)._overlayType = 'cable';
        (entity as any)._overlayData = cable;
        overlayEntitiesRef.current.push(entity);

        // 케이블 중간 지점에 클릭 가능한 라벨 마커 추가
        const midIdx = Math.floor(cable.points.length / 2);
        const midPt = cable.points[midIdx];
        const labelEntity = viewer.entities.add({
          name: cable.name,
          position: Cesium.Cartesian3.fromDegrees(midPt[0], midPt[1], 0),
          point: {
            pixelSize: 8,
            color: cableColor.withAlpha(0.9),
            outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1.5, 1e7, 0.5),
          },
          label: {
            text: `🔗 ${cable.name}`,
            font: '10px monospace',
            fillColor: cableColor,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -12),
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 8e6, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8e6),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        (labelEntity as any)._overlayType = 'cable';
        (labelEntity as any)._overlayData = cable;
        overlayEntitiesRef.current.push(labelEntity);
      }
    }

    // 6. 군사 기지
    if (activeOverlays.includes('military')) {
      const typeColors: Record<string, string> = {
        naval: '#FF4444', air: '#FFD700', army: '#32CD32', joint: '#FF69B4',
      };
      for (const base of MILITARY_BASES) {
        const bColor = Cesium.Color.fromCssColorString(typeColors[base.type] || '#FF4444');
        const entity = viewer.entities.add({
          name: base.name,
          position: Cesium.Cartesian3.fromDegrees(base.lng, base.lat, 0),
          point: {
            pixelSize: 10,
            color: bColor,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
            outlineWidth: 2,
            scaleByDistance: new Cesium.NearFarScalar(1e5, 2, 1e7, 0.6),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `⚔ ${base.name} [${base.country}]`,
            font: '10px monospace',
            fillColor: bColor,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 5e6, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e6),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        (entity as any)._overlayType = 'military_base';
        (entity as any)._overlayData = base;
        overlayEntitiesRef.current.push(entity);
      }
    }

    // 7. 핵 시설
    if (activeOverlays.includes('nuclear')) {
      for (const plant of NUCLEAR_PLANTS) {
        const nColor = plant.status === 'active'
          ? Cesium.Color.fromCssColorString('#00FF00')
          : Cesium.Color.fromCssColorString('#FF6600');
        const entity = viewer.entities.add({
          name: plant.name,
          position: Cesium.Cartesian3.fromDegrees(plant.lng, plant.lat, 0),
          point: {
            pixelSize: 12,
            color: nColor,
            outlineColor: Cesium.Color.YELLOW.withAlpha(0.9),
            outlineWidth: 3,
            scaleByDistance: new Cesium.NearFarScalar(1e5, 2, 1e7, 0.6),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `☢ ${plant.name} (${plant.reactors}R)`,
            font: '10px monospace',
            fillColor: nColor,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -16),
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 5e6, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e6),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        (entity as any)._overlayType = 'nuclear_plant';
        (entity as any)._overlayData = plant;
        overlayEntitiesRef.current.push(entity);
      }
    }

    // 8. 주요 항구
    if (activeOverlays.includes('ports')) {
      for (const port of MAJOR_PORTS) {
        const entity = viewer.entities.add({
          name: port.name,
          position: Cesium.Cartesian3.fromDegrees(port.lng, port.lat, 0),
          point: {
            pixelSize: Math.max(8, 14 - port.rank * 0.4),
            color: Cesium.Color.fromCssColorString('#00BFFF'),
            outlineColor: Cesium.Color.WHITE.withAlpha(0.7),
            outlineWidth: 2,
            scaleByDistance: new Cesium.NearFarScalar(1e5, 2, 1e7, 0.6),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `⚓ #${port.rank} ${port.name}`,
            font: '10px monospace',
            fillColor: Cesium.Color.fromCssColorString('#00BFFF'),
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 5e6, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e6),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        (entity as any)._overlayType = 'port';
        (entity as any)._overlayData = port;
        overlayEntitiesRef.current.push(entity);
      }
    }

    // 9. 해류
    if (activeOverlays.includes('currents')) {
      for (const current of OCEAN_CURRENTS) {
        const positions = current.points.map(([lng, lat]) =>
          Cesium.Cartesian3.fromDegrees(lng, lat, 0)
        );
        const curColor = Cesium.Color.fromCssColorString(current.color);
        // 클릭 가능한 폴리라인
        const entity = viewer.entities.add({
          name: current.name,
          polyline: {
            positions,
            width: current.warm ? 5 : 4,
            material: new Cesium.PolylineArrowMaterialProperty(curColor.withAlpha(0.6)),
            clampToGround: true,
          },
        });
        (entity as any)._overlayType = 'current';
        (entity as any)._overlayData = current;
        overlayEntitiesRef.current.push(entity);

        // 해류 중간 지점에 클릭 가능한 라벨 마커 추가
        const midIdx = Math.floor(current.points.length / 2);
        const midPt = current.points[midIdx];
        const curLabelEntity = viewer.entities.add({
          name: current.name,
          position: Cesium.Cartesian3.fromDegrees(midPt[0], midPt[1], 0),
          point: {
            pixelSize: 8,
            color: curColor.withAlpha(0.9),
            outlineColor: Cesium.Color.WHITE.withAlpha(0.5),
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1.5, 1e7, 0.5),
          },
          label: {
            text: `${current.warm ? '🔴' : '🔵'} ${current.name}`,
            font: '10px monospace',
            fillColor: curColor,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -12),
            scaleByDistance: new Cesium.NearFarScalar(5e5, 1, 8e6, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8e6),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        (curLabelEntity as any)._overlayType = 'current';
        (curLabelEntity as any)._overlayData = current;
        overlayEntitiesRef.current.push(curLabelEntity);
      }
    }

    // 10. 태양 위치 마커
    if (activeOverlays.includes('sunPos')) {
      const sun = getSunPosition(new Date());
      const entity = viewer.entities.add({
        name: 'Sun Subsolar Point',
        position: Cesium.Cartesian3.fromDegrees(sun.lng, sun.lat, 0),
        point: {
          pixelSize: 16,
          color: Cesium.Color.YELLOW.withAlpha(0.8),
          outlineColor: Cesium.Color.ORANGE,
          outlineWidth: 3,
          scaleByDistance: new Cesium.NearFarScalar(1e5, 2, 2e7, 0.5),
        },
        label: {
          text: '☀ SUBSOLAR',
          font: '11px monospace',
          fillColor: Cesium.Color.YELLOW,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          outlineColor: Cesium.Color.BLACK,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -14),
          scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 1e7, 0.3),
        },
      });
      overlayEntitiesRef.current.push(entity);
    }

    // 11. 3D 지형 + OSM Buildings
    if (activeOverlays.includes('terrain3d')) {
      (async () => {
        try {
          // 3D 지형
          const terrain = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
          viewer.terrainProvider = terrain;
          viewer.scene.globe.depthTestAgainstTerrain = true;
          viewer.scene.verticalExaggeration = 2.0;
        } catch {
          console.warn('[Terrain] Cesium Ion token required for 3D terrain');
          viewer.scene.verticalExaggeration = 2.0;
        }
        try {
          // OSM 3D Buildings (Cesium Ion asset 96188)
          if (!buildingsTilesetRef.current) {
            const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(96188, {
              maximumScreenSpaceError: 16,
            });
            // 건물 스타일 — 반투명 시안/녹색 와이어프레임 느낌
            tileset.style = new Cesium.Cesium3DTileStyle({
              color: "color('cyan', 0.6)",
            });
            viewer.scene.primitives.add(tileset);
            buildingsTilesetRef.current = tileset;
          } else {
            buildingsTilesetRef.current.show = true;
          }
        } catch (e) {
          console.warn('[Buildings] OSM Buildings not available:', e);
        }
      })();
    } else {
      // Reset terrain
      viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.verticalExaggeration = 1.0;
      // Hide buildings
      if (buildingsTilesetRef.current) {
        buildingsTilesetRef.current.show = false;
      }
    }

    // 12. 교통 흐름 (TomTom)
    if (activeOverlays.includes('traffic')) {
      const tomtomKey = import.meta.env.VITE_TOMTOM_KEY;
      if (tomtomKey && tomtomKey !== 'placeholder') {
        const trafficProvider = new Cesium.UrlTemplateImageryProvider({
          url: `https://api.tomtom.com/traffic/map/4/tile/flow/relative0-dark/{z}/{x}/{y}.png?key=${tomtomKey}&tileSize=256`,
          credit: new Cesium.Credit('© TomTom'),
          minimumLevel: 0,
          maximumLevel: 18,
        });
        const trafficLayer = viewer.imageryLayers.addImageryProvider(trafficProvider);
        trafficLayer.alpha = 0.7;
        overlayImageryRef.current.push(trafficLayer);
      } else {
        console.warn('[Traffic] VITE_TOMTOM_KEY required for traffic overlay');
      }
    }

    // 13. CCTV 카메라 — LOD + 뷰포트 컬링 최적화
    // 고도별 LOD:
    //   > 8,000km: 표시 안함
    //   > 2,000km: 빌보드만 (작게)
    //   > 500km:  빌보드 + 라벨
    //   > 50km:   빌보드 + 라벨 + FOV 프러스텀
    //   < 50km:   빌보드 + 라벨 + FOV + 썸네일 프리뷰
    if (activeOverlays.includes('cctv')) {
      bootstrapWindyCams();

      const cctvs = fetchCCTVs();

      // ── PointPrimitiveCollection/LabelCollection 재사용 (최초 1회만 생성) ──
      if (cctvPrimitiveRef.current && cctvLabelCollRef.current) {
        // 이미 생성된 컬렉션이 있으면 show만 복원
        cctvPrimitiveRef.current.show = true;
        cctvLabelCollRef.current.show = true;
        viewer.scene.requestRender();
      } else {
        // 최초 생성
        const cctvPoints = new Cesium.PointPrimitiveCollection();
        const cctvLabels = new Cesium.LabelCollection({ scene: viewer.scene });
        const bbDataMap = cctvBillboardDataRef.current;
        bbDataMap.clear();

        for (const cam of cctvs) {
          const color = cam.type === 'traffic' ? Cesium.Color.LIME
            : cam.type === 'port' ? Cesium.Color.CYAN
            : cam.type === 'landmark' ? Cesium.Color.GOLD
            : cam.type === 'webcam' ? Cesium.Color.fromCssColorString('#BB86FC')
            : Cesium.Color.fromCssColorString('#00FF88');

          const pt = cctvPoints.add({
            position: Cesium.Cartesian3.fromDegrees(cam.lng, cam.lat, 200),
            pixelSize: 6,
            color,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
            outlineWidth: 1,
            scaleByDistance: new Cesium.NearFarScalar(1e4, 1.5, 8e6, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8e6),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          });
          // Point → CCTVData 매핑 (클릭 핸들링)
          bbDataMap.set(pt, cam);

          // 라벨은 500km 이내에서만 표시
          cctvLabels.add({
            position: Cesium.Cartesian3.fromDegrees(cam.lng, cam.lat, 200),
            text: cam.name,
            font: '10px monospace',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -12),
            scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 5e5, 0.2),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e5),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          });
        }

        viewer.scene.primitives.add(cctvPoints);
        viewer.scene.primitives.add(cctvLabels);
        cctvPrimitiveRef.current = cctvPoints;
        cctvLabelCollRef.current = cctvLabels;
        viewer.scene.requestRender();
      }

      // ── FOV/썸네일 동적 LOD — 카메라 이동 시 뷰포트 내 저고도 카메라만 Entity 생성 ──
      // heading이 있는 모든 카메라를 FOV 대상으로 (하드코딩 40개 제한 제거)
      const fovCandidates = cctvs.filter((c) => c.heading != null);

      /** 뷰포트 내 카메라 중 고도 기반으로 FOV/썸네일 동적 생성 */
      const updateCCTVLOD = () => {
        const v = viewerRef.current;
        if (!v) return;

        const altitude = v.camera.positionCartographic.height;

        // FOV: 50km 이내에서만 생성
        const needFov = altitude < 5e4;
        // 썸네일: 20km 이내에서만 생성
        const needThumbnails = altitude < 2e4;

        // 현재 FOV 필요 없으면 모두 제거
        if (!needFov) {
          for (const e of cctvFovEntitiesRef.current) v.entities.remove(e);
          cctvFovEntitiesRef.current = [];
          for (const e of cctvThumbnailEntitiesRef.current) v.entities.remove(e);
          cctvThumbnailEntitiesRef.current = [];
          return;
        }

        // 뷰포트 사각형 계산
        const viewRect = v.camera.computeViewRectangle();
        if (!viewRect) return;

        // 뷰포트 안에 있는 카메라 필터링
        const visibleCams = fovCandidates.filter((cam) => {
          const cLng = Cesium.Math.toRadians(cam.lng);
          const cLat = Cesium.Math.toRadians(cam.lat);
          return Cesium.Rectangle.contains(viewRect, new Cesium.Cartographic(cLng, cLat));
        });

        // 현재 FOV 엔티티 ID Set
        const currentFovIds = new Set(
          cctvFovEntitiesRef.current
            .filter((e: any) => e._cctvFovId)
            .map((e: any) => e._cctvFovId),
        );
        const visibleIds = new Set(visibleCams.map((c) => c.id));

        // 뷰포트 밖으로 나간 FOV 엔티티 제거
        const keepFov: Cesium.Entity[] = [];
        for (const e of cctvFovEntitiesRef.current) {
          if (!(e as any)._cctvFovId || !visibleIds.has((e as any)._cctvFovId)) {
            v.entities.remove(e);
          } else {
            keepFov.push(e);
          }
        }
        cctvFovEntitiesRef.current = keepFov;

        // 새로 보이는 카메라에 대해 FOV 생성
        for (const cam of visibleCams) {
          if (currentFovIds.has(cam.id)) continue; // 이미 생성됨

          const color = cam.type === 'traffic' ? Cesium.Color.LIME
            : cam.type === 'port' ? Cesium.Color.CYAN
            : cam.type === 'landmark' ? Cesium.Color.GOLD
            : cam.type === 'webcam' ? Cesium.Color.fromCssColorString('#BB86FC')
            : Cesium.Color.WHITE;

          const camHeading = cam.heading ?? ((cam.lat * 1000 + cam.lng * 100) % 360);
          const headingRad = Cesium.Math.toRadians(camHeading);
          const fovRange = 300;
          const fovAngle = 60;
          const halfFov = Cesium.Math.toRadians(fovAngle / 2);
          const camHeight = 200;

          const camLatRad = Cesium.Math.toRadians(cam.lat);
          const metersPerDeg = 111320 * Math.cos(camLatRad);
          const dLat1 = (fovRange * Math.cos(headingRad - halfFov)) / 111320;
          const dLng1 = (fovRange * Math.sin(headingRad - halfFov)) / metersPerDeg;
          const dLat2 = (fovRange * Math.cos(headingRad + halfFov)) / 111320;
          const dLng2 = (fovRange * Math.sin(headingRad + halfFov)) / metersPerDeg;

          const farLng1 = cam.lng + dLng1;
          const farLat1 = cam.lat + dLat1;
          const farLng2 = cam.lng + dLng2;
          const farLat2 = cam.lat + dLat2;

          // FOV 엔티티 생성 (바닥 삼각형 + 벽면 + 엣지 라인)
          const fovEntities: Cesium.Entity[] = [];

          const fovGround = v.entities.add({
            polygon: {
              hierarchy: Cesium.Cartesian3.fromDegreesArray([
                cam.lng, cam.lat, farLng1, farLat1, farLng2, farLat2,
              ]),
              material: color.withAlpha(0.1),
              height: 0,
            },
          } as any);
          fovEntities.push(fovGround);

          const wallLeft = v.entities.add({
            wall: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                cam.lng, cam.lat, camHeight, farLng1, farLat1, 0,
              ]),
              material: color.withAlpha(0.08),
            },
          } as any);
          fovEntities.push(wallLeft);

          const wallRight = v.entities.add({
            wall: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                cam.lng, cam.lat, camHeight, farLng2, farLat2, 0,
              ]),
              material: color.withAlpha(0.08),
            },
          } as any);
          fovEntities.push(wallRight);

          const wallFront = v.entities.add({
            wall: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                farLng1, farLat1, 0, farLng2, farLat2, 0,
              ]),
              minimumHeights: [0, 0],
              maximumHeights: [camHeight * 0.3, camHeight * 0.3],
              material: color.withAlpha(0.12),
            },
          } as any);
          fovEntities.push(wallFront);

          const fovLines = v.entities.add({
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                farLng1, farLat1, 0, cam.lng, cam.lat, camHeight, farLng2, farLat2, 0,
              ]),
              width: 1.5,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.3,
                color: color.withAlpha(0.6),
              }),
            },
          } as any);
          fovEntities.push(fovLines);

          // 각 FOV 엔티티에 카메라 ID 태그 (정리용)
          for (const e of fovEntities) (e as any)._cctvFovId = cam.id;
          cctvFovEntitiesRef.current.push(...fovEntities);
        }

        // ── 썸네일 프리뷰 (20km 이내) ──
        const currentThumbIds = new Set(
          cctvThumbnailEntitiesRef.current
            .filter((e: any) => e._cctvThumbId)
            .map((e: any) => e._cctvThumbId),
        );

        // 뷰포트 밖 썸네일 제거
        const keepThumbs: Cesium.Entity[] = [];
        for (const e of cctvThumbnailEntitiesRef.current) {
          if (!(e as any)._cctvThumbId || !visibleIds.has((e as any)._cctvThumbId)) {
            v.entities.remove(e);
          } else {
            keepThumbs.push(e);
          }
        }
        cctvThumbnailEntitiesRef.current = keepThumbs;

        if (needThumbnails) {
          for (const cam of visibleCams) {
            if (currentThumbIds.has(cam.id)) continue;
            const vidId = cam.embedUrl.split('/embed/')[1]?.split('?')[0];
            if (!vidId) continue;
            const thumbUrl = `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`;
            const thumbEntity = v.entities.add({
              position: Cesium.Cartesian3.fromDegrees(cam.lng, cam.lat, 350),
              billboard: {
                image: thumbUrl,
                width: 160,
                height: 90,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance: new Cesium.NearFarScalar(500, 1.2, 2e4, 0.3),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2e4),
                pixelOffset: new Cesium.Cartesian2(0, -50),
              },
            });
            (thumbEntity as any)._cctvThumbId = cam.id;
            cctvThumbnailEntitiesRef.current.push(thumbEntity);
          }
        }
      };

      // 초기 LOD 업데이트
      updateCCTVLOD();

      // 카메라 이동 시 디바운스 LOD 업데이트 (200ms)
      let lodTimer: ReturnType<typeof setTimeout> | null = null;
      const onCameraChanged = () => {
        if (lodTimer) clearTimeout(lodTimer);
        lodTimer = setTimeout(updateCCTVLOD, 200);
      };
      viewer.camera.changed.addEventListener(onCameraChanged);
      // 카메라 changed 이벤트 감도 설정 (0.1 = 10% 이동 시 발생)
      viewer.camera.percentageChanged = 0.1;

      cctvCameraListenerRef.current = () => {
        viewer.camera.changed.removeEventListener(onCameraChanged);
        if (lodTimer) clearTimeout(lodTimer);
      };
    }

    // 14. God Mode — 모든 감지 오버레이 활성화 (panoptic detection)
    if (activeOverlays.includes('godMode')) {
      // 감시 그리드 — 전 세계를 격자로 표시
      for (let lat = -60; lat <= 60; lat += 30) {
        for (let lng = -180; lng < 180; lng += 30) {
          const north = Math.min(lat + 30, 89.9);
          const south = Math.max(lat, -89.9);
          const entity = viewer.entities.add({
            rectangle: {
              coordinates: Cesium.Rectangle.fromDegrees(lng, south, lng + 30, north),
              material: Cesium.Color.LIME.withAlpha(0.03),
              outline: true,
              outlineColor: Cesium.Color.LIME.withAlpha(0.15),
              outlineWidth: 1,
            },
          });
          overlayEntitiesRef.current.push(entity);
        }
      }
      // 감시 노드 — 주요 도시에 스캐닝 포인트
      const godModeNodes = [
        { lat: 40.7128, lng: -74.006 }, { lat: 51.5074, lng: -0.1278 },
        { lat: 35.6762, lng: 139.6503 }, { lat: 48.8566, lng: 2.3522 },
        { lat: 37.5665, lng: 126.978 }, { lat: 39.9042, lng: 116.4074 },
        { lat: 55.7558, lng: 37.6173 }, { lat: 28.6139, lng: 77.209 },
        { lat: -33.8688, lng: 151.2093 }, { lat: 1.3521, lng: 103.8198 },
        { lat: 25.2048, lng: 55.2708 }, { lat: 34.0522, lng: -118.2437 },
        { lat: -23.5505, lng: -46.6333 }, { lat: 31.2304, lng: 121.4737 },
        { lat: 52.52, lng: 13.405 }, { lat: 41.9028, lng: 12.4964 },
      ];
      for (const node of godModeNodes) {
        // 스캐닝 링
        const ringEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat, 500),
          ellipse: {
            semiMinorAxis: 80000,
            semiMajorAxis: 80000,
            material: Cesium.Color.LIME.withAlpha(0.08),
            outline: true,
            outlineColor: Cesium.Color.LIME.withAlpha(0.4),
            outlineWidth: 2,
            height: 0,
          },
        });
        overlayEntitiesRef.current.push(ringEntity);
        // 내부 링
        const innerRing = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat, 500),
          ellipse: {
            semiMinorAxis: 30000,
            semiMajorAxis: 30000,
            material: Cesium.Color.LIME.withAlpha(0.05),
            outline: true,
            outlineColor: Cesium.Color.LIME.withAlpha(0.6),
            outlineWidth: 1,
            height: 0,
          },
        });
        overlayEntitiesRef.current.push(innerRing);
        // 라벨
        const labelEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat, 1000),
          label: {
            text: 'SCANNING',
            font: '9px monospace',
            fillColor: Cesium.Color.LIME.withAlpha(0.7),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 1e7, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8e6),
          },
        });
        overlayEntitiesRef.current.push(labelEntity);
      }
    }

    // 15. Vehicle Detection — 주요 도시 도로에 차량 감지 오버레이
    if (activeOverlays.includes('vehicles')) {
      const vehicleCities = [
        { name: 'New York', lat: 40.7580, lng: -73.9855, roads: [
          [[40.748, -73.998], [40.758, -73.985], [40.768, -73.972]],
          [[40.753, -73.995], [40.753, -73.980], [40.753, -73.965]],
        ]},
        { name: 'London', lat: 51.5074, lng: -0.1278, roads: [
          [[51.500, -0.140], [51.507, -0.128], [51.515, -0.115]],
          [[51.503, -0.135], [51.508, -0.125], [51.513, -0.115]],
        ]},
        { name: 'Tokyo', lat: 35.6762, lng: 139.6503, roads: [
          [[35.670, 139.640], [35.676, 139.650], [35.682, 139.660]],
          [[35.672, 139.645], [35.678, 139.655], [35.684, 139.665]],
        ]},
        { name: 'Seoul', lat: 37.5665, lng: 126.978, roads: [
          [[37.560, 126.970], [37.567, 126.978], [37.574, 126.986]],
          [[37.563, 126.973], [37.570, 126.981], [37.577, 126.989]],
        ]},
        { name: 'Paris', lat: 48.8566, lng: 2.3522, roads: [
          [[48.850, 2.340], [48.857, 2.352], [48.864, 2.364]],
          [[48.853, 2.345], [48.860, 2.357], [48.867, 2.369]],
        ]},
      ];

      for (const city of vehicleCities) {
        // 도시별 감지 영역 표시
        const areaEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(city.lng, city.lat, 200),
          ellipse: {
            semiMinorAxis: 2000,
            semiMajorAxis: 2000,
            material: Cesium.Color.ORANGE.withAlpha(0.06),
            outline: true,
            outlineColor: Cesium.Color.ORANGE.withAlpha(0.3),
            height: 0,
          },
        });
        overlayEntitiesRef.current.push(areaEntity);

        // 도로별 차량 흐름 표시 (폴리라인)
        for (const road of city.roads) {
          const positions = road.map(([lat, lng]) =>
            Cesium.Cartesian3.fromDegrees(lng, lat, 50)
          );
          const roadEntity = viewer.entities.add({
            polyline: {
              positions,
              width: 4,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.3,
                color: Cesium.Color.ORANGE.withAlpha(0.8),
              }),
              clampToGround: true,
            },
          });
          overlayEntitiesRef.current.push(roadEntity);

          // 차량 포인트 (도로 위에 점으로 표시)
          for (const [lat, lng] of road) {
            // 도로 위에 여러 차량 시뮬레이션
            for (let offset = 0; offset < 3; offset++) {
              const jitter = (Math.random() - 0.5) * 0.002;
              const vEntity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(
                  lng + jitter, lat + jitter * 0.7, 30
                ),
                point: {
                  pixelSize: 4,
                  color: Cesium.Color.YELLOW,
                  outlineColor: Cesium.Color.ORANGE,
                  outlineWidth: 1,
                  scaleByDistance: new Cesium.NearFarScalar(1e3, 2.0, 5e5, 0.5),
                  distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3e5),
                },
              });
              overlayEntitiesRef.current.push(vEntity);
            }
          }
        }

        // 감지 라벨
        const label = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(city.lng, city.lat + 0.008, 500),
          label: {
            text: `VEHICLE DETECT: ${city.name}`,
            font: '9px monospace',
            fillColor: Cesium.Color.ORANGE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 5e5, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3e5),
          },
        });
        overlayEntitiesRef.current.push(label);
      }
    }

    // 16. Military Aircraft (ADS-B) — 군용기 추적 마커
    if (activeOverlays.includes('adsb')) {
      // 주요 군사 공역 표시
      const milAirspace = [
        { name: 'PACAF', lat: 36.0, lng: 138.0, radius: 500000 },
        { name: 'EUCOM', lat: 50.0, lng: 10.0, radius: 600000 },
        { name: 'CENTCOM', lat: 30.0, lng: 50.0, radius: 700000 },
        { name: 'INDOPACOM', lat: 15.0, lng: 115.0, radius: 500000 },
        { name: 'NORTHCOM', lat: 38.0, lng: -98.0, radius: 800000 },
        { name: 'AFRICOM', lat: 5.0, lng: 20.0, radius: 600000 },
        { name: 'SOUTHCOM', lat: -10.0, lng: -60.0, radius: 500000 },
      ];

      for (const airspace of milAirspace) {
        // 공역 범위 표시
        const areaEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(airspace.lng, airspace.lat, 10000),
          ellipse: {
            semiMinorAxis: airspace.radius,
            semiMajorAxis: airspace.radius,
            material: Cesium.Color.RED.withAlpha(0.04),
            outline: true,
            outlineColor: Cesium.Color.RED.withAlpha(0.2),
            outlineWidth: 1,
            height: 0,
          },
        });
        overlayEntitiesRef.current.push(areaEntity);
        // 라벨
        const label = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(airspace.lng, airspace.lat, 15000),
          label: {
            text: `MIL AIRSPACE: ${airspace.name}`,
            font: '10px monospace',
            fillColor: Cesium.Color.RED.withAlpha(0.8),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 1e7, 0.4),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1.5e7),
          },
        });
        overlayEntitiesRef.current.push(label);
      }

      // 군용기 — 별도 useEffect에서 30초 자동 갱신으로 처리
    }

    // requestRenderMode에서 오버레이 변경 후 화면 갱신 보장
    viewer.scene.requestRender();
  }, [activeOverlays, windyCamsVersion]);

  // Subscribe to Windy cam updates to re-trigger overlay rendering
  useEffect(() => {
    if (!activeOverlays.includes('cctv')) return;
    const unsub = subscribeAllCCTVs(() => setWindyCamsVersion((v) => v + 1));
    return unsub;
  }, [activeOverlays]);

  // ADS-B 군용기 — 30초 자동 갱신 + 이전 위치 트레일
  const adsbTrailRef = useRef<Map<string, Cesium.Cartesian3[]>>(new Map());
  const adsbTrailEntitiesRef = useRef<Cesium.Entity[]>([]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!activeOverlays.includes('adsb')) {
      // ADS-B 비활성 시 정리
      if (adsbPrimitiveRef.current) {
        viewer.scene.primitives.remove(adsbPrimitiveRef.current);
        adsbPrimitiveRef.current = null;
      }
      if (adsbLabelCollRef.current) {
        viewer.scene.primitives.remove(adsbLabelCollRef.current);
        adsbLabelCollRef.current = null;
      }
      for (const e of adsbTrailEntitiesRef.current) {
        viewer.entities.remove(e);
      }
      adsbTrailEntitiesRef.current = [];
      adsbTrailRef.current.clear();
      setDataCounts('adsb', 0);
      return;
    }

    let cancelled = false;

    async function updateAdsb() {
      const aircraft = await fetchMilAircraft();
      if (cancelled || !viewerRef.current || viewerRef.current.isDestroyed()) return;
      const v = viewerRef.current;

      // 이전 primitive + billboard 매핑 정리
      if (adsbPrimitiveRef.current) {
        for (let i = 0; i < adsbPrimitiveRef.current.length; i++) {
          billboardDataMap.current.delete(adsbPrimitiveRef.current.get(i));
        }
        viewer.scene.primitives.remove(adsbPrimitiveRef.current);
      }
      if (adsbLabelCollRef.current) {
        viewer.scene.primitives.remove(adsbLabelCollRef.current);
      }
      // 이전 트레일 엔티티 정리
      for (const e of adsbTrailEntitiesRef.current) {
        v.entities.remove(e);
      }
      adsbTrailEntitiesRef.current = [];

      const adsbBillboards = new Cesium.BillboardCollection({ scene: v.scene });
      const adsbLabels = new Cesium.LabelCollection({ scene: v.scene });

      for (const ac of aircraft) {
        const altMeters = ac.altitude * 0.3048;
        const pos = Cesium.Cartesian3.fromDegrees(ac.lng, ac.lat, altMeters * 100);

        const bb = adsbBillboards.add({
          position: pos,
          image: AIRPLANE_SVG,
          width: 24,
          height: 24,
          color: Cesium.Color.RED,
          rotation: -Cesium.Math.toRadians(ac.heading),
          scaleByDistance: new Cesium.NearFarScalar(1e5, 1.5, 1e7, 0.4),
        });
        billboardDataMap.current.set(bb, { type: 'adsb', data: ac });

        adsbLabels.add({
          position: pos,
          text: `${ac.callsign}\n${ac.type}\nFL${Math.round(ac.altitude / 100)}`,
          font: '9px monospace',
          fillColor: Cesium.Color.RED,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(15, 0),
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          scaleByDistance: new Cesium.NearFarScalar(1e5, 1.0, 5e6, 0.3),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e6),
        });

        // 트레일 기록 (최대 20포인트 = ~10분분)
        const key = ac.callsign || ac.hex;
        if (!adsbTrailRef.current.has(key)) {
          adsbTrailRef.current.set(key, []);
        }
        const trail = adsbTrailRef.current.get(key)!;
        trail.push(pos);
        if (trail.length > 20) trail.shift();

        // 트레일 폴리라인 렌더링 (2포인트 이상)
        if (trail.length >= 2) {
          const trailEntity = v.entities.add({
            polyline: {
              positions: [...trail],
              width: 2,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.2,
                color: Cesium.Color.RED.withAlpha(0.4),
              }),
            },
          });
          adsbTrailEntitiesRef.current.push(trailEntity);
        }
      }

      v.scene.primitives.add(adsbBillboards);
      v.scene.primitives.add(adsbLabels);
      adsbPrimitiveRef.current = adsbBillboards;
      adsbLabelCollRef.current = adsbLabels;
      setDataCounts('adsb', aircraft.length);
      setLastUpdated('adsb', Date.now());

      // Record ADSB positions for trajectory
      const now = Date.now();
      const posRecords: PositionRecord[] = [];
      for (const a of aircraft) {
        const eid = `adsb-${a.hex}`;
        trajectoryEntityMapRef.current.set(eid, {
          lat: a.lat, lng: a.lng, altitude: (a.altitude || 0) * 0.3048,
          heading: a.heading || 0, speed: (a.speed || 0) * 0.514444, entityType: 'adsb',
        });
        if (useTrajectoryStore.getState().activeTrajectories.some((id) => id === eid)) {
          posRecords.push({ entityId: eid, entityType: 'adsb', lat: a.lat, lng: a.lng, altitude: (a.altitude || 0) * 0.3048, heading: a.heading || 0, speed: (a.speed || 0) * 0.514444, timestamp: now });
        }
      }
      if (posRecords.length) {
        trajectoryDB.addPositions(posRecords);
        // 이미 저장된 프로파일이 있는 엔티티만 백그라운드 갱신 (신규는 패널에서 온디맨드 로드)
        for (const r of posRecords) {
          if (behavioralProfiler.loadProfile(r.entityId)) behavioralProfiler.refreshProfile(r.entityId);
        }
      }
    }

    // 초기 로드 + 30초마다 갱신
    updateAdsb();
    const interval = setInterval(updateAdsb, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeOverlays, setDataCounts, setLastUpdated]);

  // ── Weather 오버레이 — 주요 도시 현재 기상 (10분 갱신) ──
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!activeOverlays.includes('weather')) {
      if (weatherBillboardRef.current) {
        viewer.scene.primitives.remove(weatherBillboardRef.current);
        weatherBillboardRef.current = null;
      }
      if (weatherLabelRef.current) {
        viewer.scene.primitives.remove(weatherLabelRef.current);
        weatherLabelRef.current = null;
      }
      setDataCounts('weather', 0);
      return;
    }

    let cancelled = false;

    async function updateWeather() {
      const data = await fetchWeather();
      if (cancelled || !viewerRef.current || viewerRef.current.isDestroyed()) return;
      const v = viewerRef.current;

      if (weatherBillboardRef.current) {
        v.scene.primitives.remove(weatherBillboardRef.current);
      }
      if (weatherLabelRef.current) {
        v.scene.primitives.remove(weatherLabelRef.current);
      }

      const labels = new Cesium.LabelCollection({ scene: v.scene });

      for (const w of data) {
        const icon = weatherCodeToIcon(w.weatherCode);
        const tempColor = w.temperature > 30 ? '#FF4444'
          : w.temperature > 20 ? '#FFD700'
          : w.temperature > 10 ? '#00FF88'
          : w.temperature > 0 ? '#00BFFF'
          : '#87CEEB';

        labels.add({
          position: Cesium.Cartesian3.fromDegrees(w.lng, w.lat, 50000),
          text: `${icon} ${w.temperature.toFixed(0)}°C\n${w.city}`,
          font: '11px monospace',
          fillColor: Cesium.Color.fromCssColorString(tempColor),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          scaleByDistance: new Cesium.NearFarScalar(5e5, 1.2, 2e7, 0.4),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        });
      }

      v.scene.primitives.add(labels);
      weatherLabelRef.current = labels;
      setDataCounts('weather', data.length);
      setLastUpdated('weather', Date.now());
    }

    updateWeather();
    const interval = setInterval(updateWeather, 600000); // 10분

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeOverlays, setDataCounts, setLastUpdated]);

  // ── Typhoon 오버레이 — 현재 위치 + 예측 경로 ──
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!activeOverlays.includes('typhoon')) {
      if (typhoonBillboardRef.current) {
        viewer.scene.primitives.remove(typhoonBillboardRef.current);
        typhoonBillboardRef.current = null;
      }
      for (const e of typhoonEntitiesRef.current) {
        viewer.entities.remove(e);
      }
      typhoonEntitiesRef.current = [];
      setDataCounts('typhoon', 0);
      return;
    }

    let cancelled = false;

    (async () => {
      const typhoons = await fetchTyphoons();
      if (cancelled || !viewerRef.current || viewerRef.current.isDestroyed()) return;
      const v = viewerRef.current;

      // 정리
      if (typhoonBillboardRef.current) {
        v.scene.primitives.remove(typhoonBillboardRef.current);
      }
      for (const e of typhoonEntitiesRef.current) {
        v.entities.remove(e);
      }
      typhoonEntitiesRef.current = [];

      const billboards = new Cesium.BillboardCollection({ scene: v.scene });

      for (const t of typhoons) {
        // 카테고리별 색상
        const catColor = t.category >= 4 ? '#FF0000'
          : t.category >= 3 ? '#FF4500'
          : t.category >= 2 ? '#FFA500'
          : '#FFD700';
        const color = Cesium.Color.fromCssColorString(catColor);

        // 현재 위치 — 펄스 포인트
        const pos = Cesium.Cartesian3.fromDegrees(t.lng, t.lat, 10000);
        const entity = v.entities.add({
          name: t.name,
          position: pos,
          point: {
            pixelSize: new Cesium.CallbackProperty(() => {
              const phase = (Date.now() % 3000) / 3000;
              return 12 + Math.sin(phase * Math.PI * 2) * 6;
            }, false) as any,
            color: new Cesium.CallbackProperty(() => {
              const phase = (Date.now() % 3000) / 3000;
              return color.withAlpha(0.5 + Math.sin(phase * Math.PI * 2) * 0.3);
            }, false) as any,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
            outlineWidth: 2,
          },
          label: {
            text: `🌀 ${t.name}\nCAT${t.category} ${t.windSpeed}kn\n${t.pressure}hPa`,
            font: '10px monospace',
            fillColor: color,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            scaleByDistance: new Cesium.NearFarScalar(5e5, 1.2, 2e7, 0.4),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        typhoonEntitiesRef.current.push(entity);

        // 예측 경로 Polyline
        if (t.forecastPath.length > 1) {
          const pathPositions = t.forecastPath.map((p) =>
            Cesium.Cartesian3.fromDegrees(p.lng, p.lat, 5000)
          );
          const pathEntity = v.entities.add({
            polyline: {
              positions: pathPositions,
              width: 3,
              material: new Cesium.PolylineDashMaterialProperty({
                color: color.withAlpha(0.7),
                dashLength: 16,
              }),
              clampToGround: false,
            },
          });
          typhoonEntitiesRef.current.push(pathEntity);

          // 경로 끝점 (예측 도착점)
          const lastPt = t.forecastPath[t.forecastPath.length - 1];
          const endEntity = v.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lastPt.lng, lastPt.lat, 5000),
            point: {
              pixelSize: 6,
              color: color.withAlpha(0.5),
              outlineColor: Cesium.Color.WHITE.withAlpha(0.3),
              outlineWidth: 1,
            },
          });
          typhoonEntitiesRef.current.push(endEntity);
        }
      }

      v.scene.primitives.add(billboards);
      typhoonBillboardRef.current = billboards;
      setDataCounts('typhoon', typhoons.length);
      setLastUpdated('typhoon', Date.now());
    })();

    return () => { cancelled = true; };
  }, [activeOverlays, setDataCounts, setLastUpdated]);

  // ── Volcano 오버레이 — 활화산/휴화산 마커 ──
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!activeOverlays.includes('volcano')) {
      for (const e of volcanoEntitiesRef.current) {
        viewer.entities.remove(e);
      }
      volcanoEntitiesRef.current = [];
      setDataCounts('volcano', 0);
      return;
    }

    // 이전 정리
    for (const e of volcanoEntitiesRef.current) {
      viewer.entities.remove(e);
    }
    volcanoEntitiesRef.current = [];

    const volcanoes = fetchVolcanoes();
    for (const vol of volcanoes) {
      const color = vol.status === 'active'
        ? Cesium.Color.RED.withAlpha(0.9)
        : Cesium.Color.ORANGE.withAlpha(0.7);

      const entity = viewer.entities.add({
        name: vol.name,
        position: Cesium.Cartesian3.fromDegrees(vol.lng, vol.lat, vol.elevation),
        point: {
          pixelSize: vol.status === 'active' ? 10 : 7,
          color,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
          outlineWidth: 1,
          scaleByDistance: new Cesium.NearFarScalar(1e5, 2, 1e7, 0.5),
        },
        label: {
          text: `🌋 ${vol.name} (${vol.elevation}m)\n${vol.status.toUpperCase()} | Last: ${vol.lastEruption}`,
          font: '10px monospace',
          fillColor: color,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          outlineColor: Cesium.Color.BLACK,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -14),
          scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 3e6, 0),
          show: false,
        },
      });
      volcanoEntitiesRef.current.push(entity);
    }
    setDataCounts('volcano', volcanoes.length);
    setLastUpdated('volcano', Date.now());
  }, [activeOverlays, setDataCounts, setLastUpdated]);

  // ── Wildfire 오버레이 — 열점 PointPrimitiveCollection ──
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!activeOverlays.includes('wildfire')) {
      if (wildfirePointsRef.current) {
        viewer.scene.primitives.remove(wildfirePointsRef.current);
        wildfirePointsRef.current = null;
      }
      setDataCounts('wildfire', 0);
      return;
    }

    let cancelled = false;

    (async () => {
      const fires = await fetchWildfires();
      if (cancelled || !viewerRef.current || viewerRef.current.isDestroyed()) return;
      const v = viewerRef.current;

      if (wildfirePointsRef.current) {
        v.scene.primitives.remove(wildfirePointsRef.current);
      }

      const points = new Cesium.PointPrimitiveCollection();
      for (const f of fires) {
        // brightness → 색상/크기 매핑
        const intensity = Math.min(1, (f.brightness - 250) / 200);
        const r = 1.0;
        const g = 0.3 + (1 - intensity) * 0.4; // 밝을수록 빨강, 약하면 주황
        const size = 4 + intensity * 6;

        points.add({
          position: Cesium.Cartesian3.fromDegrees(f.lng, f.lat, 1000),
          pixelSize: size,
          color: new Cesium.Color(r, g, 0.0, 0.85),
          outlineColor: Cesium.Color.fromCssColorString('#FF4500').withAlpha(0.4),
          outlineWidth: 1,
          scaleByDistance: new Cesium.NearFarScalar(1e5, 2.0, 1e7, 0.5),
        });
      }

      v.scene.primitives.add(points);
      wildfirePointsRef.current = points;
      setDataCounts('wildfire', fires.length);
      setLastUpdated('wildfire', Date.now());
    })();

    return () => { cancelled = true; };
  }, [activeOverlays, setDataCounts, setLastUpdated]);

  // ── OSINT 뉴스 레이어 — Entity (개수 적으므로 Entity OK) ──
  const OSINT_CATEGORY_COLORS: Record<string, string> = {
    conflict: '#FF4444', military: '#FF6600', disaster: '#FF8C00',
    politics: '#9966FF', economy: '#33CC33', health: '#00CCCC',
    environment: '#66BB6A', general: '#AAAAAA',
  };

  const renderOsintEntities = useCallback((viewer: Cesium.Viewer, news: OsintData[]) => {
    clearEntities(osintEntitiesRef.current, viewer);
    for (const item of news) {
      const color = Cesium.Color.fromCssColorString(OSINT_CATEGORY_COLORS[item.category] ?? '#AAAAAA');
      const timeStr = new Date(item.time).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      const safeUrl = sanitizeUrl(item.url);
      const desc = `<b>${escapeHtml(item.title)}</b><br/>` +
        `Source: ${escapeHtml(item.source)} | ${escapeHtml(item.category.toUpperCase())}<br/>` +
        `Location: ${escapeHtml(item.locationName)}<br/>` +
        `Time: ${timeStr}<br/>` +
        (item.tone !== undefined ? `Tone: ${item.tone.toFixed(1)}<br/>` : '') +
        (safeUrl ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">Read more →</a>` : '');
      const labelText = item.category === 'conflict' ? '⚔' : item.category === 'disaster' ? '⚠' : '📰';
      const entity = viewer.entities.add({
        name: `📰 ${item.title}`,
        position: Cesium.Cartesian3.fromDegrees(item.lng, item.lat, 0),
        point: {
          pixelSize: item.severity === 'crisis' ? 12 : item.severity === 'disaster' ? 10 : 7,
          color,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
          outlineWidth: 1,
        },
        label: {
          text: labelText,
          font: '14px sans-serif',
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -8),
          scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 1e7, 0.3),
          show: false,
        },
        description: desc,
      });
      osintEntitiesRef.current.push(entity);
    }
    setDataCounts('osint', news.length);
    setLastUpdated('osint', Date.now());
  }, [clearEntities, setDataCounts, setLastUpdated]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!activeLayers.includes('osint')) {
      clearEntities(osintEntitiesRef.current, viewer);
      setDataCounts('osint', 0);
      return;
    }

    let cancelled = false;
    (async () => {
      const news = await fetchOsint();
      if (cancelled || !viewerRef.current) return;
      renderOsintEntities(viewerRef.current, news);
    })();

    // 15분마다 갱신 (캐시 TTL과 동기)
    const interval = setInterval(async () => {
      if (!viewerRef.current || !activeLayers.includes('osint')) return;
      const news = await fetchOsint();
      if (!viewerRef.current) return;
      renderOsintEntities(viewerRef.current, news);
    }, 900_000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [activeLayers, clearEntities, setDataCounts, setLastUpdated, renderOsintEntities]);

  // ── News Cluster Timelapse ──
  const clusterSelectedId = useNewsClusterStore((s) => s.selectedClusterId);
  const clusterCurrentTime = useNewsClusterStore((s) => s.currentTime);
  const allClusters = useNewsClusterStore((s) => s.clusters);

  const CLUSTER_CATEGORY_COLORS: Record<string, string> = {
    conflict: '#FF4444', military: '#FF6600', disaster: '#FF8C00',
    politics: '#9966FF', economy: '#33CC33', health: '#00CCCC',
    environment: '#66BB6A', general: '#AAAAAA',
  };

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Clear previous arc/marker entities
    clearEntities(clusterArcEntitiesRef.current, viewer);
    clearEntities(clusterMarkerEntitiesRef.current, viewer);

    if (!clusterSelectedId) return;

    const cluster = allClusters.find((c) => c.id === clusterSelectedId);
    if (!cluster) return;

    const { visibleEvents, visibleArcs } = getVisibleClusterState(cluster, clusterCurrentTime);
    const colorHex = CLUSTER_CATEGORY_COLORS[cluster.category] ?? '#AAAAAA';
    const color = Cesium.Color.fromCssColorString(colorHex);

    // Draw glowing arcs
    for (const arc of visibleArcs) {
      // Midpoint elevated for arc effect
      const midLat = (arc.fromLat + arc.toLat) / 2;
      const midLng = (arc.fromLng + arc.toLng) / 2;
      const dist = Math.sqrt(
        Math.pow(arc.toLat - arc.fromLat, 2) + Math.pow(arc.toLng - arc.fromLng, 2)
      );
      const arcHeight = Math.min(dist * 80000, 1200000); // max 1200km height

      const positions = [
        Cesium.Cartesian3.fromDegrees(arc.fromLng, arc.fromLat, 0),
        Cesium.Cartesian3.fromDegrees(midLng, midLat, arcHeight),
        Cesium.Cartesian3.fromDegrees(arc.toLng, arc.toLat, 0),
      ];

      const arcEntity = viewer.entities.add({
        polyline: {
          positions,
          width: 2,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.25,
            color: color.withAlpha(0.7),
          }),
          arcType: Cesium.ArcType.NONE,
        },
      });
      clusterArcEntitiesRef.current.push(arcEntity);
    }

    // Draw event markers
    for (const ev of visibleEvents) {
      const isOrigin = ev.id === cluster.events[0].id;
      const markerEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(ev.lng, ev.lat, 0),
        point: {
          pixelSize: isOrigin ? 10 : 7,
          color: isOrigin ? Cesium.Color.WHITE : color.withAlpha(0.9),
          outlineColor: color,
          outlineWidth: isOrigin ? 2 : 1,
        },
        label: {
          text: isOrigin ? '★' : '•',
          font: '12px sans-serif',
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 8e6, 0.3),
          show: true,
          fillColor: color,
        },
      });
      clusterMarkerEntitiesRef.current.push(markerEntity);
    }
  }, [clusterSelectedId, clusterCurrentTime, allClusters, clearEntities]);

  // ── Heatmap Layer ──
  const heatmapPrimitivesRef = useRef<Cesium.GroundPrimitive[]>([]);
  const heatmapPrecisionRef = useRef<number>(0);
  const activeHeatmaps = useAppStore((s) => s.activeHeatmaps);
  const heatmapParams = useAppStore((s) => s.heatmapParams);
  const anomalyHaloEnabled = useAppStore((s) => s.anomalyHaloEnabled);
  const haloDetectorRef = useRef(new AnomalyHaloDetector());
  const haloPrimitiveRef = useRef<Cesium.GroundPrimitive | null>(null);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // 기존 히트맵 제거
    for (const prim of heatmapPrimitivesRef.current) {
      try { viewer.scene.primitives.remove(prim); } catch { /* already removed */ }
    }
    heatmapPrimitivesRef.current = [];

    if (activeHeatmaps.length === 0) return;

    let cancelled = false;
    let cameraListener: (() => void) | null = null;

    const buildHeatmaps = async () => {
      if (cancelled) return;
      const v = viewerRef.current;
      if (!v || v.isDestroyed()) return;

      const alt = v.camera.positionCartographic.height;
      const newPrecision = precisionForAltitude(alt);

      // precision이 바뀌지 않았고 이미 렌더링된 상태면 스킵
      if (newPrecision === heatmapPrecisionRef.current && heatmapPrimitivesRef.current.length > 0) return;
      heatmapPrecisionRef.current = newPrecision;

      // 기존 제거
      for (const prim of heatmapPrimitivesRef.current) {
        try { v.scene.primitives.remove(prim); } catch { /* ok */ }
      }
      heatmapPrimitivesRef.current = [];

      const layerFetchers: Record<string, () => Promise<HeatmapPoint[]>> = {
        flights: async () => {
          const data = await fetchFlights();
          return data.filter((f) => !f.onGround).map((f) => ({ lat: f.lat, lng: f.lng }));
        },
        ships: async () => {
          const data = await fetchShips();
          return data.map((s) => ({ lat: s.lat, lng: s.lng }));
        },
        earthquakes: async () => {
          const data = await fetchEarthquakes();
          return data.map((q) => ({ lat: q.lat, lng: q.lng, weight: q.magnitude }));
        },
      };

      for (const layerId of activeHeatmaps) {
        if (cancelled) return;
        const fetcher = layerFetchers[layerId];
        if (!fetcher) continue;

        try {
          const points = await fetcher();
          // halo 통계 업데이트 (이상치 탐지용)
          const cells = aggregatePoints(points, newPrecision);
          haloDetectorRef.current.update(layerId, cells, newPrecision);
          const prim = createHeatmapPrimitive(points, alt, {
            opacity: heatmapParams.opacity,
            intensity: heatmapParams.intensity,
            palette: heatmapParams.palette as 'thermal' | 'viridis' | 'plasma',
          });
          if (prim && !cancelled && v && !v.isDestroyed()) {
            v.scene.primitives.add(prim);
            heatmapPrimitivesRef.current.push(prim);
          }
        } catch {
          // fetch 실패 무시
        }
      }
    };

    // 초기 빌드
    buildHeatmaps();

    // 카메라 이동 시 precision 변경 감지 → 리빌드 (debounce 800ms)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const onCameraChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!cancelled) {
          const v = viewerRef.current;
          if (v && !v.isDestroyed()) {
            const alt = v.camera.positionCartographic.height;
            const newP = precisionForAltitude(alt);
            if (newP !== heatmapPrecisionRef.current) {
              buildHeatmaps();
            }
          }
        }
      }, 800);
    };

    if (viewer.camera) {
      viewer.camera.changed.addEventListener(onCameraChange);
      cameraListener = () => viewer.camera.changed.removeEventListener(onCameraChange);
    }

    // 10초마다 데이터 갱신
    const interval = setInterval(() => {
      heatmapPrecisionRef.current = 0; // force rebuild
      buildHeatmaps();
    }, 10000);

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (cameraListener) cameraListener();
      clearInterval(interval);
      const v = viewerRef.current;
      if (v && !v.isDestroyed()) {
        for (const prim of heatmapPrimitivesRef.current) {
          try { v.scene.primitives.remove(prim); } catch { /* ok */ }
        }
      }
      heatmapPrimitivesRef.current = [];
    };
  }, [activeHeatmaps, heatmapParams]);

  // ── Anomaly Halo 렌더링 ──
  useEffect(() => {
    const removeHalo = () => {
      const v = viewerRef.current;
      if (v && !v.isDestroyed() && haloPrimitiveRef.current) {
        try { v.scene.primitives.remove(haloPrimitiveRef.current); } catch { /* ok */ }
        haloPrimitiveRef.current = null;
      }
    };

    if (!anomalyHaloEnabled || activeHeatmaps.length === 0) {
      removeHalo();
      return;
    }

    const buildHalo = () => {
      const v = viewerRef.current;
      if (!v || v.isDestroyed()) return;

      // sin 기반 맥동 (주기 2.5초)
      const pulseFactor = (Math.sin(Date.now() / 1250) + 1) / 2;

      const allCells = activeHeatmaps.flatMap((layerId) =>
        haloDetectorRef.current.getHaloCells(layerId),
      );

      const alt = v.camera.positionCartographic.height;
      const newPrim = allCells.length > 0
        ? createHaloPrimitive(allCells, alt, pulseFactor)
        : null;

      removeHalo();
      if (newPrim) {
        v.scene.primitives.add(newPrim);
        haloPrimitiveRef.current = newPrim;
      }
    };

    // 400ms마다 재빌드 — 맥동 주기와 맞춤
    const interval = setInterval(buildHalo, 400);
    buildHalo();

    return () => {
      clearInterval(interval);
      removeHalo();
    };
  }, [anomalyHaloEnabled, activeHeatmaps]);

  // ── Correlation Engine 연동 ──
  const correlationEngine = useCorrelationStore((s) => s.engine);

  // 엔진 자동 시작/정지
  useEffect(() => {
    const startEngine = useCorrelationStore.getState().startEngine;
    const stopEngine = useCorrelationStore.getState().stopEngine;
    startEngine();
    return () => { stopEngine(); };
  }, []);

  // 레이어 데이터 갱신 시 SpatialIndex 업데이트
  useEffect(() => {
    if (!correlationEngine) return;

    const buildEntities = async () => {
      try {
        // 지진 데이터
        const quakes = await fetchEarthquakes();
        const quakeEntities: SpatialEntity[] = quakes.map((q) => ({
          id: `eq-${q.id}`,
          layer: 'earthquakes',
          lat: q.lat,
          lng: q.lng,
          data: { magnitude: q.magnitude, place: q.place, depth: q.depth, time: q.time },
        }));
        correlationEngine.updateLayer('earthquakes', quakeEntities);

        // 선박 데이터
        const ships = await fetchShips();
        const shipEntities: SpatialEntity[] = ships.map((s) => ({
          id: `ship-${s.mmsi}`,
          layer: 'ships',
          lat: s.lat,
          lng: s.lng,
          data: { name: s.name, mmsi: s.mmsi, shipType: s.shipType, speed: s.speed },
        }));
        correlationEngine.updateLayer('ships', shipEntities);

        // 항공기 데이터
        const flights = await fetchFlights();
        const flightEntities: SpatialEntity[] = flights.filter((f) => !f.onGround).map((f) => ({
          id: `flight-${f.callsign || Math.random().toString(36).slice(2, 8)}`,
          layer: 'flights',
          lat: f.lat,
          lng: f.lng,
          data: { callsign: f.callsign, altitude: f.altitude, velocity: f.velocity },
        }));
        correlationEngine.updateLayer('flights', flightEntities);

        // 군용기 데이터
        const aircraft = await fetchMilAircraft();
        const adsbEntities: SpatialEntity[] = aircraft.map((ac) => ({
          id: `adsb-${ac.hex}`,
          layer: 'adsb',
          lat: ac.lat,
          lng: ac.lng,
          data: { callsign: ac.callsign, type: ac.type, altitude: ac.altitude, hex: ac.hex },
        }));
        correlationEngine.updateLayer('adsb', adsbEntities);
      } catch {
        // 데이터 fetch 실패 시 무시 (다음 주기에 재시도)
      }

      // CCTV 데이터
      const cctvs = fetchCCTVs();
      const cctvEntities: SpatialEntity[] = cctvs.map((c) => ({
        id: `cctv-${c.id}`,
        layer: 'cctvs',
        lat: c.lat,
        lng: c.lng,
        data: { name: c.name, city: c.city, type: c.type },
      }));
      correlationEngine.updateLayer('cctvs', cctvEntities);

      // 화산 데이터
      const volcanoes = fetchVolcanoes();
      const volcanoEntities: SpatialEntity[] = volcanoes.map((v) => ({
        id: `vol-${v.name}`,
        layer: 'volcanoes',
        lat: v.lat,
        lng: v.lng,
        data: { name: v.name, country: v.country, elevation: v.elevation, status: v.status, lastEruption: v.lastEruption },
      }));
      correlationEngine.updateLayer('volcanoes', volcanoEntities);

      // 산불 데이터
      try {
        const fires = await fetchWildfires();
        const wildfireEntities: SpatialEntity[] = fires.map((f, i) => ({
          id: `fire-${i}-${f.lat}-${f.lng}`,
          layer: 'wildfires',
          lat: f.lat,
          lng: f.lng,
          data: { brightness: f.brightness, confidence: f.confidence, satellite: f.satellite },
        }));
        correlationEngine.updateLayer('wildfires', wildfireEntities);
      } catch {
        // 산불 데이터 fetch 실패 시 무시
      }

      // OSINT 뉴스 데이터
      try {
        const news = await fetchOsint();
        const osintEntities: SpatialEntity[] = news.map((n) => ({
          id: `osint-${n.id}`,
          layer: 'osint',
          lat: n.lat,
          lng: n.lng,
          data: { title: n.title, category: n.category, source: n.source, severity: n.severity, tone: n.tone },
        }));
        correlationEngine.updateLayer('osint', osintEntities);
      } catch {
        // OSINT 데이터 fetch 실패 시 무시
      }
    };

    // 초기 로드 + 15초마다 갱신
    buildEntities();
    const interval = setInterval(buildEntities, 15000);
    return () => clearInterval(interval);
  }, [correlationEngine]);

  // ── Trajectory rendering & periodic cleanup ──
  const activeTrajectories = useTrajectoryStore((s) => s.activeTrajectories);
  const showPrediction = useTrajectoryStore((s) => s.showPrediction);
  const predictionMinutes = useTrajectoryStore((s) => s.predictionMinutes);
  const historyMinutes = useTrajectoryStore((s) => s.historyMinutes);

  useEffect(() => {
    const renderer = trajectoryRendererRef.current;
    if (!renderer) return;

    renderer.update(
      activeTrajectories,
      showPrediction,
      predictionMinutes,
      historyMinutes,
      trajectoryEntityMapRef.current,
    );
  }, [activeTrajectories, showPrediction, predictionMinutes, historyMinutes]);

  // Refresh trajectory render every 15 seconds while trajectories are active
  useEffect(() => {
    if (activeTrajectories.length === 0) return;
    const interval = setInterval(() => {
      trajectoryRendererRef.current?.update(
        useTrajectoryStore.getState().activeTrajectories,
        useTrajectoryStore.getState().showPrediction,
        useTrajectoryStore.getState().predictionMinutes,
        useTrajectoryStore.getState().historyMinutes,
        trajectoryEntityMapRef.current,
      );
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTrajectories.length > 0]);

  // Periodic cleanup of old position records (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => { trajectoryDB.cleanup(); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0 }}
      />
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none font-mono text-[10px] leading-snug
            bg-zinc-900/90 backdrop-blur-sm border border-zinc-600/50 rounded px-2.5 py-1.5 shadow-lg"
          style={{
            left: tooltip.x + 16,
            top: tooltip.y - 10,
            borderColor: tooltip.color + '60',
          }}
        >
          {tooltip.lines.map((line, i) => (
            <div key={i} style={{ color: i === 0 ? tooltip.color : '#d1d5db' }}>
              {i === 0 ? <span className="font-bold">{line}</span> : line}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
