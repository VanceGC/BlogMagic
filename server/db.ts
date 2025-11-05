import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, subscriptions, InsertSubscription, apiKeys, InsertApiKey, blogConfigs, InsertBlogConfig, posts, InsertPost, postQueue, InsertPostQueueItem, savedTopics, InsertSavedTopic, images, InsertImage } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(users).values(user);
}

export async function updateUser(openId: string, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(data).where(eq(users.openId, openId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}

// Subscriptions
export async function getSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result[0];
}

export async function upsertSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(subscriptions).values(data).onDuplicateKeyUpdate({ set: data });
}

export async function updateSubscription(id: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}

export async function deductCredits(userId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const subscription = await getSubscriptionByUserId(userId);
  if (!subscription) {
    throw new Error("No active subscription found");
  }
  
  if (subscription.credits < amount) {
    throw new Error("Insufficient credits");
  }
  
  await db.update(subscriptions)
    .set({ credits: subscription.credits - amount })
    .where(eq(subscriptions.userId, userId));
}

export async function resetCredits(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(subscriptions)
    .set({ 
      credits: 200,
      creditsResetAt: new Date()
    })
    .where(eq(subscriptions.userId, userId));
}

// API Keys
export async function getApiKeysByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
}

export async function createApiKey(data: InsertApiKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(apiKeys).values(data);
  return result;
}

export async function deleteApiKey(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
}

// Blog Configs
export async function getBlogConfigsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(blogConfigs).where(eq(blogConfigs.userId, userId));
}

export async function getBlogConfigById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(blogConfigs).where(eq(blogConfigs.id, id)).limit(1);
  return result[0];
}

export async function createBlogConfig(data: InsertBlogConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(blogConfigs).values(data);
  return result;
}

export async function updateBlogConfig(id: number, userId: number, data: Partial<InsertBlogConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(blogConfigs).set(data).where(eq(blogConfigs.id, id));
}

export async function deleteBlogConfig(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blogConfigs).where(eq(blogConfigs.id, id));
}

// Posts
export async function getPostsByBlogConfigId(blogConfigId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(posts).where(eq(posts.blogConfigId, blogConfigId));
}

export async function getPostById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(posts).where(and(eq(posts.id, id), eq(posts.userId, userId))).limit(1);
  return result[0];
}

export async function getPostsByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(posts).where(eq(posts.userId, userId)).limit(limit);
}

export async function createPost(data: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(posts).values(data);
  return result;
}

export async function updatePost(id: number, userId: number, data: Partial<InsertPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Filter out undefined values
  const updateData: Partial<InsertPost> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      updateData[key as keyof InsertPost] = value as any;
    }
  }
  
  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    throw new Error("No values to set");
  }
  
  await db.update(posts).set(updateData).where(and(eq(posts.id, id), eq(posts.userId, userId)));
}

export async function deletePost(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(posts).where(eq(posts.id, id));
}

// Post Queue
export async function createPostQueueItem(data: InsertPostQueueItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(postQueue).values(data);
  return result;
}

export async function getPendingQueueItems() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(postQueue).where(eq(postQueue.status, "pending"));
}

export async function updateQueueItem(id: number, data: Partial<InsertPostQueueItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(postQueue).set(data).where(eq(postQueue.id, id));
}

// Saved Topics
export async function getSavedTopicsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(savedTopics).where(eq(savedTopics.userId, userId)).orderBy(savedTopics.createdAt);
}

export async function getSavedTopicById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(savedTopics).where(and(eq(savedTopics.id, id), eq(savedTopics.userId, userId))).limit(1);
  return result[0];
}

export async function createSavedTopic(data: InsertSavedTopic) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(savedTopics).values(data);
  return result;
}

export async function deleteSavedTopic(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(savedTopics).where(and(eq(savedTopics.id, id), eq(savedTopics.userId, userId)));
}


// Images
export async function saveImage(data: InsertImage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(images).values(data);
  return result[0].insertId;
}

export async function getImageById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(images).where(eq(images.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

