# Database Migration Guide

## Understanding Your Database Setup

### What's in Git (Schema Only)
✅ **Database schema** - Table definitions in `drizzle/schema.ts`
✅ **Migration system** - Drizzle ORM configuration
✅ **Schema versioning** - Migration files

### What's NOT in Git (Your Data)
❌ **Actual data** - Users, posts, blog configs, API keys
❌ **Database credentials** - Connection strings
❌ **Database instance** - The MySQL server itself

## Migration Options

### Option 1: Fresh Start (Recommended for Testing)

If you're just getting started or don't have critical data yet:

```bash
# On your new server
# 1. Install MySQL
sudo apt install mysql-server  # Ubuntu/Debian
# or
brew install mysql  # macOS

# 2. Create database
mysql -u root -p
CREATE DATABASE blogmagic;
CREATE USER 'blogmagic'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON blogmagic.* TO 'blogmagic'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 3. Update .env
DATABASE_URL=mysql://blogmagic:your-password@localhost:3306/blogmagic

# 4. Push schema
pnpm db:push

# 5. Start fresh!
```

### Option 2: Export & Import Data (Preserve Existing Data)

If you have important data to migrate:

#### Step 1: Export from Current Database

**Method A: Using mysqldump (if you have direct access)**

```bash
# Export all data
mysqldump -h [current-host] -u [username] -p [database-name] > blogmagic_backup.sql

# Or export specific tables
mysqldump -h [current-host] -u [username] -p [database-name] \
  users subscriptions api_keys blog_configs posts post_queue saved_topics \
  > blogmagic_backup.sql
```

**Method B: Using Drizzle Studio (GUI)**

```bash
# In your current Manus environment
pnpm db:studio

# This opens a GUI where you can:
# 1. View all your data
# 2. Export to CSV/JSON
# 3. Copy data manually
```

**Method C: Using a Script (if database is accessible)**

Create `export-data.ts`:

```typescript
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./drizzle/schema";
import fs from "fs";

const db = drizzle(process.env.DATABASE_URL!);

async function exportData() {
  const users = await db.select().from(schema.users);
  const subscriptions = await db.select().from(schema.subscriptions);
  const apiKeys = await db.select().from(schema.apiKeys);
  const blogConfigs = await db.select().from(schema.blogConfigs);
  const posts = await db.select().from(schema.posts);
  const postQueue = await db.select().from(schema.postQueue);
  const savedTopics = await db.select().from(schema.savedTopics);

  const data = {
    users,
    subscriptions,
    apiKeys,
    blogConfigs,
    posts,
    postQueue,
    savedTopics,
  };

  fs.writeFileSync("database-export.json", JSON.stringify(data, null, 2));
  console.log("✅ Data exported to database-export.json");
}

exportData();
```

Run it:
```bash
npx tsx export-data.ts
```

#### Step 2: Import to New Database

**Method A: Using mysqldump file**

```bash
# Import SQL dump
mysql -u blogmagic -p blogmagic < blogmagic_backup.sql
```

**Method B: Using JSON export**

Create `import-data.ts`:

```typescript
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./drizzle/schema";
import fs from "fs";

const db = drizzle(process.env.DATABASE_URL!);

async function importData() {
  const data = JSON.parse(fs.readFileSync("database-export.json", "utf-8"));

  // Import in order (respecting foreign keys)
  if (data.users.length) await db.insert(schema.users).values(data.users);
  if (data.subscriptions.length) await db.insert(schema.subscriptions).values(data.subscriptions);
  if (data.apiKeys.length) await db.insert(schema.apiKeys).values(data.apiKeys);
  if (data.blogConfigs.length) await db.insert(schema.blogConfigs).values(data.blogConfigs);
  if (data.posts.length) await db.insert(schema.posts).values(data.posts);
  if (data.postQueue.length) await db.insert(schema.postQueue).values(data.postQueue);
  if (data.savedTopics.length) await db.insert(schema.savedTopics).values(data.savedTopics);

  console.log("✅ Data imported successfully");
}

importData();
```

Run it:
```bash
npx tsx import-data.ts
```

### Option 3: Use Cloud MySQL (Easiest)

Instead of self-hosting MySQL, use a managed service:

**PlanetScale** (Recommended - Free tier available):
1. Sign up at https://planetscale.com
2. Create database
3. Get connection string
4. Update `DATABASE_URL` in `.env`
5. Run `pnpm db:push`

**Other Options:**
- **AWS RDS** - Reliable, scalable
- **Google Cloud SQL** - Good integration with GCP
- **DigitalOcean Managed MySQL** - Simple, affordable
- **Railway** - Developer-friendly

## Current Database Schema

Your database has these tables:

```
users              - User accounts
subscriptions      - Stripe subscriptions & credits
api_keys          - Encrypted API keys (OpenAI, etc.)
blog_configs      - WordPress site configurations
posts             - Generated blog posts
post_queue        - Post generation queue
saved_topics      - Saved topic ideas
```

## Important Notes

### API Keys Encryption
⚠️ **API keys are encrypted** using `JWT_SECRET`. When migrating:
- Use the **same JWT_SECRET** on your new server
- Or re-enter API keys in the new system

### User Authentication
⚠️ After switching to Google OAuth:
- Existing users will need to sign in with Google
- Match users by **email address**
- Old `openId` (Manus ID) will be replaced with Google ID

### Admin User
To set yourself as admin on new database:

```sql
-- After first Google login, update your role
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Recommended Migration Path

For most users, I recommend:

1. **Start Fresh** with a new database (Option 1)
2. Use **PlanetScale** or **DigitalOcean** for managed MySQL
3. Manually recreate important blog configs (only takes a few minutes)
4. Let the system generate new content

**Why?**
- Cleaner start with Google OAuth
- No encryption key conflicts
- Faster setup (< 10 minutes)
- Less complexity

## Need Your Current Data?

If you have critical data you need to preserve, let me know and I can:

1. Create export scripts for your specific data
2. Help you access the current Manus database
3. Provide step-by-step migration assistance

## Questions?

- **Q: Will I lose my posts?**
  - A: Only if you start fresh. Use Option 2 to preserve data.

- **Q: Can I keep using the Manus database?**
  - A: Only while hosted on Manus. For self-hosting, you need your own MySQL.

- **Q: What's the easiest option?**
  - A: Fresh start with PlanetScale (free tier).

- **Q: How do I backup my data regularly?**
  - A: Use `mysqldump` in a cron job or use managed database backups.

