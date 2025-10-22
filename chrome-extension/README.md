# AI Blog Automation Chrome Extension

Quick access to your AI Blog Automation platform directly from your browser. Generate blog posts from any webpage, manage your content, and stay updated with your blog automation workflow.

## Features

- **Quick Access Popup**: View stats and access platform features with one click
- **Context Menu Integration**: Right-click to generate posts from any page or selected text
- **Content Extraction**: Automatically extract relevant content from webpages
- **Badge Notifications**: See draft post count at a glance
- **Seamless Navigation**: Jump directly to any section of your platform

## Installation

### From Source (Development)

1. **Download Extension**:
   - Download or clone this repository
   - Locate the `chrome-extension` folder

2. **Enable Developer Mode**:
   - Open Chrome and go to `chrome://extensions/`
   - Toggle "Developer mode" in the top right

3. **Load Extension**:
   - Click "Load unpacked"
   - Select the `chrome-extension` folder
   - The extension icon should appear in your toolbar

### From Chrome Web Store (Coming Soon)

Once published, you'll be able to install directly from the Chrome Web Store.

## Setup

1. **Click Extension Icon**: Click the AI Blog Automation icon in your toolbar
2. **Open Settings**: Click "Open Settings" or right-click icon → "Options"
3. **Configure Platform**:
   - Enter your platform URL (e.g., `https://your-platform.com`)
   - Optionally add your API key for authenticated requests
   - Click "Save Settings"
4. **Test Connection**: Click "Test Connection" to verify setup

## Usage

### Popup Interface

Click the extension icon to:
- View post statistics (total, drafts, published)
- Generate new posts
- View all posts
- Manage blog configurations
- Access platform sections (dashboard, analytics, settings)

### Context Menu

Right-click on any webpage to:
- **Generate from Page**: Create a blog post based on the current page
- **Generate from Selection**: Create a post about selected text
- **Generate from Link**: Create a post based on a linked page

### Keyboard Shortcuts (Optional)

You can set custom keyboard shortcuts in Chrome:
1. Go to `chrome://extensions/shortcuts`
2. Find "AI Blog Automation"
3. Set your preferred shortcuts

## Features in Detail

### Content Extraction

The extension intelligently extracts:
- Page title and meta description
- Main content area (articles, blog posts)
- Headings and structure
- Relevant images
- Clean text without ads or navigation

### Badge Notifications

The extension badge shows the number of draft posts:
- Updates every 5 minutes
- Click to view drafts in the platform
- Helps you stay on top of content review

### Privacy & Security

- All data is stored locally in Chrome sync storage
- API keys are stored securely
- No data is sent to third parties
- Content extraction happens locally in your browser

## Troubleshooting

### Extension not connecting?

1. Verify platform URL is correct
2. Check that platform is accessible
3. Try testing connection in settings
4. Check browser console for errors

### Context menu not working?

1. Refresh the page after installing extension
2. Check extension is enabled in `chrome://extensions/`
3. Verify you have the latest version

### Stats not loading?

1. Ensure you're logged into the platform
2. Check API key if required
3. Verify platform is online

## Permissions Explained

- **storage**: Save your settings and preferences
- **activeTab**: Access current page for content extraction
- **contextMenus**: Add right-click menu options
- **host_permissions**: Connect to your platform API

## Development

### File Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for context menus
├── content.js            # Content extraction script
├── options.html          # Settings page
├── options.js            # Settings page logic
├── popup/
│   ├── popup.html        # Popup interface
│   ├── popup.css         # Popup styles
│   └── popup.js          # Popup logic
└── icons/                # Extension icons
```

### Building

No build step required - the extension runs directly from source.

### Testing

1. Make changes to source files
2. Go to `chrome://extensions/`
3. Click reload icon on the extension card
4. Test your changes

## Support

For issues or questions:
- Check the main platform documentation
- Review browser console for errors
- Contact support through the platform

## Version History

### 1.0.0
- Initial release
- Popup interface with stats
- Context menu integration
- Content extraction
- Badge notifications
- Settings page

## License

Same license as the main AI Blog Automation platform.

