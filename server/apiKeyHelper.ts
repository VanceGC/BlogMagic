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
  console.log(`[API Key Helper] Fetching API keys for user ${userId}`);
  const apiKeys = await db.getApiKeysByUserId(userId);
  console.log(`[API Key Helper] Found ${apiKeys.length} API keys in database`);
  
  const keys: UserApiKeys = {};
  
  for (const key of apiKeys) {
    console.log(`[API Key Helper] Processing key: provider=${key.provider}, isActive=${key.isActive} (type: ${typeof key.isActive})`);
    // isActive is stored as tinyint (0 or 1) in MySQL
    if (!key.isActive || key.isActive === 0) {
      console.log(`[API Key Helper] Skipping inactive key`);
      continue;
    }
    
    try {
      const decryptedKey = decryptApiKey(key.encryptedKey);
      
      if (key.provider === 'openai') {
        keys.openai = decryptedKey;
        console.log(`[API Key Helper] ✓ OpenAI key decrypted successfully`);
      } else if (key.provider === 'anthropic') {
        keys.anthropic = decryptedKey;
        console.log(`[API Key Helper] ✓ Anthropic key decrypted successfully`);
      } else if (key.provider === 'stability') {
        keys.stability = decryptedKey;
        console.log(`[API Key Helper] ✓ Stability key decrypted successfully`);
      }
    } catch (error) {
      console.error(`[API Key Helper] ✗ Failed to decrypt ${key.provider} key for user ${userId}:`, error);
    }
  }
  
  console.log(`[API Key Helper] Final keys available:`, {
    hasOpenAI: !!keys.openai,
    hasAnthropic: !!keys.anthropic,
    hasStability: !!keys.stability
  });
  
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

