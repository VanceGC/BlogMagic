// AI Blog Automation Chrome Extension - Background Service Worker

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
    // Create context menu for selected text
    chrome.contextMenus.create({
        id: 'generate-from-selection',
        title: 'Generate blog post from "%s"',
        contexts: ['selection']
    });
    
    // Create context menu for page
    chrome.contextMenus.create({
        id: 'generate-from-page',
        title: 'Generate blog post from this page',
        contexts: ['page']
    });
    
    // Create context menu for links
    chrome.contextMenus.create({
        id: 'generate-from-link',
        title: 'Generate blog post from this link',
        contexts: ['link']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const result = await chrome.storage.sync.get(['platformUrl']);
    const platformUrl = result.platformUrl || '';
    
    if (!platformUrl) {
        chrome.runtime.openOptionsPage();
        return;
    }
    
    switch (info.menuItemId) {
        case 'generate-from-selection':
            const selectedText = info.selectionText;
            chrome.tabs.create({
                url: `${platformUrl}/generate?topic=${encodeURIComponent(selectedText)}`
            });
            break;
            
        case 'generate-from-page':
            chrome.tabs.sendMessage(tab.id, { action: 'extractContent' }, (response) => {
                if (response?.content) {
                    chrome.tabs.create({
                        url: `${platformUrl}/generate?source=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(response.title || '')}`
                    });
                } else {
                    chrome.tabs.create({
                        url: `${platformUrl}/generate?source=${encodeURIComponent(tab.url)}`
                    });
                }
            });
            break;
            
        case 'generate-from-link':
            const linkUrl = info.linkUrl;
            chrome.tabs.create({
                url: `${platformUrl}/generate?source=${encodeURIComponent(linkUrl)}`
            });
            break;
    }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openPlatform') {
        chrome.storage.sync.get(['platformUrl'], (result) => {
            const platformUrl = result.platformUrl || '';
            if (platformUrl) {
                chrome.tabs.create({ url: platformUrl + (request.path || '') });
            }
        });
    }
    
    return true;
});

// Badge notification for new posts (optional feature)
async function updateBadge() {
    const result = await chrome.storage.sync.get(['platformUrl', 'apiKey']);
    const platformUrl = result.platformUrl || '';
    const apiKey = result.apiKey || '';
    
    if (!platformUrl) return;
    
    try {
        const response = await fetch(`${platformUrl}/api/trpc/posts.list`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const posts = data.result?.data || [];
            const draftCount = posts.filter(p => p.status === 'draft').length;
            
            if (draftCount > 0) {
                chrome.action.setBadgeText({ text: draftCount.toString() });
                chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
            } else {
                chrome.action.setBadgeText({ text: '' });
            }
        }
    } catch (error) {
        console.error('Failed to update badge:', error);
    }
}

// Update badge every 5 minutes
chrome.alarms.create('updateBadge', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateBadge') {
        updateBadge();
    }
});

// Update badge on startup
updateBadge();

