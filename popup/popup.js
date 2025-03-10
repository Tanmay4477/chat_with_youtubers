// Popup.js - Functionality for the extension popup

document.addEventListener('DOMContentLoaded', function() {
    // Get UI elements
    const apiKeyInput = document.getElementById('api-key');
    const toggleApiKeyButton = document.getElementById('toggle-api-key');
    const modelNameSelect = document.getElementById('model-name');
    const customEndpointContainer = document.getElementById('custom-endpoint-container');
    const apiEndpointInput = document.getElementById('api-endpoint');
    const useSummaryCheckbox = document.getElementById('use-summary');
    const useTranscriptCheckbox = document.getElementById('use-transcript');
    const saveSettingsButton = document.getElementById('save-settings');
    const statusText = document.getElementById('status-text');
    const videoTitleElement = document.getElementById('video-title');
    
    // Load saved settings
    chrome.storage.local.get([
      'apiKey',
      'apiEndpoint',
      'modelName',
      'useSummary',
      'useTranscript'
    ], (result) => {
      if (result.apiKey) {
        apiKeyInput.value = result.apiKey;
      }
      
      if (result.modelName) {
        modelNameSelect.value = result.modelName;
        // If using custom model, show the endpoint input
        if (result.modelName === 'custom') {
          customEndpointContainer.style.display = 'block';
        }
      }
      
      if (result.apiEndpoint) {
        apiEndpointInput.value = result.apiEndpoint;
      }
      
      if (result.useSummary !== undefined) {
        useSummaryCheckbox.checked = result.useSummary;
      }
      
      if (result.useTranscript !== undefined) {
        useTranscriptCheckbox.checked = result.useTranscript;
      }
    });
    
    // Check current tab's YouTube video status
    getCurrentTabInfo();
    
    // Toggle API key visibility
    toggleApiKeyButton.addEventListener('click', function() {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleApiKeyButton.textContent = '🔒';
      } else {
        apiKeyInput.type = 'password';
        toggleApiKeyButton.textContent = '👁️';
      }
    });
    
    // Toggle custom endpoint visibility based on model selection
    modelNameSelect.addEventListener('change', function() {
      if (this.value === 'custom') {
        customEndpointContainer.style.display = 'block';
      } else {
        customEndpointContainer.style.display = 'none';
      }
    });
    
    // Save settings
    saveSettingsButton.addEventListener('click', function() {
      const settings = {
        apiKey: apiKeyInput.value.trim(),
        modelName: modelNameSelect.value,
        useSummary: useSummaryCheckbox.checked,
        useTranscript: useTranscriptCheckbox.checked
      };
      
      // Add API endpoint if using custom model
      if (modelNameSelect.value === 'custom') {
        settings.apiEndpoint = apiEndpointInput.value.trim();
      } else {
        // Set appropriate endpoint based on selected model
        switch (modelNameSelect.value) {
          case 'gpt-3.5-turbo':
          case 'gpt-4':
            settings.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
            break;
          case 'claude-3-haiku':
            settings.apiEndpoint = 'https://api.anthropic.com/v1/messages';
            break;
          default:
            settings.apiEndpoint = 'https://api.example.com/chat';
        }
      }
      
      chrome.storage.local.set(settings, function() {
        // Show save confirmation
        saveSettingsButton.textContent = 'Saved!';
        setTimeout(() => {
          saveSettingsButton.textContent = 'Save Settings';
        }, 1500);
      });
    });
  });
  
  // Function to check if the current tab is a YouTube video
  async function getCurrentTabInfo() {
    try {
      // Get the active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      // Check if this is a YouTube video page
      if (currentTab.url && currentTab.url.includes('youtube.com/watch')) {
        // Extract video ID
        const url = new URL(currentTab.url);
        const videoId = url.searchParams.get('v');
        
        if (videoId) {
          document.getElementById('status').className = 'status active';
          document.getElementById('status-text').textContent = 'Active';
          document.getElementById('video-title').textContent = `Video ID: ${videoId}`;
          
          // Get video title (in a real extension, you might want to pass this from content script)
          document.getElementById('video-title').textContent = currentTab.title.replace(' - YouTube', '');
        } else {
          setInactiveStatus('Not a video page');
        }
      } else {
        setInactiveStatus('Not on YouTube');
      }
    } catch (error) {
      console.error('Error checking tab:', error);
      setInactiveStatus('Error checking page');
    }
  }
  
  function setInactiveStatus(message) {
    document.getElementById('status').className = 'status inactive';
    document.getElementById('status-text').textContent = 'Inactive';
    document.getElementById('video-title').textContent = message;
  }