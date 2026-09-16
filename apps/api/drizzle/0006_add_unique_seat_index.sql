CREATE UNIQUE INDEX IF NOT EXISTS unique_active_seat ON bookings (trip_id, seat_number) WHERE status IN ('confirmed', 'swapped');
CREATE INDEX IF NOT EXISTS idx_bookings_trip_seat ON bookings (trip_id, seat_number);
CREATE INDEX IF NOT EXISTS idx_boarding_logs_booking_scanned ON boarding_logs (booking_id, scanned_at);
