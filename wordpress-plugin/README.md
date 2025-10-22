# AI Blog Automation WordPress Plugin

This WordPress plugin connects your WordPress site to the AI Blog Automation platform, enabling automatic publishing of AI-generated, SEO-optimized blog posts.

## Features

- **Automatic Post Publishing**: Receive and publish AI-generated posts via REST API
- **SEO Optimization**: Full integration with Yoast SEO for meta titles, descriptions, and focus keywords
- **Featured Images**: Automatically download and set AI-generated featured images
- **Flexible Publishing**: Choose between auto-publish or save as draft for review
- **Secure Authentication**: Webhook authentication using API keys and WordPress Application Passwords
- **Easy Configuration**: Simple admin interface for all settings

## Installation

1. **Upload Plugin**:
   - Download the plugin folder
   - Upload to `/wp-content/plugins/ai-blog-automation/`
   - Or upload the ZIP file via WordPress admin

2. **Activate Plugin**:
   - Go to WordPress Admin → Plugins
   - Find "AI Blog Automation"
   - Click "Activate"

3. **Configure Settings**:
   - Go to AI Blog → Settings
   - Configure your preferences

## Configuration

### Step 1: Create Application Password

1. Go to **Users → Profile** in WordPress admin
2. Scroll to **Application Passwords** section
3. Enter name: "AI Blog Automation"
4. Click **Add New Application Password**
5. Copy the generated password (you'll need this for the platform)

### Step 2: Configure Plugin Settings

1. Go to **AI Blog → Settings**
2. Set your preferences:
   - **Platform API URL**: Your AI Blog Automation platform URL
   - **Webhook API Key**: Optional security key for webhook authentication
   - **Auto Publish**: Choose to publish immediately or save as draft
   - **Default Category**: Category for new posts
   - **Default Author**: Author for new posts

### Step 3: Connect to Platform

1. Log in to your AI Blog Automation platform
2. Create a new blog configuration
3. Enter your WordPress details:
   - **WordPress URL**: Your site URL (e.g., https://yourblog.com)
   - **Username**: Your WordPress username
   - **Application Password**: The password from Step 1

## REST API Endpoints

### POST /wp-json/ai-blog-automation/v1/webhook

Receive and publish a new blog post.

**Headers**:
```
Authorization: Basic {base64(username:app_password)}
Content-Type: application/json
```

**Body**:
```json
{
  "title": "Post Title",
  "content": "<p>Post content in HTML</p>",
  "excerpt": "Brief excerpt",
  "seo_title": "SEO Title",
  "seo_description": "SEO meta description",
  "keywords": "focus keyword",
  "featured_image_url": "https://example.com/image.jpg"
}
```

**Response**:
```json
{
  "success": true,
  "post_id": 123,
  "post_url": "https://yourblog.com/post-slug",
  "edit_url": "https://yourblog.com/wp-admin/post.php?post=123&action=edit"
}
```

### GET /wp-json/ai-blog-automation/v1/test

Test the connection and authentication.

**Response**:
```json
{
  "success": true,
  "message": "Connection successful",
  "wordpress_version": "6.4",
  "plugin_version": "1.0.0"
}
```

## SEO Integration

The plugin automatically integrates with **Yoast SEO** if installed:

- Sets SEO title (`_yoast_wpseo_title`)
- Sets meta description (`_yoast_wpseo_metadesc`)
- Sets focus keyword (`_yoast_wpseo_focuskw`)

If Yoast SEO is not installed, the plugin will still work but SEO meta fields won't be set.

## Security

- Uses WordPress Application Passwords for secure API authentication
- Optional webhook API key for additional security
- All inputs are sanitized and validated
- Uses WordPress nonces for admin forms

## Troubleshooting

### Posts not appearing?

1. Check that Application Password is correct
2. Verify WordPress URL in platform is correct
3. Check WordPress error logs
4. Test connection using the "Test Connection" button in settings

### Featured images not uploading?

1. Ensure WordPress has write permissions to uploads folder
2. Check that image URLs are publicly accessible
3. Verify PHP `allow_url_fopen` is enabled

### SEO meta not saving?

1. Install and activate Yoast SEO plugin
2. Ensure Yoast SEO is up to date

## Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- WordPress REST API enabled
- Application Passwords enabled (WordPress 5.6+)

## Support

For issues or questions:
- Check the documentation at your AI Blog Automation platform
- Review WordPress error logs
- Contact support through the platform

## Changelog

### 1.0.0
- Initial release
- REST API webhook endpoint
- Yoast SEO integration
- Featured image handling
- Admin settings interface
- Connection testing

## License

GPL v2 or later

