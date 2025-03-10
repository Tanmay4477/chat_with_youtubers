// This script runs on YouTube pages

// Wait for the page to fully load
document.addEventListener('DOMContentLoaded', initializeExtension);
window.addEventListener('load', initializeExtension);
window.addEventListener('yt-navigate-finish', initializeExtension); // YouTube-specific event for navigation

let chatContainer = null;
let videoId = null;
let transcript = null;

function initializeExtension() {
  // Only run on video pages
  if (!window.location.pathname.includes('/watch')) return;
  
  // Get the current video ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const newVideoId = urlParams.get('v');
  
  if (newVideoId !== videoId) {
    videoId = newVideoId;
    transcript = null; // Reset transcript for new video
    
    // Remove existing chat UI if present
    if (chatContainer) {
      chatContainer.remove();
      chatContainer = null;
    }
    
    // Create new chat button and container
    createChatButton();
    createChatContainer();
    
    // Fetch transcript when a new video is loaded
    fetchTranscript(videoId);
  }
}

function createChatButton() {
  const existingButton = document.getElementById('youtube-chat-assistant-button');
  if (existingButton) return;
  
  const button = document.createElement('button');
  button.id = 'youtube-chat-assistant-button';
  button.innerHTML = 'Chat with Video';
  button.className = 'youtube-chat-assistant-button';
  
  // Style the button
  button.style.position = 'absolute';
  button.style.zIndex = '9000';
  button.style.top = '10px';
  button.style.right = '10px';
  button.style.backgroundColor = '#FF0000';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.padding = '8px 12px';
  button.style.cursor = 'pointer';
  button.style.fontWeight = 'bold';
  
  button.addEventListener('click', toggleChatContainer);
  
  // Add to YouTube's video container
  const videoContainer = document.querySelector('#player-container') || document.querySelector('.html5-video-container');
  if (videoContainer) {
    videoContainer.style.position = 'relative';
    videoContainer.appendChild(button);
  } else {
    // Fallback to body if container not found
    document.body.appendChild(button);
  }
}

function createChatContainer() {
  if (chatContainer) return;
  
  chatContainer = document.createElement('div');
  chatContainer.id = 'youtube-chat-assistant-container';
  chatContainer.className = 'youtube-chat-assistant-container';
  
  // Style the container
  chatContainer.style.position = 'fixed';
  chatContainer.style.zIndex = '9001';
  chatContainer.style.right = '20px';
  chatContainer.style.top = '70px';
  chatContainer.style.width = '350px';
  chatContainer.style.height = '500px';
  chatContainer.style.backgroundColor = 'white';
  chatContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
  chatContainer.style.borderRadius = '8px';
  chatContainer.style.display = 'none'; // Hidden by default
  chatContainer.style.flexDirection = 'column';
  
  // Chat header
  const header = document.createElement('div');
  header.className = 'youtube-chat-assistant-header';
  header.innerHTML = '<h3>Video Chat Assistant</h3>';
  header.style.padding = '10px';
  header.style.borderBottom = '1px solid #e0e0e0';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  
  // Close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.fontSize = '24px';
  closeButton.style.cursor = 'pointer';
  closeButton.addEventListener('click', () => {
    chatContainer.style.display = 'none';
  });
  header.appendChild(closeButton);
  
  // Chat messages area
  const messagesArea = document.createElement('div');
  messagesArea.className = 'youtube-chat-assistant-messages';
  messagesArea.style.flex = '1';
  messagesArea.style.overflow = 'auto';
  messagesArea.style.padding = '10px';
  
  // Initial welcome message
  const welcomeMsg = document.createElement('div');
  welcomeMsg.className = 'assistant-message';
  welcomeMsg.textContent = 'Hello! Ask me anything about this video.';
  welcomeMsg.style.backgroundColor = '#f0f0f0';
  welcomeMsg.style.borderRadius = '8px';
  welcomeMsg.style.padding = '10px';
  welcomeMsg.style.marginBottom = '10px';
  messagesArea.appendChild(welcomeMsg);
  
  // Input area
  const inputArea = document.createElement('div');
  inputArea.className = 'youtube-chat-assistant-input';
  inputArea.style.padding = '10px';
  inputArea.style.borderTop = '1px solid #e0e0e0';
  inputArea.style.display = 'flex';
  
  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Ask about this video...';
  textarea.style.flex = '1';
  textarea.style.padding = '8px';
  textarea.style.borderRadius = '4px';
  textarea.style.border = '1px solid #ccc';
  textarea.style.resize = 'none';
  textarea.style.height = '40px';
  
  const sendButton = document.createElement('button');
  sendButton.textContent = 'Send';
  sendButton.style.marginLeft = '10px';
  sendButton.style.backgroundColor = '#FF0000';
  sendButton.style.color = 'white';
  sendButton.style.border = 'none';
  sendButton.style.borderRadius = '4px';
  sendButton.style.padding = '0 15px';
  sendButton.style.cursor = 'pointer';
  
  // Handle sending messages
  sendButton.addEventListener('click', () => sendMessage(textarea.value, messagesArea));
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(textarea.value, messagesArea);
    }
  });
  
  inputArea.appendChild(textarea);
  inputArea.appendChild(sendButton);
  
  // Add all elements to container
  chatContainer.appendChild(header);
  chatContainer.appendChild(messagesArea);
  chatContainer.appendChild(inputArea);
  
  document.body.appendChild(chatContainer);
}

function toggleChatContainer() {
  if (!chatContainer) createChatContainer();
  
  if (chatContainer.style.display === 'none') {
    chatContainer.style.display = 'flex';
  } else {
    chatContainer.style.display = 'none';
  }
}

function fetchTranscript(videoId) {
  // In a real implementation, you would fetch the transcript from a service
  // For now, we'll use a placeholder message
  console.log(`Fetching transcript for video ${videoId}...`);
  // You could use YouTube's caption track or a third-party transcription service
  
  // Simulate transcript fetch
  setTimeout(() => {
    transcript = "This is a placeholder transcript. In a real implementation, you would extract the actual video content.";
    console.log("Transcript loaded");
  }, 1000);
}

function sendMessage(message, messagesArea) {
  if (!message.trim()) return;
  
  // Add user message to chat
  const userMessageElement = document.createElement('div');
  userMessageElement.className = 'user-message';
  userMessageElement.textContent = message;
  userMessageElement.style.backgroundColor = '#e6f7ff';
  userMessageElement.style.borderRadius = '8px';
  userMessageElement.style.padding = '10px';
  userMessageElement.style.marginBottom = '10px';
  userMessageElement.style.alignSelf = 'flex-end';
  messagesArea.appendChild(userMessageElement);
  
  // Clear input
  const textarea = document.querySelector('.youtube-chat-assistant-input textarea');
  textarea.value = '';
  
  // Add loading indicator
  const loadingElement = document.createElement('div');
  loadingElement.className = 'assistant-message loading';
  loadingElement.textContent = 'Thinking...';
  loadingElement.style.backgroundColor = '#f0f0f0';
  loadingElement.style.borderRadius = '8px';
  loadingElement.style.padding = '10px';
  loadingElement.style.marginBottom = '10px';
  messagesArea.appendChild(loadingElement);
  
  // Scroll to bottom
  messagesArea.scrollTop = messagesArea.scrollHeight;
  
  // Process message and get response
  processMessage(message, videoId)
    .then(response => {
      // Remove loading indicator
      messagesArea.removeChild(loadingElement);
      
      // Add assistant response
      const assistantMessageElement = document.createElement('div');
      assistantMessageElement.className = 'assistant-message';
      assistantMessageElement.textContent = response;
      assistantMessageElement.style.backgroundColor = '#f0f0f0';
      assistantMessageElement.style.borderRadius = '8px';
      assistantMessageElement.style.padding = '10px';
      assistantMessageElement.style.marginBottom = '10px';
      messagesArea.appendChild(assistantMessageElement);
      
      // Scroll to bottom again
      messagesArea.scrollTop = messagesArea.scrollHeight;
    });
}

function processMessage(message, videoId) {
  // In a real implementation, you would send the message and videoId/transcript to your backend
  // For demonstration, we'll simulate a response
  
  return new Promise(resolve => {
    // Simulate processing delay
    setTimeout(() => {
      if (message.toLowerCase().includes('summary')) {
        resolve("This video discusses [video topic]. The main points covered are: 1) [Point 1], 2) [Point 2], and 3) [Point 3].");
      } else if (message.toLowerCase().includes('who')) {
        resolve("The speaker in this video is [Speaker Name], who is known for [brief description].");
      } else {
        resolve("Based on the video content, I can tell you that [relevant answer to the question]. Would you like to know more about a specific part of the video?");
      }
    }, 1500);
  });
}

// Initialize when script is loaded
initializeExtension();