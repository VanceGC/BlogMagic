/**
 * WordPress Site Scraper
 * 
 * Scrapes WordPress sites to build an internal link database for SEO optimization.
 * Fetches all posts and pages via WordPress REST API, extracts metadata, and stores
 * in the site_pages table for intelligent internal linking suggestions.
 */

import { createSitePage, deleteSitePagesByBlogConfigId } from '../db';

interface WordPressPost {
  id: number;
  link: string;
  title: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  date: string;
  modified: string;
}

/**
 * Scrape a WordPress site and populate the site_pages table
 * @param blogConfigId - The blog configuration ID
 * @param siteUrl - The WordPress site URL (e.g., https://example.com)
 * @returns Number of pages scraped
 */
export async function scrapeWordPressSite(
  blogConfigId: number,
  siteUrl: string
): Promise<number> {
  console.log(`[WordPress Scraper] Starting scrape for blog config ${blogConfigId}: ${siteUrl}`);
  
  try {
    // Clear existing pages for this blog config
    await deleteSitePagesByBlogConfigId(blogConfigId);
    console.log(`[WordPress Scraper] Cleared existing pages for blog config ${blogConfigId}`);
    
    // Normalize site URL
    const baseUrl = siteUrl.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/wp-json/wp/v2`;
    
    let totalScraped = 0;
    
    // Scrape posts
    const posts = await fetchAllWordPressPosts(`${apiUrl}/posts`);
    console.log(`[WordPress Scraper] Found ${posts.length} posts`);
    
    for (const post of posts) {
      await saveSitePage(blogConfigId, post);
      totalScraped++;
    }
    
    // Scrape pages
    const pages = await fetchAllWordPressPosts(`${apiUrl}/pages`);
    console.log(`[WordPress Scraper] Found ${pages.length} pages`);
    
    for (const page of pages) {
      await saveSitePage(blogConfigId, page);
      totalScraped++;
    }
    
    console.log(`[WordPress Scraper] Successfully scraped ${totalScraped} pages for blog config ${blogConfigId}`);
    return totalScraped;
    
  } catch (error) {
    console.error(`[WordPress Scraper] Error scraping site:`, error);
    throw new Error(`Failed to scrape WordPress site: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch all posts/pages from WordPress REST API with pagination
 */
async function fetchAllWordPressPosts(url: string): Promise<WordPressPost[]> {
  const allPosts: WordPressPost[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    try {
      const response = await fetch(`${url}?per_page=100&page=${page}&_embed=1`, {
        headers: {
          'User-Agent': 'BlogMagic/1.0',
        },
      });
      
      if (!response.ok) {
        if (response.status === 400 && page > 1) {
          // No more pages
          hasMore = false;
          break;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const posts = await response.json() as WordPressPost[];
      
      if (posts.length === 0) {
        hasMore = false;
      } else {
        allPosts.push(...posts);
        page++;
      }
      
      // Check if there are more pages via Link header
      const linkHeader = response.headers.get('Link');
      if (!linkHeader || !linkHeader.includes('rel="next"')) {
        hasMore = false;
      }
      
    } catch (error) {
      console.error(`[WordPress Scraper] Error fetching page ${page}:`, error);
      hasMore = false;
    }
  }
  
  return allPosts;
}

/**
 * Save a WordPress post/page to the site_pages table
 */
async function saveSitePage(blogConfigId: number, post: WordPressPost): Promise<void> {
  // Extract plain text from HTML
  const stripHtml = (html: string): string => {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  // Extract keywords from content (simple keyword extraction)
  const extractKeywords = (text: string): string => {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4); // Only words longer than 4 characters
    
    // Get unique words and take top 20 by frequency
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
    
    return topWords.join(', ');
  };
  
  const title = stripHtml(post.title.rendered);
  const excerpt = stripHtml(post.excerpt.rendered).slice(0, 500);
  const content = stripHtml(post.content.rendered);
  const keywords = extractKeywords(content);
  
  await createSitePage({
    blogConfigId,
    url: post.link,
    title,
    excerpt,
    content: content.slice(0, 10000), // Limit content size
    keywords,
    scrapedAt: new Date(),
  });
}

/**
 * Get relevant internal links for a given topic
 * @param blogConfigId - The blog configuration ID
 * @param topic - The topic/keywords to search for
 * @param limit - Maximum number of links to return
 * @returns Array of relevant site pages
 */
export async function getRelevantInternalLinks(
  blogConfigId: number,
  topic: string,
  limit: number = 5
): Promise<Array<{ url: string; title: string; excerpt: string }>> {
  const { getSitePagesByBlogConfigId } = await import('../db');
  
  const allPages = await getSitePagesByBlogConfigId(blogConfigId);
  
  if (allPages.length === 0) {
    return [];
  }
  
  // Simple relevance scoring based on keyword matching
  const topicWords = topic.toLowerCase().split(/\s+/);
  
  const scoredPages = allPages.map(page => {
    let score = 0;
    const searchText = `${page.title} ${page.excerpt} ${page.keywords}`.toLowerCase();
    
    topicWords.forEach(word => {
      if (searchText.includes(word)) {
        score += 1;
      }
    });
    
    return { page, score };
  });
  
  // Sort by score and return top results
  const topPages = scoredPages
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ page }) => ({
      url: page.url,
      title: page.title,
      excerpt: page.excerpt || '',
    }));
  
  return topPages;
}

