CREATE TABLE `images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`data` binary(16777215) NOT NULL,
	`mimeType` varchar(50) NOT NULL,
	`size` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `images_id` PRIMARY KEY(`id`)
);
