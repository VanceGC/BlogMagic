# Database Migration Scripts

These scripts help you export and import your database when migrating from Manus to self-hosted infrastructure.

## Quick Start

### Export Current Database

```bash
# Export all data from current database
npx tsx scripts/export-database.ts
```

This creates `database-export.json` with all your data.

### Import to New Database

```bash
# 1. Set up new database and update DATABASE_URL in .env
# 2. Push schema to new database
pnpm db:push

# 3. Import data
npx tsx scripts/import-database.ts
```

## What Gets Exported/Imported

- ✅ Users
- ✅ Subscriptions
- ✅ API Keys (encrypted)
- ✅ Blog Configurations
- ✅ Posts
- ✅ Post Queue
- ✅ Saved Topics

## Important Notes

### API Keys
- API keys are **encrypted** using `JWT_SECRET`
- Use the **same JWT_SECRET** on your new server
- Otherwise, you'll need to re-enter API keys

### User Authentication
- After switching to Google OAuth, users sign in with Google
- Users are matched by **email address**
- Old Manus `openId` will be replaced with Google ID on first login

### Admin Access
After import, set yourself as admin:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Troubleshooting

### "Database not available"
- Check `DATABASE_URL` is set correctly
- Ensure MySQL is running
- Test connection: `mysql -u user -p database`

### "Duplicate entry" errors
- Database is not empty
- Either clear database or skip existing records

### "Foreign key constraint" errors
- Run `pnpm db:push` first to create schema
- Import order matters (users before subscriptions, etc.)

## Alternative: Start Fresh

If you don't have critical data, starting fresh is easier:

```bash
# 1. Create new database
# 2. Update DATABASE_URL
# 3. Push schema
pnpm db:push

# 4. Start using the app!
```

You can manually recreate:
- Blog configs (takes 2 minutes)
- API keys (just re-enter them)

## Need Help?

See [DATABASE_MIGRATION.md](../DATABASE_MIGRATION.md) for detailed migration guide.

