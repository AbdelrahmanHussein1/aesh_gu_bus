'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Route, Trip } from '@/lib/types';
import { getApiBaseUrl } from '@/lib/api';
import { generateMockTrips } from '@/lib/offline';

interface Options {
  userId: string;
  token: string;
  selectedRouteId: number;
  selectedDate: string;
  isOffline: boolean;
  routes: Route[];
}
type TripSnapshot = { key: string; data: Trip[]; loading: boolean; error: string; refreshedAt: Date | null };
const NO_TRIPS: Trip[] = [];

export function useRiderTrips({ userId, token, selectedRouteId, selectedDate, isOffline, routes }: Options) {
  const offline = isOffline && process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true';
  const key = userId && selectedDate ? `${userId}:${token}:${offline}:${selectedRouteId}:${selectedDate}` : '';
  const currentKey = useRef(key);
  currentKey.current = key;
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const routesRef = useRef(routes);
  routesRef.current = routes;
  const [snapshot, setSnapshot] = useState<TripSnapshot>({ key: '', data: [], loading: false, error: '', refreshedAt: null });
  const matches = snapshot.key === key;
  // A changed picker/session hides the old trips during this render, before effects run.
  const trips = matches ? snapshot.data : NO_TRIPS;
  const isTripsLoading = matches ? snapshot.loading : Boolean(key);
  const tripsError = matches ? snapshot.error : '';
  const lastTripsRefreshTime = matches ? snapshot.refreshedAt : null;

  const refreshTrips = useCallback(async () => {
    if (currentKey.current !== key) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const request = ++sequence.current;
    if (!key) {
      setSnapshot({ key, data: [], loading: false, error: '', refreshedAt: null });
      return;
    }
    setSnapshot(previous => previous.key === key
      ? { ...previous, loading: true, error: '' }
      : { key, data: [], loading: true, error: '', refreshedAt: null });
    const timeout = setTimeout(() => abort.abort(), 15000);
    try {
      let data: Trip[];
      if (offline) {
        data = generateMockTrips(selectedRouteId, selectedDate, routesRef.current);
      } else {
        const query = new URLSearchParams({ date: selectedDate });
        if (selectedRouteId) query.set('routeId', String(selectedRouteId));
        const response = await fetch(`${getApiBaseUrl()}/api/trips?${query}`, { signal: abort.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('The live trip schedule could not be loaded. Please retry.');
        data = await response.json();
        if (!Array.isArray(data)) throw new Error('The server returned an invalid trip schedule. Please retry.');
      }
      if (currentKey.current !== key || sequence.current !== request) return;
      setSnapshot({ key, data, loading: false, error: '', refreshedAt: new Date() });
    } catch (error) {
      if (currentKey.current !== key || sequence.current !== request) return;
      setSnapshot({ key, data: [], loading: false, refreshedAt: null, error: abort.signal.aborted ? 'The trip request timed out. Please retry.' : error instanceof Error ? error.message : 'The live trip schedule could not be loaded. Please retry.' });
    } finally {
      clearTimeout(timeout);
    }
  }, [key]);

  useEffect(() => {
    void refreshTrips();
    return () => { ++sequence.current; controller.current?.abort(); };
  }, [refreshTrips]);

  return { trips, isTripsLoading, tripsError, lastTripsRefreshTime, refreshTrips, tripContextKey: key };
}
