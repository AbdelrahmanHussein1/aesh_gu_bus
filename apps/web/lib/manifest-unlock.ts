import type { Trip } from './types';

export interface ManifestUnlockStatus {
  isUnlocked: boolean;
  reasonEn: string;
  reasonAr: string;
  unlockTimeFormatted: string;
  minutesRemaining?: number;
  boardedCount: number;
  totalCapacity: number;
}

/**
 * Returns whether the Boarded Passenger Manifest PDF is unlocked for download/printing.
 * Rules:
 * 1. 50 students boarded (or total bus capacity reached).
 * 2. 30 minutes before shift departure (e.g., 8:30 AM for 9:00 AM; 10:30 AM for 11:00 AM).
 * 3. Shift has already departed or day has ended.
 */
export function checkManifestUnlock(
  trip: Partial<Trip> | null | undefined,
  boardedCount: number,
  forceUnlock = false
): ManifestUnlockStatus {
  const capacity = trip?.bus?.totalSeats || trip?.totalSeats || 50;

  if (forceUnlock) {
    return {
      isUnlocked: true,
      reasonEn: 'Manual Administrative / Dev Override Active',
      reasonAr: 'تم تفعيل التجاوز الإداري / التجريبي',
      unlockTimeFormatted: 'NOW',
      boardedCount,
      totalCapacity: capacity,
    };
  }

  // 1. Check if 50 students are boarded
  if (boardedCount >= 50 || (capacity > 0 && boardedCount >= capacity)) {
    return {
      isUnlocked: true,
      reasonEn: `Full Capacity Reached (${boardedCount}/${capacity} Boarded)`,
      reasonAr: `اكتمل صعود الحافلة بالكامل (${boardedCount}/${capacity} راكب)`,
      unlockTimeFormatted: 'NOW',
      boardedCount,
      totalCapacity: capacity,
    };
  }

  if (!trip) {
    return {
      isUnlocked: false,
      reasonEn: 'No active trip selected',
      reasonAr: 'يرجى اختيار رحلة أولاً',
      unlockTimeFormatted: '—',
      boardedCount: 0,
      totalCapacity: capacity,
    };
  }

  // Determine departure time string (HH:mm)
  let depTimeStr = trip.departureTime || '';
  if (!depTimeStr) {
    switch (trip.timeSlot) {
      case 'morning_1': depTimeStr = '09:00'; break;
      case 'morning_2': depTimeStr = '11:00'; break;
      case 'return_1':  depTimeStr = '12:30'; break;
      case 'return_2':  depTimeStr = '14:30'; break;
      case 'return_3':  depTimeStr = '17:30'; break;
      default:          depTimeStr = '09:00'; break;
    }
  }

  // Normalize HH:mm
  const timeParts = depTimeStr.split(':');
  const hours = parseInt(timeParts[0] || '9', 10);
  const minutes = parseInt(timeParts[1] || '0', 10);

  // Determine operational date (YYYY-MM-DD)
  const tripDateStr = trip.tripDate || new Date().toISOString().split('T')[0];
  const dateParts = tripDateStr.split('-');
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);

  const departureDate = new Date(year, month, day, hours, minutes, 0, 0);
  // Cutoff is 30 minutes before departure
  const cutoffDate = new Date(departureDate.getTime() - 30 * 60 * 1000);

  const now = new Date();
  const unlockTimeFormatted = cutoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const depTimeFormatted = departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  // 2. Check if current time is past cutoff time (30 minutes prior to shift)
  if (now.getTime() >= cutoffDate.getTime()) {
    const isPastDeparture = now.getTime() >= departureDate.getTime();
    return {
      isUnlocked: true,
      reasonEn: isPastDeparture
        ? `Shift Completed / Day Ended (${depTimeFormatted})`
        : `Shift Cutoff Reached (${unlockTimeFormatted} — 30m before ${depTimeFormatted})`,
      reasonAr: isPastDeparture
        ? `انتهى موعد الرحلة (${depTimeFormatted})`
        : `حان موعد الكشف الرسمي (${unlockTimeFormatted} — قبل موعد ${depTimeFormatted} بـ 30 دقيقة)`,
      unlockTimeFormatted,
      boardedCount,
      totalCapacity: capacity,
    };
  }

  // 3. Otherwise locked
  const msRemaining = cutoffDate.getTime() - now.getTime();
  const minutesRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60)));

  return {
    isUnlocked: false,
    reasonEn: `Unlocks at ${unlockTimeFormatted} (30m before ${depTimeFormatted}) or upon 50 boarded students (in ${minutesRemaining}m)`,
    reasonAr: `يتاح في تمام ${unlockTimeFormatted} (قبل موعد ${depTimeFormatted} بـ 30 دقيقة) أو عند اكتمال صعود 50 راكب (متبقي ${minutesRemaining} دقيقة)`,
    unlockTimeFormatted,
    minutesRemaining,
    boardedCount,
    totalCapacity: capacity,
  };
}
