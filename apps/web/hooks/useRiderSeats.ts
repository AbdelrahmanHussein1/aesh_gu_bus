'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BookingType, Seat, Trip } from '@/lib/types';
import { getApiBaseUrl } from '@/lib/api';
import { generateMockSeats, generateRoundTripSeats } from '@/lib/offline';
import { combineSeatMaps, fetchSeatMaps } from './seatAvailability';

export type SeatLoadStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
type SeatSnapshot = { key: string; status: SeatLoadStatus; error: string; maps: Seat[][] };
interface Options {
  userId: string;
  token: string;
  isOffline: boolean;
  bookingType: BookingType;
  activeTrip: Trip | null;
  activeArrivalTrip: Trip | null;
  activeReturnTrip: Trip | null;
}

export function useRiderSeats({ userId, token, isOffline, bookingType, activeTrip, activeArrivalTrip, activeReturnTrip }: Options) {
  const offline = isOffline && process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true';
  const tripIds = bookingType === 'round_trip'
    ? activeArrivalTrip && activeReturnTrip ? [activeArrivalTrip.id, activeReturnTrip.id] : []
    : activeTrip ? [activeTrip.id] : [];
  const key = userId && tripIds.length ? `${userId}:${token}:${offline}:${bookingType}:${tripIds.join(',')}` : '';
  const currentKey = useRef(key);
  currentKey.current = key;
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const lockBusy = useRef(false);
  const [snapshot, setSnapshot] = useState<SeatSnapshot>({ key: '', status: 'idle', error: '', maps: [] });
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const [selection, setSelection] = useState<{ key: string; seat: number | null; expiresAt: number | null }>({ key: '', seat: null, expiresAt: null });
  // Update on lock acknowledgement, before React renders, so delayed ownerless WS events retain our hold.
  const acknowledgedHold = useRef<{ key: string; seat: number | null; expiresAt: number | null }>({ key: '', seat: null, expiresAt: null });
  const [lockingSeatNumber, setLockingSeatNumber] = useState<number | null>(null);
  const selectedSeat = selection.key === key ? selection.seat : null;
  const heldExpiresAt = selection.key === key ? selection.expiresAt : null;
  const current = snapshot.key === key;
  const seatLoadStatus: SeatLoadStatus = current ? snapshot.status : key ? 'loading' : 'idle';
  const seats = current && snapshot.status === 'ready' ? combineSeatMaps(snapshot.maps, userId) : [];
  const seatError = current ? snapshot.error : '';

  const setSelectedSeat = useCallback((seat: number | null) => {
    if (currentKey.current !== key) return;
    if (seat === null) acknowledgedHold.current = { key, seat: null, expiresAt: null };
    setSelection(prev => ({ key, seat, expiresAt: seat === null ? null : prev.expiresAt }));
  }, [key]);
  const setSeats = useCallback((update: Seat[] | ((prev: Seat[]) => Seat[])) => {
    if (currentKey.current !== key) return;
    setSnapshot(prev => prev.key !== key ? prev : {
      ...prev, maps: prev.maps.map(map => typeof update === 'function' ? update(map) : update),
    });
  }, [key]);

  const loadSeatMap = useCallback(async () => {
    if (currentKey.current !== key) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const id = ++requestId.current;
    if (!key) {
      setSnapshot({ key, status: 'idle', error: '', maps: [] });
      return;
    }
    setSnapshot(prev => ({ key, status: 'loading', error: '', maps: prev.key === key ? prev.maps : [] }));
    const timeout = setTimeout(() => abort.abort(), 15000);
    try {
      const maps: Seat[][] = offline
        ? [bookingType === 'round_trip'
          ? generateRoundTripSeats(tripIds[0], tripIds[1], userId)
          : generateMockSeats(tripIds[0], userId)]
        : (await fetchSeatMaps(tripIds, getApiBaseUrl(), abort.signal)).map(data => {
          // The public seat endpoint omits lock owners. Retain only this session's unexpired hold.
          const held = acknowledgedHold.current;
          return data.map(s => ({ ...s, userId: s.userId ?? (s.status === 'held' && held.key === key && held.seat === s.seatNumber && (held.expiresAt || 0) > Date.now() ? userId : null) }));
        });
      if (currentKey.current !== key || requestId.current !== id) return;
      const combined = combineSeatMaps(maps, userId);
      setSnapshot({ key, maps, status: combined.length ? 'ready' : 'empty', error: '' });
      const held = acknowledgedHold.current;
      const heldSeat = combined.find(s => s.seatNumber === held.seat);
      if (held.key !== key || (held.expiresAt || 0) <= Date.now() || heldSeat?.status !== 'held' || heldSeat.userId !== userId) {
        acknowledgedHold.current = { key, seat: null, expiresAt: null };
      }
      setSelection(prev => {
        const seat = combined.find(s => s.seatNumber === prev.seat);
        if (prev.key === key && seat && (seat.status === 'free' || seat.status === 'held' && seat.userId === userId)) return prev;
        return { key, seat: null, expiresAt: null };
      });
    } catch (error) {
      if (currentKey.current !== key || requestId.current !== id) return;
      // A failed read says nothing about Redis ownership. Keep the acknowledged lease for retry/cleanup.
      setSelection({ key, seat: null, expiresAt: null });
      setSnapshot({ key, status: 'error', maps: [], error: abort.signal.aborted ? 'The seat request timed out. Please retry.' : error instanceof Error ? error.message : 'Seat availability could not be loaded. Please retry.' });
    } finally {
      clearTimeout(timeout);
    }
  // IDs, user and mode are represented by key, so old request closures cannot load a different map.
  }, [key]);

  useEffect(() => {
    acknowledgedHold.current = { key, seat: null, expiresAt: null };
    setSelection({ key, seat: null, expiresAt: null });
    setLockingSeatNumber(null);
    void loadSeatMap();
    const refreshVisible = () => { if (document.visibilityState === 'visible') void loadSeatMap(); };
    const interval = !offline && key ? setInterval(refreshVisible, 45000) : null;
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      controller.current?.abort();
      ++requestId.current;
      const held = acknowledgedHold.current;
      if (held.key === key && held.seat && !offline && token) {
        acknowledgedHold.current = { key, seat: null, expiresAt: null };
        for (const id of tripIds) {
          void fetch(`${getApiBaseUrl()}/api/trips/${id}/seats/${held.seat}/unlock`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true,
          }).catch(() => {});
        }
      }
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [key, loadSeatMap, offline]);

  useEffect(() => {
    if (!heldExpiresAt) return;
    const timer = setTimeout(() => { setSelectedSeat(null); void loadSeatMap(); }, Math.max(0, heldExpiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [heldExpiresAt, setSelectedSeat, loadSeatMap]);

  const handleSeatMessage = useCallback((tripId: number, msg: any) => {
    if (currentKey.current !== key || !tripIds.includes(tripId)) return;
    if (!['seat_locked', 'seat_unlocked', 'booking_cancelled', 'seat_booked'].includes(msg.type)) return;
    if (snapshotRef.current.status !== 'ready') { void loadSeatMap(); return; }
    // Invalidate an older refresh before applying the newer socket event.
    ++requestId.current;
    controller.current?.abort();
    const status = msg.type === 'seat_locked' ? 'held' : msg.type === 'seat_booked' ? 'booked' : 'free';
    const held = acknowledgedHold.current;
    const ownsHold = held.key === key && held.seat === msg.seatNumber && (held.expiresAt || 0) > Date.now();
    const eventOwner = msg.userId ?? (ownsHold ? userId : null);
    setSnapshot(prev => prev.key !== key ? prev : { ...prev, maps: prev.maps.map((map, index) => tripIds[index] !== tripId ? map : map.map(s => s.seatNumber === msg.seatNumber ? { ...s, status, userId: status === 'held' ? eventOwner : null } : s)) });
    if (status === 'booked' || status === 'held' && eventOwner !== userId) {
      if (held.seat === msg.seatNumber) acknowledgedHold.current = { key, seat: null, expiresAt: null };
      setSelection(prev => prev.key === key && prev.seat === msg.seatNumber ? { key, seat: null, expiresAt: null } : prev);
    }
  }, [key, loadSeatMap, userId]);

  const handleSeatClick = useCallback(async (seatNumber: number, _currentStatus: string) => {
    if (lockBusy.current || seatLoadStatus !== 'ready' || currentKey.current !== key) return;
    const seat = seats.find(s => s.seatNumber === seatNumber);
    if (!seat || seat.status === 'booked' || seat.status === 'held' && seat.userId !== userId) return;
    const retainedHold = acknowledgedHold.current;
    if (!selectedSeat && retainedHold.key === key && retainedHold.seat === seatNumber && (retainedHold.expiresAt || 0) > Date.now() && seat.status === 'held' && seat.userId === userId) {
      // Retrying a read must not POST another Redis SET NX for a lock we already own or extend its expiry.
      setSelection(retainedHold);
      return;
    }
    const previous = selectedSeat ?? (retainedHold.key === key ? retainedHold.seat : null);
    lockBusy.current = true;
    setLockingSeatNumber(seatNumber);
    let expiresAt = offline ? Date.now() + 300000 : Number.POSITIVE_INFINITY;
    const acquired: number[] = [];
    const unlock = (tid: number, number: number) => fetch(`${getApiBaseUrl()}/api/trips/${tid}/seats/${number}/unlock`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    try {
      if (!offline) {
        if (!token) throw new Error('Sign in to select a seat.');
        if (previous) await Promise.all(tripIds.map(id => unlock(id, previous)));
        if (previous !== seatNumber) {
          for (const id of tripIds) {
            const response = await fetch(`${getApiBaseUrl()}/api/trips/${id}/seats/${seatNumber}/lock`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) throw new Error('This seat could not be held. Refresh availability and choose again.');
            acquired.push(id);
            const data = await response.json();
            if (typeof data.expiresAt !== 'number' || data.expiresAt <= Date.now()) throw new Error('The server did not confirm an active seat hold. Please retry.');
            expiresAt = Math.min(expiresAt, data.expiresAt);
          }
        }
      }
      if (currentKey.current !== key) {
        await Promise.all(acquired.map(id => unlock(id, seatNumber).catch(() => {})));
        return;
      }
      const next = previous === seatNumber ? null : seatNumber;
      const nextHold = { key, seat: next, expiresAt: next ? expiresAt : null };
      acknowledgedHold.current = nextHold;
      setSelection(nextHold);
      setSeats(prev => prev.map(s => s.seatNumber === next ? { ...s, status: 'held', userId } : s.seatNumber === previous ? { ...s, status: 'free', userId: null } : s));
    } catch (error) {
      await Promise.all(acquired.map(id => unlock(id, seatNumber).catch(() => {})));
      if (currentKey.current !== key) return;
      acknowledgedHold.current = { key, seat: null, expiresAt: null };
      setSelection({ key, seat: null, expiresAt: null });
      setSnapshot({ key, status: 'error', maps: [], error: error instanceof Error ? error.message : 'Unable to select this seat. Please retry.' });
    } finally {
      lockBusy.current = false;
      if (currentKey.current === key) setLockingSeatNumber(null);
    }
  }, [key, seatLoadStatus, seats, selectedSeat, userId, token, offline, setSeats]);

  return { seats, seatLoadStatus, seatError, selectedSeat, heldExpiresAt, lockingSeatNumber, setSelectedSeat, setSeats, loadSeatMap, handleSeatMessage, handleSeatClick };
}
