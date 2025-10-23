ALTER TABLE `blogConfigs` ADD `schedulingEnabled` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `blogConfigs` ADD `autoPublish` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `blogConfigs` ADD `scheduleTime` varchar(5);--> statement-breakpoint
ALTER TABLE `blogConfigs` ADD `scheduleDayOfWeek` int;--> statement-breakpoint
ALTER TABLE `blogConfigs` ADD `timezone` varchar(100) DEFAULT 'America/New_York';--> statement-breakpoint
ALTER TABLE `blogConfigs` ADD `lastScheduledAt` timestamp;