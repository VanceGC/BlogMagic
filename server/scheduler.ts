import * as db from "./db";
import { generateBlogPost, generateFeaturedImage } from "./contentGenerator";
import { publishToWordPress } from "./wordpressPublisher";

/**
 * Calculate the next scheduled date based on frequency and configuration
 */
export function calculateNextScheduledDate(
  frequency: "daily" | "weekly" | "biweekly" | "monthly",
  scheduleTime: string, // HH:MM format
  scheduleDayOfWeek: number | null, // 0 = Sunday, 6 = Saturday
  timezone: string,
  fromDate?: Date
): Date {
  const now = fromDate || new Date();
  const [hours, minutes] = scheduleTime.split(":").map(Number);

  let nextDate = new Date(now);
  nextDate.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case "daily":
      // If time has passed today, schedule for tomorrow
      if (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      break;

    case "weekly":
      // Schedule for specific day of week
      if (scheduleDayOfWeek !== null) {
        const currentDay = nextDate.getDay();
        let daysUntilTarget = scheduleDayOfWeek - currentDay;
        
        if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextDate <= now)) {
          daysUntilTarget += 7;
        }
        
        nextDate.setDate(nextDate.getDate() + daysUntilTarget);
      }
      break;

    case "biweekly":
      // Schedule for specific day of week, every 2 weeks
      if (scheduleDayOfWeek !== null) {
        const currentDay = nextDate.getDay();
        let daysUntilTarget = scheduleDayOfWeek - currentDay;
        
        if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextDate <= now)) {
          daysUntilTarget += 14;
        }
        
        nextDate.setDate(nextDate.getDate() + daysUntilTarget);
      }
      break;

    case "monthly":
      // Schedule for same day next month
      if (nextDate <= now) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
  }

  return nextDate;
}

/**
 * Generate the next N scheduled posts as drafts
 */
export async function generateScheduledPosts(
  blogConfigId: number,
  userId: number,
  count: number = 3
): Promise<void> {
  const blogConfig = await db.getBlogConfigById(blogConfigId, userId);
  if (!blogConfig) {
    throw new Error("Blog configuration not found");
  }

  if (!blogConfig.schedulingEnabled) {
    throw new Error("Scheduling is not enabled for this blog");
  }

  if (!blogConfig.scheduleTime) {
    throw new Error("Schedule time not configured");
  }

  // Get existing scheduled posts to avoid duplicates
  const existingPosts = await db.getPostsByBlogConfigId(blogConfigId, userId);
  const scheduledPosts = existingPosts.filter(
    (p) => p.status === "scheduled" || p.status === "draft"
  );

  // Calculate how many more posts we need
  const postsToGenerate = Math.max(0, count - scheduledPosts.length);
  if (postsToGenerate === 0) {
    return; // Already have enough scheduled posts
  }

  // Find the last scheduled date or start from now
  let lastScheduledDate = blogConfig.lastScheduledAt || new Date();
  if (scheduledPosts.length > 0) {
    const latestScheduled = scheduledPosts.reduce((latest, post) => {
      if (!post.scheduledFor) return latest;
      return post.scheduledFor > latest ? post.scheduledFor : latest;
    }, new Date(0));
    
    if (latestScheduled > lastScheduledDate) {
      lastScheduledDate = latestScheduled;
    }
  }

  // Import topic diversity module
  const { selectNextTopic } = await import("./topicDiversity");

  // Generate posts for future dates
  for (let i = 0; i < postsToGenerate; i++) {
    if (!blogConfig.postingFrequency) {
      console.error("Blog config missing posting frequency");
      break;
    }
    const scheduledFor = calculateNextScheduledDate(
      blogConfig.postingFrequency,
      blogConfig.scheduleTime,
      blogConfig.scheduleDayOfWeek || null,
      blogConfig.timezone || "America/New_York",
      lastScheduledDate
    );

    // Select a diverse topic
    const topic = await selectNextTopic(blogConfig, userId);

    // Generate content with the selected topic
    const content = await generateBlogPost({
      blogConfig,
      userId,
      topic,
    });

    // Generate featured image
    let featuredImageUrl: string | undefined;
    try {
      featuredImageUrl = await generateFeaturedImage(content.title, content.content, userId);
    } catch (error) {
      console.error("Failed to generate image:", error);
    }

    // Save post as scheduled
    await db.createPost({
      blogConfigId,
      userId,
      title: content.title,
      content: content.content,
      excerpt: content.excerpt,
      seoTitle: content.seoTitle,
      seoDescription: content.seoDescription,
      keywords: content.keywords.join(", "),
      featuredImageUrl,
      status: "scheduled",
      scheduledFor,
    });

    lastScheduledDate = scheduledFor;
  }

  // Update last scheduled date
  await db.updateBlogConfig(blogConfigId, userId, {
    lastScheduledAt: lastScheduledDate,
  });
}

/**
 * Process scheduled posts that are due for publishing
 */
export async function processScheduledPosts(): Promise<void> {
  const allDb = await db.getDb();
  if (!allDb) {
    console.error("Database not available");
    return;
  }

  // Get all scheduled posts that are due
  const now = new Date();
  
  // This is a simplified version - in production you'd query the database more efficiently
  // For now, we'll need to add a helper function to get all scheduled posts
  console.log("Processing scheduled posts at", now.toISOString());
  
  // TODO: Implement actual scheduled post processing
  // This would typically run on a cron job every 5-15 minutes
}

/**
 * Publish a scheduled post to WordPress
 */
export async function publishScheduledPost(postId: number, userId: number): Promise<void> {
  const posts = await db.getPostsByUserId(userId, 1000);
  const post = posts.find((p) => p.id === postId);
  
  if (!post) {
    throw new Error("Post not found");
  }

  if (post.status !== "scheduled") {
    throw new Error("Post is not scheduled");
  }

  const blogConfig = await db.getBlogConfigById(post.blogConfigId, userId);
  if (!blogConfig) {
    throw new Error("Blog configuration not found");
  }

  if (!blogConfig.wordpressUrl || !blogConfig.wordpressUsername || !blogConfig.wordpressAppPassword) {
    throw new Error("WordPress credentials not configured");
  }

  try {
    // Determine post status based on blog config autoPublish setting
    const postStatus = blogConfig.autoPublish === 1 ? "publish" : "draft";
    
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
        featuredImageUrl: post.featuredImageUrl || undefined,
        status: postStatus,
      }
    );

    // Update post status
    await db.updatePost(postId, userId, {
      status: "published",
      wordpressPostId: wpPostId,
      publishedAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to publish scheduled post:", error);
    await db.updatePost(postId, userId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

