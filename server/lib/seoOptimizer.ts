/**
 * SEO Optimization Module
 * 
 * Analyzes blog post content for SEO quality and provides AI-powered improvements.
 * Checks keyword density, readability, meta descriptions, header structure,
 * and link balance. Suggests improvements and can regenerate content sections.
 */

import { invokeLLM } from '../_core/llm';

interface SEOAnalysis {
  score: number; // 0-100 overall SEO score
  keywordDensity: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  readability: {
    score: number;
    fleschScore: number;
    issues: string[];
    suggestions: string[];
  };
  structure: {
    score: number;
    hasH1: boolean;
    h2Count: number;
    h3Count: number;
    issues: string[];
    suggestions: string[];
  };
  metaDescription: {
    score: number;
    length: number;
    hasKeyword: boolean;
    issues: string[];
    suggestions: string[];
  };
  links: {
    score: number;
    internalCount: number;
    externalCount: number;
    issues: string[];
    suggestions: string[];
  };
}

interface OptimizedContent {
  title: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  improvements: string[];
}

/**
 * Calculate Flesch Reading Ease score
 * Higher score = easier to read (0-100 scale)
 * 90-100: Very Easy
 * 80-89: Easy
 * 70-79: Fairly Easy
 * 60-69: Standard
 * 50-59: Fairly Difficult
 * 30-49: Difficult
 * 0-29: Very Confusing
 */
function calculateFleschScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);
  
  if (sentences.length === 0 || words.length === 0) {
    return 0;
  }
  
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Count syllables in a word (simple approximation)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  const vowels = word.match(/[aeiouy]+/g);
  let count = vowels ? vowels.length : 1;
  
  // Adjust for silent e
  if (word.endsWith('e')) count--;
  
  // Ensure at least 1 syllable
  return Math.max(1, count);
}

/**
 * Extract keywords from text (simple frequency-based)
 */
function extractKeywords(text: string, limit: number = 10): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 4);
  
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });
  
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Calculate keyword density
 */
function calculateKeywordDensity(text: string, keyword: string): number {
  const normalizedText = text.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();
  const words = text.split(/\s+/).length;
  
  const keywordOccurrences = (normalizedText.match(new RegExp(normalizedKeyword, 'g')) || []).length;
  
  return (keywordOccurrences / words) * 100;
}

/**
 * Analyze header structure
 */
function analyzeHeaders(content: string): { hasH1: boolean; h2Count: number; h3Count: number } {
  const h1Matches = content.match(/^#\s+/gm) || [];
  const h2Matches = content.match(/^##\s+/gm) || [];
  const h3Matches = content.match(/^###\s+/gm) || [];
  
  return {
    hasH1: h1Matches.length > 0,
    h2Count: h2Matches.length,
    h3Count: h3Matches.length,
  };
}

/**
 * Count links in content
 */
function countLinks(content: string): { internal: number; external: number } {
  const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  
  let internal = 0;
  let external = 0;
  
  linkMatches.forEach(link => {
    const urlMatch = link.match(/\(([^)]+)\)/);
    if (urlMatch) {
      const url = urlMatch[1];
      if (url.startsWith('http://') || url.startsWith('https://')) {
        external++;
      } else {
        internal++;
      }
    }
  });
  
  return { internal, external };
}

/**
 * Perform comprehensive SEO analysis on blog post content
 */
export async function analyzeSEO(
  title: string,
  content: string,
  excerpt: string,
  targetKeyword?: string
): Promise<SEOAnalysis> {
  console.log('[SEO Optimizer] Starting SEO analysis');
  
  const fullText = `${title} ${content} ${excerpt}`;
  const keywords = targetKeyword ? [targetKeyword.toLowerCase()] : extractKeywords(fullText, 3);
  const primaryKeyword = keywords[0] || '';
  
  // Keyword Density Analysis
  const keywordDensity = calculateKeywordDensity(fullText, primaryKeyword);
  const keywordScore = keywordDensity >= 1 && keywordDensity <= 3 ? 100 : 
                       keywordDensity < 1 ? 50 : 30;
  const keywordIssues: string[] = [];
  const keywordSuggestions: string[] = [];
  
  if (keywordDensity < 1) {
    keywordIssues.push(`Low keyword density (${keywordDensity.toFixed(2)}%)`);
    keywordSuggestions.push(`Increase usage of "${primaryKeyword}" to 1-3% density`);
  } else if (keywordDensity > 3) {
    keywordIssues.push(`High keyword density (${keywordDensity.toFixed(2)}%) - may appear spammy`);
    keywordSuggestions.push(`Reduce usage of "${primaryKeyword}" to avoid keyword stuffing`);
  }
  
  // Readability Analysis
  const fleschScore = calculateFleschScore(content);
  const readabilityScore = fleschScore >= 60 ? 100 : fleschScore >= 50 ? 80 : 60;
  const readabilityIssues: string[] = [];
  const readabilitySuggestions: string[] = [];
  
  if (fleschScore < 60) {
    readabilityIssues.push(`Flesch score ${fleschScore.toFixed(0)} - content may be difficult to read`);
    readabilitySuggestions.push('Use shorter sentences and simpler words');
    readabilitySuggestions.push('Break up long paragraphs');
  }
  
  // Structure Analysis
  const headers = analyzeHeaders(content);
  let structureScore = 100;
  const structureIssues: string[] = [];
  const structureSuggestions: string[] = [];
  
  if (!headers.hasH1) {
    structureScore -= 30;
    structureIssues.push('Missing H1 header');
    structureSuggestions.push('Add a main H1 header with your primary keyword');
  }
  
  if (headers.h2Count < 3) {
    structureScore -= 20;
    structureIssues.push(`Only ${headers.h2Count} H2 headers - content may lack structure`);
    structureSuggestions.push('Add more H2 headers to break up content into sections');
  }
  
  // Meta Description Analysis
  const metaDescLength = excerpt.length;
  const metaHasKeyword = excerpt.toLowerCase().includes(primaryKeyword);
  let metaScore = 100;
  const metaIssues: string[] = [];
  const metaSuggestions: string[] = [];
  
  if (metaDescLength < 120) {
    metaScore -= 30;
    metaIssues.push(`Meta description too short (${metaDescLength} chars)`);
    metaSuggestions.push('Expand meta description to 120-160 characters');
  } else if (metaDescLength > 160) {
    metaScore -= 20;
    metaIssues.push(`Meta description too long (${metaDescLength} chars)`);
    metaSuggestions.push('Shorten meta description to 120-160 characters');
  }
  
  if (!metaHasKeyword) {
    metaScore -= 30;
    metaIssues.push('Meta description missing primary keyword');
    metaSuggestions.push(`Include "${primaryKeyword}" in meta description`);
  }
  
  // Link Analysis
  const links = countLinks(content);
  let linkScore = 100;
  const linkIssues: string[] = [];
  const linkSuggestions: string[] = [];
  
  if (links.internal < 2) {
    linkScore -= 30;
    linkIssues.push(`Only ${links.internal} internal links`);
    linkSuggestions.push('Add 2-5 internal links to related content');
  }
  
  if (links.external < 1) {
    linkScore -= 20;
    linkIssues.push('No external links to authoritative sources');
    linkSuggestions.push('Add 1-3 external links to credible sources');
  }
  
  // Calculate overall score
  const overallScore = Math.round(
    (keywordScore * 0.25) +
    (readabilityScore * 0.2) +
    (structureScore * 0.25) +
    (metaScore * 0.15) +
    (linkScore * 0.15)
  );
  
  console.log(`[SEO Optimizer] Analysis complete - Overall score: ${overallScore}/100`);
  
  return {
    score: overallScore,
    keywordDensity: {
      score: keywordScore,
      issues: keywordIssues,
      suggestions: keywordSuggestions,
    },
    readability: {
      score: readabilityScore,
      fleschScore,
      issues: readabilityIssues,
      suggestions: readabilitySuggestions,
    },
    structure: {
      score: structureScore,
      hasH1: headers.hasH1,
      h2Count: headers.h2Count,
      h3Count: headers.h3Count,
      issues: structureIssues,
      suggestions: structureSuggestions,
    },
    metaDescription: {
      score: metaScore,
      length: metaDescLength,
      hasKeyword: metaHasKeyword,
      issues: metaIssues,
      suggestions: metaSuggestions,
    },
    links: {
      score: linkScore,
      internalCount: links.internal,
      externalCount: links.external,
      issues: linkIssues,
      suggestions: linkSuggestions,
    },
  };
}

/**
 * Use AI to optimize content based on SEO analysis
 */
export async function optimizeContent(
  title: string,
  content: string,
  excerpt: string,
  analysis: SEOAnalysis,
  targetKeyword?: string,
  apiKey?: string,
  provider?: 'openai' | 'anthropic'
): Promise<OptimizedContent> {
  console.log('[SEO Optimizer] Starting AI-powered content optimization');
  
  const allIssues = [
    ...analysis.keywordDensity.issues,
    ...analysis.readability.issues,
    ...analysis.structure.issues,
    ...analysis.metaDescription.issues,
    ...analysis.links.issues,
  ];
  
  const allSuggestions = [
    ...analysis.keywordDensity.suggestions,
    ...analysis.readability.suggestions,
    ...analysis.structure.suggestions,
    ...analysis.metaDescription.suggestions,
    ...analysis.links.suggestions,
  ];
  
  if (allIssues.length === 0) {
    console.log('[SEO Optimizer] No optimization needed - content already excellent');
    return {
      title,
      content,
      excerpt,
      metaDescription: excerpt,
      improvements: ['Content already optimized for SEO'],
    };
  }
  
  const prompt = `You are an SEO expert optimizing blog content. 

Current content:
Title: ${title}
Excerpt: ${excerpt}
Content:
${content}

SEO Analysis Results:
- Overall Score: ${analysis.score}/100
- Issues Found:
${allIssues.map(issue => `  * ${issue}`).join('\n')}

- Suggestions:
${allSuggestions.map(suggestion => `  * ${suggestion}`).join('\n')}

${targetKeyword ? `Target Keyword: ${targetKeyword}` : ''}

Please optimize this content to address all SEO issues while maintaining quality and readability. Return your response as JSON with this structure:

{
  "title": "optimized title (include keyword if provided)",
  "content": "optimized content (maintain markdown format, improve structure, readability, keyword usage, add headers)",
  "excerpt": "optimized excerpt (120-160 chars, include keyword)",
  "metaDescription": "SEO meta description (120-160 chars, compelling, include keyword)",
  "improvements": ["list of specific improvements made"]
}

Important:
- Keep the same tone and style
- Maintain all factual information
- Improve readability with shorter sentences
- Add proper H2/H3 headers if missing
- Ensure keyword density is 1-3%
- Make content scannable and engaging

Return ONLY the JSON object, no other text.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are an SEO optimization expert. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 8000,
      apiKey,
      provider,
    });

    const responseContent = response.choices[0]?.message?.content;
    const contentText = typeof responseContent === 'string' ? responseContent : '{}';
    const optimized = JSON.parse(contentText) as OptimizedContent;
    
    console.log(`[SEO Optimizer] Optimization complete - ${optimized.improvements.length} improvements made`);
    return optimized;
    
  } catch (error) {
    console.error('[SEO Optimizer] Error optimizing content:', error);
    // Return original content if optimization fails
    return {
      title,
      content,
      excerpt,
      metaDescription: excerpt,
      improvements: ['Optimization failed - using original content'],
    };
  }
}

/**
 * Perform full SEO optimization workflow
 * Analyzes content and applies AI improvements if score is below threshold
 */
export async function performSEOOptimization(
  title: string,
  content: string,
  excerpt: string,
  targetKeyword?: string,
  threshold: number = 70,
  apiKey?: string,
  provider?: 'openai' | 'anthropic'
): Promise<{ optimized: OptimizedContent; analysis: SEOAnalysis }> {
  console.log('[SEO Optimizer] Starting full SEO optimization workflow');
  
  // Step 1: Analyze current content
  const analysis = await analyzeSEO(title, content, excerpt, targetKeyword);
  
  console.log(`[SEO Optimizer] Initial SEO score: ${analysis.score}/100 (threshold: ${threshold})`);
  
  // Step 2: Optimize if below threshold
  if (analysis.score < threshold) {
    console.log('[SEO Optimizer] Score below threshold - applying AI optimization');
    const optimized = await optimizeContent(title, content, excerpt, analysis, targetKeyword, apiKey, provider);
    
    // Re-analyze optimized content
    const newAnalysis = await analyzeSEO(
      optimized.title,
      optimized.content,
      optimized.excerpt,
      targetKeyword
    );
    
    console.log(`[SEO Optimizer] New SEO score after optimization: ${newAnalysis.score}/100`);
    
    return { optimized, analysis: newAnalysis };
  } else {
    console.log('[SEO Optimizer] Score above threshold - no optimization needed');
    return {
      optimized: {
        title,
        content,
        excerpt,
        metaDescription: excerpt,
        improvements: ['Content already meets SEO standards'],
      },
      analysis,
    };
  }
}

