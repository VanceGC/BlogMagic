import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { BlogConfig } from "../drizzle/schema";

interface GeneratedContent {
  title: string;
  content: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  featuredImagePrompt: string;
}

interface ContentGenerationParams {
  blogConfig: BlogConfig;
  userId: number;
  topic?: string;
}

/**
 * Generate SEO-optimized blog post content using AI
 */
export async function generateBlogPost(params: ContentGenerationParams): Promise<GeneratedContent> {
  const { blogConfig, userId, topic } = params;

  // Get user's API keys
  console.log(`[Content Generator] Generating blog post for user ${userId}`);
  const { getPreferredLLMKey, getUserApiKeys } = await import('./apiKeyHelper');
  const llmKey = await getPreferredLLMKey(userId);
  
  if (!llmKey) {
    const allKeys = await getUserApiKeys(userId);
    console.error(`[Content Generator] No LLM API key found for user ${userId}. Keys in DB:`, {
      hasOpenAI: !!allKeys.openai,
      hasAnthropic: !!allKeys.anthropic,
      hasStability: !!allKeys.stability
    });
    throw new Error('No API key configured. Please add your OpenAI or Anthropic API key in Settings.');
  }
  
  console.log(`[Content Generator] Using ${llmKey.provider} API key for content generation`);

  // Build context for AI
  const context = buildContentContext(blogConfig);

  // Generate blog post structure and content
  const prompt = topic 
    ? `Generate a comprehensive, SEO-optimized blog post about "${topic}" for the following business:\n\n${context}\n\nThe post should be professional, engaging, and optimized for search engines.`
    : `Generate a comprehensive, SEO-optimized blog post topic and content for the following business:\n\n${context}\n\nChoose a relevant topic that would attract the target audience and rank well in search engines.`;

  const response = await invokeLLM({
    apiKey: llmKey.apiKey,
    provider: llmKey.provider,
    messages: [
      {
        role: "system",
        content: `You are an expert content marketer and SEO specialist. Your task is to create high-quality, engaging blog posts that:
- Are optimized for search engines with proper keyword placement
- Provide genuine value to readers
- Match the specified tone and style
- Include compelling headlines and meta descriptions
- Are structured with proper headings (H2, H3) and paragraphs
- Are between 1500-2500 words for optimal SEO performance
- Include actionable insights and examples
- End with a clear call-to-action`
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "blog_post",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Compelling blog post title (60-70 characters)"
            },
            content: {
              type: "string",
              description: "Full blog post content in HTML format with proper headings and paragraphs"
            },
            excerpt: {
              type: "string",
              description: "Brief excerpt/summary (150-160 characters)"
            },
            seoTitle: {
              type: "string",
              description: "SEO-optimized title tag (50-60 characters)"
            },
            seoDescription: {
              type: "string",
              description: "SEO meta description (150-160 characters)"
            },
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "Array of 5-10 relevant SEO keywords"
            },
            featuredImagePrompt: {
              type: "string",
              description: "Detailed prompt for generating a relevant featured image"
            }
          },
          required: ["title", "content", "excerpt", "seoTitle", "seoDescription", "keywords", "featuredImagePrompt"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to generate content");
  }

  return JSON.parse(content);
}

/**
 * Generate featured image for blog post with AI-powered prompt analysis
 */
export async function generateFeaturedImage(
  blogTitle: string,
  blogContent: string,
  userId: number
): Promise<string> {
  // Get user's API keys
  const { getUserApiKeys, getPreferredLLMKey } = await import('./apiKeyHelper');
  const apiKeys = await getUserApiKeys(userId);
  const llmKeyResult = await getPreferredLLMKey(userId);
  if (!llmKeyResult) {
    throw new Error('No LLM API key configured. Please add an OpenAI or Anthropic API key in Settings.');
  }
  const { apiKey: llmApiKey, provider: llmProvider } = llmKeyResult;

  // Step 1: Use AI to analyze the blog post and create a professional image prompt
  console.log('[Featured Image] Step 1: Analyzing blog post with AI to create image prompt...');
  
  const analysisResponse = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are a professional blog editor tasked with creating featured images. Analyze the blog post and describe a professional, visually striking image that would make an excellent featured image. Focus on:
- Visual metaphors and symbolism relevant to the content
- Professional, modern aesthetic
- Clean, uncluttered composition
- NO text, captions, or words in the image
- Suitable for a business/professional blog

Provide only the image description, no additional commentary.`
      },
      {
        role: 'user',
        content: `Blog Title: ${blogTitle}\n\nBlog Content:\n${blogContent.substring(0, 2000)}...\n\nCreate a detailed visual description for the featured image:`
      }
    ],
    apiKey: llmApiKey,
    provider: llmProvider,
  });

  const imageDescription = analysisResponse.choices[0].message.content;
  console.log('[Featured Image] AI-generated image description:', imageDescription);

  // Step 2: Generate the image with Stability AI using the refined prompt
  console.log('[Featured Image] Step 2: Generating image with Stability AI...');
  
  const result = await generateImage({
    prompt: `Professional blog featured image, WordPress optimized: ${imageDescription}. High quality, modern, clean design. IMPORTANT: No text, no captions, no words, no letters in the image.`,
    apiKey: apiKeys.stability,
  });

  if (!result.url) {
    throw new Error("Failed to generate featured image");
  }

  console.log('[Featured Image] Image generated successfully:', result.url);
  return result.url;
}

/**
 * Build context string from blog configuration
 */
function buildContentContext(config: BlogConfig): string {
  const parts: string[] = [];

  if (config.businessDescription) {
    parts.push(`Business: ${config.businessDescription}`);
  }

  if (config.targetAudience) {
    parts.push(`Target Audience: ${config.targetAudience}`);
  }

  if (config.keywords) {
    parts.push(`Focus Keywords: ${config.keywords}`);
  }

  if (config.competitors) {
    parts.push(`Competitors: ${config.competitors}`);
  }

  parts.push(`Locale: ${config.locale}`);
  parts.push(`Tone: ${config.toneOfVoice}`);

  return parts.join('\n');
}

/**
 * Generate multiple topic ideas for future posts
 */
export async function generateTopicIdeas(blogConfig: BlogConfig, userId: number, count: number = 10): Promise<string[]> {
  // Get user's API keys
  console.log(`[Content Generator] Generating blog post for user ${userId}`);
  const { getPreferredLLMKey, getUserApiKeys } = await import('./apiKeyHelper');
  const llmKey = await getPreferredLLMKey(userId);
  
  if (!llmKey) {
    const allKeys = await getUserApiKeys(userId);
    console.error(`[Content Generator] No LLM API key found for user ${userId}. Keys in DB:`, {
      hasOpenAI: !!allKeys.openai,
      hasAnthropic: !!allKeys.anthropic,
      hasStability: !!allKeys.stability
    });
    throw new Error('No API key configured. Please add your OpenAI or Anthropic API key in Settings.');
  }
  
  console.log(`[Content Generator] Using ${llmKey.provider} API key for content generation`);

  const context = buildContentContext(blogConfig);

  const response = await invokeLLM({
    apiKey: llmKey.apiKey,
    provider: llmKey.provider,
    messages: [
      {
        role: "system",
        content: "You are an expert content strategist. Generate blog post topic ideas that are SEO-friendly, relevant to the business, and valuable to the target audience."
      },
      {
        role: "user",
        content: `Generate ${count} blog post topic ideas for:\n\n${context}\n\nTopics should be specific, actionable, and optimized for search intent.`
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
              items: { type: "string" },
              description: "Array of blog post topic ideas"
            }
          },
          required: ["topics"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to generate topics");
  }

  const parsed = JSON.parse(content);
  return parsed.topics;
}

