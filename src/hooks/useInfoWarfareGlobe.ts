/**
 * useInfoWarfareGlobe — 정보전 의심 노드를 Globe에 빨간 펄스로 시각화
 * useGeofenceGlobe / useMeasurementGlobe와 동일한 패턴
 */
import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useInfoWarfareStore } from '@/store/useInfoWarfareStore';
import type { SpreadPattern } from '@/correlation/InfoWarfareDetector';

const PATTERN_COLORS: Record<SpreadPattern['patternType'], Cesium.Color> = {
  'simultaneous-multinode': Cesium.Color.fromCssColorString('#FF2020'),
  'velocity-spike':         Cesium.Color.fromCssColorString('#FF6600'),
  'reverse-propagation':    Cesium.Color.fromCssColorString('#FF00FF'),
};

export function useInfoWarfareGlobe(
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>,
) {
  const entitiesRef = useRef<Cesium.Entity[]>([]);
  const patterns = useInfoWarfareStore((s) => s.patterns);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // 기존 엔티티 제거
    for (const e of entitiesRef.current) viewer.entities.remove(e);
    entitiesRef.current = [];

    // 최근 2시간 패턴만 렌더
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    const visible = patterns.filter((p) => p.detectedAt > cutoff);

    for (const pattern of visible) {
      const color = PATTERN_COLORS[pattern.patternType] ?? Cesium.Color.RED;
      const isCritical = pattern.severity === 'critical';

      for (const node of pattern.suspiciousNodes) {
        // 펄스 원 (ellipse)
        const pulseEntity = viewer.entities.add({
          name: `iw-pulse-${pattern.id}`,
          position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat),
          ellipse: {
            semiMajorAxis: isCritical ? 250000 : 150000,
            semiMinorAxis: isCritical ? 250000 : 150000,
            material: color.withAlpha(0.15),
            outline: true,
            outlineColor: color.withAlpha(isCritical ? 0.9 : 0.6),
            outlineWidth: isCritical ? 2 : 1,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        });

        // 중앙 점
        const dotEntity = viewer.entities.add({
          name: `iw-dot-${pattern.id}`,
          position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat),
          point: {
            pixelSize: isCritical ? 10 : 7,
            color,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
            outlineWidth: 1.5,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: node.label.slice(0, 30),
            font: '9px monospace',
            fillColor: color,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -12),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(5e5, 1, 8e6, 0),
            show: true,
          },
        });

        entitiesRef.current.push(pulseEntity, dotEntity);
      }

      // 첫 번째 노드에 패턴 제목 라벨
      if (pattern.suspiciousNodes.length > 0) {
        const first = pattern.suspiciousNodes[0];
        const titleEntity = viewer.entities.add({
          name: `iw-title-${pattern.id}`,
          position: Cesium.Cartesian3.fromDegrees(first.lng, first.lat, 50000),
          label: {
            text: `⚡ ${pattern.title}`,
            font: `${isCritical ? 12 : 10}px monospace`,
            fillColor: PATTERN_COLORS[pattern.patternType] ?? Cesium.Color.RED,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 3,
            outlineColor: Cesium.Color.BLACK,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1.2, 5e6, 0.3),
          },
        });
        entitiesRef.current.push(titleEntity);
      }
    }

    return () => {
      for (const e of entitiesRef.current) viewer.entities.remove(e);
      entitiesRef.current = [];
    };
  }, [patterns, viewerRef]);
}
