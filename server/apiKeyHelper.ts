import * as db from "./db";
import { decryptApiKey } from "./encryption";

export interface UserApiKeys {
  openai?: string;
  anthropic?: string;
  stability?: string;
}

/**
 * Fetch and decrypt user's API keys from database
 */
export async function getUserApiKeys(userId: number): Promise<UserApiKeys> {
  const apiKeys = await db.getApiKeysByUserId(userId);
  
  const keys: UserApiKeys = {};
  
  for (const key of apiKeys) {
    if (!key.isActive) continue;
    
    try {
      const decryptedKey = decryptApiKey(key.encryptedKey);
      
      if (key.provider === 'openai') {
        keys.openai = decryptedKey;
      } else if (key.provider === 'anthropic') {
        keys.anthropic = decryptedKey;
      } else if (key.provider === 'stability') {
        keys.stability = decryptedKey;
      }
    } catch (error) {
      console.error(`Failed to decrypt ${key.provider} key for user ${userId}:`, error);
    }
  }
  
  return keys;
}

/**
 * Get the preferred LLM API key (OpenAI first, then Anthropic)
 */
export async function getPreferredLLMKey(userId: number): Promise<{ provider: 'openai' | 'anthropic', apiKey: string } | null> {
  const keys = await getUserApiKeys(userId);
  
  if (keys.openai) {
    return { provider: 'openai', apiKey: keys.openai };
  }
  
  if (keys.anthropic) {
    return { provider: 'anthropic', apiKey: keys.anthropic };
  }
  
  return null;
}

