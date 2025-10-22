CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('openai','anthropic','stability') NOT NULL,
	`keyName` varchar(100) NOT NULL,
	`encryptedKey` text NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blogConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`siteName` varchar(255) NOT NULL,
	`wordpressUrl` varchar(500) NOT NULL,
	`wordpressUsername` varchar(255),
	`wordpressAppPassword` text,
	`businessDescription` text,
	`competitors` text,
	`keywords` text,
	`locale` enum('local','national','global') DEFAULT 'national',
	`targetAudience` text,
	`toneOfVoice` varchar(100) DEFAULT 'professional',
	`postingFrequency` enum('daily','weekly','biweekly','monthly') DEFAULT 'weekly',
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blogConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `postQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blogConfigId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `postQueue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blogConfigId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`excerpt` text,
	`featuredImageUrl` varchar(1000),
	`seoTitle` varchar(500),
	`seoDescription` text,
	`keywords` text,
	`status` enum('draft','scheduled','published','failed') NOT NULL DEFAULT 'draft',
	`wordpressPostId` varchar(100),
	`scheduledFor` timestamp,
	`publishedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripeCustomerId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`stripePriceId` varchar(255),
	`status` enum('trialing','active','canceled','past_due','unpaid') NOT NULL,
	`trialEndsAt` timestamp,
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`canceledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
