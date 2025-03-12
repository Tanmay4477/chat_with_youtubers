// Variables
let sidebarInjected = false;
let currentVideoId = null;
let transcript = null;
let chatHistory = [];

// Initialize when the page loads
function initialize() {
  // Check if we're on a YouTube video page
  if (window.location.href.includes('youtube.com/watch')) {
    // Extract video ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    
    if (videoId) {
      currentVideoId = videoId;
      
      // Add button to toggle sidebar if not already added
      if (!document.getElementById('video-assistant-toggle')) {
        addToggleButton();
      }
      
      // If video ID changed, reset transcript and chat history
      if (currentVideoId !== videoId) {
        transcript = null;
        chatHistory = [];
        currentVideoId = videoId;
      }
    }
  }
}

// Add button to toggle sidebar
function addToggleButton() {
  const ytpRightControls = document.querySelector('.ytp-right-controls');
  if (!ytpRightControls) return;
  
  const toggleButton = document.createElement('button');
  toggleButton.className = 'ytp-button video-assistant-toggle';
  toggleButton.id = 'video-assistant-toggle';
  toggleButton.title = 'Open Video Assistant';
  toggleButton.innerHTML = `
    <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
      <path d="M18 8C12.47 8 8 12.47 8 18s4.47 10 10 10 10-4.47 10-10S23.53 8 18 8zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-6h2v2h-2zm0-8h2v6h-2z" fill="#fff"></path>
    </svg>
  `;
  
  toggleButton.addEventListener('click', toggleSidebar);
  ytpRightControls.appendChild(toggleButton);
}

// Toggle sidebar visibility
function toggleSidebar() {
  if (sidebarInjected) {
    const sidebar = document.getElementById('video-assistant-sidebar');
    if (sidebar) {
      if (sidebar.style.display === 'none') {
        sidebar.style.display = 'block';
      } else {
        sidebar.style.display = 'none';
      }
    }
  } else {
    injectSidebar();
  }
}

// Inject sidebar into the page
function injectSidebar() {
  // Create iframe for the sidebar
  const iframe = document.createElement('iframe');
  iframe.id = 'video-assistant-sidebar';
  iframe.className = 'video-assistant-sidebar';
  iframe.src = chrome.runtime.getURL('sidebar.html');
  
  // Add iframe to the page
  document.body.appendChild(iframe);
  sidebarInjected = true;
  
  // Send current video ID to the sidebar when it loads
  iframe.onload = function() {
    iframe.contentWindow.postMessage({
      type: 'VIDEO_INFO',
      videoId: currentVideoId
    }, '*');
  };
  
  // Set up message listener for communication with sidebar
  window.addEventListener('message', handleSidebarMessages);
}

// Handle messages from the sidebar
function handleSidebarMessages(event) {
  // Make sure the message is from our sidebar
  if (event.source !== document.getElementById('video-assistant-sidebar')?.contentWindow) {
    return;
  }
  
  const message = event.data;
  
  switch(message.type) {
    case 'GET_TRANSCRIPT':
      fetchTranscript();
      break;
    
    case 'CHAT_REQUEST':
      handleChatRequest(message.message);
      break;
    
    case 'SUMMARY_REQUEST':
      handleSummaryRequest();
      break;
    
    case 'QUIZ_REQUEST':
      handleQuizRequest(message.numQuestions, message.difficulty);
      break;
    
    case 'SEEK_VIDEO':
      seekVideo(message.timestamp);
      break;
  }
}

// Fetch transcript using YouTube's transcript API
async function fetchTranscript() {
  try {
    if (transcript) {
      // If we already have the transcript, send it to the sidebar
      sendMessageToSidebar('TRANSCRIPT_READY', { transcript });
      return;
    }
    
    // Try to get transcript from YouTube's UI
    await tryGetTranscriptFromUI();
    
  } catch (error) {
    console.error('Error fetching transcript:', error);
    sendMessageToSidebar('ERROR', {
      error: 'Failed to get transcript',
      message: 'Unable to get transcript for this video. The video may not have captions available.'
    });
  }
}

// Try to get transcript from YouTube's UI
async function tryGetTranscriptFromUI() {
  // Send a message to the sidebar that we're trying to get the transcript
  sendMessageToSidebar('TRANSCRIPT_LOADING');
  
  // Click the "..." button if it exists
  const moreButton = document.querySelector('.ytp-settings-button');
  if (moreButton) {
    moreButton.click();
    
    // Short delay to wait for the menu to appear
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to find and click the "Open transcript" option
    const menuItems = document.querySelectorAll('.ytp-menuitem');
    let transcriptButton = null;
    
    for (const item of menuItems) {
      const text = item.querySelector('.ytp-menuitem-label');
      if (text && text.textContent.includes('transcript')) {
        transcriptButton = item;
        break;
      }
    }
    
    if (transcriptButton) {
      transcriptButton.click();
      
      // Wait for transcript panel to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Parse transcript from the panel
      const transcriptItems = document.querySelectorAll('.segment-text');
      const transcriptTimestamps = document.querySelectorAll('.segment-timestamp');
      
      if (transcriptItems.length > 0 && transcriptItems.length === transcriptTimestamps.length) {
        transcript = [];
        
        for (let i = 0; i < transcriptItems.length; i++) {
          const text = transcriptItems[i].textContent.trim();
          const timestampText = transcriptTimestamps[i].textContent.trim();
          
          // Parse timestamp (format: MM:SS)
          const [minutes, seconds] = timestampText.split(':').map(Number);
          const startTime = minutes * 60 + seconds;
          
          // Approximate duration (until next segment or default 5 seconds)
          const duration = (i < transcriptItems.length - 1) 
            ? ((transcriptTimestamps[i+1].textContent.split(':').map(Number)[0] * 60) + 
               transcriptTimestamps[i+1].textContent.split(':').map(Number)[1]) - startTime
            : 5;
          
          transcript.push({
            text,
            start: startTime,
            duration
          });
        }
        
        // Send transcript to sidebar
        sendMessageToSidebar('TRANSCRIPT_READY', { transcript });
        
        // Close the transcript panel
        const closeButton = document.querySelector('.ytp-panel-close-button');
        if (closeButton) {
          closeButton.click();
        }
        
        return;
      }
    }
    
    // Close the menu if we couldn't find the transcript option
    document.body.click();
  }
  
  // If we couldn't get the transcript from the UI, use the API
  handleApiRequest('fetch-transcript');
}

// Handle API requests through the background script
function handleApiRequest(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    const requestData = {
      ...data,
      video_id: currentVideoId
    };
    
    // If we have transcript already, include it
    if (transcript && !data.transcript) {
      requestData.transcript = transcript;
    }
    
    chrome.runtime.sendMessage(
      {
        action: 'apiRequest',
        endpoint,
        data: requestData
      },
      response => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      }
    );
  });
}

// Send message to sidebar iframe
function sendMessageToSidebar(type, data = {}) {
  const sidebar = document.getElementById('video-assistant-sidebar');
  if (sidebar) {
    sidebar.contentWindow.postMessage({
      type,
      ...data
    }, '*');
  }
}

// Handle chat message request
async function handleChatRequest(message) {
  try {
    sendMessageToSidebar('CHAT_LOADING');
    
    // Add message to chat history
    chatHistory.push({
      role: 'user',
      content: message
    });
    
    // Send chat request to API
    const response = await handleApiRequest('chat', {
      message,
      chat_history: chatHistory
    });
    
    // Add response to chat history
    chatHistory.push({
      role: 'assistant',
      content: response.response
    });
    
    // Send response to sidebar
    sendMessageToSidebar('CHAT_RESPONSE', {
      message: response.response,
      timestamps: response.relevant_timestamps
    });
    
  } catch (error) {
    console.error('Chat request error:', error);
    sendMessageToSidebar('ERROR', {
      error: 'Chat request failed',
      message: error.message
    });
  }
}

// Handle summary request
async function handleSummaryRequest() {
  try {
    sendMessageToSidebar('SUMMARY_LOADING');
    
    // Send summary request to API
    const response = await handleApiRequest('summary');
    
    // Send response to sidebar
    sendMessageToSidebar('SUMMARY_RESPONSE', {
      summary: response.summary,
      keyPoints: response.key_points
    });
    
  } catch (error) {
    console.error('Summary request error:', error);
    sendMessageToSidebar('ERROR', {
      error: 'Summary request failed',
      message: error.message
    });
  }
}

// Handle quiz request
async function handleQuizRequest(numQuestions = 5, difficulty = 'medium') {
  try {
    sendMessageToSidebar('QUIZ_LOADING');
    
    // Send quiz request to API
    const response = await handleApiRequest('quiz', {
      num_questions: numQuestions,
      difficulty
    });
    
    // Send response to sidebar
    sendMessageToSidebar('QUIZ_RESPONSE', {
      questions: response.questions
    });
    
  } catch (error) {
    console.error('Quiz request error:', error);
    sendMessageToSidebar('ERROR', {
      error: 'Quiz request failed',
      message: error.message
    });
  }
}

// Seek video to specific timestamp
function seekVideo(timestamp) {
  const video = document.querySelector('video');
  if (video) {
    video.currentTime = timestamp;
  }
}

// Run initialization when the script loads
initialize();

// Listen for navigation events (for when the user navigates to a different video)
const observer = new MutationObserver(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');
  
  if (videoId && videoId !== currentVideoId) {
    currentVideoId = videoId;
    transcript = null;
    chatHistory = [];
    
    // If sidebar is open, update it with the new video ID
    const sidebar = document.getElementById('video-assistant-sidebar');
    if (sidebar && sidebar.style.display !== 'none') {
      sidebar.contentWindow.postMessage({
        type: 'VIDEO_INFO',
        videoId: currentVideoId
      }, '*');
    }
  }
});

observer.observe(document.querySelector('head > title'), {
  subtree: true,
  characterData: true,
  childList: true
});