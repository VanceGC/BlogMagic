import axios from 'axios';

interface WordPressPost {
  title: string;
  content: string;
  excerpt?: string;
  status: 'draft' | 'publish';
  featured_media?: number;
  meta?: {
    _yoast_wpseo_title?: string;
    _yoast_wpseo_metadesc?: string;
    _yoast_wpseo_focuskw?: string;
  };
}

interface WordPressCredentials {
  url: string;
  username: string;
  appPassword: string;
}

/**
 * Upload image to WordPress media library
 */
export async function uploadImageToWordPress(
  credentials: WordPressCredentials,
  imageUrl: string,
  title: string
): Promise<number> {
  try {
    // Download image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Upload to WordPress
    const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
    
    const response = await axios.post(
      `${credentials.url}/wp-json/wp/v2/media`,
      imageBuffer,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': imageResponse.headers['content-type'] || 'image/jpeg',
          'Content-Disposition': `attachment; filename="${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg"`
        }
      }
    );

    return response.data.id;
  } catch (error) {
    console.error('Failed to upload image to WordPress:', error);
    throw new Error('Failed to upload featured image');
  }
}

/**
 * Publish post to WordPress
 */
export async function publishToWordPress(
  credentials: WordPressCredentials,
  post: {
    title: string;
    content: string;
    excerpt?: string;
    seoTitle?: string;
    seoDescription?: string;
    keywords?: string;
    featuredImageUrl?: string;
    status?: 'draft' | 'publish';
  }
): Promise<string> {
  try {
    const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');

    // Upload featured image if provided
    let featuredMediaId: number | undefined;
    if (post.featuredImageUrl) {
      try {
        featuredMediaId = await uploadImageToWordPress(credentials, post.featuredImageUrl, post.title);
      } catch (error) {
        console.error('Failed to upload featured image, continuing without it:', error);
      }
    }

    // Prepare post data
    const postData: WordPressPost = {
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      status: post.status || 'draft',
      featured_media: featuredMediaId,
    };

    // Add Yoast SEO meta if SEO data is provided
    if (post.seoTitle || post.seoDescription || post.keywords) {
      postData.meta = {
        _yoast_wpseo_title: post.seoTitle,
        _yoast_wpseo_metadesc: post.seoDescription,
        _yoast_wpseo_focuskw: post.keywords,
      };
    }

    // Publish to WordPress
    const response = await axios.post(
      `${credentials.url}/wp-json/wp/v2/posts`,
      postData,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.id.toString();
  } catch (error: any) {
    console.error('Failed to publish to WordPress:', error.response?.data || error.message);
    throw new Error(`WordPress publish failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Update existing WordPress post
 */
export async function updateWordPressPost(
  credentials: WordPressCredentials,
  postId: string,
  updates: Partial<WordPressPost>
): Promise<void> {
  try {
    const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');

    await axios.post(
      `${credentials.url}/wp-json/wp/v2/posts/${postId}`,
      updates,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error: any) {
    console.error('Failed to update WordPress post:', error.response?.data || error.message);
    throw new Error(`WordPress update failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Test WordPress connection
 */
export async function testWordPressConnection(credentials: WordPressCredentials): Promise<boolean> {
  try {
    const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
    
    await axios.get(
      `${credentials.url}/wp-json/wp/v2/users/me`,
      {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error('WordPress connection test failed:', error);
    return false;
  }
}

