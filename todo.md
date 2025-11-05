# Project TODO

- [x] Fix content generation to use user API keys from database instead of environment variables
- [x] Update generateBlogPost to fetch and decrypt user's OpenAI/Anthropic keys
- [x] Update generateFeaturedImage to fetch and decrypt user's Stability AI key
- [x] Test post generation with user-provided API keys



- [x] Debug API key retrieval - verify keys are being fetched from database
- [x] Improve error message to show which user and what keys were found
- [x] Add console logging to trace API key fetching process



- [x] Fix trending topics to work without BUILT_IN_FORGE_API_URL
- [x] Make topic selection fall back to simple AI generation when trending data unavailable
- [x] Remove hard dependency on Manus built-in APIs for topic discovery



## Critical Issues to Fix

- [x] Remove "thinking" parameter from LLM invoke calls (causing 400 error)
- [x] Add blog selection dropdown to dashboard for multi-blog support
- [x] Fix VITE_APP_TITLE to show "BlogMagic" instead of "%VITE_APP_TITLE%"
- [x] Fix all undefined VITE variables in production build
- [x] Verify post generation works end-to-end with user API keys



## URGENT: max_tokens Error

- [x] Fix max_tokens from 32768 to 16384 (OpenAI model limit)
- [x] Use model-specific token limits (GPT-4o: 16384, Claude: 8192)



## Stability AI Image Generation Fix

- [x] Fix Stability AI API to use multipart/form-data instead of JSON
- [x] Update generateWithStabilityAI function to use FormData



## Image Storage Fix (MySQL Database)

- [x] Add images table to database schema (id, data as BLOB, mimeType, createdAt)
- [x] Create database functions to save and retrieve images
- [x] Update generateWithStabilityAI to save images to database
- [x] Add API endpoint to serve images from database (/api/images/:id)
- [x] Update posts to reference image IDs instead of URLs (posts already store URLs as text, now stores /api/images/:id)



## Database Migration Error Fix

- [x] Change images.data column from binary(16777215) to LONGTEXT
- [x] MySQL error: "Column length too big for column 'data' (max = 255); use BLOB or TEXT instead"



## Drizzle-Kit Migration Bug

- [ ] drizzle-kit still generating `binary(16777215)` even though schema uses `text()`
- [ ] Create manual SQL migration to bypass drizzle-kit bug
- [ ] Create images table directly in MySQL database



## Improved Featured Image Generation

- [x] Add AI analysis step: read blog post and generate professional image prompt
- [x] Use OpenAI/Anthropic to analyze post content and create detailed visual description
- [x] Update Stability AI to use WordPress featured image size (16:9 aspect ratio for 1200x628)
- [x] Add explicit instructions to prevent text/captions in generated images (negative prompt)
- [x] Default to OpenAI if both API keys are available (implemented in getPreferredLLMKey)



## Comprehensive SEO Optimization System

### Phase 1: Site Scraping & Internal Link Database
- [x] Create `site_pages` table (id, blogConfigId, url, title, excerpt, content, keywords, scrapedAt)
- [x] Implement WordPress site scraper function
- [x] Trigger scraping when blog config is created/updated
- [x] Store page metadata for internal linking suggestions

### Phase 2: Web Research & External Citations
- [x] Integrate search tool to research topics during content generation
- [x] Create `external_sources` table (id, postId, url, title, domain, citedAt)
- [x] Have AI identify research needs and query web
- [x] Extract and store authoritative sources
- [x] Add citations naturally within content

### Phase 3: AI-Powered SEO Review
- [x] Implement SEO analysis function (keyword density, readability, structure)
- [x] Add AI review pass after initial draft
- [x] Check: keyword optimization, Flesch reading ease, meta description
- [x] Verify: header hierarchy (H2/H3), internal/external link balance
- [x] AI suggests improvements and regenerates if needed

### Phase 4: Integration
- [x] Update generateBlogPost to include research step
- [x] Add internal link suggestions based on scraped site data
- [x] Insert external citations from research
- [x] Run SEO optimization pass before finalizing
- [x] Log SEO scores for tracking improvements




## Google Custom Search API Integration

- [x] Integrate Google Custom Search API into webResearch.ts
- [x] Auto-detect GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX environment variables
- [x] Change enableResearch default to true when credentials are present
- [ ] Test Google Search integration
- [x] Update deployment documentation




## WordPress Featured Image Upload Fix

- [x] Investigate WordPress publisher code to find why featured images aren't uploading
- [x] Implement proper featured image upload to WordPress media library (save Stability AI images to S3)
- [x] Set uploaded image as featured image on post (already implemented)
- [x] Add comprehensive error logging for debugging
- [ ] Test featured image upload end-to-end
- [ ] Deploy fix to production




## Local File Storage for Images (Replace S3)

- [x] Create local storage module with directory structure: {userEmail}/{blogConfigName}/images/
- [x] Update image generation to save to local filesystem instead of S3
- [x] Add static file serving endpoint to serve images from local storage
- [x] Update WordPress publisher to convert relative URLs to absolute URLs
- [x] Ensure proper file permissions and security (handled by Express static middleware)
- [ ] Test end-to-end image generation and WordPress upload
- [ ] Deploy to production




## Fix "Generate Featured Image" Button

- [x] Debug why generateImage procedure shows "User or blog config not found"
- [x] Fix user/blog config lookup in generateFeaturedImage function (added getUserById)
- [x] Ensure blog config is properly passed to the function
- [ ] Test "Generate Featured Image" button on Edit Post page
- [ ] Deploy fix to production




## WordPress Featured Image Upload - Final Fix

- [x] Check if featuredImageUrl is being passed to WordPress publisher (confirmed - line 627)
- [x] Verify image URL is accessible from WordPress server (issue found - wrong base URL)
- [x] Add comprehensive logging to track image upload process (already added)
- [x] Implement filesystem read instead of HTTP download (foolproof solution)
- [x] Handle both local (/uploads/) and external URLs
- [ ] Test end-to-end featured image upload
- [ ] Deploy foolproof solution

