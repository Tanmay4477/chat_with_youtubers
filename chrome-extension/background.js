// Constants
const API_BASE_URL = 'http://localhost:8000/api/v1';  // Replace with your actual API URL in production
let sessionId = null;

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Video Assistant installed');
  
  // Generate a unique session ID
  sessionId = generateSessionId();
  chrome.storage.local.set({ 'sessionId': sessionId });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'apiRequest') {
    handleApiRequest(request.endpoint, request.data)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep the messaging channel open for async response
  }
  
  if (request.action === 'getSessionId') {
    chrome.storage.local.get('sessionId', (data) => {
      if (!data.sessionId) {
        sessionId = generateSessionId();
        chrome.storage.local.set({ 'sessionId': sessionId });
        sendResponse({ sessionId });
      } else {
        sendResponse({ sessionId: data.sessionId });
      }
    });
    return true; // Keep the messaging channel open for async response
  }
});

// Generate a random session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Handle API requests to our backend
async function handleApiRequest(endpoint, data) {
  try {
    // Get the session ID
    if (!sessionId) {
      const sessionData = await chrome.storage.local.get('sessionId');
      sessionId = sessionData.sessionId || generateSessionId();
      if (!sessionData.sessionId) {
        chrome.storage.local.set({ 'sessionId': sessionId });
      }
    }
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/video/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'API request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}