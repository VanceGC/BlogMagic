# Deploying BlogMagic on CyberPanel

## Important: CyberPanel Considerations

CyberPanel is primarily designed for **PHP applications** (WordPress, Laravel, etc.), but you can deploy **Node.js applications** like BlogMagic with some additional setup.

## Prerequisites

- CyberPanel installed on your server
- Node.js 18+ installed on server
- MySQL database access
- Domain name pointed to your server
- SSH access to your server

## Deployment Steps

### Step 1: Install Node.js on Your Server

CyberPanel doesn't include Node.js by default. SSH into your server:

```bash
# SSH into your server
ssh root@your-server-ip

# Install Node.js 18+ and pnpm
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
npm install -g pnpm pm2
```

### Step 2: Create Website in CyberPanel

1. Go to **Websites → Create Website**
2. Enter your domain (e.g., `blogmagic.app`)
3. Select PHP version (doesn't matter, we'll use Node.js)
4. Create the website

### Step 3: Set Up Git Integration

1. Click **Setup Git** on the Git Integration card
2. Enter your repository URL: `https://github.com/VanceGC/BlogMagic.git`
3. Branch: `main`
4. Click **Setup Git**

**⚠️ Important:** CyberPanel's Git integration will clone the repo, but **won't automatically run Node.js build/start commands**. You'll need to do this manually via SSH.

### Step 4: Configure via SSH

SSH into your server and navigate to your website directory:

```bash
# Navigate to website directory
cd /home/blogmagic.app/public_html

# Or if CyberPanel used a different path:
cd /home/yourdomain.com/public_html

# Pull latest code (if not already cloned)
git clone https://github.com/VanceGC/BlogMagic.git .
# or
git pull origin main

# Install dependencies
pnpm install

# Create .env file
nano .env
```

### Step 5: Configure Environment Variables

Create `.env` file with your configuration:

```env
# Database (use CyberPanel's MySQL)
DATABASE_URL=mysql://your_db_user:your_db_password@localhost:3306/your_db_name

# JWT Secret
JWT_SECRET=your-random-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://blogmagic.app/api/auth/google/callback

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
STRIPE_PRICE_ID=your-price-id

# App Config
VITE_APP_TITLE="BlogMagic"
VITE_APP_LOGO="https://your-logo-url.com/logo.png"
PORT=3000
NODE_ENV=production
```

### Step 6: Create MySQL Database

In CyberPanel:

1. Go to **Databases → Create Database**
2. Create database: `blogmagic`
3. Create database user with password
4. Grant all privileges
5. Update `DATABASE_URL` in `.env`

### Step 7: Build and Deploy

```bash
# Push database schema
pnpm db:push

# Build the application
pnpm build

# Start with PM2 (process manager)
pm2 start npm --name "blogmagic" -- start
pm2 save
pm2 startup
```

### Step 8: Configure Reverse Proxy

Since BlogMagic runs on port 3000, you need to proxy requests from port 80/443 to port 3000.

**Option A: Using OpenLiteSpeed (CyberPanel's default)**

1. Go to **Websites → List Websites**
2. Click **Manage** on your domain
3. Click **Rewrite Rules**
4. Add this configuration:

```
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/\.well-known/
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

**Option B: Using Nginx (if you prefer)**

Create `/etc/nginx/sites-available/blogmagic.app`:

```nginx
server {
    listen 80;
    server_name blogmagic.app www.blogmagic.app;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:
```bash
ln -s /etc/nginx/sites-available/blogmagic.app /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 9: Enable SSL (HTTPS)

In CyberPanel:

1. Go to **Websites → List Websites**
2. Click **Manage** on your domain
3. Click **Issue SSL**
4. Select **Let's Encrypt**
5. Click **Issue SSL**

### Step 10: Set Up Auto-Deploy (Optional)

Create a deploy script at `/home/blogmagic.app/deploy.sh`:

```bash
#!/bin/bash
cd /home/blogmagic.app/public_html
git pull origin main
pnpm install
pnpm build
pm2 restart blogmagic
echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x /home/blogmagic.app/deploy.sh
```

Set up a webhook in GitHub:
1. Go to your GitHub repo → Settings → Webhooks
2. Add webhook URL: `https://blogmagic.app/deploy` (you'll need to create this endpoint)
3. Or manually run: `bash /home/blogmagic.app/deploy.sh`

## Alternative: Docker on CyberPanel

If you prefer Docker (easier and more reliable):

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Navigate to your website directory
cd /home/blogmagic.app/public_html

# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3000
lsof -ti:3000
# Kill the process
kill -9 $(lsof -ti:3000)
```

### PM2 Not Starting
```bash
# View logs
pm2 logs blogmagic

# Restart
pm2 restart blogmagic

# Check status
pm2 status
```

### Database Connection Failed
- Verify MySQL is running: `systemctl status mysql`
- Check database credentials in `.env`
- Ensure database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### SSL Certificate Issues
- Ensure domain DNS points to your server
- Wait 5-10 minutes for DNS propagation
- Check firewall allows ports 80 and 443

## Recommended Approach

For CyberPanel, I recommend:

1. **Use CyberPanel for:**
   - Domain management
   - SSL certificates
   - MySQL database
   - DNS management

2. **Deploy Node.js app manually via SSH:**
   - Clone from GitHub
   - Install dependencies
   - Build and run with PM2
   - Configure reverse proxy

3. **Or use Docker:**
   - Much simpler
   - Better isolation
   - Easier updates
   - Just run `docker-compose up -d`

## Quick Start Commands

```bash
# Complete setup in one go
cd /home/yourdomain.com/public_html
git clone https://github.com/VanceGC/BlogMagic.git .
pnpm install
cp .env.example .env
nano .env  # Configure your settings
pnpm db:push
pnpm build
pm2 start npm --name "blogmagic" -- start
pm2 save
pm2 startup
```

## Monitoring

```bash
# Check app status
pm2 status

# View logs
pm2 logs blogmagic

# Monitor resources
pm2 monit

# Restart app
pm2 restart blogmagic
```

## Updates

To update your app:

```bash
cd /home/yourdomain.com/public_html
git pull origin main
pnpm install
pnpm build
pm2 restart blogmagic
```

## Summary

**CyberPanel Git Integration:** ✅ Can clone the repo
**Automatic Node.js deployment:** ❌ Not supported out of the box
**Manual deployment:** ✅ Works perfectly via SSH + PM2
**Docker deployment:** ✅ Recommended for easier management

CyberPanel is great for managing the server infrastructure (domains, SSL, databases), but you'll need to handle the Node.js deployment manually or use Docker.

