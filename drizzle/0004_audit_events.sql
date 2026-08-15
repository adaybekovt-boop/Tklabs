CREATE TABLE IF NOT EXISTS `audit_events` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `event_code` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_events_user_created_idx` ON `audit_events` (`user_id`, `created_at`);
