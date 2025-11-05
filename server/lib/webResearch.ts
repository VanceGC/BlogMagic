/**
 * Web Research Module
 * 
 * Performs web research to find authoritative external sources for blog posts.
 * Uses AI to identify research needs, searches the web, evaluates sources,
 * and stores citations in the external_sources table.
 */

import { invokeLLM } from '../_core/llm';
import { createExternalSource } from '../db';

interface ResearchQuery {
  query: string;
  purpose: string; // Why this research is needed
}

interface ExternalSource {
  url: string;
  title: string;
  domain: string;
  snippet: string;
  relevance: number; // 0-1 score
}

/**
 * Identify research needs for a blog post topic
 * Uses AI to determine what external information would strengthen the content
 */
export async function identifyResearchNeeds(
  topic: string,
  outline: string,
  apiKey?: string,
  provider?: 'openai' | 'anthropic'
): Promise<ResearchQuery[]> {
  console.log(`[Web Research] Identifying research needs for topic: ${topic}`);
  
  const prompt = `You are a research assistant helping to identify what external sources would strengthen a blog post.

Topic: ${topic}

Outline:
${outline}

Identify 3-5 specific research queries that would help find authoritative external sources to cite in this blog post. For each query, explain its purpose.

Return your response as a JSON array with this structure:
[
  {
    "query": "specific search query",
    "purpose": "why this research is needed"
  }
]

Focus on:
- Statistics and data to support claims
- Expert opinions and authoritative sources
- Recent studies or research findings
- Industry best practices
- Case studies or real-world examples

Return ONLY the JSON array, no other text.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a research assistant. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      apiKey,
      provider,
    });

    const content = response.choices[0]?.message?.content;
    const contentText = typeof content === 'string' ? content : '[]';
    const queries = JSON.parse(contentText) as ResearchQuery[];
    
    console.log(`[Web Research] Identified ${queries.length} research queries`);
    return queries;
    
  } catch (error) {
    console.error('[Web Research] Error identifying research needs:', error);
    return [];
  }
}

/**
 * Check if Google Custom Search API credentials are available
 */
export function hasGoogleSearchCredentials(): boolean {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  return !!(apiKey && cx);
}

/**
 * Search the web using Google Custom Search API
 */
async function searchWeb(query: string): Promise<ExternalSource[]> {
  console.log(`[Web Research] Searching web for: ${query}`);
  
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  
  if (!apiKey || !cx) {
    console.log('[Web Research] Google Search API credentials not configured - skipping web search');
    return [];
  }
  
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BlogMagic/1.0',
      },
    });
    
    if (!response.ok) {
      console.error(`[Web Research] Google Search API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json() as any;
    
    if (!data.items || data.items.length === 0) {
      console.log('[Web Research] No search results found');
      return [];
    }
    
    const sources: ExternalSource[] = data.items.map((item: any) => {
      const url = item.link || '';
      let domain = '';
      try {
        domain = new URL(url).hostname.replace('www.', '');
      } catch (e) {
        domain = 'unknown';
      }
      
      return {
        url,
        title: item.title || '',
        domain,
        snippet: item.snippet || '',
        relevance: 0.7, // Default relevance, will be evaluated by AI
      };
    });
    
    console.log(`[Web Research] Found ${sources.length} search results from Google`);
    return sources;
    
  } catch (error) {
    console.error('[Web Research] Error searching with Google Custom Search API:', error);
    return [];
  }
}

/**
 * Evaluate source credibility using AI
 */
async function evaluateSourceCredibility(
  source: ExternalSource,
  topic: string,
  apiKey?: string,
  provider?: 'openai' | 'anthropic'
): Promise<number> {
  const prompt = `Evaluate the credibility and relevance of this source for a blog post about "${topic}":

URL: ${source.url}
Domain: ${source.domain}
Title: ${source.title}
Snippet: ${source.snippet}

Rate from 0.0 to 1.0 based on:
- Domain authority (is it a reputable source?)
- Relevance to the topic
- Recency and accuracy
- Expertise of the author/organization

Return ONLY a number between 0.0 and 1.0, nothing else.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a source credibility evaluator. Respond with only a number.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 10,
      apiKey,
      provider,
    });

    const content = response.choices[0]?.message?.content;
    const contentText = typeof content === 'string' ? content : '0.5';
    const score = parseFloat(contentText.trim());
    
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    
  } catch (error) {
    console.error('[Web Research] Error evaluating source:', error);
    return 0.5;
  }
}

/**
 * Perform comprehensive research for a blog post
 * Returns curated list of authoritative external sources
 */
export async function researchTopic(
  topic: string,
  outline: string,
  apiKey?: string,
  provider?: 'openai' | 'anthropic'
): Promise<ExternalSource[]> {
  console.log(`[Web Research] Starting research for topic: ${topic}`);
  
  // Step 1: Identify what to research
  const queries = await identifyResearchNeeds(topic, outline, apiKey, provider);
  
  if (queries.length === 0) {
    console.log('[Web Research] No research queries identified');
    return [];
  }
  
  // Step 2: Search for each query
  const allSources: ExternalSource[] = [];
  
  for (const query of queries) {
    const sources = await searchWeb(query.query);
    allSources.push(...sources);
  }
  
  if (allSources.length === 0) {
    console.log('[Web Research] No sources found');
    return [];
  }
  
  // Step 3: Evaluate and filter sources
  const evaluatedSources = await Promise.all(
    allSources.map(async (source) => {
      const relevance = await evaluateSourceCredibility(source, topic, apiKey, provider);
      return { ...source, relevance };
    })
  );
  
  // Step 4: Return top sources (relevance > 0.6)
  const topSources = evaluatedSources
    .filter(source => source.relevance > 0.6)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5); // Top 5 sources
  
  console.log(`[Web Research] Found ${topSources.length} high-quality sources`);
  return topSources;
}

/**
 * Save external sources to database for a post
 */
export async function saveExternalSources(
  postId: number,
  sources: ExternalSource[]
): Promise<void> {
  console.log(`[Web Research] Saving ${sources.length} external sources for post ${postId}`);
  
  for (const source of sources) {
    await createExternalSource({
      postId,
      url: source.url,
      title: source.title,
      domain: source.domain,
      citedAt: new Date(),
    });
  }
  
  console.log(`[Web Research] Successfully saved external sources`);
}

/**
 * Generate citation text for sources
 * Creates natural citations to insert into blog content
 */
export async function generateCitations(
  sources: ExternalSource[],
  apiKey?: string,
  provider?: 'openai' | 'anthropic'
): Promise<string[]> {
  if (sources.length === 0) {
    return [];
  }
  
  const prompt = `Generate natural, inline citations for these sources. Each citation should be a complete sentence that references the source naturally.

Sources:
${sources.map((s, i) => `${i + 1}. ${s.title} (${s.domain})\n   ${s.snippet}`).join('\n\n')}

Generate ${sources.length} citation sentences that could be naturally inserted into a blog post. Each should:
- Reference the source naturally (e.g., "According to [Source]..." or "Research from [Source] shows...")
- Include a key insight from the snippet
- Be informative and add value to the content

Return as a JSON array of strings:
["citation 1", "citation 2", ...]

Return ONLY the JSON array, no other text.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a citation generator. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      apiKey,
      provider,
    });

    const content = response.choices[0]?.message?.content;
    const contentText = typeof content === 'string' ? content : '[]';
    const citations = JSON.parse(contentText) as string[];
    
    return citations;
    
  } catch (error) {
    console.error('[Web Research] Error generating citations:', error);
    return [];
  }
}

/**
 * Format sources as a reference list for the end of the post
 */
export function formatReferenceList(sources: ExternalSource[]): string {
  if (sources.length === 0) {
    return '';
  }
  
  const references = sources.map((source, i) => {
    return `${i + 1}. [${source.title}](${source.url}) - ${source.domain}`;
  }).join('\n');
  
  return `\n\n## References\n\n${references}`;
}

