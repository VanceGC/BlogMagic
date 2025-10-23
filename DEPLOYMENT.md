# BlogMagic - Deployment Guide

**Turnkey deployment in 10-15 minutes!**

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- MySQL database
- Google OAuth credentials
- OpenAI API key

### 1. Clone & Install (2 minutes)

```bash
git clone <your-repo-url> blogmagic
cd blogmagic
pnpm install
```

### 2. Configure Environment (5 minutes)

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and fill in these **required** values:

```env
# Database (MySQL)
DATABASE_URL=mysql://user:password@localhost:3306/blogmagic

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-random-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Stripe (for payments)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_PRICE_ID=your-stripe-price-id

# App Configuration
VITE_APP_TITLE="BlogMagic"
VITE_APP_LOGO="https://your-logo-url.com/logo.png"
PORT=3000
```

### 3. Setup Database (3 minutes)

```bash
# Push database schema
pnpm db:push
```

### 4. Start Application (1 minute)

**Development:**
```bash
pnpm dev
```

**Production:**
```bash
pnpm build
pnpm start
```

Visit `http://localhost:3000` 🎉

---

## Detailed Setup Instructions

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

### Database Setup

**Option 1: Local MySQL**
```bash
# Install MySQL
brew install mysql  # macOS
# or
sudo apt install mysql-server  # Ubuntu

# Create database
mysql -u root -p
CREATE DATABASE blogmagic;
CREATE USER 'blogmagic'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON blogmagic.* TO 'blogmagic'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Option 2: Cloud MySQL (PlanetScale, AWS RDS, etc.)**
- Create a MySQL database
- Copy the connection string
- Update `DATABASE_URL` in `.env`

### Stripe Setup (for Payments)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get API keys from "Developers" → "API keys"
3. Create a product and price
4. Copy Price ID
5. Setup webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
6. Copy webhook secret

### Production Deployment

#### Option 1: VPS/Cloud Server (DigitalOcean, AWS, etc.)

```bash
# On your server
git clone <your-repo> blogmagic
cd blogmagic
pnpm install
cp .env.example .env
# Edit .env with production values
pnpm db:push
pnpm build
pnpm start
```

**Using PM2 (recommended):**
```bash
npm install -g pm2
pm2 start npm --name "blogmagic" -- start
pm2 save
pm2 startup
```

#### Option 2: Docker

```bash
docker-compose up -d
```

#### Option 3: Vercel/Railway/Render

1. Connect your GitHub repository
2. Add environment variables from `.env`
3. Deploy!

### Nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | Secret for JWT tokens | Generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | `https://yourdomain.com/api/auth/google/callback` |
| `OPENAI_API_KEY` | OpenAI API key | From OpenAI dashboard |
| `STRIPE_SECRET_KEY` | Stripe secret key | From Stripe dashboard |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | From Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | From Stripe webhooks |
| `STRIPE_PRICE_ID` | Stripe price ID | From Stripe products |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `VITE_APP_TITLE` | Application title | `"BlogMagic"` |
| `VITE_APP_LOGO` | Logo URL | Placeholder |
| `NODE_ENV` | Environment | `development` |

### Removed (Manus-specific - not needed for self-hosting)

These variables were specific to Manus platform and are **no longer needed**:
- ~~`OAUTH_SERVER_URL`~~ - Replaced with Google OAuth
- ~~`VITE_OAUTH_PORTAL_URL`~~ - Replaced with Google OAuth
- ~~`VITE_APP_ID`~~ - Not needed
- ~~`OWNER_OPEN_ID`~~ - Not needed
- ~~`BUILT_IN_FORGE_API_URL`~~ - Not needed
- ~~`BUILT_IN_FORGE_API_KEY`~~ - Not needed
- ~~`VITE_ANALYTICS_ENDPOINT`~~ - Optional analytics
- ~~`VITE_ANALYTICS_WEBSITE_ID`~~ - Optional analytics

---

## Troubleshooting

### Database Connection Failed
- Check `DATABASE_URL` format
- Ensure MySQL is running
- Verify credentials and database exists

### Google OAuth Not Working
- Check callback URL matches exactly
- Verify Google Cloud project has Google+ API enabled
- Check redirect URIs in Google Console

### Port Already in Use
- Change `PORT` in `.env`
- Or kill process: `lsof -ti:3000 | xargs kill`

### Build Errors
- Clear cache: `rm -rf node_modules dist && pnpm install`
- Check Node version: `node --version` (should be 18+)

---

## Support

For issues or questions:
- GitHub Issues: <your-repo-url>/issues
- Documentation: <your-docs-url>
- Email: support@blogmagic.app

---

## License

[Your License Here]

