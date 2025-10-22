// AI Blog Automation Chrome Extension - Content Script

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
        const content = extractPageContent();
        sendResponse(content);
    }
    return true;
});

// Extract relevant content from the current page
function extractPageContent() {
    // Get page title
    const title = document.title;
    
    // Get meta description
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    
    // Get main content (try various selectors)
    let mainContent = '';
    
    // Try to find main content area
    const contentSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.content',
        '.post-content',
        '.entry-content',
        '#content',
        'body'
    ];
    
    for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            mainContent = extractTextFromElement(element);
            if (mainContent.length > 100) {
                break;
            }
        }
    }
    
    // Get all headings
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .map(h => h.textContent.trim())
        .filter(h => h.length > 0)
        .slice(0, 10);
    
    // Get all images
    const images = Array.from(document.querySelectorAll('img'))
        .map(img => ({
            src: img.src,
            alt: img.alt
        }))
        .filter(img => img.src && !img.src.includes('data:'))
        .slice(0, 5);
    
    return {
        title,
        metaDescription,
        content: mainContent.substring(0, 5000), // Limit to 5000 chars
        headings,
        images,
        url: window.location.href
    };
}

// Extract clean text from an element
function extractTextFromElement(element) {
    // Clone the element to avoid modifying the page
    const clone = element.cloneNode(true);
    
    // Remove script and style elements
    const unwanted = clone.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ad, .social-share');
    unwanted.forEach(el => el.remove());
    
    // Get text content
    let text = clone.textContent || '';
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
}

// Add a subtle indicator that the extension is active (optional)
function addExtensionIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'ai-blog-automation-indicator';
    indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 999999;
        cursor: pointer;
        transition: all 0.3s;
        opacity: 0;
        transform: translateY(20px);
    `;
    indicator.textContent = '✨ Generate blog post from this page';
    
    indicator.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openPlatform', path: '/generate?source=' + encodeURIComponent(window.location.href) });
    });
    
    document.body.appendChild(indicator);
    
    // Fade in
    setTimeout(() => {
        indicator.style.opacity = '1';
        indicator.style.transform = 'translateY(0)';
    }, 100);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(20px)';
        setTimeout(() => indicator.remove(), 300);
    }, 5000);
}

// Only show indicator on article pages (heuristic)
if (document.querySelector('article') || document.querySelector('.post-content') || document.querySelector('.entry-content')) {
    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
        // Uncomment to enable the indicator
        // addExtensionIndicator();
    } else {
        window.addEventListener('load', () => {
            // Uncomment to enable the indicator
            // addExtensionIndicator();
        });
    }
}

