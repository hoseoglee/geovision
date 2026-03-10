

import { useEffect, useRef, useCallback, useState } from 'react';
import * as Cesium from 'cesium';
import { useAppStore } from '@/store/useAppStore';
import type { SatelliteData } from '@/providers/SatelliteProvider';
import { propagateSatellite } from '@/providers/SatelliteProvider';
import type { FlightData } from '@/providers/FlightProvider';
import type { ShipData } from '@/providers/ShipProvider';
import { fetchSatellites } from '@/providers/SatelliteProvider';
import { fetchFlights } from '@/providers/FlightProvider';
import { fetchEarthquakes } from '@/providers/EarthquakeProvider';
import { fetchShips, connectAISStream, disconnectAISStream, isAISConnected } from '@/providers/ShipProvider';
import { fetchCCTVs, setSelectedCCTV, bootstrapWindyCams, subscribeAllCCTVs } from '@/providers/CCTVProvider';
import { CHOKEPOINTS } from '@/data/chokepoints';
import {
  SUBMARINE_CABLES, MILITARY_BASES, NUCLEAR_PLANTS, MAJOR_PORTS, OCEAN_CURRENTS,
} from '@/data/overlayData';
import { getSunPosition } from '@/components/SunPosition';
import crtShader from '@/filters/crt';
import nightVisionShader from '@/filters/nightVision';
import thermalShader from '@/filters/thermal';
import flirShader from '@/filters/flir';
import animeShader from '@/filters/anime';
import lutShader from '@/filters/lut';

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

// CCTV 아이콘 — 밝은 녹색 카메라
const CCTV_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="3" y="6" width="12" height="10" rx="2" fill="#00FF88" stroke="#FFF" stroke-width="1"/><polygon points="15,8 21,5 21,19 15,16" fill="#00FF88" stroke="#FFF" stroke-width="0.8"/><circle cx="9" cy="20" r="2" fill="#00FF88"/></svg>`)}`;

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
  const stageRef = useRef<Cesium.PostProcessStage | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [windyCamsVersion, setWindyCamsVersion] = useState(0);

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

  const activeFilter = useAppStore((s) => s.activeFilter);
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

      // 마우스 좌표 추적
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
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // 클릭 → 상세 정보 + 외부 사이트 연결
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const picked = viewer.scene.pick(click.position);

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
            });
          }
          return;
        }
      }

      // Entity 클릭 (초크포인트, 지진 등)
      if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity) {
        const entity = picked.id;

        // Check if clicked entity is a CCTV camera
        const cctvData = entity?.properties?.cctvData?.getValue(Cesium.JulianDate.now());
        if (cctvData) {
          setSelectedCCTV(cctvData);
          return;
        }
        const desc = entity.description?.getValue(Cesium.JulianDate.now()) || '';
        const name = entity.name || 'Unknown';
        if (name && (entity as any)._chokepoint) {
          const cp = (entity as any)._chokepoint;
          setSelectedEntity({
            type: 'ship',
            name: cp.name,
            details: { TYPE: cp.type.toUpperCase(), LAT: cp.lat.toFixed(3), LNG: cp.lng.toFixed(3), INFO: cp.info },
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
          pixelSize: 6,
          color,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
          outlineWidth: 1,
          scaleByDistance: new Cesium.NearFarScalar(1e5, 2.0, 1e7, 0.5),
        },
        label: {
          text: `◆ ${cp.name}`,
          font: '10px monospace',
          fillColor: color,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          outlineColor: Cesium.Color.BLACK,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -8),
          scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 5e6, 0.3),
          show: false,
        },
      });
      (entity as any)._chokepoint = cp;
    }

    return () => {
      for (const e of hoverTrailRef.current) viewer.entities.remove(e);
      hoverTrailRef.current = [];
      handler.destroy();
      if (!viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

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

  // PostProcessStage 적용/해제
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (stageRef.current) {
      viewer.scene.postProcessStages.remove(stageRef.current);
      stageRef.current = null;
    }

    if (activeFilter && FILTER_SHADERS[activeFilter]) {
      const stage = new Cesium.PostProcessStage({
        fragmentShader: FILTER_SHADERS[activeFilter],
      });
      viewer.scene.postProcessStages.add(stage);
      stageRef.current = stage;
    }
  }, [activeFilter]);

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
        const entity = viewer.entities.add({
          name: cable.name,
          polyline: {
            positions,
            width: 2,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString(cable.color).withAlpha(0.7),
              dashLength: 12,
            }),
            clampToGround: true,
          },
          label: {
            text: cable.name,
            font: '9px monospace',
            fillColor: Cesium.Color.fromCssColorString(cable.color),
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            scaleByDistance: new Cesium.NearFarScalar(5e5, 1, 5e6, 0.3),
            show: false,
          },
        });
        overlayEntitiesRef.current.push(entity);
      }
    }

    // 6. 군사 기지
    if (activeOverlays.includes('military')) {
      const typeColors: Record<string, string> = {
        naval: '#FF4444', air: '#FFD700', army: '#32CD32', joint: '#FF69B4',
      };
      for (const base of MILITARY_BASES) {
        const entity = viewer.entities.add({
          name: base.name,
          position: Cesium.Cartesian3.fromDegrees(base.lng, base.lat, 0),
          point: {
            pixelSize: 7,
            color: Cesium.Color.fromCssColorString(typeColors[base.type] || '#FF4444'),
            outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
            outlineWidth: 1,
            scaleByDistance: new Cesium.NearFarScalar(1e5, 2, 1e7, 0.5),
          },
          label: {
            text: `⚔ ${base.name} [${base.country}]`,
            font: '10px monospace',
            fillColor: Cesium.Color.fromCssColorString(typeColors[base.type] || '#FF4444'),
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 3e6, 0),
            show: false,
          },
        });
        overlayEntitiesRef.current.push(entity);
      }
    }

    // 7. 핵 시설
    if (activeOverlays.includes('nuclear')) {
      for (const plant of NUCLEAR_PLANTS) {
        const color = plant.status === 'active'
          ? Cesium.Color.fromCssColorString('#00FF00')
          : Cesium.Color.fromCssColorString('#FF6600');
        const entity = viewer.entities.add({
          name: plant.name,
          position: Cesium.Cartesian3.fromDegrees(plant.lng, plant.lat, 0),
          point: {
            pixelSize: 8,
            color,
            outlineColor: Cesium.Color.YELLOW.withAlpha(0.8),
            outlineWidth: 2,
            scaleByDistance: new Cesium.NearFarScalar(1e5, 2, 1e7, 0.5),
          },
          label: {
            text: `☢ ${plant.name} (${plant.reactors}R)`,
            font: '10px monospace',
            fillColor: color,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -12),
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 3e6, 0),
            show: false,
          },
        });
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
            pixelSize: Math.max(5, 12 - port.rank * 0.5),
            color: Cesium.Color.fromCssColorString('#00BFFF'),
            outlineColor: Cesium.Color.WHITE.withAlpha(0.5),
            outlineWidth: 1,
            scaleByDistance: new Cesium.NearFarScalar(1e5, 2, 1e7, 0.5),
          },
          label: {
            text: `⚓ #${port.rank} ${port.name}`,
            font: '10px monospace',
            fillColor: Cesium.Color.fromCssColorString('#00BFFF'),
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 3e6, 0),
            show: false,
          },
        });
        overlayEntitiesRef.current.push(entity);
      }
    }

    // 9. 해류
    if (activeOverlays.includes('currents')) {
      for (const current of OCEAN_CURRENTS) {
        const positions = current.points.map(([lng, lat]) =>
          Cesium.Cartesian3.fromDegrees(lng, lat, 0)
        );
        const color = Cesium.Color.fromCssColorString(current.color).withAlpha(0.6);
        const entity = viewer.entities.add({
          name: current.name,
          polyline: {
            positions,
            width: current.warm ? 4 : 3,
            material: new Cesium.PolylineArrowMaterialProperty(color),
            clampToGround: true,
          },
          label: {
            text: `${current.warm ? '🔴' : '🔵'} ${current.name}`,
            font: '9px monospace',
            fillColor: Cesium.Color.fromCssColorString(current.color),
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            scaleByDistance: new Cesium.NearFarScalar(5e5, 1, 5e6, 0.3),
            show: false,
          },
        });
        overlayEntitiesRef.current.push(entity);
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

    // 13. CCTV 카메라
    if (activeOverlays.includes('cctv')) {
      // Bootstrap Windy cams in background
      bootstrapWindyCams();

      const cctvs = fetchCCTVs();
      for (const cam of cctvs) {
        const color = cam.type === 'traffic' ? Cesium.Color.LIME
          : cam.type === 'port' ? Cesium.Color.CYAN
          : cam.type === 'landmark' ? Cesium.Color.GOLD
          : cam.type === 'webcam' ? Cesium.Color.fromCssColorString('#BB86FC')
          : Cesium.Color.WHITE;
        const entity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(cam.lng, cam.lat, 200),
          billboard: {
            image: CCTV_SVG,
            width: 20,
            height: 20,
            color,
            scaleByDistance: new Cesium.NearFarScalar(1e4, 2.0, 1e7, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e6),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: cam.name,
            font: '10px monospace',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 5e6, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2e6),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          properties: { cctvData: cam },
        });
        overlayEntitiesRef.current.push(entity);

        // 카메라 영상 미리보기 — 줌인 시 3D 공간에 떠있는 패널
        if (cam.source === 'static' && cam.thumbnailUrl !== undefined) {
          // static 카메라는 YouTube 썸네일 사용
          const thumbUrl = `https://img.youtube.com/vi/${cam.embedUrl.split('/embed/')[1]?.split('?')[0]}/mqdefault.jpg`;
          const previewEntity = viewer.entities.add({
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
          overlayEntitiesRef.current.push(previewEntity);
        } else if (cam.source === 'static') {
          // YouTube 썸네일 자동 추출
          const vidId = cam.embedUrl.split('/embed/')[1]?.split('?')[0];
          if (vidId) {
            const thumbUrl = `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`;
            const previewEntity = viewer.entities.add({
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
            overlayEntitiesRef.current.push(previewEntity);
          }
        } else if (cam.thumbnailUrl) {
          // Windy 카메라는 thumbnailUrl 사용
          const previewEntity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(cam.lng, cam.lat, 350),
            billboard: {
              image: cam.thumbnailUrl,
              width: 160,
              height: 90,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              scaleByDistance: new Cesium.NearFarScalar(500, 1.2, 2e4, 0.3),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2e4),
              pixelOffset: new Cesium.Cartesian2(0, -50),
            },
          });
          overlayEntitiesRef.current.push(previewEntity);
        }

        // 카메라 시야각(FOV) 3D 프러스텀 — 정적 카메라(36개)에만 적용 (성능)
        if (cam.source === 'static') {
        const camHeading = cam.heading ?? ((cam.lat * 1000 + cam.lng * 100) % 360);
        const headingRad = Cesium.Math.toRadians(camHeading);
        const fovRange = 300; // 시야 범위 (미터)
        const fovAngle = 60; // FOV 각도 (도)
        const halfFov = Cesium.Math.toRadians(fovAngle / 2);
        const camHeight = 200; // 카메라 설치 높이 (m)

        // FOV 부채꼴 끝점 계산
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

        // 바닥 삼각형 (지면)
        const fovGround = viewer.entities.add({
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray([
              cam.lng, cam.lat,
              farLng1, farLat1,
              farLng2, farLat2,
            ]),
            material: color.withAlpha(0.1),
            height: 0,
          },
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e4),
        } as any);
        overlayEntitiesRef.current.push(fovGround);

        // 3D 벽면 — 카메라에서 지면까지 내려오는 프러스텀 측면
        // 좌측 벽
        const wallLeft = viewer.entities.add({
          wall: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              cam.lng, cam.lat, camHeight,
              farLng1, farLat1, 0,
            ]),
            material: color.withAlpha(0.08),
          },
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e4),
        } as any);
        overlayEntitiesRef.current.push(wallLeft);

        // 우측 벽
        const wallRight = viewer.entities.add({
          wall: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              cam.lng, cam.lat, camHeight,
              farLng2, farLat2, 0,
            ]),
            material: color.withAlpha(0.08),
          },
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e4),
        } as any);
        overlayEntitiesRef.current.push(wallRight);

        // 전면 벽 (먼 쪽 끝)
        const wallFront = viewer.entities.add({
          wall: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              farLng1, farLat1, 0,
              farLng2, farLat2, 0,
            ]),
            minimumHeights: [0, 0],
            maximumHeights: [camHeight * 0.3, camHeight * 0.3],
            material: color.withAlpha(0.12),
          },
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e4),
        } as any);
        overlayEntitiesRef.current.push(wallFront);

        // 프러스텀 엣지 라인 — 카메라에서 FOV 끝점까지 와이어프레임
        const fovLines = viewer.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              farLng1, farLat1, 0,
              cam.lng, cam.lat, camHeight,
              farLng2, farLat2, 0,
            ]),
            width: 1.5,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.3,
              color: color.withAlpha(0.6),
            }),
          },
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e4),
        } as any);
        overlayEntitiesRef.current.push(fovLines);
        } // end if (cam.source === 'static')
      }
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

      // 시뮬레이션 군용기 마커 (주요 군사 기지 인근)
      const milAircraft = [
        { callsign: 'FORTE12', type: 'RQ-4 Global Hawk', lat: 36.2, lng: 129.5, alt: 18000, heading: 45 },
        { callsign: 'DOOM31', type: 'B-52H Stratofortress', lat: 35.5, lng: 126.0, alt: 12000, heading: 270 },
        { callsign: 'KNIFE72', type: 'RC-135W Rivet Joint', lat: 38.5, lng: 127.5, alt: 10000, heading: 180 },
        { callsign: 'VIPER01', type: 'F-16C Fighting Falcon', lat: 51.0, lng: 1.0, alt: 8000, heading: 90 },
        { callsign: 'SENTRY50', type: 'E-3 AWACS', lat: 33.0, lng: 44.0, alt: 9000, heading: 320 },
        { callsign: 'DRAGON50', type: 'P-8A Poseidon', lat: 25.0, lng: 120.0, alt: 7500, heading: 200 },
        { callsign: 'ATLAS01', type: 'C-17 Globemaster', lat: 49.0, lng: 8.0, alt: 11000, heading: 60 },
        { callsign: 'REAPER11', type: 'MQ-9 Reaper', lat: 32.0, lng: 45.0, alt: 6000, heading: 150 },
      ];

      for (const ac of milAircraft) {
        const acEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(ac.lng, ac.lat, ac.alt * 100),
          billboard: {
            image: AIRPLANE_SVG,
            width: 24,
            height: 24,
            color: Cesium.Color.RED,
            rotation: -Cesium.Math.toRadians(ac.heading),
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1.5, 1e7, 0.4),
          },
          label: {
            text: `${ac.callsign}\n${ac.type}\nFL${Math.round(ac.alt / 100)}`,
            font: '9px monospace',
            fillColor: Cesium.Color.RED,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(15, 0),
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1.0, 5e6, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e6),
          },
        });
        overlayEntitiesRef.current.push(acEntity);
      }
    }
  }, [activeOverlays, windyCamsVersion]);

  // Subscribe to Windy cam updates to re-trigger overlay rendering
  useEffect(() => {
    if (!activeOverlays.includes('cctv')) return;
    const unsub = subscribeAllCCTVs(() => setWindyCamsVersion((v) => v + 1));
    return unsub;
  }, [activeOverlays]);

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0 }}
      />
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none font-mono text-[10px] leading-snug
            bg-gray-900/90 backdrop-blur-sm border border-gray-600/50 rounded px-2.5 py-1.5 shadow-lg"
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
