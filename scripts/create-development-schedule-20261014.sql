-- Development-only schedule. These are not university-operated trips.
BEGIN;

INSERT INTO routes (name_en, name_ar, is_active)
SELECT 'CODEX DEVELOPMENT TEST ROUTE - NO REAL SERVICE', 'خط تطوير تجريبي - ليست خدمة فعلية', true
WHERE NOT EXISTS (
  SELECT 1 FROM routes WHERE name_en = 'CODEX DEVELOPMENT TEST ROUTE - NO REAL SERVICE'
);

INSERT INTO buses (name, total_seats, seat_rows, seats_per_row, bus_type, is_active)
SELECT 'CODEX DEVELOPMENT BUS - NOT OPERATING', 50, 10, 5, 'seating', true
WHERE NOT EXISTS (
  SELECT 1 FROM buses WHERE name = 'CODEX DEVELOPMENT BUS - NOT OPERATING'
);

INSERT INTO stops (route_id, name_en, name_ar, stop_order)
SELECT r.id, s.name_en, s.name_ar, s.stop_order
FROM routes r
CROSS JOIN (VALUES
  ('Development pickup - test only', 'نقطة تجريبية فقط', 1),
  ('Development campus - test only', 'الجامعة - اختبار فقط', 2)
) AS s(name_en, name_ar, stop_order)
WHERE r.name_en = 'CODEX DEVELOPMENT TEST ROUTE - NO REAL SERVICE'
ON CONFLICT (route_id, stop_order) DO NOTHING;

INSERT INTO trips (route_id, bus_id, trip_date, departure_time, return_time,
  direction, time_slot, total_seats, price_egp, status)
SELECT r.id, b.id, to_char(d.day::date, 'YYYY-MM-DD'),
  ((d.day::date + s.departure::time) AT TIME ZONE 'Africa/Cairo'),
  ((d.day::date + s.departure::time) AT TIME ZONE 'Africa/Cairo') + interval '2 hours',
  s.direction, s.slot, 50, '0.00', 'scheduled'
FROM routes r
CROSS JOIN buses b
CROSS JOIN generate_series('2026-10-15'::date, '2026-10-21'::date, '1 day'::interval) AS d(day)
CROSS JOIN (VALUES
  ('to_campus', 'morning_1', '07:00'),
  ('from_campus', 'return', '16:45')
) AS s(direction, slot, departure)
WHERE r.name_en = 'CODEX DEVELOPMENT TEST ROUTE - NO REAL SERVICE'
  AND b.name = 'CODEX DEVELOPMENT BUS - NOT OPERATING'
  AND extract(isodow FROM d.day) <> 5
  AND NOT EXISTS (
    SELECT 1 FROM trips t WHERE t.route_id = r.id
      AND t.trip_date = to_char(d.day::date, 'YYYY-MM-DD')
      AND t.direction = s.direction AND t.time_slot = s.slot
  );

COMMIT;
