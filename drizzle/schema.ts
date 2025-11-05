import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, tinyint, binary } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /**
   * OAuth identifier (openId) for Google OAuth users. Nullable for email/password users.
   */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  /**
   * Hashed password for email/password authentication. Nullable for OAuth users.
   */
  password: varchar("password", { length: 255 }),
  /**
   * Password reset token and expiration for password recovery flow
   */
  passwordResetToken: varchar("passwordResetToken", { length: 255 }),
  passwordResetExpires: timestamp("passwordResetExpires"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Subscription table for Stripe integration
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  status: mysqlEnum("status", ["trialing", "active", "canceled", "past_due", "unpaid"]).notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  canceledAt: timestamp("canceledAt"),
  credits: int("credits").default(200).notNull(),
  creditsResetAt: timestamp("creditsResetAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * User API keys for AI services
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: mysqlEnum("provider", ["openai", "anthropic", "stability"]).notNull(),
  keyName: varchar("keyName", { length: 100 }).notNull(),
  encryptedKey: text("encryptedKey").notNull(),
  isActive: tinyint("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * Blog configurations for WordPress sites
 */
export const blogConfigs = mysqlTable("blogConfigs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  siteName: varchar("siteName", { length: 255 }).notNull(),
  wordpressUrl: varchar("wordpressUrl", { length: 500 }).notNull(),
  wordpressUsername: varchar("wordpressUsername", { length: 255 }),
  wordpressAppPassword: text("wordpressAppPassword"),
  businessDescription: text("businessDescription"),
  competitors: text("competitors"),
  keywords: text("keywords"),
  locale: mysqlEnum("locale", ["local", "national", "global"]).default("national"),
  targetAudience: text("targetAudience"),
  toneOfVoice: varchar("toneOfVoice", { length: 100 }).default("professional"),
  postingFrequency: mysqlEnum("postingFrequency", ["daily", "weekly", "biweekly", "monthly"]).default("weekly"),
  schedulingEnabled: tinyint("schedulingEnabled").default(0).notNull(),
  autoPublish: tinyint("autoPublish").default(0).notNull(),
  scheduleTime: varchar("scheduleTime", { length: 5 }),
  scheduleDayOfWeek: int("scheduleDayOfWeek"),
  timezone: varchar("timezone", { length: 100 }).default("America/New_York"),
  color: varchar("color", { length: 7 }).default("#8B5CF6"),
  defaultCategories: text("defaultCategories"), // JSON array of WordPress category IDs
  lastScheduledAt: timestamp("lastScheduledAt"),
  isActive: tinyint("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogConfig = typeof blogConfigs.$inferSelect;
export type InsertBlogConfig = typeof blogConfigs.$inferInsert;

/**
 * Generated blog posts
 */
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  blogConfigId: int("blogConfigId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  featuredImageUrl: varchar("featuredImageUrl", { length: 1000 }),
  seoTitle: varchar("seoTitle", { length: 500 }),
  seoDescription: text("seoDescription"),
  keywords: text("keywords"),
  categories: text("categories"), // JSON array of WordPress category IDs
  status: mysqlEnum("status", ["draft", "scheduled", "published", "failed"]).default("draft").notNull(),
  wordpressPostId: varchar("wordpressPostId", { length: 100 }),
  scheduledFor: timestamp("scheduledFor"),
  publishedAt: timestamp("publishedAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

/**
 * Post generation queue
 */
export const postQueue = mysqlTable("postQueue", {
  id: int("id").autoincrement().primaryKey(),
  blogConfigId: int("blogConfigId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PostQueueItem = typeof postQueue.$inferSelect;
export type InsertPostQueueItem = typeof postQueue.$inferInsert;

/**
 * Saved trending topics
 */
export const savedTopics = mysqlTable("savedTopics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  blogConfigId: int("blogConfigId").notNull(),
  title: text("title").notNull(),
  reason: text("reason").notNull(),
  source: text("source").notNull(),
  keywords: text("keywords").notNull(), // JSON array stored as text
  searchVolume: mysqlEnum("searchVolume", ["high", "medium", "low"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SavedTopic = typeof savedTopics.$inferSelect;
export type InsertSavedTopic = typeof savedTopics.$inferInsert;

/**
 * Generated images stored as binary data
 */
export const images = mysqlTable("images", {
  id: int("id").autoincrement().primaryKey(),
  data: text("data").notNull(), // Base64 image data (LONGTEXT)
  mimeType: varchar("mimeType", { length: 50 }).notNull(), // e.g., "image/png", "image/jpeg"
  size: int("size").notNull(), // File size in bytes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Image = typeof images.$inferSelect;
export type InsertImage = typeof images.$inferInsert;

/**
 * Site pages table for storing scraped WordPress pages/posts
 * Used for intelligent internal linking suggestions
 */
export const sitePages = mysqlTable("site_pages", {
  id: int("id").autoincrement().primaryKey(),
  blogConfigId: int("blogConfigId").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  content: text("content"),
  keywords: text("keywords"), // Comma-separated keywords extracted from content
  scrapedAt: timestamp("scrapedAt").defaultNow().notNull(),
});

export type SitePage = typeof sitePages.$inferSelect;
export type InsertSitePage = typeof sitePages.$inferInsert;

/**
 * External sources table for tracking citations and research sources
 * Used for SEO and credibility tracking
 */
export const externalSources = mysqlTable("external_sources", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  domain: varchar("domain", { length: 255 }),
  citedAt: timestamp("citedAt").defaultNow().notNull(),
});

export type ExternalSource = typeof externalSources.$inferSelect;
export type InsertExternalSource = typeof externalSources.$inferInsert;