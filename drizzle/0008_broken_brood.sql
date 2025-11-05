CREATE TABLE `external_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`domain` varchar(255),
	`citedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `external_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blogConfigId` int NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text,
	`content` text,
	`keywords` text,
	`scrapedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_pages_id` PRIMARY KEY(`id`)
);
