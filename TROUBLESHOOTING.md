# Deployment Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Docker Build Fails - "ENOENT: no such file or directory, open '/app/patches/wouter@3.7.1.patch'"

**Problem:** The patches directory wasn't cloned from GitHub.

**Solution:**

```bash
# On your server, in your project directory
cd /home/blogmagic.app/public_html

# Pull latest changes (includes patches)
git pull origin main

# Verify patches directory exists
ls -la patches/

# If patches directory is missing, force re-clone:
cd ..
rm -rf public_html
git clone https://github.com/VanceGC/BlogMagic.git public_html
cd public_html

# Now try Docker again
docker-compose down
docker-compose up -d --build
```

### Issue 2: Manual Setup - Application Not Starting

**Checklist:**

1. **Check if Node.js is installed:**
   ```bash
   node --version  # Should be 18+
   pnpm --version  # Should be installed
   ```

2. **Check if dependencies are installed:**
   ```bash
   cd /home/blogmagic.app/public_html
   pnpm install
   ```

3. **Check if .env file exists and is configured:**
   ```bash
   ls -la .env
   cat .env  # Verify all variables are set
   ```

4. **Check if database is accessible:**
   ```bash
   # Test MySQL connection
   mysql -u your_db_user -p your_db_name
   # If this fails, check DATABASE_URL in .env
   ```

5. **Push database schema:**
   ```bash
   pnpm db:push
   ```

6. **Build the application:**
   ```bash
   pnpm build
   ```

7. **Check for build errors:**
   ```bash
   # If build fails, check the error messages
   # Common issues:
   # - Missing environment variables
   # - TypeScript errors
   # - Missing dependencies
   ```

8. **Start with PM2:**
   ```bash
   pm2 start npm --name "blogmagic" -- start
   pm2 logs blogmagic  # Check for errors
   ```

### Issue 3: Port 3000 Already in Use

**Solution:**

```bash
# Find what's using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use a different port in .env
PORT=3001
```

### Issue 4: Database Connection Failed

**Common causes:**

1. **Wrong DATABASE_URL format:**
   ```env
   # Correct format:
   DATABASE_URL=mysql://username:password@localhost:3306/database_name
   
   # NOT:
   DATABASE_URL=mysql://username@localhost/database_name  # Missing password and port
   ```

2. **Database doesn't exist:**
   ```bash
   mysql -u root -p
   CREATE DATABASE blog_magic;
   ```

3. **User doesn't have permissions:**
   ```sql
   GRANT ALL PRIVILEGES ON blog_magic.* TO 'your_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **MySQL not running:**
   ```bash
   systemctl status mysql
   systemctl start mysql
   ```

### Issue 5: "Cannot find module" Errors

**Solution:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules
rm -rf .pnpm-store
pnpm install

# If still failing, check pnpm version
pnpm --version  # Should be 8.0+
npm install -g pnpm@latest
```

### Issue 6: PM2 Not Starting Application

**Debug steps:**

```bash
# View logs
pm2 logs blogmagic

# Check status
pm2 status

# Try starting manually first
cd /home/blogmagic.app/public_html
pnpm start

# If manual start works, then use PM2:
pm2 delete blogmagic
pm2 start npm --name "blogmagic" -- start
```

### Issue 7: Reverse Proxy Not Working

**For OpenLiteSpeed (CyberPanel default):**

1. Go to CyberPanel → Websites → Manage → Rewrite Rules
2. Add:
   ```
   RewriteEngine On
   RewriteCond %{REQUEST_URI} !^/\.well-known/
   RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
   ```
3. Restart OpenLiteSpeed:
   ```bash
   systemctl restart lsws
   ```

**For Nginx:**

```bash
# Test nginx config
nginx -t

# If errors, check your config file
nano /etc/nginx/sites-available/blogmagic.app

# Restart nginx
systemctl restart nginx
```

### Issue 8: SSL Certificate Not Working

**Solution:**

```bash
# In CyberPanel, go to:
# Websites → List Websites → Manage → Issue SSL

# Or manually with certbot:
certbot --nginx -d blogmagic.app -d www.blogmagic.app
```

### Issue 9: Docker - "Cannot connect to Docker daemon"

**Solution:**

```bash
# Start Docker service
systemctl start docker
systemctl enable docker

# Check Docker status
systemctl status docker

# If still failing, reinstall Docker:
curl -fsSL https://get.docker.com | sh
```

### Issue 10: Environment Variables Not Loading

**Check:**

```bash
# Verify .env file exists
ls -la .env

# Check file permissions
chmod 600 .env

# Verify variables are loaded
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL ? 'Loaded' : 'Not loaded')"
```

## Quick Diagnostic Script

Run this to check your setup:

```bash
#!/bin/bash
echo "=== BlogMagic Deployment Diagnostic ==="
echo ""
echo "Node.js version:"
node --version
echo ""
echo "pnpm version:"
pnpm --version
echo ""
echo "PM2 status:"
pm2 status
echo ""
echo "Docker status:"
docker --version
systemctl status docker | grep Active
echo ""
echo "MySQL status:"
systemctl status mysql | grep Active
echo ""
echo ".env file exists:"
ls -la .env
echo ""
echo "Patches directory:"
ls -la patches/
echo ""
echo "Port 3000 usage:"
lsof -ti:3000 || echo "Port 3000 is free"
echo ""
echo "=== End Diagnostic ==="
```

Save as `diagnostic.sh`, make executable with `chmod +x diagnostic.sh`, and run with `./diagnostic.sh`.

## Still Having Issues?

### For Manual Setup Issues:

1. **Start fresh:**
   ```bash
   cd /home/blogmagic.app
   rm -rf public_html
   git clone https://github.com/VanceGC/BlogMagic.git public_html
   cd public_html
   pnpm install
   cp .env.example .env
   nano .env  # Configure your settings
   pnpm db:push
   pnpm build
   pnpm start  # Test manually first
   ```

2. **If manual start works, then use PM2:**
   ```bash
   pm2 start npm --name "blogmagic" -- start
   pm2 save
   pm2 startup
   ```

### For Docker Issues:

1. **Complete reset:**
   ```bash
   cd /home/blogmagic.app/public_html
   docker-compose down -v  # Remove volumes
   docker system prune -a  # Clean Docker
   git pull origin main    # Get latest code
   docker-compose up -d --build
   ```

2. **Check logs:**
   ```bash
   docker-compose logs -f
   ```

### Get Logs for Support:

If you need help, collect these logs:

```bash
# PM2 logs
pm2 logs blogmagic --lines 100 > pm2-logs.txt

# Docker logs
docker-compose logs > docker-logs.txt

# System info
node --version > system-info.txt
pnpm --version >> system-info.txt
docker --version >> system-info.txt
cat .env >> system-info.txt  # Be careful - contains secrets!
```

## Recommended: Use Docker

Docker is the most reliable deployment method:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone repo
git clone https://github.com/VanceGC/BlogMagic.git
cd BlogMagic

# Create .env file
cp .env.example .env
nano .env  # Configure

# Start
docker-compose up -d

# View logs
docker-compose logs -f
```

## Contact Support

If you're still stuck:
1. Run the diagnostic script above
2. Collect logs
3. Open an issue on GitHub with:
   - Error messages
   - Diagnostic output
   - Deployment method (manual/Docker)
   - Server OS and version

