# SEO Features Deployment Guide

## Overview

This guide covers deploying the comprehensive SEO optimization system to your BlogMagic production server at blogmagic.app.

## What's New

The SEO optimization system includes:

1. **WordPress Site Scraper** - Builds internal link database
2. **Web Research Module** - Finds authoritative external sources
3. **SEO Analyzer** - Scores content 0-100 across multiple factors
4. **AI Optimizer** - Auto-improves content if score < 70
5. **Integrated Workflow** - All features work together seamlessly

## Deployment Steps

### Step 1: Create New Database Tables

SSH into your server and run these SQL commands:

```bash
ssh user@blogmagic.app
mysql -u blog_admin -prDp0H68sPRP9etLN blog_magic
```

Then execute:

```sql
-- Create site_pages table for internal linking
CREATE TABLE IF NOT EXISTS `site_pages` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `blogConfigId` INT NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `excerpt` TEXT,
  `content` TEXT,
  `keywords` TEXT,
  `scrapedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `site_pages_id` PRIMARY KEY(`id`),
  INDEX `idx_blog_config` (`blogConfigId`)
);

-- Create external_sources table for citations
CREATE TABLE IF NOT EXISTS `external_sources` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `postId` INT NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `domain` VARCHAR(255) NOT NULL,
  `citedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `external_sources_id` PRIMARY KEY(`id`),
  INDEX `idx_post` (`postId`)
);
```

Exit MySQL:
```sql
exit;
```

### Step 2: Deploy Code

```bash
cd /home/blogmagic.app/public_html
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Step 3: Verify Deployment

Check that the server is running:

```bash
docker-compose logs -f --tail=50
```

You should see:
```
[OAuth] Initialized with baseURL: https://api.manus.im
Server running on http://localhost:3000/
```

Visit https://blogmagic.app to confirm the site is live.

## How to Use SEO Features

### 1. Scrape Your WordPress Site

After creating or updating a blog configuration, scrape the site to build the internal link database:

**Via tRPC (in code):**
```typescript
await trpc.seo.scrapeSite.mutate({ blogConfigId: 1 });
```

**What it does:**
- Fetches all posts and pages from your WordPress site
- Extracts titles, excerpts, content, keywords
- Stores in `site_pages` table
- Enables intelligent internal linking suggestions

### 2. Generate SEO-Optimized Posts

When generating posts, enable SEO features:

**Via tRPC:**
```typescript
await trpc.posts.generate.mutate({
  blogConfigId: 1,
  topic: "Your Topic",
  generateImage: true,
  enableSEO: true,              // Enable SEO optimization pass
  enableResearch: false,         // Enable web research (requires search API)
  enableInternalLinks: true,     // Enable internal link suggestions
});
```

**What happens:**

1. **Initial Content Generation**
   - AI generates blog post with title, content, excerpt, keywords

2. **Internal Link Suggestions** (if `enableInternalLinks: true`)
   - Searches scraped site pages for relevant content
   - Adds "Related Articles" section with 5 relevant internal links
   - Improves site structure and SEO

3. **Web Research** (if `enableResearch: true`)
   - AI identifies what research is needed
   - Searches for authoritative sources (requires search API integration)
   - Generates natural citations
   - Adds reference list to content
   - Stores external sources in database

4. **SEO Optimization** (if `enableSEO: true`)
   - Analyzes keyword density (1-3% optimal)
   - Calculates Flesch Reading Ease score (60+ target)
   - Checks header structure (H1, H2, H3)
   - Validates meta descriptions (120-160 chars)
   - Counts internal/external links
   - Scores content 0-100
   - **Auto-improves content if score < 70**

### 3. Analyze SEO Score

You can analyze any content's SEO score:

**Via tRPC:**
```typescript
const analysis = await trpc.seo.analyzeSEO.mutate({
  title: "Your Title",
  content: "Your content...",
  excerpt: "Your excerpt",
  targetKeyword: "optional keyword",
});

console.log(`SEO Score: ${analysis.score}/100`);
console.log(`Keyword Density: ${analysis.keywordDensity.score}/100`);
console.log(`Readability: ${analysis.readability.fleschScore}`);
console.log(`Structure: ${analysis.structure.h2Count} H2 headers`);
```

### 4. View Scraped Pages

Check what pages were scraped from your WordPress site:

**Via tRPC:**
```typescript
const pages = await trpc.seo.getSitePages.query({ blogConfigId: 1 });
console.log(`Scraped ${pages.length} pages`);
```

## SEO Features Configuration

### Default Settings

The `posts.generate` endpoint has these defaults:

```typescript
{
  enableSEO: true,              // ✅ SEO optimization ON by default
  enableResearch: auto,          // ✅ Auto-enabled when GOOGLE_SEARCH_API_KEY is set
  enableInternalLinks: true,     // ✅ Internal links ON by default
}
```

**Web Research Auto-Enable:**
- If `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_CX` are set in `.env`, research is **automatically enabled**
- You can explicitly disable it by passing `enableResearch: false`
- You can explicitly enable it by passing `enableResearch: true` (will fail gracefully if no API key)

### Customizing SEO Behavior

You can customize the SEO optimization threshold in `server/contentGenerator.ts`:

```typescript
const { optimized, analysis } = await performSEOOptimization(
  generatedContent.title,
  generatedContent.content,
  generatedContent.excerpt,
  primaryKeyword,
  70, // ← Change this threshold (0-100)
  llmKey.apiKey,
  llmKey.provider
);
```

- **70** = Optimize if score < 70 (default, recommended)
- **80** = More aggressive optimization
- **60** = Less aggressive optimization

## Web Research Integration

The web research feature is **fully integrated** with Google Custom Search API and automatically enabled when credentials are present.

### Setup Google Custom Search API

1. **Get API Key:**
   - Go to https://developers.google.com/custom-search/v1/overview
   - Click "Get a Key"
   - Create or select a project
   - Copy your API key

2. **Create Custom Search Engine:**
   - Go to https://programmablesearchengine.google.com/
   - Click "Add" to create a new search engine
   - Under "Sites to search", enter `*` to search the entire web
   - Copy your Search Engine ID (CX)

3. **Add to `.env`:**
```bash
GOOGLE_SEARCH_API_KEY=your_api_key_here
GOOGLE_SEARCH_CX=your_search_engine_id_here
```

4. **Restart your server:**
```bash
docker-compose restart
```

**That's it!** Web research will now automatically run when generating posts.

### Alternative Search APIs

If you prefer not to use Google, you can modify `server/lib/webResearch.ts` to use:

**SerpAPI:**
- Get API key from https://serpapi.com/
- Install: `pnpm add serpapi`
- Modify the `searchWeb()` function

**Brave Search API:**
- Get API key from https://brave.com/search/api/
- Modify the `searchWeb()` function

**Bing Web Search API:**
- Get API key from Azure Cognitive Services
- Modify the `searchWeb()` function

## SEO Scoring System

The SEO analyzer scores content across 5 categories:

| Category | Weight | What It Checks |
|----------|--------|----------------|
| **Keyword Density** | 25% | 1-3% optimal range for primary keyword |
| **Readability** | 20% | Flesch Reading Ease score (60+ target) |
| **Structure** | 25% | H1, H2, H3 headers, proper hierarchy |
| **Meta Description** | 15% | 120-160 characters, includes keyword |
| **Links** | 15% | 2-5 internal links, 1-3 external links |

**Overall Score:**
- **90-100**: Excellent SEO
- **70-89**: Good SEO
- **50-69**: Needs improvement
- **0-49**: Poor SEO

Content scoring **below 70** is automatically improved by AI.

## Monitoring SEO Performance

### Check SEO Scores

Query posts with SEO scores:

```typescript
const posts = await trpc.posts.list.query({ blogConfigId: 1 });
posts.forEach(post => {
  console.log(`${post.title}: SEO Score ${post.seoScore || 'N/A'}`);
});
```

### View External Sources

Check what sources were cited:

```typescript
const sources = await db.getExternalSourcesByPostId(postId);
console.log(`Cited ${sources.length} external sources`);
```

### View Internal Links

Check scraped pages:

```typescript
const pages = await db.getSitePagesByBlogConfigId(blogConfigId);
console.log(`${pages.length} pages available for internal linking`);
```

## Troubleshooting

### Issue: No internal links suggested

**Solution:** Scrape your WordPress site first:
```typescript
await trpc.seo.scrapeSite.mutate({ blogConfigId: 1 });
```

### Issue: Web research not working

**Reason:** Web search API not integrated (it's a framework)

**Solution:** Integrate Google Custom Search, SerpAPI, or Brave Search API (see above)

### Issue: SEO score always 100

**Reason:** Content is already excellent, or threshold is too low

**Solution:** Lower the threshold in `server/contentGenerator.ts` to see optimization in action

### Issue: Content generation slow

**Reason:** SEO features add processing time

**Solution:** Disable features you don't need:
```typescript
{
  enableSEO: false,           // Skip SEO optimization
  enableResearch: false,       // Skip web research
  enableInternalLinks: false,  // Skip internal links
}
```

## Performance Considerations

### Processing Time

With all features enabled:
- **Base content generation**: ~10-20 seconds
- **+ Internal links**: +2-5 seconds
- **+ Web research**: +10-30 seconds (if API integrated)
- **+ SEO optimization**: +5-15 seconds (if score < 70)

**Total**: 15-70 seconds depending on features

### Optimization Tips

1. **Scrape sites once** - Run `seo.scrapeSite` only when site content changes
2. **Disable research** - Keep `enableResearch: false` unless you need citations
3. **Adjust threshold** - Increase SEO threshold to 80 to reduce optimization frequency
4. **Cache results** - Store SEO scores in database to avoid re-analysis

## Next Steps

1. ✅ Deploy code to production
2. ✅ Create database tables
3. ✅ Scrape your WordPress sites
4. ✅ Generate posts with SEO features
5. ⏳ (Optional) Integrate web search API for research
6. ⏳ Monitor SEO scores and iterate

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review code: `server/lib/seoOptimizer.ts`, `server/lib/wordpressScraper.ts`, `server/lib/webResearch.ts`
- Test locally: `pnpm run dev`

## Summary

The SEO optimization system is **production-ready** and will significantly improve your blog post quality:

- ✅ **Automatic SEO scoring** - Know exactly how good your content is
- ✅ **AI-powered improvements** - Content automatically optimized if needed
- ✅ **Internal linking** - Boost site structure and SEO
- ✅ **External citations** - Add credibility (when search API integrated)
- ✅ **Comprehensive analysis** - Keyword density, readability, structure, meta, links

**All features are optional** - Use what you need, disable what you don't.

Happy blogging! 🚀

