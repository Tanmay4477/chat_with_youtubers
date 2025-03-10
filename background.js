// Service worker for handling background tasks

// Handle installation and update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('YouTube Chat Assistant installed');
      
      // Set default settings
      chrome.storage.local.set({
        apiKey: '',
        apiEndpoint: 'https://api.example.com/chat', // Your AI service endpoint
        modelName: 'default-model',
        useSummary: true,
        useTranscript: true
      });
      
      // Open options page on install (optional)
      // chrome.runtime.openOptionsPage();
    } else if (details.reason === 'update') {
      console.log('YouTube Chat Assistant updated');
    }
  });
  
  // Listen for messages from content script or popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'processVideo') {
      // Handle video processing request
      processVideo(message.videoId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      
      return true; // Indicates async response
    }
    
    if (message.action === 'chatQuery') {
      // Handle chat query
      processQuery(message.query, message.videoId, message.transcript)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      
      return true; // Indicates async response
    }
  });
  
  // Function to process a video (get transcript, metadata, etc.)
  async function processVideo(videoId) {
    try {
      // In a real implementation, you would:
      // 1. Check if we already have data for this video in storage
      // 2. If not, fetch the transcript using YouTube's captions or a transcription service
      // 3. Store the results for faster access later
      
      console.log(`Processing video ${videoId}`);
      
      // Simulated processing
      return {
        success: true,
        videoId: videoId,
        title: "Sample Video Title",
        transcript: "This is a sample transcript for demonstration purposes.",
        duration: 300 // seconds
      };
    } catch (error) {
      console.error('Error processing video:', error);
      throw error;
    }
  }
  
  // Function to process a chat query
  async function processQuery(query, videoId, transcript) {
    try {
      console.log(`Processing query: "${query}" for video ${videoId}`);
      
      // Get API settings
      const settings = await chrome.storage.local.get(['apiKey', 'apiEndpoint', 'modelName']);
      
      if (!settings.apiKey || !settings.apiEndpoint) {
        return {
          success: false,
          message: "API settings not configured. Please set up in extension options."
        };
      }
      
      // In a real implementation, you would send the query to your AI service
      // For this example, we'll simulate a response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create simulated response
      let response;
      if (query.toLowerCase().includes('summary')) {
        response = "This video is about [topic] and covers [main points].";
      } else if (query.toLowerCase().includes('explain')) {
        response = "The video explains that [detailed explanation based on content].";
      } else {
        response = "Based on the video content, [relevant answer to the query].";
      }
      
      return {
        success: true,
        response: response
      };
      
      /* Real implementation would look something like:
      
      const response = await fetch(settings.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.modelName,
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant that answers questions about YouTube videos.
                       The following is a transcript of a video with ID ${videoId}:
                       ${transcript}`
            },
            {
              role: 'user',
              content: query
            }
          ]
        })
      });
      
      const data = await response.json();
      
      return {
        success: true,
        response: data.choices[0].message.content
      };
      */
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  }