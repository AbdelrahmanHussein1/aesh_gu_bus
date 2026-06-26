CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" varchar(255),
	"details" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boarding_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" uuid NOT NULL,
	"scanned_by" uuid NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scan_result" varchar(25) DEFAULT 'valid' NOT NULL,
	"device_info" varchar(255),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"seat_number" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending_payment' NOT NULL,
	"qr_token" text,
	"qr_version" integer DEFAULT 1 NOT NULL,
	"payment_id" varchar(255),
	"payment_status" varchar(20),
	"receipt_image" text,
	"receipt_ref" varchar(255),
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"swapped_from_booking_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "bookings_qr_token_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "buses" (
	"id" serial PRIMARY KEY NOT NULL,
	"erp_vehicle_id" integer,
	"name" varchar(255) NOT NULL,
	"license_plate" varchar(50),
	"total_seats" integer DEFAULT 50 NOT NULL,
	"seat_rows" integer DEFAULT 10 NOT NULL,
	"seats_per_row" integer DEFAULT 5 NOT NULL,
	"bus_type" varchar(50) DEFAULT 'seating',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "buses_erp_vehicle_id_unique" UNIQUE("erp_vehicle_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"erp_point_id" integer,
	"name_ar" varchar(255) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "routes_erp_point_id_unique" UNIQUE("erp_point_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stops" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer,
	"name_ar" varchar(255) NOT NULL,
	"name_en" varchar(255),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"google_place_id" varchar(255),
	"arrive_time" varchar(8),
	"depart_time" varchar(8),
	"stop_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "swap_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"old_booking_id" uuid,
	"new_booking_id" uuid,
	"performed_by" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"bus_id" integer NOT NULL,
	"trip_date" varchar(10) NOT NULL,
	"departure_time" timestamp with time zone NOT NULL,
	"return_time" timestamp with time zone,
	"direction" varchar(15) DEFAULT 'to_campus' NOT NULL,
	"total_seats" integer NOT NULL,
	"price_egp" numeric(10, 2) DEFAULT '160.00' NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"cancellation_lock_hours" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"erp_uid" integer,
	"erp_partner_id" integer,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"full_name_ar" varchar(255),
	"phone" varchar(20),
	"role" varchar(20) DEFAULT 'rider' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_erp_uid_unique" UNIQUE("erp_uid"),
	CONSTRAINT "users_erp_partner_id_unique" UNIQUE("erp_partner_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boarding_logs" ADD CONSTRAINT "boarding_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boarding_logs" ADD CONSTRAINT "boarding_logs_scanned_by_users_id_fk" FOREIGN KEY ("scanned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stops" ADD CONSTRAINT "stops_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "swap_logs" ADD CONSTRAINT "swap_logs_old_booking_id_bookings_id_fk" FOREIGN KEY ("old_booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "swap_logs" ADD CONSTRAINT "swap_logs_new_booking_id_bookings_id_fk" FOREIGN KEY ("new_booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "swap_logs" ADD CONSTRAINT "swap_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
