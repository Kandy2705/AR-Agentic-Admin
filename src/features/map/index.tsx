import { lazy, Suspense, type ComponentProps } from 'react';
import { LoadingState } from '@/components/ui/states';

/** Leaflet (~150 kB) is only downloaded when a map is actually shown. */
const LazyLocationPicker = lazy(() => import('./LocationPicker'));
const LazyBuildingsMap = lazy(() => import('./BuildingsMap'));
const LazyBuildingLocationMap = lazy(() => import('./BuildingLocationMap'));

const fallback = <LoadingState rows={4} className="p-0" />;

export function LocationPicker(props: ComponentProps<typeof LazyLocationPicker>) {
  return (
    <Suspense fallback={fallback}>
      <LazyLocationPicker {...props} />
    </Suspense>
  );
}

export function BuildingsMap(props: ComponentProps<typeof LazyBuildingsMap>) {
  return (
    <Suspense fallback={fallback}>
      <LazyBuildingsMap {...props} />
    </Suspense>
  );
}

export function BuildingLocationMap(props: ComponentProps<typeof LazyBuildingLocationMap>) {
  return (
    <Suspense fallback={fallback}>
      <LazyBuildingLocationMap {...props} />
    </Suspense>
  );
}

export type { MapReference } from './LocationPicker';
