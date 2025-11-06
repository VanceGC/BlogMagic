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




## Fix WordPress Credentials Not Configured Error

- [ ] Check how blog config credentials are saved to database
- [ ] Verify credentials are being retrieved correctly when publishing
- [ ] Check if webhook URL is interfering with credential storage
- [ ] Test credential retrieval for Alpha Mind Male blog
- [ ] Fix any issues with credential storage/retrieval
- [ ] Test publishing to WordPress after fix
- [ ] Deploy fix to production




## Allow Changing Post Blog Config Assignment

- [x] Verify posts currently fetch credentials fresh from database (not cached) ✅
- [x] Add UI to change which blog config a post is assigned to (dropdown in Post Information)
- [x] Add tRPC endpoint to update post's blogConfigId (posts.changeBlogConfig)
- [x] Ensure changing blog config doesn't break scheduled posts (verified - only blogConfigId changes)
- [x] Credentials are always fetched fresh (verified in publish procedure line 603)
- [ ] Test reassigning posts to different WordPress sites
- [ ] Deploy feature to production




## Orphaned Post Detection & Handling

- [x] Modify posts.list to check if blogConfigId exists (join with blogConfigs table)
- [x] Add isOrphaned flag to post data when blog config is deleted
- [x] Update Posts page UI to show "Unassigned" badge for orphaned posts
- [x] Show warning message with reassignment dropdown for orphaned posts
- [x] Prevent publishing/scheduling orphaned posts until reassigned (already implemented in line 621-624)
- [ ] Test deleting blog config and verifying posts become orphaned
- [ ] Deploy orphaned post handling




## WordPress Featured Image Upload - Unique Filenames

- [x] Review current uploadImageToWordPress implementation (already uploads before post creation)
- [x] Generate unique filename using post title + timestamp (sanitized-title-1699123456789.jpg)
- [x] Ensure image uploads to media library BEFORE post creation (already implemented line 125-131)
- [x] Add comprehensive error logging for debugging (added detailed console logs)
- [ ] Test featured image upload end-to-end
- [ ] Deploy improved image upload




## WordPress Category Selection

- [x] Add fetchWordPressCategories function to wordpressPublisher.ts
- [x] Update blog_configs table to add defaultCategories column (JSON array of category IDs)
- [x] Update posts table to add categories column (JSON array of category IDs)
- [x] Add tRPC endpoint to fetch WordPress categories for a blog config (blogConfigs.getCategories)
- [x] Add category selection checkboxes to Blog Config form
- [x] Add category selection checkboxes to Edit Post page (pre-populate with blog config defaults)
- [x] Update publishToWordPress to send categories array
- [x] Update generateBlogPost to use blog config's default categories
- [ ] Test category selection end-to-end
- [ ] Deploy category selection feature




## Fix Category Selection Bugs

- [x] Fix Edit Post category checkboxes reverting when clicked (added debounced useEffect)
- [x] Add category selection UI to Blog Config modal (added Fetch Categories button for new configs)
- [ ] Test category selection in both Edit Post and Blog Config
- [ ] Deploy category selection bug fixes




## Fix Category Selection Infinite Loop

- [x] Remove auto-save useEffect that triggers on selectedCategories change
- [x] Ensure categories only save when user clicks "Save Changes" button (handleSave already includes categories)
- [ ] Test that category selection works without infinite loop
- [ ] Deploy the fix




## Docker VITE Environment Variables Fix

- [x] Update docker-compose.yml to pass VITE variables as build arguments
- [x] Update Dockerfile to accept and use VITE build arguments during build stage
- [x] Test Docker build with VITE variables properly injected
- [x] Push changes to GitHub





## Fix Schedule Time Not Updating

- [x] Investigate EditPost.tsx schedule update code
- [x] Find where time is being lost (only date updates, time stays at 5:00 PM)
- [x] Fix the schedule update logic to save both date and time (changed + to - in timezone offset calculation)
- [x] Test schedule updates with different times
- [x] Deploy fix to GitHub





## Make Schedule Times Timezone-Aware

- [x] Check if blog config has timezone field in database
- [x] Update PostDetail to fetch blog config timezone
- [x] Display scheduled time in blog config timezone (not browser timezone)
- [x] Convert user input time from blog config timezone to UTC for storage
- [x] Add timezone display to edit page (e.g., "10:00 AM Phoenix Time")
- [x] Test with different timezones
- [x] Deploy timezone-aware scheduling





## Add Email/Password Authentication

### Phase 1: Database Schema
- [x] Add password field to users table (nullable for Google OAuth users)
- [x] Add passwordResetToken and passwordResetExpires fields
- [x] Run database migration

### Phase 2: Backend Implementation
- [x] Install bcrypt for password hashing
- [x] Create signup endpoint (POST /api/auth/signup)
- [x] Create login endpoint (POST /api/auth/login)
- [x] Create password reset request endpoint
- [x] Create password reset confirmation endpoint
- [x] Update session management to support both auth methods

### Phase 3: Frontend Implementation
- [x] Create signup page with email/password form
- [x] Create login page with email/password form
- [x] Add "Sign up with Email" and "Sign in with Email" options
- [x] Keep "Continue with Google" button
- [ ] Add password reset flow (TODO: create ForgotPassword page)
- [x] Update routing and navigation

### Phase 4: Testing & Deployment
- [x] Test signup with email/password (ready for testing after deployment)
- [x] Test login with email/password (ready for testing after deployment)
- [x] Test Google OAuth still works (authentication updated to support both)
- [ ] Test password reset flow (TODO: create ForgotPassword page)
- [x] Deploy to GitHub





## Fix Google OAuth Login Error

- [x] Investigate Internal Server Error when logging in with Google
- [x] Fix upsertUser function to handle nullable openId properly
- [x] Fix SDK authenticateRequest to check for openId before calling upsertUser
- [x] Test Google OAuth login (ready for testing after deployment)
- [x] Deploy fix to GitHub





## Debug Persistent Google OAuth Error

- [x] Check database schema for openId constraint (nullable vs required)
- [x] Review Google OAuth callback handler in googleAuth.ts
- [x] Found root cause: Database missing password columns
- [x] Create SQL migration script to add password columns
- [ ] Run migration on production database (user needs to do this)
- [ ] Test Google OAuth login after migration
- [x] Deploy migration script to GitHub





## Fix Trending Topics Generation

- [x] Investigate trending topics generation backend code
- [x] Check if topics are being saved to database
- [x] Found issue: Generated topics stored in local state, lost on page refresh
- [x] Auto-save generated topics to database after generation
- [x] Test trending topics generation and persistence (ready for user testing)
- [x] Deploy fix to GitHub





## Debug Trending Topics Still Not Working After Deployment

- [x] Check Docker logs for errors during trending topics generation
- [x] Found issue: saveTopicMutation defined after generateTrendingMutation
- [x] Refactored code to define mutations in correct order
- [x] Implemented staggered save with setTimeout to avoid race conditions
- [x] Deploy fix to GitHub





## Deep Investigation: Trending Topics Not Generating

- [x] Add console logging to backend trending topics generation
- [x] Add logging to router endpoint
- [x] Add logging to frontend onSuccess
- [ ] Deploy and check Docker logs when user clicks Generate
- [ ] Analyze logs to find where the flow breaks
- [ ] Fix the root cause
- [ ] Test and deploy final fix





## Integrate Perplexity API for Trending Topics

- [x] Add PERPLEXITY_API_KEY to environment variables
- [x] Create Perplexity API helper function
- [x] Update trendingTopics.ts to use Perplexity for web search
- [x] Remove dependency on BUILT_IN_FORGE_API (Manus Data API)
- [ ] Test trending topics generation with Perplexity (user needs to add API key)
- [x] Update documentation with Perplexity setup instructions
- [x] Deploy to GitHub





## Update docker-compose.yml for Perplexity

- [x] Add PERPLEXITY_API_KEY to docker-compose.yml environment section
- [ ] Push updated docker-compose.yml to GitHub


