CREATE TABLE `savedTopics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`blogConfigId` int NOT NULL,
	`title` text NOT NULL,
	`reason` text NOT NULL,
	`source` text NOT NULL,
	`keywords` text NOT NULL,
	`searchVolume` enum('high','medium','low') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `savedTopics_id` PRIMARY KEY(`id`)
);
