'use client';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Booking, Trip } from '@/lib/types';
import { getApiBaseUrl } from '@/lib/api';
import { addMockAuditLog } from '@/lib/offline';
import { playSuccessChime } from './boardingFeedback';

const OFFLINE_MODE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true';
interface Options {
  activeTrip: Trip | null; isOffline: boolean; token: string;
  setMyBookings: Dispatch<SetStateAction<Booking[]>>;
  setJustBoardedBookingIds: Dispatch<SetStateAction<Set<string>>>;
  loadSupervisorManifest: () => Promise<void>; refreshTrips: () => Promise<void>;
}
export function useSupervisorScanner({ activeTrip, isOffline, token, setMyBookings, setJustBoardedBookingIds, loadSupervisorManifest, refreshTrips }: Options) {
  const [scanInputToken, setScanInputToken] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCameraPermissionGuide, setShowCameraPermissionGuide] = useState(false);
  const scanBusy = useRef(false);
  const session = useRef(token);
  session.current = token;
  const streamRef = useRef<MediaStream | null>(null);
  const cameraGeneration = useRef(0);
  useEffect(() => () => { session.current = ''; ++cameraGeneration.current; streamRef.current?.getTracks().forEach(track => track.stop()); }, []);
  const verifyScanToken = useCallback(async (tokenToVerify: string) => {
    tokenToVerify = tokenToVerify.trim();
    if (!tokenToVerify || scanBusy.current) return;
    scanBusy.current = true;
    const requestSession = session.current;
    try {
    setIsScanning(true);
    setScanResult(null);

    const apiUrl = getApiBaseUrl();
    if (!isOffline && token) {
      try {
        const res = await fetch(`${apiUrl}/api/scan/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            token: tokenToVerify,
            expectedLegType: activeTrip?.direction || 'to_campus',
          }),
        });
        const data = await res.json();
        if (session.current !== requestSession) return;
        setScanResult(res.ok ? data : { ...data, success: false, result: data.result || 'invalid', message: data.message || data.error || 'Ticket verification failed.' });
        setIsScanning(false);
        if (res.ok && data.success && data.result === 'valid') {
          playSuccessChime();
          if (data.bookingId) {
            setJustBoardedBookingIds(prev => new Set(prev).add(data.bookingId));
          }
          if (typeof window !== 'undefined') {
            import('canvas-confetti').then(mod => {
              mod.default({
                particleCount: 140,
                spread: 85,
                origin: { y: 0.55 },
                colors: ['#22c55e', '#16a34a', '#4ade80', '#38bdf8', '#fbbf24'],
              });
            }).catch(() => {});
            window.dispatchEvent(new CustomEvent('rider_boarded_event', { detail: { bookingId: data.bookingId, tripId: data.tripId || activeTrip?.id } }));
            window.dispatchEvent(new CustomEvent('schedule_updated', { detail: { tripId: data.tripId || activeTrip?.id } }));
          }
          await loadSupervisorManifest();
          await refreshTrips();
        } else {
          loadSupervisorManifest();
        }
        return;
      } catch (err) {
        if (session.current !== requestSession) return;
        setScanResult({ success: false, result: 'network_error', message: 'Could not contact the server. Check your connection before verifying again.' });
        return;
      }
    }

    if (!isOffline || !OFFLINE_MODE_ENABLED) {
      setScanResult({ success: false, result: 'network_error', message: 'Online sign-in is required to verify this ticket.' });
      return;
    }
    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const clean = tokenToVerify.trim().toUpperCase();
    const isManualCode = !clean.includes('.') || clean.startsWith('GU-');
    let target: Booking | undefined;

    if (isManualCode) {
      let formatted = clean;
      if (!formatted.startsWith('GU-')) {
        formatted = `GU-${formatted.replace(/^GU/i, '')}`;
      }
      target = all.find(b =>
        (b.boardingCode && (b.boardingCode.toUpperCase() === formatted || b.boardingCode.toUpperCase() === clean)) ||
        b.id.toUpperCase().startsWith(clean.replace(/^GU-/i, ''))
      );
    } else {
      const parts = tokenToVerify.split('.');
      if (parts.length < 5) {
        setScanResult({ success: false, result: 'invalid', message: 'ERROR: Scan Invalid (Unrecognized format)' });
        setIsScanning(false);
        return;
      }
      const [bookingHex] = parts;
      target = all.find(b => b.id.replace(/-/g, '') === bookingHex);
    }

    if (!target) {
      setScanResult({ success: false, result: 'invalid', message: isManualCode ? `ERROR: Boarding Code "${clean}" Not Found` : 'ERROR: Booking Record Not Found' });
      setIsScanning(false);
      return;
    }
    if (target.status === 'cancelled') {
      setScanResult({ success: false, result: 'expired', message: 'ERROR: Ticket Cancelled' });
      setIsScanning(false);
      return;
    }
    if (target.isBoarded) {
      setScanResult({ success: false, result: 'already_checked_in', message: `Already checked in at ${target.boardedAt}` });
      setIsScanning(false);
      return;
    }
    const checkInTime = new Date().toLocaleTimeString();
    target.isBoarded = true;
    target.boardedAt = checkInTime;
    target.qrUsedAt = new Date().toISOString();
    const updated = all.map(b => b.id === target.id ? target : b);
    localStorage.setItem('aesh_bookings', JSON.stringify(updated));
    setMyBookings(prev => prev.map(b => b.id === target.id ? { ...b, isBoarded: true, qrUsedAt: new Date().toISOString() } : b));
    setJustBoardedBookingIds(prev => new Set(prev).add(target.id));
    playSuccessChime();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rider_boarded_event', { detail: { bookingId: target.id, tripId: target.tripId } }));
      window.dispatchEvent(new CustomEvent('schedule_updated', { detail: { tripId: target.tripId } }));
      import('canvas-confetti').then(mod => {
        mod.default({
          particleCount: 140,
          spread: 85,
          origin: { y: 0.55 },
          colors: ['#22c55e', '#16a34a', '#4ade80', '#38bdf8', '#fbbf24'],
        });
      }).catch(() => {});
    }
    addMockAuditLog('ATTENDANCE_SCAN', `Rider ${target.riderName} scanned on board`);
    setScanResult({ success: true, result: 'valid', riderName: target.riderName, seatNumber: target.seatNumber, route: target.routeAr, time: checkInTime });
    setIsScanning(false);
    loadSupervisorManifest();
    } finally { scanBusy.current = false; if (session.current === requestSession) setIsScanning(false); }
  }, [activeTrip, isOffline, token, loadSupervisorManifest, refreshTrips]);

  const handleSimulatedScan = useCallback(() => {
    verifyScanToken(scanInputToken);
  }, [scanInputToken, verifyScanToken]);

  const startCameraScan = useCallback(async () => {
    const cameraRequest = ++cameraGeneration.current;
    setIsCameraActive(true);
    setCameraError(null);
    setScanResult(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera not available in this context');
      setIsCameraActive(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (cameraRequest !== cameraGeneration.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = stream;
      setCameraStream(stream);
    } catch {
      if (cameraRequest !== cameraGeneration.current) return;
      setCameraError('Camera access denied');
      setIsCameraActive(false);
    }
  }, []);

  const stopCameraScan = useCallback(() => {
    ++cameraGeneration.current;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraStream(null);
    setIsCameraActive(false);
  }, []);


  return { scanInputToken, setScanInputToken, scanResult, setScanResult, isScanning, setIsScanning, isCameraActive, setIsCameraActive, cameraError, setCameraError, cameraStream, showCameraPermissionGuide, setShowCameraPermissionGuide, verifyScanToken, handleSimulatedScan, startCameraScan, stopCameraScan };
}
