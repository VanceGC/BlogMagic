import { ENV } from "./env";

/**
 * Search the web for trending topics using Perplexity API
 */
export async function searchTrendingTopics(query: string): Promise<string> {
  if (!ENV.perplexityApiKey) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.perplexityApiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that finds current trending topics and viral content. Provide real-time information from the web.",
        },
        {
          role: "user",
          content: query,
        },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

