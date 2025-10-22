// AI Blog Automation Chrome Extension - Options Page Script

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('settings-form').addEventListener('submit', saveSettings);
document.getElementById('test-connection').addEventListener('click', testConnection);

// Load saved settings
async function loadSettings() {
    const result = await chrome.storage.sync.get(['platformUrl', 'apiKey']);
    
    if (result.platformUrl) {
        document.getElementById('platform-url').value = result.platformUrl;
    }
    
    if (result.apiKey) {
        document.getElementById('api-key').value = result.apiKey;
    }
}

// Save settings
async function saveSettings(e) {
    e.preventDefault();
    
    const platformUrl = document.getElementById('platform-url').value.trim();
    const apiKey = document.getElementById('api-key').value.trim();
    
    // Validate URL
    try {
        new URL(platformUrl);
    } catch (error) {
        showAlert('Please enter a valid URL', 'error');
        return;
    }
    
    // Remove trailing slash from URL
    const cleanUrl = platformUrl.replace(/\/$/, '');
    
    // Save to storage
    await chrome.storage.sync.set({
        platformUrl: cleanUrl,
        apiKey: apiKey
    });
    
    showAlert('Settings saved successfully!', 'success');
}

// Test connection to platform
async function testConnection() {
    const platformUrl = document.getElementById('platform-url').value.trim();
    const apiKey = document.getElementById('api-key').value.trim();
    
    if (!platformUrl) {
        showAlert('Please enter a platform URL first', 'error');
        return;
    }
    
    const button = document.getElementById('test-connection');
    const originalText = button.textContent;
    button.textContent = 'Testing...';
    button.disabled = true;
    
    try {
        const cleanUrl = platformUrl.replace(/\/$/, '');
        const headers = {};
        
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const response = await fetch(`${cleanUrl}/api/trpc/auth.me`, {
            headers: headers
        });
        
        if (response.ok) {
            showAlert('✓ Connection successful! Platform is reachable.', 'success');
        } else {
            showAlert('⚠ Platform is reachable but authentication may be required.', 'error');
        }
    } catch (error) {
        showAlert('✗ Connection failed. Please check the URL and try again.', 'error');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Show alert message
function showAlert(message, type) {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert ${type} show`;
    
    setTimeout(() => {
        alert.classList.remove('show');
    }, 5000);
}

