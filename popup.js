// Get current tab and stored color on popup load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tab.id;
        
        // Get stored color for this tab
        const result = await chrome.storage.local.get([`color_${tabId}`]);
        const currentColor = result[`color_${tabId}`] || 'Default';
        
        // Update current color display
        document.getElementById('currentColor').textContent = `Current: ${currentColor}`;
        
        // Add event listeners for preset color buttons
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                changeBackgroundColor(color);
            });
        });
        
        // Add event listener for custom color apply button
        document.getElementById('applyCustom').addEventListener('click', () => {
            const customColor = document.getElementById('customColor').value;
            changeBackgroundColor(customColor);
        });
        
        // Add event listener for reset button
        document.getElementById('resetColor').addEventListener('click', () => {
            resetBackgroundColor();
        });
        
    } catch (error) {
        console.error('Error initializing popup:', error);
    }
});

// Function to change background color
async function changeBackgroundColor(color) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if we can access this tab
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
            showFeedback('✗ Cannot modify this page');
            return;
        }
        
        // Inject content script if needed and send message
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        } catch (injectionError) {
            // Content script might already be injected, continue
            console.log('Content script already injected or injection failed:', injectionError);
        }
        
        // Wait a moment for content script to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Send message to content script
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'changeBackground',
            color: color
        });
        
        if (response && response.success) {
            // Store the color for this tab
            await chrome.storage.local.set({
                [`color_${tab.id}`]: color
            });
            
            // Update current color display
            document.getElementById('currentColor').textContent = `Current: ${color}`;
            
            // Show success feedback
            showFeedback('✓ Color applied!');
        } else {
            throw new Error('Content script did not respond successfully');
        }
        
    } catch (error) {
        console.error('Error changing background color:', error);
        
        // Try direct CSS injection as fallback
        try {
            await chrome.scripting.insertCSS({
                target: { tabId: (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id },
                css: `
                    body { 
                        background-color: ${color} !important; 
                        background-image: none !important; 
                    }
                    html { 
                        background-color: ${color} !important; 
                    }
                `
            });
            
            // Store the color for this tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.storage.local.set({
                [`color_${tab.id}`]: color
            });
            
            // Update current color display
            document.getElementById('currentColor').textContent = `Current: ${color}`;
            
            showFeedback('✓ Color applied (fallback)!');
        } catch (fallbackError) {
            console.error('Fallback CSS injection also failed:', fallbackError);
            showFeedback('✗ Error applying color');
        }
    }
}

// Function to reset background color
async function resetBackgroundColor() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if we can access this tab
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
            showFeedback('✗ Cannot modify this page');
            return;
        }
        
        // Try to send message to content script first
        try {
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'resetBackground'
            });
            
            if (response && response.success) {
                // Remove stored color for this tab
                await chrome.storage.local.remove([`color_${tab.id}`]);
                
                // Update current color display
                document.getElementById('currentColor').textContent = 'Current: Default';
                
                // Show success feedback
                showFeedback('✓ Reset to original!');
                return;
            }
        } catch (messageError) {
            console.log('Message to content script failed, trying CSS removal:', messageError);
        }
        
        // Fallback: Remove CSS directly
        try {
            await chrome.scripting.removeCSS({
                target: { tabId: tab.id },
                css: `
                    body { 
                        background-color: initial !important; 
                        background-image: initial !important; 
                    }
                    html { 
                        background-color: initial !important; 
                    }
                `
            });
            
            // Remove stored color for this tab
            await chrome.storage.local.remove([`color_${tab.id}`]);
            
            // Update current color display
            document.getElementById('currentColor').textContent = 'Current: Default';
            
            // Show success feedback
            showFeedback('✓ Reset (fallback)!');
            
        } catch (fallbackError) {
            console.error('Both reset methods failed:', fallbackError);
            showFeedback('✗ Error resetting color');
        }
        
    } catch (error) {
        console.error('Error resetting background color:', error);
        showFeedback('✗ Error resetting color');
    }
}

// Function to show feedback
function showFeedback(message) {
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
    `;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 2000);
}