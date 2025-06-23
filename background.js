// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    // Create main context menu
    chrome.contextMenus.create({
        id: 'colorChanger',
        title: 'Change Background Color',
        contexts: ['page']
    });
    
    // Create submenu items for quick color changes
    const colors = [
        { id: 'white', title: 'White', color: '#ffffff' },
        { id: 'light-gray', title: 'Light Gray', color: '#f0f0f0' },
        { id: 'dark-gray', title: 'Dark Gray', color: '#333333' },
        { id: 'black', title: 'Black', color: '#000000' },
        { id: 'red', title: 'Red', color: '#ff6b6b' },
        { id: 'blue', title: 'Blue', color: '#45b7d1' },
        { id: 'green', title: 'Green', color: '#96ceb4' },
        { id: 'yellow', title: 'Yellow', color: '#feca57' },
        { id: 'reset', title: 'Reset to Original', color: 'reset' }
    ];
    
    colors.forEach(colorItem => {
        chrome.contextMenus.create({
            id: colorItem.id,
            title: colorItem.title,
            parentId: 'colorChanger',
            contexts: ['page']
        });
    });
    
    console.log('Background Color Changer extension installed!');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const colorMap = {
        'white': '#ffffff',
        'light-gray': '#f0f0f0',
        'dark-gray': '#333333',
        'black': '#000000',
        'red': '#ff6b6b',
        'blue': '#45b7d1',
        'green': '#96ceb4',
        'yellow': '#feca57'
    };
    
    try {
        if (info.menuItemId === 'reset') {
            // Reset background
            await chrome.tabs.sendMessage(tab.id, {
                action: 'resetBackground'
            });
            
            // Remove stored color
            await chrome.storage.local.remove([`color_${tab.id}`]);
            
        } else if (colorMap[info.menuItemId]) {
            // Change to selected color
            const color = colorMap[info.menuItemId];
            
            await chrome.tabs.sendMessage(tab.id, {
                action: 'changeBackground',
                color: color
            });
            
            // Store the color
            await chrome.storage.local.set({
                [`color_${tab.id}`]: color
            });
        }
    } catch (error) {
        console.error('Error handling context menu click:', error);
    }
});

// Clean up storage when tabs are closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
    try {
        await chrome.storage.local.remove([`color_${tabId}`]);
    } catch (error) {
        console.error('Error cleaning up storage:', error);
    }
});

// Restore background color when navigating to a new page in the same tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        try {
            // Get stored color for this tab
            const result = await chrome.storage.local.get([`color_${tabId}`]);
            const storedColor = result[`color_${tabId}`];
            
            if (storedColor) {
                // Small delay to ensure page is fully loaded
                setTimeout(async () => {
                    try {
                        await chrome.tabs.sendMessage(tabId, {
                            action: 'changeBackground',
                            color: storedColor
                        });
                    } catch (error) {
                        // Content script might not be ready yet, ignore error
                        console.log('Content script not ready, color will be applied when ready');
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Error restoring background color:', error);
        }
    }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'colorChanged') {
        console.log('Background color changed:', message.color);
        sendResponse({ success: true });
    }
});