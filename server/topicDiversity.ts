import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { BlogConfig } from "../drizzle/schema";

/**
 * Generate diverse topic ideas based on blog config and previous posts
 */
export async function generateDiverseTopics(
  blogConfig: BlogConfig,
  userId: number,
  count: number = 10
): Promise<string[]> {
  // Get existing posts to avoid topic repetition
  const existingPosts = await db.getPostsByBlogConfigId(blogConfig.id, userId);
  const existingTitles = existingPosts.map((p) => p.title);
  const existingTopics = existingTitles.join("\n- ");

  // Build context
  const businessInfo = `
Business: ${blogConfig.siteName}
Description: ${blogConfig.businessDescription || "Not provided"}
Target Audience: ${blogConfig.targetAudience || "General audience"}
Keywords: ${blogConfig.keywords || "Not specified"}
Competitors: ${blogConfig.competitors || "Not specified"}
Locale: ${blogConfig.locale}
Tone: ${blogConfig.toneOfVoice}
  `.trim();

  const prompt = `Generate ${count} diverse, unique blog post topic ideas for this business:

${businessInfo}

${existingTitles.length > 0 ? `IMPORTANT: Avoid these existing topics:\n- ${existingTopics}\n` : ""}

Requirements:
- Each topic should be COMPLETELY DIFFERENT from existing posts
- Cover various aspects of the business/industry
- Appeal to different audience segments
- Range from beginner to advanced content
- Include how-to guides, listicles, case studies, and thought leadership
- Be SEO-friendly and search-intent focused
- Address different pain points and interests
- Ensure NO repetition or similar angles to existing posts

Generate topics that would form a well-rounded content calendar with maximum variety.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a content strategist specializing in creating diverse, engaging blog content calendars. Your goal is to generate a wide variety of unique topics that avoid repetition while staying relevant to the business and audience.`
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "topic_ideas",
        strict: true,
        schema: {
          type: "object",
          properties: {
            topics: {
              type: "array",
              description: "Array of diverse blog post topic ideas",
              items: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Compelling topic/title for the blog post"
                  },
                  angle: {
                    type: "string",
                    description: "Unique angle or approach for this topic"
                  },
                  category: {
                    type: "string",
                    description: "Content category (how-to, listicle, guide, case-study, opinion, etc.)"
                  },
                  targetAudience: {
                    type: "string",
                    description: "Specific audience segment this appeals to"
                  },
                  keywords: {
                    type: "array",
                    description: "Primary keywords for this topic",
                    items: {
                      type: "string"
                    }
                  }
                },
                required: ["title", "angle", "category", "targetAudience", "keywords"],
                additionalProperties: false
              }
            }
          },
          required: ["topics"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  const contentString = typeof content === 'string' ? content : JSON.stringify(content);
  const result = JSON.parse(contentString || "{}");
  return result.topics?.map((t: any) => t.title) || [];
}

/**
 * Select next topic ensuring maximum diversity and trending relevance
 */
export async function selectNextTopic(
  blogConfig: BlogConfig,
  userId: number,
  useTrending: boolean = true
): Promise<string> {
  // Try to get a trending topic first (50% of the time)
  if (useTrending && Math.random() > 0.5) {
    try {
      const { selectTrendingTopic } = await import("./trendingTopics");
      const trendingTopic = await selectTrendingTopic(blogConfig);
      if (trendingTopic) {
        console.log("Selected trending topic:", trendingTopic);
        return trendingTopic;
      }
    } catch (error) {
      console.error("Failed to get trending topic:", error);
      // Fall back to diverse topics
    }
  }

  // Generate a batch of diverse topics
  const topics = await generateDiverseTopics(blogConfig, userId, 5);
  
  if (topics.length === 0) {
    throw new Error("Failed to generate topic ideas");
  }

  // Get recent posts to check similarity
  const recentPosts = await db.getPostsByBlogConfigId(blogConfig.id, userId);
  const recentTitles = recentPosts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map((p) => p.title.toLowerCase());

  // Find the most different topic
  for (const topic of topics) {
    const topicLower = topic.toLowerCase();
    const isSimilar = recentTitles.some((title) => {
      // Check for word overlap
      const topicWords = new Set(topicLower.split(/\s+/).filter((w) => w.length > 3));
      const titleWords = new Set(title.split(/\s+/).filter((w) => w.length > 3));
      const overlap = Array.from(topicWords).filter((w) => titleWords.has(w)).length;
      return overlap > 2; // Too similar if more than 2 words overlap
    });

    if (!isSimilar) {
      return topic;
    }
  }

  // If all topics are similar (unlikely), return the first one
  return topics[0];
}

/**
 * Analyze content diversity metrics
 */
export async function analyzeContentDiversity(
  blogConfigId: number,
  userId: number
): Promise<{
  totalPosts: number;
  uniqueTopics: number;
  diversityScore: number;
  recommendations: string[];
}> {
  const posts = await db.getPostsByBlogConfigId(blogConfigId, userId);
  
  if (posts.length === 0) {
    return {
      totalPosts: 0,
      uniqueTopics: 0,
      diversityScore: 100,
      recommendations: ["Start creating content to build your blog"]
    };
  }

  // Simple diversity analysis based on title word overlap
  const titles = posts.map((p) => p.title.toLowerCase());
  const allWords = titles.flatMap((t) => t.split(/\s+/).filter((w) => w.length > 3));
  const uniqueWords = new Set(allWords);
  
  const diversityScore = Math.min(100, (uniqueWords.size / allWords.length) * 100);
  
  const recommendations: string[] = [];
  if (diversityScore < 50) {
    recommendations.push("Consider covering more diverse topics");
    recommendations.push("Explore different content formats (how-to, listicles, case studies)");
  }
  if (posts.length > 5 && uniqueWords.size < posts.length * 5) {
    recommendations.push("Try addressing different audience pain points");
  }

  return {
    totalPosts: posts.length,
    uniqueTopics: uniqueWords.size,
    diversityScore: Math.round(diversityScore),
    recommendations
  };
}

