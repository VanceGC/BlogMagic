import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router, adminProcedure } from "./_core/trpc";
import * as db from "./db";
import { encryptApiKey, decryptApiKey } from "./encryption";
import { generateBlogPost, generateFeaturedImage, generateTopicIdeas } from "./contentGenerator";
import { publishToWordPress, testWordPressConnection } from "./wordpressPublisher";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  subscription: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const subscription = await db.getSubscriptionByUserId(ctx.user.id);
      return subscription || null;
    }),

    createCheckout: protectedProcedure
      .input(z.object({ trial: z.boolean().default(true) }))
      .mutation(async ({ ctx, input }) => {
        const { createCheckoutSession, getStripe, createStripeCustomer } = await import("./stripe");
        const { ENV } = await import("./_core/env");
        
        // Get or create Stripe customer
        let subscription = await db.getSubscriptionByUserId(ctx.user.id);
        let customerId = subscription?.stripeCustomerId;
        
        if (!customerId) {
          const customer = await createStripeCustomer(ctx.user.email || "", ctx.user.name || "");
          customerId = customer.id;
        }
        
        const baseUrl = ENV.isProduction ? "https://blogmagic.app" : "http://localhost:3000";
        const priceId = process.env.STRIPE_PRICE_ID || "";
        const session = await createCheckoutSession(
          customerId,
          priceId,
          `${baseUrl}/dashboard?checkout=success`,
          `${baseUrl}/subscription?checkout=cancel`
        );
        return { url: session.url };
      }),

    createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
      const { createPortalSession } = await import("./stripe");
      const { ENV } = await import("./_core/env");
      
      const subscription = await db.getSubscriptionByUserId(ctx.user.id);
      if (!subscription?.stripeCustomerId) {
        throw new Error("No Stripe customer found");
      }
      
      const baseUrl = ENV.isProduction ? "https://blogmagic.app" : "http://localhost:3000";
      const session = await createPortalSession(
        subscription.stripeCustomerId,
        `${baseUrl}/subscription`
      );
      return { url: session.url };
    }),
  }),

  apiKeys: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const keys = await db.getApiKeysByUserId(ctx.user.id);
      // Don't send encrypted keys to client
      return keys.map(k => ({
        id: k.id,
        provider: k.provider,
        keyName: k.keyName,
        isActive: k.isActive,
        createdAt: k.createdAt,
      }));
    }),

    create: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "anthropic", "stability"]),
        keyName: z.string(),
        apiKey: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const encryptedKey = encryptApiKey(input.apiKey);
        await db.createApiKey({
          userId: ctx.user.id,
          provider: input.provider,
          keyName: input.keyName,
          encryptedKey,
          isActive: 1,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteApiKey(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  trending: router({
    getSuggestions: protectedProcedure
      .input(z.object({ blogConfigId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Check if user is admin (unlimited credits)
        if (ctx.user.role !== 'admin') {
          // Check subscription and credits
          const subscription = await db.getSubscriptionByUserId(ctx.user.id);
          if (!subscription) {
            throw new Error("No active subscription found. Please subscribe to use this feature.");
          }
          
          if (subscription.credits < 10) {
            throw new Error(`Insufficient credits. You have ${subscription.credits} credits remaining. Trending topic generation costs 10 credits.`);
          }
          
          // Deduct credits
          await db.deductCredits(ctx.user.id, 10);
        }
        
        const { getTrendingSuggestions } = await import("./trendingTopics");
        const blogConfig = await db.getBlogConfigById(input.blogConfigId, ctx.user.id);
        if (!blogConfig) {
          throw new Error("Blog configuration not found");
        }
        return await getTrendingSuggestions(blogConfig);
      }),

    saveTopic: protectedProcedure
      .input(z.object({
        blogConfigId: z.number(),
        title: z.string(),
        reason: z.string(),
        source: z.string(),
        keywords: z.array(z.string()),
        searchVolume: z.enum(["high", "medium", "low"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createSavedTopic({
          userId: ctx.user.id,
          blogConfigId: input.blogConfigId,
          title: input.title,
          reason: input.reason,
          source: input.source,
          keywords: JSON.stringify(input.keywords),
          searchVolume: input.searchVolume,
        });
        return { success: true };
      }),

    listSaved: protectedProcedure
      .query(async ({ ctx }) => {
        const topics = await db.getSavedTopicsByUserId(ctx.user.id);
        return topics.map(topic => ({
          ...topic,
          keywords: JSON.parse(topic.keywords) as string[],
        }));
      }),

    getSaved: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const topic = await db.getSavedTopicById(input.id, ctx.user.id);
        if (!topic) return null;
        return {
          ...topic,
          keywords: JSON.parse(topic.keywords) as string[],
        };
      }),

    deleteSaved: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSavedTopic(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  blogConfigs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getBlogConfigsByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getBlogConfigById(input.id, ctx.user.id);
      }),

    // Debug endpoint to check credentials
    debugCredentials: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const config = await db.getBlogConfigById(input.id, ctx.user.id);
        if (!config) {
          throw new Error("Blog configuration not found");
        }
        return {
          siteName: config.siteName,
          wordpressUrl: config.wordpressUrl,
          hasUsername: !!config.wordpressUsername,
          hasAppPassword: !!config.wordpressAppPassword,
          usernameValue: config.wordpressUsername || "(empty)",
          appPasswordLength: config.wordpressAppPassword?.length || 0,
        };
      }),

    create: protectedProcedure
      .input(z.object({
        siteName: z.string(),
        wordpressUrl: z.string().url(),
        wordpressUsername: z.string().optional(),
        wordpressAppPassword: z.string().optional(),
        businessDescription: z.string().optional(),
        competitors: z.string().optional(),
        keywords: z.string().optional(),
        locale: z.enum(["local", "national", "global"]).default("national"),
        targetAudience: z.string().optional(),
        toneOfVoice: z.string().default("professional"),
        postingFrequency: z.enum(["daily", "weekly", "biweekly", "monthly"]).default("weekly"),
        schedulingEnabled: z.number().default(0),
        autoPublish: z.number().default(0),
        scheduleTime: z.string().optional(),
        scheduleDayOfWeek: z.number().optional(),
        timezone: z.string().default("America/New_York"),
        color: z.string().default("#8B5CF6"),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createBlogConfig({
          userId: ctx.user.id,
          ...input,
          isActive: 1,
        });

        // If scheduling is enabled, generate the first 3 posts
        if (input.schedulingEnabled === 1 && input.scheduleTime) {
          const { generateScheduledPosts } = await import("./scheduler");
          // Get the newly created config ID from the result
          // Drizzle returns an array with insertId in the first element
          const configId = (result as any)[0]?.insertId || (result as any).insertId;
          if (configId) {
            try {
              await generateScheduledPosts(Number(configId), ctx.user.id, 3);
            } catch (error) {
              console.error("Failed to generate scheduled posts:", error);
              // Don't fail the entire creation if post generation fails
            }
          }
        }

        return { success: true };
      }),

    getCategories: protectedProcedure
      .input(z.object({
        blogConfigId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        // Get blog config to get WordPress credentials
        const blogConfig = await db.getBlogConfigById(input.blogConfigId, ctx.user.id);
        if (!blogConfig) {
          throw new Error("Blog configuration not found");
        }

        if (!blogConfig.wordpressUrl || !blogConfig.wordpressUsername || !blogConfig.wordpressAppPassword) {
          throw new Error("WordPress credentials not configured");
        }

        // Fetch categories from WordPress
        const { fetchWordPressCategories } = await import("./wordpressPublisher");
        const categories = await fetchWordPressCategories({
          url: blogConfig.wordpressUrl,
          username: blogConfig.wordpressUsername,
          appPassword: blogConfig.wordpressAppPassword,
        });

        return categories;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        siteName: z.string().optional(),
        wordpressUrl: z.string().optional(),
        wordpressUsername: z.string().optional(),
        wordpressAppPassword: z.string().optional(),
        defaultCategories: z.string().optional(), // JSON string of category IDs
        businessDescription: z.string().optional(),
        competitors: z.string().optional(),
        keywords: z.string().optional(),
        locale: z.enum(["local", "national", "global"]).optional(),
        targetAudience: z.string().optional(),
        toneOfVoice: z.string().optional(),
        postingFrequency: z.enum(["daily", "weekly", "biweekly", "monthly"]).optional(),
        schedulingEnabled: z.number().optional(),
        autoPublish: z.number().optional(),
        scheduleTime: z.string().optional(),
        scheduleDayOfWeek: z.number().optional(),
        timezone: z.string().optional(),
        color: z.string().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateBlogConfig(id, ctx.user.id, data);
        return { success: true };
      }),

    enableScheduling: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { generateScheduledPosts } = await import("./scheduler");
        
        // Get current config
        const config = await db.getBlogConfigById(input.id, ctx.user.id);
        if (!config) {
          throw new Error("Blog configuration not found");
        }

        // Set default schedule time if not configured
        const updateData: any = {
          schedulingEnabled: 1,
        };

        if (!config.scheduleTime) {
          updateData.scheduleTime = "09:00";
        }
        if (!config.timezone) {
          updateData.timezone = "America/New_York";
        }
        if (config.scheduleDayOfWeek === null && (config.postingFrequency === "weekly" || config.postingFrequency === "biweekly")) {
          updateData.scheduleDayOfWeek = 1; // Monday
        }

        // Enable scheduling with defaults
        await db.updateBlogConfig(input.id, ctx.user.id, updateData);

        // Generate next 3 posts
        await generateScheduledPosts(input.id, ctx.user.id, 3);

        return { success: true };
      }),

    disableScheduling: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateBlogConfig(input.id, ctx.user.id, {
          schedulingEnabled: 0,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteBlogConfig(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  seo: router({
    scrapeSite: protectedProcedure
      .input(z.object({ blogConfigId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const blogConfig = await db.getBlogConfigById(input.blogConfigId, ctx.user.id);
        if (!blogConfig) {
          throw new Error("Blog configuration not found");
        }
        
        const { scrapeWordPressSite } = await import("./lib/wordpressScraper");
        const pagesScraped = await scrapeWordPressSite(blogConfig.id, blogConfig.wordpressUrl);
        
        return { success: true, pagesScraped };
      }),
    
    getSitePages: protectedProcedure
      .input(z.object({ blogConfigId: z.number() }))
      .query(async ({ ctx, input }) => {
        const blogConfig = await db.getBlogConfigById(input.blogConfigId, ctx.user.id);
        if (!blogConfig) {
          throw new Error("Blog configuration not found");
        }
        
        const pages = await db.getSitePagesByBlogConfigId(blogConfig.id);
        return pages;
      }),
    
    analyzeSEO: protectedProcedure
      .input(z.object({
        title: z.string(),
        content: z.string(),
        excerpt: z.string(),
        targetKeyword: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { analyzeSEO } = await import("./lib/seoOptimizer");
        const analysis = await analyzeSEO(
          input.title,
          input.content,
          input.excerpt,
          input.targetKeyword
        );
        return analysis;
      }),
  }),

  posts: router({
    list: protectedProcedure
      .input(z.object({ 
        blogConfigId: z.number().optional(),
        limit: z.number().default(50) 
      }).optional())
      .query(async ({ ctx, input }) => {
        const limit = input?.limit ?? 50;
        if (input?.blogConfigId) {
          return await db.getPostsByBlogConfigId(input.blogConfigId, ctx.user.id);
        }
        return await db.getPostsByUserId(ctx.user.id, limit);
      }),

    generate: protectedProcedure
      .input(z.object({
        blogConfigId: z.number(),
        topic: z.string().optional(),
        generateImage: z.boolean().default(true),
        enableSEO: z.boolean().default(true),
        enableResearch: z.boolean().optional(),
        enableInternalLinks: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        // Auto-enable research if Google Search credentials are present and not explicitly disabled
        const { hasGoogleSearchCredentials } = await import("./lib/webResearch");
        const enableResearch = input.enableResearch ?? hasGoogleSearchCredentials();
        
        // Get blog config
        const blogConfig = await db.getBlogConfigById(input.blogConfigId, ctx.user.id);
        if (!blogConfig) {
          throw new Error("Blog configuration not found");
        }

        // Select topic if not provided
        let topic = input.topic;
        if (!topic) {
          const { selectNextTopic } = await import("./topicDiversity");
          topic = await selectNextTopic(blogConfig, ctx.user.id);
        }

        // Generate content with SEO features
        const content = await generateBlogPost({
          blogConfig,
          userId: ctx.user.id,
          topic,
          enableSEO: input.enableSEO,
          enableResearch,
          enableInternalLinks: input.enableInternalLinks,
        });

        // Generate featured image if requested
        let featuredImageUrl: string | undefined;
        if (input.generateImage) {
          try {
            featuredImageUrl = await generateFeaturedImage(content.title, content.content, ctx.user.id, input.blogConfigId);
          } catch (error) {
            console.error("Failed to generate image:", error);
          }
        }

        // Save post to database
        const result = await db.createPost({
          blogConfigId: input.blogConfigId,
          userId: ctx.user.id,
          title: content.title,
          content: content.content,
          excerpt: content.excerpt,
          seoTitle: content.seoTitle,
          seoDescription: content.seoDescription,
          keywords: content.keywords.join(", "),
          featuredImageUrl,
          status: "draft",
          categories: blogConfig.defaultCategories || undefined, // Use blog config's default categories
        });
        
        // Save external sources if any
        if (content.externalSources && content.externalSources.length > 0) {
          const postId = (result as any)[0]?.insertId || (result as any).insertId;
          if (postId) {
            for (const source of content.externalSources) {
              await db.createExternalSource({
                postId: Number(postId),
                url: source.url,
                title: source.title,
                domain: source.domain,
                citedAt: new Date(),
              });
            }
          }
        }

        return { success: true, content };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const posts = await db.getPostsByUserId(ctx.user.id, 1000);
        const post = posts.find(p => p.id === input.id);
        if (!post) {
          throw new Error("Post not found");
        }
        return post;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        excerpt: z.string().optional(),
        categories: z.string().optional(), // JSON string of category IDs
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updatePost(input.id, ctx.user.id, {
          title: input.title,
          content: input.content,
          excerpt: input.excerpt,
          categories: input.categories,
        });
        return { success: true };
      }),

    generateImage: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const posts = await db.getPostsByUserId(ctx.user.id, 1000);
        const post = posts.find(p => p.id === input.postId);
        if (!post) {
          throw new Error("Post not found");
        }

        // Generate image from post title and content
        const imageUrl = await generateFeaturedImage(
          post.title,
          post.content,
          ctx.user.id,
          post.blogConfigId
        );

        await db.updatePost(input.postId, ctx.user.id, {
          featuredImageUrl: imageUrl,
        });

        return { success: true, imageUrl };
      }),

    updateSchedule: protectedProcedure
      .input(z.object({
        postId: z.number(),
        scheduledFor: z.string().nullable(),
        status: z.enum(["draft", "scheduled"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const updateData: any = {
          status: input.status,
        };

        if (input.scheduledFor) {
          updateData.scheduledFor = new Date(input.scheduledFor);
        } else {
          updateData.scheduledFor = null;
        }

        await db.updatePost(input.postId, ctx.user.id, updateData);
        return { success: true };
      }),

    regenerateContent: protectedProcedure
      .input(z.object({
        postId: z.number(),
        topic: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { generateBlogPost } = await import("./contentGenerator");
        const { selectNextTopic } = await import("./topicDiversity");

        // Get the post and its blog config
        const post = await db.getPostById(input.postId, ctx.user.id);
        if (!post) {
          throw new Error("Post not found");
        }

        const blogConfig = await db.getBlogConfigById(post.blogConfigId, ctx.user.id);
        if (!blogConfig) {
          throw new Error("Blog configuration not found");
        }

        // Select topic if not provided
        let topic = input.topic;
        if (!topic) {
          topic = await selectNextTopic(blogConfig, ctx.user.id);
        }

        // Generate new content
        const content = await generateBlogPost({
          blogConfig,
          userId: ctx.user.id,
          topic,
        });

        // Update the post with new content (keep image and scheduled date)
        await db.updatePost(post.id, ctx.user.id, {
          title: content.title,
          content: content.content,
          excerpt: content.excerpt,
          seoTitle: content.seoTitle,
          seoDescription: content.seoDescription,
        });

        return {
          title: content.title,
          content: content.content,
          excerpt: content.excerpt,
        };
      }),

    publish: protectedProcedure
      .input(z.object({
        postId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get post
        const posts = await db.getPostsByUserId(ctx.user.id, 1000);
        const post = posts.find(p => p.id === input.postId);
        if (!post) {
          throw new Error("Post not found");
        }

        // Get blog config
        const blogConfig = await db.getBlogConfigById(post.blogConfigId, ctx.user.id);
        if (!blogConfig) {
          throw new Error("Blog configuration not found");
        }

        if (!blogConfig.wordpressUrl || !blogConfig.wordpressUsername || !blogConfig.wordpressAppPassword) {
          throw new Error("WordPress credentials not configured");
        }

        try {
          // Publish to WordPress
          const wpPostId = await publishToWordPress(
            {
              url: blogConfig.wordpressUrl,
              username: blogConfig.wordpressUsername,
              appPassword: blogConfig.wordpressAppPassword,
            },
            {
              title: post.title,
              content: post.content,
              excerpt: post.excerpt || undefined,
              seoTitle: post.seoTitle || undefined,
              seoDescription: post.seoDescription || undefined,
              keywords: post.keywords || undefined,
              featuredImageUrl: post.featuredImageUrl || undefined,
              status: "publish",
              categories: post.categories ? JSON.parse(post.categories) : undefined,
            }
          );

          // Update post status
          await db.updatePost(post.id, ctx.user.id, {
            status: "published",
            wordpressPostId: wpPostId,
            publishedAt: new Date(),
          });

          return { success: true, wordpressPostId: wpPostId };
        } catch (error: any) {
          // Update post with error
          await db.updatePost(post.id, ctx.user.id, {
            status: "failed",
            errorMessage: error.message,
          });

          throw error;
        }
      }),

    changeBlogConfig: protectedProcedure
      .input(z.object({
        postId: z.number(),
        newBlogConfigId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify the new blog config exists and belongs to the user
        const newBlogConfig = await db.getBlogConfigById(input.newBlogConfigId, ctx.user.id);
        if (!newBlogConfig) {
          throw new Error("Blog configuration not found");
        }

        // Update the post's blog config
        await db.updatePost(input.postId, ctx.user.id, {
          blogConfigId: input.newBlogConfigId,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePost(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  admin: router({
    listUsers: adminProcedure.query(async () => {
      const db_instance = await db.getDb();
      if (!db_instance) return [];
      
      const { users, subscriptions } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      // Get all users with their subscriptions
      const allUsers = await db_instance.select().from(users);
      const result = [];
      
      for (const user of allUsers) {
        const subscription = await db.getSubscriptionByUserId(user.id);
        result.push({
          ...user,
          subscription,
        });
      }
      
      return result;
    }),

    adjustCredits: adminProcedure
      .input(z.object({
        userId: z.number(),
        credits: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        const subscription = await db.getSubscriptionByUserId(input.userId);
        if (!subscription) {
          throw new Error("User has no subscription");
        }
        
        await db.updateSubscription(subscription.id, {
          credits: input.credits,
        });
        
        return { success: true };
      }),

    resetUserCredits: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await db.resetCredits(input.userId);
        return { success: true };
      }),
  }),

  content: router({
    generateTopics: protectedProcedure
      .input(z.object({
        blogConfigId: z.number(),
        count: z.number().default(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const blogConfig = await db.getBlogConfigById(input.blogConfigId, ctx.user.id);
        if (!blogConfig) {
          throw new Error("Blog configuration not found");
        }

        const topics = await generateTopicIdeas(blogConfig, input.count);
        return { topics };
      }),

    testWordPress: protectedProcedure
      .input(z.object({
        url: z.string().url(),
        username: z.string(),
        appPassword: z.string(),
      }))
      .mutation(async ({ input }) => {
        const isConnected = await testWordPressConnection({
          url: input.url,
          username: input.username,
          appPassword: input.appPassword,
        });

        return { success: isConnected };
      }),
  }),

  images: router({
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const image = await db.getImageById(input.id);
        if (!image) {
          throw new Error("Image not found");
        }
        
        // Return base64 data and mime type so client can display it
        return {
          data: image.data,
          mimeType: image.mimeType,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

