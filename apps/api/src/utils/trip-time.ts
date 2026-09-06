/**
 * Trip departure date & time utility for Galala University Bus Transit (Bus Aesh)
 * 
 * Accurately combines calendar tripDate ('YYYY-MM-DD') with departureTime timestamp or timeSlot
 * to avoid template timestamp date drift.
 */

export function getTripDepartureDateTime(
  tripDate?: string | null,
  departureTime?: Date | string | null,
  timeSlot?: string | null
): Date {
  let hours = 7;
  let minutes = 0;

  if (departureTime) {
    const d = new Date(departureTime);
    if (!isNaN(d.getTime())) {
      hours = d.getHours();
      minutes = d.getMinutes();
    }
  } else if (timeSlot) {
    if (timeSlot.includes('11') || timeSlot === 'morning_2') {
      hours = 11; minutes = 30;
    } else if (timeSlot.includes('12') || timeSlot === 'return_1') {
      hours = 12; minutes = 30;
    } else if (timeSlot.includes('14') || timeSlot === 'return_2') {
      hours = 14; minutes = 30;
    } else if (timeSlot.includes('17') || timeSlot === 'return_3') {
      hours = 17; minutes = 30;
    } else {
      hours = 7; minutes = 0;
    }
  }

  // Combine with tripDate (e.g. '2026-09-07')
  if (tripDate && /^\d{4}-\d{2}-\d{2}$/.test(tripDate.trim())) {
    const [year, month, day] = tripDate.trim().split('-').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }

  if (departureTime) {
    return new Date(departureTime);
  }

  return new Date();
}

export function getHoursUntilDeparture(
  tripDate?: string | null,
  departureTime?: Date | string | null,
  timeSlot?: string | null
): number {
  const departureDate = getTripDepartureDateTime(tripDate, departureTime, timeSlot);
  return (departureDate.getTime() - Date.now()) / (1000 * 60 * 60);
}
