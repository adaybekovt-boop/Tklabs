CREATE TABLE `workspace_snapshots` (
  `user_id` text PRIMARY KEY NOT NULL,
  `ciphertext` text NOT NULL,
  `iv` text NOT NULL,
  `checksum` text NOT NULL,
  `revision` integer DEFAULT 1 NOT NULL,
  `updated_at` integer NOT NULL
);
