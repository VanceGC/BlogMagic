import { invokeLLM } from "./_core/llm";
import { searchTrendingTopics } from "./_core/perplexity";
import { BlogConfig } from "../drizzle/schema";
import { getPreferredLLMKey } from "./apiKeyHelper";

interface TrendingTopic {
  title: string;
  reason: string;
  searchVolume: string;
  source: string;
  keywords: string[];
}

/**
 * Discover trending topics based on blog config using Perplexity web search
 */
export async function discoverTrendingTopics(
  blogConfig: BlogConfig,
  userId?: number
): Promise<TrendingTopic[]> {
  console.log('[TrendingTopics] Starting discoverTrendingTopics for:', blogConfig.siteName);
  const keywords = blogConfig.keywords || "";
  const businessDesc = blogConfig.businessDescription || "";
  const competitors = blogConfig.competitors || "";
  console.log('[TrendingTopics] Keywords:', keywords);
  console.log('[TrendingTopics] Business:', businessDesc);

  // Build search query for Perplexity
  let searchQuery = `Find the top 10 trending topics, viral content, and popular discussions related to: ${keywords || businessDesc}.`;
  
  if (competitors) {
    searchQuery += ` Also analyze what these competitors are talking about: ${competitors}.`;
  }
  
  searchQuery += ` Focus on recent trends from the past week. Include topics from YouTube, Reddit, Twitter/X, and industry news. For each topic, provide the title, why it's trending, and estimated search interest.`;

  console.log('[TrendingTopics] Searching with Perplexity:', searchQuery);

  let trendingContent = "";
  
  try {
    // Use Perplexity to search the web for trending topics
    trendingContent = await searchTrendingTopics(searchQuery);
    console.log('[TrendingTopics] Perplexity response length:', trendingContent.length);
  } catch (error) {
    console.error("Error fetching trending data from Perplexity:", error);
    // If Perplexity fails, we'll still try to generate topics using AI
  }

  // If we didn't get any trending data, return empty array
  if (!trendingContent || trendingContent.length === 0) {
    console.log("[TrendingTopics] No trending data found, will use AI to generate topics");
    return [];
  }
  
  console.log('[TrendingTopics] Got trending content from Perplexity');

  // Get user's API key
  if (!userId) {
    throw new Error("User ID is required for trending topics generation");
  }
  
  const llmKey = await getPreferredLLMKey(userId);
  if (!llmKey) {
    throw new Error("No LLM API key configured. Please add an OpenAI or Anthropic API key in Settings.");
  }
  
  console.log(`[TrendingTopics] Using ${llmKey.provider} API key`);

  // Use AI to analyze trending data and generate blog topics
  const prompt = `Based on the following trending information, generate 10 compelling blog post topic ideas for a business in this niche:

Business: ${businessDesc}
Keywords: ${keywords}
Target Audience: ${blogConfig.targetAudience || "general audience"}
Tone: ${blogConfig.toneOfVoice || "professional"}

Trending Information:
${trendingContent}

For each topic, provide:
1. A compelling, SEO-friendly blog post title
2. Why this topic is trending and has viral potential
3. Estimated search volume (high/medium/low)
4. Primary keywords for this topic
5. Which trending source inspired this topic

Focus on topics that:
- Are currently trending and have high engagement
- Align with the business description and keywords
- Have potential for viral reach and SEO value
- Are actionable and provide value to readers`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an expert content strategist and SEO specialist. You analyze trending data to identify viral blog post opportunities.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    apiKey: llmKey.apiKey,
    provider: llmKey.provider,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "trending_topics_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            topics: {
              type: "array",
              description: "Array of trending blog post topic ideas",
              items: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Compelling, SEO-friendly blog post title",
                  },
                  reason: {
                    type: "string",
                    description: "Why this topic is trending and has viral potential",
                  },
                  searchVolume: {
                    type: "string",
                    description: "Estimated search interest (high/medium/low)",
                  },
                  keywords: {
                    type: "array",
                    description: "Primary keywords for this trending topic",
                    items: {
                      type: "string",
                    },
                  },
                  source: {
                    type: "string",
                    description: "Which trending source inspired this topic",
                  },
                },
                required: ["title", "reason", "searchVolume", "keywords", "source"],
                additionalProperties: false,
              },
            },
          },
          required: ["topics"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const contentString = typeof content === 'string' ? content : JSON.stringify(content);
  const result = JSON.parse(contentString || "{}");
  const topics = result.topics || [];
  console.log('[TrendingTopics] Generated', topics.length, 'topics from AI');
  return topics;
}

/**
 * Select a trending topic for the next blog post
 */
export async function getTrendingSuggestions(
  blogConfig: BlogConfig
): Promise<TrendingTopic[]> {
  return await discoverTrendingTopics(blogConfig);
}

