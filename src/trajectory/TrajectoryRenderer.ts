/**
 * TrajectoryRenderer — CesiumJS Polyline-based trajectory visualization
 * Renders historical paths (solid) and predicted paths (dashed) using PolylineCollection primitives.
 */

import * as Cesium from 'cesium';
import { trajectoryDB, type PositionRecord } from './TrajectoryDB';
import { predictLinearPath, predictGreatCirclePath } from './pathPrediction';

// Trail color by entity type
const TRAIL_COLORS: Record<string, Cesium.Color> = {
  flight: Cesium.Color.YELLOW.withAlpha(0.7),
  ship: Cesium.Color.CORNFLOWERBLUE.withAlpha(0.7),
  adsb: Cesium.Color.RED.withAlpha(0.7),
};

const PREDICTION_COLOR = Cesium.Color.WHITE.withAlpha(0.4);

interface RenderedTrajectory {
  entityId: string;
  historyEntity: Cesium.Entity | null;
  predictionEntity: Cesium.Entity | null;
}

export class TrajectoryRenderer {
  private viewer: Cesium.Viewer;
  private rendered = new Map<string, RenderedTrajectory>();

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  /**
   * Update trajectory display for a set of active entity IDs.
   * Removes trajectories for entities no longer active.
   */
  async update(
    activeEntityIds: string[],
    showPrediction: boolean,
    predictionMinutes: number,
    historyMinutes: number,
    currentEntities: Map<string, { lat: number; lng: number; altitude: number; heading: number; speed: number; entityType: 'flight' | 'ship' | 'adsb' }>
  ): Promise<void> {
    const activeSet = new Set(activeEntityIds);

    // Remove trajectories no longer active
    for (const [entityId, traj] of this.rendered) {
      if (!activeSet.has(entityId)) {
        this.removeTrajectory(traj);
        this.rendered.delete(entityId);
      }
    }

    // Add/update active trajectories
    for (const entityId of activeEntityIds) {
      const maxAge = historyMinutes * 60 * 1000;
      const history = await trajectoryDB.getHistory(entityId, maxAge);
      const current = currentEntities.get(entityId);

      if (history.length < 2 && !current) continue;

      const existing = this.rendered.get(entityId);
      if (existing) this.removeTrajectory(existing);

      const entityType = current?.entityType || history[0]?.entityType || 'flight';
      const color = TRAIL_COLORS[entityType] || TRAIL_COLORS.flight;

      // Build history polyline positions
      const histPositions: Cesium.Cartesian3[] = [];
      for (const p of history) {
        histPositions.push(Cesium.Cartesian3.fromDegrees(p.lng, p.lat, p.altitude || 0));
      }
      // Append current position if available
      if (current) {
        histPositions.push(Cesium.Cartesian3.fromDegrees(current.lng, current.lat, current.altitude || 0));
      }

      let historyEntity: Cesium.Entity | null = null;
      if (histPositions.length >= 2) {
        historyEntity = this.viewer.entities.add({
          polyline: {
            positions: histPositions,
            width: 2,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.15,
              color,
            }),
            clampToGround: false,
          },
        });
      }

      // Prediction polyline
      let predictionEntity: Cesium.Entity | null = null;
      if (showPrediction && current) {
        const predicted = entityType === 'ship'
          ? predictGreatCirclePath(current.lat, current.lng, current.heading, current.speed, predictionMinutes, 2)
          : predictLinearPath(current.lat, current.lng, current.heading, current.speed, predictionMinutes, 2);

        if (predicted.length > 0) {
          const predPositions = [
            Cesium.Cartesian3.fromDegrees(current.lng, current.lat, current.altitude || 0),
            ...predicted.map((p) => Cesium.Cartesian3.fromDegrees(p.lng, p.lat, current.altitude || 0)),
          ];

          predictionEntity = this.viewer.entities.add({
            polyline: {
              positions: predPositions,
              width: 1.5,
              material: new Cesium.PolylineDashMaterialProperty({
                color: PREDICTION_COLOR,
                dashLength: 12,
              }),
              clampToGround: false,
            },
          });
        }
      }

      this.rendered.set(entityId, { entityId, historyEntity, predictionEntity });
    }
  }

  private removeTrajectory(traj: RenderedTrajectory): void {
    if (traj.historyEntity) this.viewer.entities.remove(traj.historyEntity);
    if (traj.predictionEntity) this.viewer.entities.remove(traj.predictionEntity);
  }

  clear(): void {
    for (const [, traj] of this.rendered) {
      this.removeTrajectory(traj);
    }
    this.rendered.clear();
  }

  destroy(): void {
    this.clear();
  }
}
