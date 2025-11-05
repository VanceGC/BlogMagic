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

