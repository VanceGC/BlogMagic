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

