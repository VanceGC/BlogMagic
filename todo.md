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

