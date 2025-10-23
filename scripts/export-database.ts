/**
 * Database Export Script
 * 
 * Exports all data from the current database to a JSON file
 * Run with: npx tsx scripts/export-database.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import { users, subscriptions, apiKeys, blogConfigs, posts, postQueue, savedTopics } from "../drizzle/schema";
import fs from "fs";
import path from "path";

async function exportDatabase() {
  console.log("🔄 Starting database export...\n");

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable not set");
    process.exit(1);
  }

  const db = drizzle(DATABASE_URL);

  try {
    // Export all tables
    console.log("📊 Exporting users...");
    const usersData = await db.select().from(users);
    console.log(`   ✓ ${usersData.length} users exported`);

    console.log("📊 Exporting subscriptions...");
    const subscriptionsData = await db.select().from(subscriptions);
    console.log(`   ✓ ${subscriptionsData.length} subscriptions exported`);

    console.log("📊 Exporting API keys...");
    const apiKeysData = await db.select().from(apiKeys);
    console.log(`   ✓ ${apiKeysData.length} API keys exported`);

    console.log("📊 Exporting blog configs...");
    const blogConfigsData = await db.select().from(blogConfigs);
    console.log(`   ✓ ${blogConfigsData.length} blog configs exported`);

    console.log("📊 Exporting posts...");
    const postsData = await db.select().from(posts);
    console.log(`   ✓ ${postsData.length} posts exported`);

    console.log("📊 Exporting post queue...");
    const postQueueData = await db.select().from(postQueue);
    console.log(`   ✓ ${postQueueData.length} queue items exported`);

    console.log("📊 Exporting saved topics...");
    const savedTopicsData = await db.select().from(savedTopics);
    console.log(`   ✓ ${savedTopicsData.length} saved topics exported`);

    // Combine all data
    const exportData = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      tables: {
        users: usersData,
        subscriptions: subscriptionsData,
        apiKeys: apiKeysData,
        blogConfigs: blogConfigsData,
        posts: postsData,
        postQueue: postQueueData,
        savedTopics: savedTopicsData,
      },
      stats: {
        totalUsers: usersData.length,
        totalSubscriptions: subscriptionsData.length,
        totalApiKeys: apiKeysData.length,
        totalBlogConfigs: blogConfigsData.length,
        totalPosts: postsData.length,
        totalQueueItems: postQueueData.length,
        totalSavedTopics: savedTopicsData.length,
      },
    };

    // Save to file
    const exportPath = path.join(process.cwd(), "database-export.json");
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    console.log("\n✅ Database export complete!");
    console.log(`📁 Saved to: ${exportPath}`);
    console.log("\n📊 Export Summary:");
    console.log(`   Users: ${exportData.stats.totalUsers}`);
    console.log(`   Subscriptions: ${exportData.stats.totalSubscriptions}`);
    console.log(`   API Keys: ${exportData.stats.totalApiKeys}`);
    console.log(`   Blog Configs: ${exportData.stats.totalBlogConfigs}`);
    console.log(`   Posts: ${exportData.stats.totalPosts}`);
    console.log(`   Queue Items: ${exportData.stats.totalQueueItems}`);
    console.log(`   Saved Topics: ${exportData.stats.totalSavedTopics}`);
    console.log("\n⚠️  Important Notes:");
    console.log("   - Keep this file secure (contains encrypted API keys)");
    console.log("   - Use the same JWT_SECRET when importing");
    console.log("   - After Google OAuth migration, users will need to sign in again");

  } catch (error) {
    console.error("\n❌ Export failed:", error);
    process.exit(1);
  }
}

exportDatabase();

