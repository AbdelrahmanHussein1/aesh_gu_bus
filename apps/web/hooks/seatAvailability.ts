import type { Seat } from '@/lib/types';

export async function fetchSeatMaps(tripIds: number[], apiUrl: string, signal: AbortSignal): Promise<Seat[][]> {
  return Promise.all(tripIds.map(async id => {
    const response = await fetch(`${apiUrl}/api/trips/${id}/seats`, { signal, cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 404 ? 'This trip is no longer available.' : 'Seat availability could not be loaded. Please retry.');
    const data: Seat[] = await response.json();
    if (!Array.isArray(data) || data.some(s => !s || !Number.isInteger(s.seatNumber) || s.seatNumber <= 0 || !['free', 'held', 'booked'].includes(s.status))) {
      throw new Error('The server returned an invalid seat map. Please retry.');
    }
    return data;
  }));
}

// A round-trip seat is available only when the same numbered seat is available on both legs.
export function combineSeatMaps(maps: Seat[][], userId: string): Seat[] {
  if (!maps.length) return [];
  return maps[0].filter(seat => maps.every(map => map.some(s => s.seatNumber === seat.seatNumber)))
    .map(seat => {
      const legs = maps.map(map => map.find(s => s.seatNumber === seat.seatNumber)!);
      if (legs.some(s => s.status === 'booked')) return { ...seat, status: 'booked', userId: null };
      const held = legs.filter(s => s.status === 'held');
      if (held.length) return { ...seat, status: 'held', userId: held.every(s => s.userId === userId) ? userId : null };
      return { ...seat, status: 'free', userId: null };
    });
}
