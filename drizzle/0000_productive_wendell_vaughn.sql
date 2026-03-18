CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"master_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"appointment_date" varchar(10) NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"client_phone" varchar(50),
	"client_telegram_id" varchar(50),
	"status" varchar(20) DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"email" varchar(255),
	"password" varchar(255),
	"telegram_id" varchar(50),
	"verification_code" varchar(20),
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"verified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "masters" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"specialization" varchar(255) NOT NULL,
	"telegram_id" varchar(50),
	"phone" varchar(50),
	"staff_password" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_sent" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"reminder_type" varchar(20) DEFAULT '1hour' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"price" varchar(50),
	"image_url" varchar(500),
	"order_desktop" integer DEFAULT 0 NOT NULL,
	"order_mobile" integer DEFAULT 0 NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"badge_text" varchar(50),
	"badge_type" varchar(20),
	"executor_role" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "telegram_verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"telegram_id" varchar(50) NOT NULL,
	"phone" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	CONSTRAINT "telegram_verification_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "work_slot_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_slot_id" integer NOT NULL,
	"master_id" integer NOT NULL,
	"suggested_work_date" varchar(10) NOT NULL,
	"suggested_start_time" varchar(5) NOT NULL,
	"suggested_end_time" varchar(5) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"type" varchar(30) DEFAULT 'time_change' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"master_id" integer NOT NULL,
	"work_date" varchar(10) NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(50),
	"is_confirmed" boolean DEFAULT false NOT NULL,
	"admin_update_status" varchar(20)
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_master_id_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."masters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_sent" ADD CONSTRAINT "reminder_sent_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_slot_change_requests" ADD CONSTRAINT "work_slot_change_requests_work_slot_id_work_slots_id_fk" FOREIGN KEY ("work_slot_id") REFERENCES "public"."work_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_slot_change_requests" ADD CONSTRAINT "work_slot_change_requests_master_id_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."masters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_slots" ADD CONSTRAINT "work_slots_master_id_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."masters"("id") ON DELETE cascade ON UPDATE no action;