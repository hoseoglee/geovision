import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import {
  useMeasurementStore,
  haversineKm,
  sphericalAreaKm2,
  formatDistance,
  formatArea,
} from '@/store/useMeasurementStore';
import type { MeasurePoint } from '@/store/useMeasurementStore';

/**
 * Globe 위에 측정 도형/라벨을 렌더링하고 클릭 이벤트를 처리하는 훅.
 * useGeofenceGlobe과 동일 패턴.
 */
export function useMeasurementGlobe(viewerRef: React.MutableRefObject<Cesium.Viewer | null>) {
  const entitiesRef = useRef<Cesium.Entity[]>([]);
  const previewRef = useRef<Cesium.Entity[]>([]);

  const mode = useMeasurementStore((s) => s.mode);
  const addPoint = useMeasurementStore((s) => s.addPoint);
  const setCursorPoint = useMeasurementStore((s) => s.setCursorPoint);
  const points = useMeasurementStore((s) => s.points);
  const cursorPoint = useMeasurementStore((s) => s.cursorPoint);
  const measurements = useMeasurementStore((s) => s.measurements);
  const unit = useMeasurementStore((s) => s.unit);
  const rangeRingRadii = useMeasurementStore((s) => s.rangeRingRadii);

  // --- 1. 클릭 핸들러 (측정 모드일 때만) ---
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !mode) return;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const ray = viewer.camera.getPickRay(click.position);
      if (!ray) return;
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (!cartesian) return;
      const carto = Cesium.Cartographic.fromCartesian(cartesian);
      addPoint({
        lat: Cesium.Math.toDegrees(carto.latitude),
        lng: Cesium.Math.toDegrees(carto.longitude),
      });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 마우스 이동 — 라이브 프리뷰용 커서 좌표
    handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
      const ray = viewer.camera.getPickRay(movement.endPosition);
      if (!ray) return;
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (!cartesian) { setCursorPoint(null); return; }
      const carto = Cesium.Cartographic.fromCartesian(cartesian);
      setCursorPoint({
        lat: Cesium.Math.toDegrees(carto.latitude),
        lng: Cesium.Math.toDegrees(carto.longitude),
      });
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    return () => { handler.destroy(); };
  }, [mode, addPoint, setCursorPoint, viewerRef]);

  // --- 2. 확정된 측정 결과 렌더링 ---
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    for (const e of entitiesRef.current) viewer.entities.remove(e);
    entitiesRef.current = [];

    for (const m of measurements) {
      if (m.type === 'distance' && m.points.length >= 2) {
        renderDistance(viewer, m.points, m.result, m.segments, unit, entitiesRef);
      } else if (m.type === 'area' && m.points.length >= 3) {
        renderArea(viewer, m.points, m.result, unit, entitiesRef);
      } else if (m.type === 'rangeRing' && m.points.length === 1) {
        renderRangeRing(viewer, m.points[0], rangeRingRadii, unit, entitiesRef);
      }
    }
  }, [measurements, unit, rangeRingRadii, viewerRef]);

  // --- 3. 드로잉 프리뷰 (진행 중) ---
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    for (const e of previewRef.current) viewer.entities.remove(e);
    previewRef.current = [];
    if (!mode || points.length === 0) return;

    const allPts = cursorPoint ? [...points, cursorPoint] : points;

    // 각 포인트 점 표시
    for (const p of points) {
      previewRef.current.push(viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat),
        point: {
          pixelSize: 7,
          color: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }));
    }

    if (mode === 'distance' && allPts.length >= 2) {
      // 폴리라인
      previewRef.current.push(viewer.entities.add({
        polyline: {
          positions: allPts.map((p) => Cesium.Cartesian3.fromDegrees(p.lng, p.lat)),
          width: 2.5,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.YELLOW.withAlpha(0.9),
            dashLength: 12,
          }),
          clampToGround: true,
        },
      }));

      // 현재 총 거리 라벨
      let total = 0;
      for (let i = 0; i < allPts.length - 1; i++) {
        total += haversineKm(allPts[i], allPts[i + 1]);
      }
      const lastPt = allPts[allPts.length - 1];
      previewRef.current.push(viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lastPt.lng, lastPt.lat),
        label: {
          text: formatDistance(total, unit),
          font: '13px monospace',
          fillColor: Cesium.Color.YELLOW,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 3,
          outlineColor: Cesium.Color.BLACK,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -14),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(1e4, 1, 5e6, 0.4),
        },
      }));
    }

    if (mode === 'area' && allPts.length >= 3) {
      previewRef.current.push(viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(allPts.map((p) => Cesium.Cartesian3.fromDegrees(p.lng, p.lat))),
          material: Cesium.Color.YELLOW.withAlpha(0.12),
          outline: true,
          outlineColor: Cesium.Color.YELLOW.withAlpha(0.8),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      }));

      const area = sphericalAreaKm2(allPts);
      const center = centroid(allPts);
      previewRef.current.push(viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(center.lng, center.lat),
        label: {
          text: formatArea(area, unit),
          font: '13px monospace',
          fillColor: Cesium.Color.YELLOW,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 3,
          outlineColor: Cesium.Color.BLACK,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(1e4, 1, 5e6, 0.4),
        },
      }));
    }
  }, [mode, points, cursorPoint, unit, viewerRef]);
}

// --- 헬퍼: 확정 측정 렌더 ---

function renderDistance(
  viewer: Cesium.Viewer,
  points: MeasurePoint[],
  total: number,
  segments: number[] | undefined,
  unit: string,
  ref: React.MutableRefObject<Cesium.Entity[]>,
) {
  const u = unit as import('@/store/useMeasurementStore').MeasureUnit;
  // 포인트 마커
  for (const p of points) {
    ref.current.push(viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat),
      point: {
        pixelSize: 6,
        color: Cesium.Color.ORANGE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    }));
  }

  // 폴리라인
  ref.current.push(viewer.entities.add({
    polyline: {
      positions: points.map((p) => Cesium.Cartesian3.fromDegrees(p.lng, p.lat)),
      width: 2.5,
      material: Cesium.Color.ORANGE.withAlpha(0.9),
      clampToGround: true,
    },
  }));

  // 구간별 라벨
  if (segments && segments.length > 1) {
    for (let i = 0; i < segments.length; i++) {
      const mid = midpoint(points[i], points[i + 1]);
      ref.current.push(viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(mid.lng, mid.lat),
        label: {
          text: formatDistance(segments[i], u),
          font: '10px monospace',
          fillColor: Cesium.Color.ORANGE.withAlpha(0.8),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          outlineColor: Cesium.Color.BLACK,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -6),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(1e4, 1, 5e6, 0.3),
        },
      }));
    }
  }

  // 총 거리 라벨
  const last = points[points.length - 1];
  ref.current.push(viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(last.lng, last.lat),
    label: {
      text: `TOTAL: ${formatDistance(total, u)}`,
      font: '12px monospace',
      fillColor: Cesium.Color.ORANGE,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 3,
      outlineColor: Cesium.Color.BLACK,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -14),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1e4, 1, 5e6, 0.4),
    },
  }));
}

function renderArea(
  viewer: Cesium.Viewer,
  points: MeasurePoint[],
  area: number,
  unit: string,
  ref: React.MutableRefObject<Cesium.Entity[]>,
) {
  const u = unit as import('@/store/useMeasurementStore').MeasureUnit;
  ref.current.push(viewer.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(points.map((p) => Cesium.Cartesian3.fromDegrees(p.lng, p.lat))),
      material: Cesium.Color.ORANGE.withAlpha(0.15),
      outline: true,
      outlineColor: Cesium.Color.ORANGE.withAlpha(0.8),
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  }));

  for (const p of points) {
    ref.current.push(viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat),
      point: {
        pixelSize: 5,
        color: Cesium.Color.ORANGE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    }));
  }

  const center = centroid(points);
  ref.current.push(viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(center.lng, center.lat),
    label: {
      text: formatArea(area, u),
      font: '13px monospace',
      fillColor: Cesium.Color.ORANGE,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 3,
      outlineColor: Cesium.Color.BLACK,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1e4, 1, 5e6, 0.4),
    },
  }));
}

function renderRangeRing(
  viewer: Cesium.Viewer,
  center: MeasurePoint,
  radii: number[],
  unit: string,
  ref: React.MutableRefObject<Cesium.Entity[]>,
) {
  const u = unit as import('@/store/useMeasurementStore').MeasureUnit;

  // 중심 마커
  ref.current.push(viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(center.lng, center.lat),
    point: {
      pixelSize: 8,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  }));

  // 동심원
  for (const rKm of radii) {
    ref.current.push(viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(center.lng, center.lat),
      ellipse: {
        semiMajorAxis: rKm * 1000,
        semiMinorAxis: rKm * 1000,
        material: Cesium.Color.RED.withAlpha(0.04),
        outline: true,
        outlineColor: Cesium.Color.RED.withAlpha(0.5),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    }));

    // 라벨 (상단에 표시)
    const labelLat = center.lat + (rKm / 111.32);
    ref.current.push(viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(center.lng, labelLat),
      label: {
        text: formatDistance(rKm, u),
        font: '10px monospace',
        fillColor: Cesium.Color.RED.withAlpha(0.8),
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        outlineColor: Cesium.Color.BLACK,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(1e4, 1, 1e7, 0.3),
      },
    }));
  }
}

// --- 유틸 ---

function centroid(pts: MeasurePoint[]): MeasurePoint {
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
  return { lat, lng };
}

function midpoint(a: MeasurePoint, b: MeasurePoint): MeasurePoint {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}
