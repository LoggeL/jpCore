CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer,
	`event_type` text NOT NULL,
	`message` text NOT NULL,
	`meta` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch('subsec') * 1000),
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_log_created_idx` ON `audit_log` (`created_at`);
--> statement-breakpoint
CREATE INDEX `audit_log_account_idx` ON `audit_log` (`account_id`);