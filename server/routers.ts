import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
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

  blogConfigs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getBlogConfigsByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getBlogConfigById(input.id, ctx.user.id);
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
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createBlogConfig({
          userId: ctx.user.id,
          ...input,
          isActive: 1,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        siteName: z.string().optional(),
        wordpressUrl: z.string().url().optional(),
        wordpressUsername: z.string().optional(),
        wordpressAppPassword: z.string().optional(),
        businessDescription: z.string().optional(),
        competitors: z.string().optional(),
        keywords: z.string().optional(),
        locale: z.enum(["local", "national", "global"]).optional(),
        targetAudience: z.string().optional(),
        toneOfVoice: z.string().optional(),
        postingFrequency: z.enum(["daily", "weekly", "biweekly", "monthly"]).optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateBlogConfig(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteBlogConfig(input.id, ctx.user.id);
        return { success: true };
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
      }))
      .mutation(async ({ ctx, input }) => {
        // Get blog config
        const blogConfig = await db.getBlogConfigById(input.blogConfigId, ctx.user.id);
        if (!blogConfig) {
          throw new Error("Blog configuration not found");
        }

        // Generate content
        const content = await generateBlogPost({
          blogConfig,
          topic: input.topic,
        });

        // Generate featured image if requested
        let featuredImageUrl: string | undefined;
        if (input.generateImage) {
          try {
            featuredImageUrl = await generateFeaturedImage(content.featuredImagePrompt);
          } catch (error) {
            console.error("Failed to generate image:", error);
          }
        }

        // Save post to database
        await db.createPost({
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
        });

        return { success: true, content };
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
            }
          );

          // Update post status
          await db.updatePost(post.id, {
            status: "published",
            wordpressPostId: wpPostId,
            publishedAt: new Date(),
          });

          return { success: true, wordpressPostId: wpPostId };
        } catch (error: any) {
          // Update post with error
          await db.updatePost(post.id, {
            status: "failed",
            errorMessage: error.message,
          });

          throw error;
        }
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePost(input.id, ctx.user.id);
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
});

export type AppRouter = typeof appRouter;

