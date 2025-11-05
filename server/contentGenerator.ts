import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { BlogConfig } from "../drizzle/schema";
import { performSEOOptimization } from "./lib/seoOptimizer";
import { getRelevantInternalLinks } from "./lib/wordpressScraper";
import { researchTopic, generateCitations, formatReferenceList, saveExternalSources } from "./lib/webResearch";

interface GeneratedContent {
  title: string;
  content: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  featuredImagePrompt: string;
  seoScore?: number;
  internalLinks?: Array<{ url: string; title: string; excerpt: string }>;
  externalSources?: Array<{ url: string; title: string; domain: string }>;
}

interface ContentGenerationParams {
  blogConfig: BlogConfig;
  userId: number;
  topic?: string;
  enableSEO?: boolean; // Enable SEO optimization pass
  enableResearch?: boolean; // Enable web research for citations
  enableInternalLinks?: boolean; // Enable internal link suggestions
  postId?: number; // For saving external sources
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

  let generatedContent: GeneratedContent = JSON.parse(content);
  
  // Step 2: Web Research (if enabled)
  let externalSources: Array<{ url: string; title: string; domain: string; snippet: string; relevance: number }> = [];
  if (params.enableResearch) {
    console.log('[Content Generator] Performing web research for external citations...');
    try {
      // Create a simple outline from the content for research
      const outline = `${generatedContent.title}\n\n${generatedContent.excerpt}`;
      externalSources = await researchTopic(
        generatedContent.title,
        outline,
        llmKey.apiKey,
        llmKey.provider
      );
      
      if (externalSources.length > 0) {
        console.log(`[Content Generator] Found ${externalSources.length} external sources`);
        
        // Generate citations and add to content
        const citations = await generateCitations(externalSources, llmKey.apiKey, llmKey.provider);
        if (citations.length > 0) {
          // Insert citations naturally into content
          generatedContent.content += '\n\n' + citations.join('\n\n');
        }
        
        // Add reference list at the end
        const referenceList = formatReferenceList(externalSources);
        generatedContent.content += referenceList;
        
        // Save external sources to database if postId provided
        if (params.postId) {
          await saveExternalSources(params.postId, externalSources);
        }
      }
    } catch (error) {
      console.error('[Content Generator] Web research failed:', error);
      // Continue without research if it fails
    }
  }
  
  // Step 3: Internal Link Suggestions (if enabled)
  let internalLinks: Array<{ url: string; title: string; excerpt: string }> = [];
  if (params.enableInternalLinks && blogConfig.id) {
    console.log('[Content Generator] Finding relevant internal links...');
    try {
      internalLinks = await getRelevantInternalLinks(
        blogConfig.id,
        generatedContent.title + ' ' + generatedContent.keywords.join(' '),
        5
      );
      
      if (internalLinks.length > 0) {
        console.log(`[Content Generator] Found ${internalLinks.length} relevant internal links`);
        
        // Add internal links section to content
        const linksSection = '\n\n## Related Articles\n\n' + 
          internalLinks.map(link => `- [${link.title}](${link.url})`).join('\n');
        generatedContent.content += linksSection;
      }
    } catch (error) {
      console.error('[Content Generator] Internal link suggestions failed:', error);
      // Continue without internal links if it fails
    }
  }
  
  // Step 4: SEO Optimization (if enabled)
  if (params.enableSEO) {
    console.log('[Content Generator] Performing SEO optimization...');
    try {
      const primaryKeyword = generatedContent.keywords[0];
      const { optimized, analysis } = await performSEOOptimization(
        generatedContent.title,
        generatedContent.content,
        generatedContent.excerpt,
        primaryKeyword,
        70, // Threshold score
        llmKey.apiKey,
        llmKey.provider
      );
      
      console.log(`[Content Generator] SEO optimization complete - Score: ${analysis.score}/100`);
      
      // Apply optimized content
      generatedContent.title = optimized.title;
      generatedContent.content = optimized.content;
      generatedContent.excerpt = optimized.excerpt;
      generatedContent.seoDescription = optimized.metaDescription;
      generatedContent.seoScore = analysis.score;
      
      console.log(`[Content Generator] Improvements: ${optimized.improvements.join(', ')}`);
    } catch (error) {
      console.error('[Content Generator] SEO optimization failed:', error);
      // Continue with original content if optimization fails
    }
  }
  
  // Add metadata to result
  if (internalLinks.length > 0) {
    generatedContent.internalLinks = internalLinks;
  }
  if (externalSources.length > 0) {
    generatedContent.externalSources = externalSources.map(s => ({
      url: s.url,
      title: s.title,
      domain: s.domain,
    }));
  }

  return generatedContent;
}

/**
 * Generate featured image for blog post with AI-powered prompt analysis
 */
export async function generateFeaturedImage(
  blogTitle: string,
  blogContent: string,
  userId: number,
  blogConfigId?: number
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

  // Step 3: Save to local storage if using Stability AI (returns buffer)
  if (result.buffer && blogConfigId) {
    console.log('[Featured Image] Step 3: Saving to local storage...');
    
    const { getUserById } = await import('./db');
    const { getBlogConfigById } = await import('./db');
    const { saveImageLocally } = await import('./localStorage');
    
    // Get user email and blog config name
    const user = await getUserById(userId);
    const blogConfig = await getBlogConfigById(blogConfigId, userId);
    
    if (!user || !blogConfig) {
      console.error('[Featured Image] Failed to get user or blog config:', { userId, blogConfigId, user, blogConfig });
      throw new Error('User or blog config not found');
    }
    
    const userEmail = user.email || `user-${userId}`;
    const blogConfigName = blogConfig.siteName;
    
    // Save to local storage
    const { url } = await saveImageLocally(userEmail, blogConfigName, result.buffer, 'png');
    
    console.log('[Featured Image] Image saved locally:', url);
    return url;
  }
  
  // If using built-in service (returns URL directly)
  if (result.url) {
    console.log('[Featured Image] Image generated successfully:', result.url);
    return result.url;
  }

  throw new Error("Failed to generate featured image");
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

