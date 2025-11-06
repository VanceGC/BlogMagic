import { invokeLLM } from "./_core/llm";
import { callDataApi } from "./_core/dataApi";
import { BlogConfig } from "../drizzle/schema";

interface TrendingTopic {
  title: string;
  reason: string;
  searchVolume: string;
  source: string;
  keywords: string[];
}

/**
 * Discover trending topics based on blog config using multiple sources
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

  // Collect trending data from multiple sources
  const trendingData: any[] = [];

  try {
    // 1. Search YouTube for trending videos in the niche
    if (keywords) {
      const youtubeResults = await callDataApi("Youtube/search", {
        query: {
          q: keywords,
          hl: "en",
          gl: "US",
        },
      }) as any;

      if (youtubeResults?.contents) {
        const topVideos = youtubeResults.contents
          .filter((c: any) => c.type === "video")
          .slice(0, 10)
          .map((c: any) => ({
            title: c.video?.title || "",
            views: c.video?.viewCountText || "",
            published: c.video?.publishedTimeText || "",
            channel: c.video?.channelTitle || "",
            source: "YouTube",
          }));
        trendingData.push(...topVideos);
      }
    }

    // 2. Search Reddit for hot discussions
    if (keywords) {
      // Try to find relevant subreddit based on keywords
      // For now, we'll search general subreddits
      const subreddits = ["entrepreneur", "business", "marketing", "technology"];
      
      for (const subreddit of subreddits.slice(0, 2)) {
        try {
          const redditResults = await callDataApi("Reddit/get_hot_posts", {
            query: {
              subreddit,
              limit: "10",
            },
          }) as any;

          if (redditResults?.posts) {
            const hotPosts = redditResults.posts
              .filter((p: any) => {
                const title = p.data?.title?.toLowerCase() || "";
                const keywordList = keywords.toLowerCase().split(",").map((k) => k.trim());
                return keywordList.some((k) => title.includes(k));
              })
              .slice(0, 5)
              .map((p: any) => ({
                title: p.data?.title || "",
                score: p.data?.score || 0,
                comments: p.data?.num_comments || 0,
                subreddit: p.data?.subreddit || "",
                source: "Reddit",
              }));
            trendingData.push(...hotPosts);
          }
        } catch (error) {
          console.error(`Failed to fetch from r/${subreddit}:`, error);
        }
      }
    }

    // 3. Analyze competitor content if provided
    if (competitors) {
      // Parse competitor URLs/channels
      const competitorList = competitors.split(",").map((c) => c.trim());
      
      for (const competitor of competitorList.slice(0, 2)) {
        try {
          // Try to extract YouTube channel if it's a YouTube URL
          if (competitor.includes("youtube.com") || competitor.includes("youtu.be")) {
            const channelVideos = await callDataApi("Youtube/get_channel_videos", {
              query: {
                id: competitor,
                filter: "videos_latest",
                hl: "en",
                gl: "US",
              },
            }) as any;

            if (channelVideos?.contents) {
              const competitorVideos = channelVideos.contents
                .filter((c: any) => c.type === "video")
                .slice(0, 5)
                .map((c: any) => ({
                  title: c.video?.title || "",
                  views: c.video?.stats?.views || 0,
                  published: c.video?.publishedTimeText || "",
                  source: `Competitor: ${competitor}`,
                }));
              trendingData.push(...competitorVideos);
            }
          }
        } catch (error) {
          console.error(`Failed to fetch competitor data for ${competitor}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching trending data:", error);
  }

  // If we didn't get any trending data, return empty array
  if (trendingData.length === 0) {
    console.log("[TrendingTopics] No trending data found, will use AI to generate topics");
    return [];
  }
  
  console.log('[TrendingTopics] Found', trendingData.length, 'trending items');

  // Use AI to analyze trending data and generate blog topics
  const trendingDataSummary = trendingData
    .map((item, idx) => `${idx + 1}. ${item.title} (${item.source})`)
    .join("\n");

  const prompt = `Analyze these trending topics and generate blog post ideas for this business:

Business: ${blogConfig.siteName}
Description: ${businessDesc}
Keywords: ${keywords}
Target Audience: ${blogConfig.targetAudience || "General audience"}

TRENDING CONTENT:
${trendingDataSummary}

Generate 10 blog post topic ideas that:
1. Leverage current trends from the data above
2. Are relevant to the business and target audience
3. Have viral potential and high engagement likelihood
4. Address timely, trending angles
5. Combine trending topics with the business's unique perspective
6. Are optimized for search and social sharing

For each topic, explain why it's trending and what makes it compelling.`;

  // Get user's API keys if userId provided
  let apiKey: string | undefined;
  let provider: 'openai' | 'anthropic' | undefined;
  
  if (userId) {
    const { getPreferredLLMKey } = await import('./apiKeyHelper');
    const llmKey = await getPreferredLLMKey(userId);
    if (llmKey) {
      apiKey = llmKey.apiKey;
      provider = llmKey.provider;
    }
  }
  
  const response = await invokeLLM({
    apiKey,
    provider,
    messages: [
      {
        role: "system",
        content: `You are a content strategist specializing in viral, trending content. Your goal is to identify high-potential blog topics that combine current trends with business relevance.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "trending_topics",
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
export async function selectTrendingTopic(blogConfig: BlogConfig, userId?: number): Promise<string | null> {
  const trendingTopics = await discoverTrendingTopics(blogConfig, userId);

  if (trendingTopics.length === 0) {
    return null;
  }

  // Prioritize high search volume topics
  const highVolume = trendingTopics.filter((t) => t.searchVolume === "high");
  const mediumVolume = trendingTopics.filter((t) => t.searchVolume === "medium");

  // Select from high volume first, then medium
  const priorityTopics = highVolume.length > 0 ? highVolume : mediumVolume;

  if (priorityTopics.length === 0) {
    return trendingTopics[0].title;
  }

  // Return random topic from priority list for variety
  const randomIndex = Math.floor(Math.random() * priorityTopics.length);
  return priorityTopics[randomIndex].title;
}

/**
 * Get trending topic suggestions for user review
 */
export async function getTrendingSuggestions(
  blogConfig: BlogConfig,
  userId?: number
): Promise<TrendingTopic[]> {
  return await discoverTrendingTopics(blogConfig, userId);
}

