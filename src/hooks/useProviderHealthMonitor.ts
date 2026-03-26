import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useProviderHealthStore, type ProviderKey } from '@/store/useProviderHealthStore';
import { getProviderMeta as getSatMeta } from '@/providers/SatelliteProvider';
import { getProviderMeta as getFlightMeta } from '@/providers/FlightProvider';
import { getProviderMeta as getShipMeta } from '@/providers/ShipProvider';
import { getProviderMeta as getEqMeta } from '@/providers/EarthquakeProvider';
import { getProviderMeta as getAdsbMeta } from '@/providers/AdsbProvider';
import { getProviderMeta as getWeatherMeta } from '@/providers/WeatherProvider';
import { getProviderMeta as getTyphoonMeta } from '@/providers/TyphoonProvider';
import { getProviderMeta as getVolcanoMeta } from '@/providers/VolcanoProvider';
import { getProviderMeta as getWildfireMeta } from '@/providers/WildfireProvider';
import { getProviderMeta as getCctvMeta } from '@/providers/CCTVProvider';

const META_GETTERS: Record<ProviderKey, () => { simulated: boolean; error: string | null; latency: number }> = {
  satellites: getSatMeta,
  flights: getFlightMeta,
  ships: getShipMeta,
  earthquakes: getEqMeta,
  adsb: getAdsbMeta,
  weather: getWeatherMeta,
  typhoon: getTyphoonMeta,
  volcano: getVolcanoMeta,
  wildfire: getWildfireMeta,
  cctv: getCctvMeta,
};

// Which providers are activated by activeLayers vs activeOverlays
const LAYER_PROVIDERS: ProviderKey[] = ['satellites', 'flights', 'ships', 'earthquakes'];
const OVERLAY_PROVIDERS: ProviderKey[] = ['adsb', 'weather', 'typhoon', 'volcano', 'wildfire', 'cctv'];

/**
 * Monitors provider health by polling meta from each provider module.
 * Call this once in App or Globe.
 */
export function useProviderHealthMonitor() {
  const { reportSuccess, reportError, setOffline } = useProviderHealthStore.getState();

  useEffect(() => {
    const interval = setInterval(() => {
      const { activeLayers, activeOverlays, dataCounts, lastUpdated } = useAppStore.getState();
      const { reportSuccess, reportError, setOffline } = useProviderHealthStore.getState();

      for (const key of LAYER_PROVIDERS) {
        const isActive = activeLayers.includes(key);
        if (!isActive) {
          setOffline(key);
          continue;
        }
        syncHealth(key, dataCounts, lastUpdated, reportSuccess, reportError);
      }

      for (const key of OVERLAY_PROVIDERS) {
        const isActive = activeOverlays.includes(key);
        if (!isActive) {
          setOffline(key);
          continue;
        }
        syncHealth(key, dataCounts, lastUpdated, reportSuccess, reportError);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, []);
}

function syncHealth(
  key: ProviderKey,
  dataCounts: Record<string, number>,
  lastUpdated: Record<string, number>,
  reportSuccess: (key: ProviderKey, count: number, latency: number, simulated?: boolean) => void,
  reportError: (key: ProviderKey, error: string) => void,
) {
  const meta = META_GETTERS[key]();
  const count = dataCounts[key] || 0;
  const ts = lastUpdated[key];

  if (meta.error) {
    reportError(key, meta.error);
    return;
  }

  // If we have a timestamp (data was fetched), report success
  if (ts) {
    reportSuccess(key, count, meta.latency, meta.simulated);
  }
  // else: no data yet, remain in current state (probably offline→offline)
}
