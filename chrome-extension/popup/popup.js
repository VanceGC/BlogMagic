// AI Blog Automation Chrome Extension - Popup Script

let platformUrl = '';

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadStats();
    await loadCurrentPage();
    setupEventListeners();
});

// Load settings from storage
async function loadSettings() {
    const result = await chrome.storage.sync.get(['platformUrl', 'apiKey']);
    platformUrl = result.platformUrl || '';
    
    if (!platformUrl) {
        document.getElementById('not-configured').style.display = 'block';
        document.getElementById('main-content').style.display = 'none';
    } else {
        document.getElementById('not-configured').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    }
}

// Load statistics from platform
async function loadStats() {
    if (!platformUrl) return;
    
    try {
        const result = await chrome.storage.sync.get(['apiKey']);
        const response = await fetch(`${platformUrl}/api/trpc/posts.list`, {
            headers: {
                'Authorization': `Bearer ${result.apiKey || ''}`,
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const posts = data.result?.data || [];
            
            const totalPosts = posts.length;
            const draftPosts = posts.filter(p => p.status === 'draft').length;
            const publishedPosts = posts.filter(p => p.status === 'published').length;
            
            document.getElementById('total-posts').textContent = totalPosts;
            document.getElementById('draft-posts').textContent = draftPosts;
            document.getElementById('published-posts').textContent = publishedPosts;
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
        document.getElementById('total-posts').textContent = '?';
        document.getElementById('draft-posts').textContent = '?';
        document.getElementById('published-posts').textContent = '?';
    }
}

// Load current page URL
async function loadCurrentPage() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
            const url = new URL(tab.url);
            document.getElementById('current-url').textContent = url.hostname + url.pathname;
        }
    } catch (error) {
        console.error('Failed to get current tab:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Open options page
    document.getElementById('open-options')?.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    // Generate new post
    document.getElementById('generate-post')?.addEventListener('click', () => {
        openPlatformPage('/generate');
    });
    
    // View posts
    document.getElementById('view-posts')?.addEventListener('click', () => {
        openPlatformPage('/posts');
    });
    
    // Manage blogs
    document.getElementById('manage-blogs')?.addEventListener('click', () => {
        openPlatformPage('/blogs');
    });
    
    // Quick actions
    document.getElementById('open-dashboard')?.addEventListener('click', () => {
        openPlatformPage('/');
    });
    
    document.getElementById('open-analytics')?.addEventListener('click', () => {
        openPlatformPage('/analytics');
    });
    
    document.getElementById('open-settings')?.addEventListener('click', () => {
        openPlatformPage('/settings');
    });
    
    document.getElementById('open-help')?.addEventListener('click', () => {
        openPlatformPage('/help');
    });
    
    // Generate from current page
    document.getElementById('generate-from-page')?.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
            // Send message to content script to extract page content
            chrome.tabs.sendMessage(tab.id, { action: 'extractContent' }, (response) => {
                if (response?.content) {
                    openPlatformPage(`/generate?source=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(response.title || '')}`);
                }
            });
        }
    });
    
    // Footer links
    document.getElementById('footer-settings')?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });
    
    document.getElementById('footer-logout')?.addEventListener('click', (e) => {
        e.preventDefault();
        openPlatformPage('/logout');
    });
}

// Open platform page in new tab
function openPlatformPage(path) {
    if (platformUrl) {
        chrome.tabs.create({ url: platformUrl + path });
    }
}

