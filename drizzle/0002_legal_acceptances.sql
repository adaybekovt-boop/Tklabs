CREATE TABLE IF NOT EXISTS `legal_acceptances` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `bundle_version` text NOT NULL,
  `bundle_digest` text NOT NULL,
  `language` text NOT NULL,
  `accepted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `legal_acceptances_user_id_idx` ON `legal_acceptances` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `legal_acceptances_bundle_version_idx` ON `legal_acceptances` (`bundle_version`);
