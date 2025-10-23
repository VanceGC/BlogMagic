/**
 * Database Import Script
 * 
 * Imports data from database-export.json to a new database
 * Run with: npx tsx scripts/import-database.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import { users, subscriptions, apiKeys, blogConfigs, posts, postQueue, savedTopics } from "../drizzle/schema";
import fs from "fs";
import path from "path";

async function importDatabase() {
  console.log("🔄 Starting database import...\n");

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable not set");
    process.exit(1);
  }

  // Check if export file exists
  const exportPath = path.join(process.cwd(), "database-export.json");
  if (!fs.existsSync(exportPath)) {
    console.error(`❌ Export file not found: ${exportPath}`);
    console.error("   Run 'npx tsx scripts/export-database.ts' first");
    process.exit(1);
  }

  const db = drizzle(DATABASE_URL);

  try {
    // Read export file
    console.log("📖 Reading export file...");
    const exportData = JSON.parse(fs.readFileSync(exportPath, "utf-8"));
    console.log(`   ✓ Export from ${exportData.exportDate}`);
    console.log(`   ✓ Version ${exportData.version}\n`);

    const data = exportData.tables;

    // Import in order (respecting foreign key dependencies)
    
    if (data.users && data.users.length > 0) {
      console.log(`📥 Importing ${data.users.length} users...`);
      await db.insert(users).values(data.users);
      console.log("   ✓ Users imported");
    }

    if (data.subscriptions && data.subscriptions.length > 0) {
      console.log(`📥 Importing ${data.subscriptions.length} subscriptions...`);
      await db.insert(subscriptions).values(data.subscriptions);
      console.log("   ✓ Subscriptions imported");
    }

    if (data.apiKeys && data.apiKeys.length > 0) {
      console.log(`📥 Importing ${data.apiKeys.length} API keys...`);
      await db.insert(apiKeys).values(data.apiKeys);
      console.log("   ✓ API keys imported");
    }

    if (data.blogConfigs && data.blogConfigs.length > 0) {
      console.log(`📥 Importing ${data.blogConfigs.length} blog configs...`);
      await db.insert(blogConfigs).values(data.blogConfigs);
      console.log("   ✓ Blog configs imported");
    }

    if (data.posts && data.posts.length > 0) {
      console.log(`📥 Importing ${data.posts.length} posts...`);
      await db.insert(posts).values(data.posts);
      console.log("   ✓ Posts imported");
    }

    if (data.postQueue && data.postQueue.length > 0) {
      console.log(`📥 Importing ${data.postQueue.length} queue items...`);
      await db.insert(postQueue).values(data.postQueue);
      console.log("   ✓ Queue items imported");
    }

    if (data.savedTopics && data.savedTopics.length > 0) {
      console.log(`📥 Importing ${data.savedTopics.length} saved topics...`);
      await db.insert(savedTopics).values(data.savedTopics);
      console.log("   ✓ Saved topics imported");
    }

    console.log("\n✅ Database import complete!");
    console.log("\n📊 Import Summary:");
    console.log(`   Users: ${data.users?.length || 0}`);
    console.log(`   Subscriptions: ${data.subscriptions?.length || 0}`);
    console.log(`   API Keys: ${data.apiKeys?.length || 0}`);
    console.log(`   Blog Configs: ${data.blogConfigs?.length || 0}`);
    console.log(`   Posts: ${data.posts?.length || 0}`);
    console.log(`   Queue Items: ${data.postQueue?.length || 0}`);
    console.log(`   Saved Topics: ${data.savedTopics?.length || 0}`);
    console.log("\n⚠️  Next Steps:");
    console.log("   1. Verify data in your database");
    console.log("   2. Update admin user role if needed:");
    console.log("      UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';");
    console.log("   3. Test login with Google OAuth");
    console.log("   4. Verify API keys work (may need to re-enter if JWT_SECRET changed)");

  } catch (error) {
    console.error("\n❌ Import failed:", error);
    console.error("\nTroubleshooting:");
    console.error("   - Make sure database schema is up to date (run 'pnpm db:push')");
    console.error("   - Check for duplicate key errors (database may not be empty)");
    console.error("   - Verify DATABASE_URL is correct");
    process.exit(1);
  }
}

importDatabase();

