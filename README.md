# Blog Magic - AI Blog Automation Platform

**Domain**: https://blogmagic.app

Blog Magic is an enterprise-grade AI-powered blog automation platform that generates SEO-optimized content and automatically publishes to WordPress sites.

## Features

### Core Platform
- **AI Content Generation**: Generate professional, SEO-optimized blog posts using OpenAI GPT
- **Image Generation**: Automatic featured image creation for every post
- **WordPress Integration**: Seamless publishing via REST API
- **Stripe Payments**: $9/month subscription with 30-day free trial
- **Multi-Blog Support**: Manage multiple WordPress sites from one dashboard
- **User Authentication**: Secure OAuth-based login via Manus
- **API Key Management**: Users bring their own OpenAI/Anthropic/Stability AI keys

### WordPress Plugin
- Auto-publish or save as draft
- Yoast SEO integration
- Featured image handling
- REST API webhook endpoint
- Application Password authentication

### Chrome Extension
- Quick access popup with stats
- Right-click context menu integration
- Content extraction from any webpage
- Badge notifications for draft posts

## Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, shadcn/ui
- **Backend**: Node.js, Express, tRPC 11
- **Database**: MySQL/TiDB via Drizzle ORM
- **Payments**: Stripe
- **AI**: OpenAI GPT-4, DALL-E (user's API keys)
- **Authentication**: Manus OAuth

## Project Structure

```
ai-blog-automation/
├── client/                 # React frontend
│   └── src/
│       ├── pages/         # Page components
│       ├── components/    # Reusable UI components
│       └── lib/          # tRPC client
├── server/                # Express + tRPC backend
│   ├── routers.ts        # tRPC API procedures
│   ├── db.ts             # Database queries
│   ├── contentGenerator.ts    # AI content generation
│   ├── wordpressPublisher.ts  # WordPress integration
│   ├── stripe.ts         # Stripe SDK wrapper
│   ├── stripeWebhook.ts  # Webhook handler
│   └── routes/           # Express routes
├── drizzle/              # Database schema & migrations
├── wordpress-plugin/     # WordPress plugin
└── chrome-extension/     # Chrome extension
```

## Setup Instructions

### 1. Environment Configuration

Set these via the Manus project settings UI:

**Branding** (via Settings GUI):
- `VITE_APP_TITLE`: "Blog Magic"
- `VITE_APP_LOGO`: Your logo URL

**Stripe** (already configured):
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret
- `STRIPE_PRICE_ID`: Price ID for $9/month subscription

**Stripe Webhook**:
- Configure webhook endpoint in Stripe Dashboard: `https://blogmagic.app/api/stripe/webhook`
- Select events: `customer.subscription.*`, `invoice.payment_*`

### 2. Database

Schema is already created and migrated. Tables:
- `users` - User accounts
- `subscriptions` - Stripe subscriptions
- `apiKeys` - User API keys (encrypted)
- `blogConfigs` - WordPress site configurations
- `posts` - Generated blog posts
- `postQueue` - Post generation queue

### 3. WordPress Plugin Installation

1. Download `wordpress-plugin.zip` from project root
2. Upload to WordPress: Plugins → Add New → Upload Plugin
3. Activate the plugin
4. Go to AI Blog → Settings
5. Create Application Password in WordPress profile
6. Configure platform URL and credentials

### 4. Chrome Extension Installation

1. Download `chrome-extension.zip` from project root
2. Extract the ZIP file
3. Open Chrome → Extensions → Enable Developer Mode
4. Click "Load unpacked" → Select extracted folder
5. Click extension icon → Settings
6. Enter platform URL: `https://blogmagic.app`

## API Endpoints

### tRPC Procedures

**Authentication**:
- `auth.me` - Get current user
- `auth.logout` - Logout

**Subscriptions**:
- `subscription.get` - Get user subscription

**API Keys**:
- `apiKeys.list` - List user API keys
- `apiKeys.create` - Add new API key
- `apiKeys.delete` - Delete API key

**Blog Configurations**:
- `blogConfigs.list` - List all blog configs
- `blogConfigs.get` - Get single config
- `blogConfigs.create` - Create new config
- `blogConfigs.update` - Update config
- `blogConfigs.delete` - Delete config

**Posts**:
- `posts.list` - List posts (with filters)
- `posts.generate` - Generate new post with AI
- `posts.publish` - Publish post to WordPress
- `posts.delete` - Delete post

**Content**:
- `content.generateTopics` - Generate topic ideas
- `content.testWordPress` - Test WordPress connection

### REST Endpoints

**Stripe Webhook**:
- `POST /api/stripe/webhook` - Stripe webhook handler

## User Flow

### Getting Started

1. **Sign Up**: User visits blogmagic.app and signs in with OAuth
2. **Free Trial**: Automatically starts 30-day free trial
3. **Add API Key**: User adds their OpenAI API key in Settings
4. **Configure Blog**: User creates blog configuration with:
   - WordPress URL
   - Application Password
   - Business description
   - Keywords, competitors, locale
   - Posting frequency
5. **Install Plugin**: User installs WordPress plugin
6. **Generate Content**: Platform generates SEO-optimized posts with AI
7. **Auto-Publish**: Posts automatically publish to WordPress

### Content Generation Process

1. User triggers post generation (manual or scheduled)
2. AI analyzes business context, keywords, competitors
3. Generates 1500-2500 word SEO-optimized article
4. Creates featured image with DALL-E
5. Optimizes meta title, description, keywords
6. Saves as draft in database
7. Publishes to WordPress (if auto-publish enabled)
8. Updates post status and WordPress post ID

## Pricing

- **Free Trial**: 30 days
- **Subscription**: $9/month
- **Payment**: Via Stripe
- **Cancellation**: Anytime

## Security

- OAuth authentication via Manus
- API keys encrypted with AES (using JWT_SECRET)
- Stripe webhook signature verification
- WordPress Application Passwords
- All inputs sanitized and validated

## Deployment

The platform is designed for deployment at `blogmagic.app`:

1. Deploy via Manus deployment system
2. Configure domain: blogmagic.app
3. Set environment variables via Settings GUI
4. Configure Stripe webhook URL
5. Test end-to-end flow

## Development

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:push

# Start dev server
pnpm dev

# Build for production
pnpm build
```

## Support

For issues or questions:
- Check this documentation
- Review error logs
- Contact support via platform

## License

Proprietary - All rights reserved

---

**Built with ❤️ for bloggers who want to automate their content creation**

