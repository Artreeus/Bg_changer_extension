// Store original background properties
let originalBackground = {
    color: null,
    image: null,
    stored: false
};

// Store original background on first load
function storeOriginalBackground() {
    if (!originalBackground.stored) {
        const computedStyle = window.getComputedStyle(document.body);
        originalBackground.color = computedStyle.backgroundColor;
        originalBackground.image = computedStyle.backgroundImage;
        originalBackground.stored = true;
        
        console.log('Original background stored:', originalBackground);
    }
}

// Function to change background color
function changeBackgroundColor(color) {
    // Store original background if not already stored
    storeOriginalBackground();
    
    // Apply new background color
    document.body.style.backgroundColor = color;
    document.body.style.backgroundImage = 'none'; // Remove any background image
    
    // Also apply to html element for better coverage
    document.documentElement.style.backgroundColor = color;
    
    console.log('Background color changed to:', color);
    
    // Notify background script
    chrome.runtime.sendMessage({
        action: 'colorChanged',
        color: color
    }).catch(error => {
        console.log('Could not send message to background script:', error);
    });
}

// Function to reset background color
function resetBackgroundColor() {
    if (originalBackground.stored) {
        // Restore original background
        document.body.style.backgroundColor = originalBackground.color;
        document.body.style.backgroundImage = originalBackground.image;
        document.documentElement.style.backgroundColor = '';
        
        console.log('Background reset to original');
    } else {
        // Fallback: remove inline styles
        document.body.style.backgroundColor = '';
        document.body.style.backgroundImage = '';
        document.documentElement.style.backgroundColor = '';
        
        console.log('Background reset (fallback)');
    }
    
    // Notify background script
    chrome.runtime.sendMessage({
        action: 'colorChanged',
        color: 'reset'
    }).catch(error => {
        console.log('Could not send message to background script:', error);
    });
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    try {
        if (message.action === 'changeBackground') {
            changeBackgroundColor(message.color);
            sendResponse({ success: true, message: 'Background color changed successfully' });
        } else if (message.action === 'resetBackground') {
            resetBackgroundColor();
            sendResponse({ success: true, message: 'Background reset successfully' });
        } else {
            sendResponse({ success: false, message: 'Unknown action' });
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: error.message });
    }
    
    return true; // Keep message channel open for async response
});

// Initialize: store original background when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', storeOriginalBackground);
} else {
    storeOriginalBackground();
}

// Also store original background when page becomes visible (for SPA navigation)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        setTimeout(storeOriginalBackground, 100);
    }
});

// Add some CSS to ensure smooth transitions
const style = document.createElement('style');
style.textContent = `
    body {
        transition: background-color 0.3s ease !important;
    }
`;
document.head.appendChild(style);

console.log('Background Color Changer content script loaded!');