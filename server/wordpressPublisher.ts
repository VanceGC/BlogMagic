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
    console.log('[WordPress Publisher] Processing image:', imageUrl);
    
    let imageBuffer: Buffer;
    let contentType: string;
    
    // If it's a local file path (starts with /uploads), read from filesystem
    if (imageUrl.startsWith('/uploads/')) {
      console.log('[WordPress Publisher] Reading image from local filesystem...');
      
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Convert URL path to filesystem path
      const filePath = path.join(process.cwd(), imageUrl);
      console.log('[WordPress Publisher] File path:', filePath);
      
      try {
        imageBuffer = await fs.readFile(filePath);
        // Determine content type from file extension
        const ext = path.extname(filePath).toLowerCase();
        contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
        console.log(`[WordPress Publisher] Image loaded from filesystem: ${imageBuffer.length} bytes, type: ${contentType}`);
      } catch (fsError: any) {
        console.error('[WordPress Publisher] Failed to read image from filesystem:', fsError.message);
        throw new Error(`Failed to read image file: ${fsError.message}`);
      }
    } else {
      // External URL - download via HTTP
      console.log('[WordPress Publisher] Downloading image from URL...');
      
      const imageResponse = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        maxContentLength: 50 * 1024 * 1024, // 50MB max
      });
      imageBuffer = Buffer.from(imageResponse.data);
      contentType = imageResponse.headers['content-type'] || 'image/png';
      console.log(`[WordPress Publisher] Image downloaded: ${imageBuffer.length} bytes, type: ${contentType}`);
    }

    // Upload to WordPress
    const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const filename = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${extension}`;
    
    console.log(`[WordPress Publisher] Uploading to WordPress as: ${filename}`);
    
    const response = await axios.post(
      `${credentials.url}/wp-json/wp/v2/media`,
      imageBuffer,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`
        },
        timeout: 60000, // 60 second timeout for upload
      }
    );

    console.log(`[WordPress Publisher] Image uploaded successfully, media ID: ${response.data.id}`);
    return response.data.id;
  } catch (error: any) {
    console.error('[WordPress Publisher] Failed to upload image to WordPress:', {
      imageUrl,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error(`Failed to upload featured image: ${error.message}`);
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

