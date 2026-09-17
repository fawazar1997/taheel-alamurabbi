CREATE TABLE `annual_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`year` integer NOT NULL,
	`development_meetings` text DEFAULT '[]' NOT NULL,
	`trips` text DEFAULT '[]' NOT NULL,
	`workshops` text DEFAULT '[]' NOT NULL,
	`evaluation_followup` integer,
	`status` text DEFAULT 'not_started' NOT NULL,
	`submitted_at` text,
	`updated_at` text NOT NULL
);
CREATE UNIQUE INDEX `idx_annual_plans_org_year` ON `annual_plans` (`organization_id`,`year`);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`meeting_number` integer NOT NULL,
	`attendees` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
CREATE UNIQUE INDEX `idx_attendance_org_meeting` ON `attendance` (`organization_id`,`meeting_number`);
--> statement-breakpoint
CREATE TABLE `learning_environments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`pre_score` integer,
	`post_score` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`name` text NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`participants` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_access_token_unique` ON `organizations` (`access_token`);--> statement-breakpoint
CREATE INDEX `idx_organizations_archived` ON `organizations` (`archived`);--> statement-breakpoint
CREATE TABLE `project_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`project_name` text NOT NULL,
	`year` integer NOT NULL,
	`educator_meetings` integer DEFAULT 2 NOT NULL,
	`min_development_meetings` integer DEFAULT 2 NOT NULL,
	`min_trips` integer DEFAULT 1 NOT NULL,
	`min_workshops` integer DEFAULT 2 NOT NULL,
	`updated_at` text NOT NULL
);
