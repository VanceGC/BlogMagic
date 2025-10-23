ALTER TABLE `subscriptions` ADD `credits` int DEFAULT 200 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `creditsResetAt` timestamp;