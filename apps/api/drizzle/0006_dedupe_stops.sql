-- Preserve the original rows before removing repeated seed data.
CREATE TABLE IF NOT EXISTS stops_dedupe_backup_20261014 AS SELECT * FROM stops;
--> statement-breakpoint
DELETE FROM stops WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY route_id, stop_order ORDER BY id DESC) AS position
    FROM stops WHERE route_id IS NOT NULL
  ) duplicates WHERE position > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS unique_stops_route_order ON stops (route_id, stop_order);
