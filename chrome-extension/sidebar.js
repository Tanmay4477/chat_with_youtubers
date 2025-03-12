// Variables
let currentVideoId = null;
let transcriptLoaded = false;
let quizQuestions = [];
let userAnswers = [];

// DOM Elements
const chatMessagesEl = document.getElementById('chat-messages');
const chatInputEl = document.getElementById('chat-input-text');
const chatSendButton = document.getElementById('chat-send-button');
const generateSummaryButton = document.getElementById('generate-summary-button');
const summaryContentEl = document.getElementById('summary-content');
const summaryTextEl = document.getElementById('summary-text');
const keyPointsEl = document.getElementById('key-points');
const summaryLoadingEl = document.getElementById('summary-loading');
const generateQuizButton = document.getElementById('generate-quiz-button');
const quizNumQuestionsSelect = document.getElementById('quiz-num-questions');
const quizDifficultySelect = document.getElementById('quiz-difficulty');
const quizContentEl = document.getElementById('quiz-content');
const quizQuestionsEl = document.getElementById('quiz-questions');
const checkAnswersButton = document.getElementById('check-answers-button');
const resetQuizButton = document.getElementById('reset-quiz-button');
const quizResultsEl = document.getElementById('quiz-results');
const correctAnswersEl = document.getElementById('correct-answers');
const totalQuestionsEl = document.getElementById('total-questions');
const quizLoadingEl = document.getElementById('quiz-loading');
const errorMessageEl = document.getElementById('error-message');
const errorTextEl = document.getElementById('error-text');
const dismissErrorButton = document.getElementById('dismiss-error');
const closeSidebarButton = document.getElementById('close-sidebar');
const tabButtons = document.querySelectorAll('.tab-button');

// Initialize
function initialize() {
  // Set up event listeners
  chatSendButton.addEventListener('click', handleChatSend);
  chatInputEl.addEventListener('keypress', handleChatKeypress);
  generateSummaryButton.addEventListener('click', requestSummary);
  generateQuizButton.addEventListener('click', requestQuiz);
  checkAnswersButton.addEventListener('click', checkQuizAnswers);
  resetQuizButton.addEventListener('click', resetQuiz);
  dismissErrorButton.addEventListener('click', dismissError);
  closeSidebarButton.addEventListener('click', closeSidebar);
  
  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });
  
  // Set up message listener for communication with content script
  window.addEventListener('message', handleContentScriptMessages);
}

// Handle messages from content script
function handleContentScriptMessages(event) {
  // Make sure the message is from our parent window (content script)
  if (event.source !== window.parent) {
    return;
  }
  
  const message = event.data;
  
  switch(message.type) {
    case 'VIDEO_INFO':
      handleVideoInfo(message.videoId);
      break;
    
    case 'TRANSCRIPT_READY':
      handleTranscriptReady(message.transcript);
      break;
    
    case 'TRANSCRIPT_LOADING':
      // Could show a loading indicator here
      break;
    
    case 'CHAT_RESPONSE':
      handleChatResponse(message.message, message.timestamps);
      break;
    
    case 'CHAT_LOADING':
      showChatLoading();
      break;
    
    case 'SUMMARY_RESPONSE':
      handleSummaryResponse(message.summary, message.keyPoints);
      break;
    
    case 'SUMMARY_LOADING':
      showSummaryLoading(true);
      break;
    
    case 'QUIZ_RESPONSE':
      handleQuizResponse(message.questions);
      break;
    
    case 'QUIZ_LOADING':
      showQuizLoading(true);
      break;
    
    case 'ERROR':
      showError(message.error, message.message);
      break;
  }
}

// Handle new video information
function handleVideoInfo(videoId) {
  currentVideoId = videoId;
  transcriptLoaded = false;
  clearChat();
  hideSummary();
  hideQuiz();
  
  // Add welcome message with video ID
  addSystemMessage(`Video ID: ${videoId}`);
  addSystemMessage('Ask any questions about this video!');
}

// Handle transcript ready
function handleTranscriptReady(transcript) {
  transcriptLoaded = true;
  addSystemMessage('Transcript loaded successfully.');
}

// Send message to content script
function sendMessageToContentScript(type, data = {}) {
  window.parent.postMessage({
    type,
    ...data
  }, '*');
}

// Request transcript if not already loaded
function ensureTranscriptLoaded() {
  if (!transcriptLoaded) {
    sendMessageToContentScript('GET_TRANSCRIPT');
    return false;
  }
  return true;
}

// Handle chat input send button click
function handleChatSend() {
  const message = chatInputEl.value.trim();
  if (message) {
    sendChatMessage(message);
  }
}

// Handle chat input keypress (Enter to send)
function handleChatKeypress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    const message = chatInputEl.value.trim();
    if (message) {
      sendChatMessage(message);
    }
  }
}

// Send chat message
function sendChatMessage(message) {
  // Check if transcript is loaded
  if (!ensureTranscriptLoaded()) {
    addSystemMessage('Loading transcript first...');
    
    // Wait for transcript to load before sending message
    const checkTranscript = setInterval(() => {
      if (transcriptLoaded) {
        clearInterval(checkTranscript);
        sendChatMessage(message);
      }
    }, 500);
    
    return;
  }
  
  // Add user message to chat
  addUserMessage(message);
  
  // Clear input
  chatInputEl.value = '';
  
  // Send message to content script
  sendMessageToContentScript('CHAT_REQUEST', { message });
}

// Handle chat response
function handleChatResponse(message, timestamps) {
  // Add assistant message to chat
  addAssistantMessage(message, timestamps);
}

// Show chat loading indicator
function showChatLoading() {
  // Add loading message to chat
  const loadingEl = document.createElement('div');
  loadingEl.className = 'message loading';
  loadingEl.innerHTML = `
    <div class="message-content">
      <div class="spinner small"></div>
      <p>Thinking...</p>
    </div>
  `;
  chatMessagesEl.appendChild(loadingEl);
  
  // Scroll to bottom
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// Add user message to chat
function addUserMessage(message) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message user';
  messageEl.innerHTML = `
    <div class="message-content">
      <p>${formatMessage(message)}</p>
    </div>
  `;
  chatMessagesEl.appendChild(messageEl);
  
  // Scroll to bottom
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// Add assistant message to chat
function addAssistantMessage(message, timestamps = []) {
  // Remove loading message if it exists
  const loadingEl = document.querySelector('.message.loading');
  if (loadingEl) {
    loadingEl.remove();
  }
  
  const messageEl = document.createElement('div');
  messageEl.className = 'message assistant';
  
  // Format message with clickable timestamps
  let formattedMessage = formatMessage(message);
  if (timestamps && timestamps.length > 0) {
    // Make timestamps in the text clickable
    const timestampRegex = /\[(\d{2}):(\d{2})\]/g;
    formattedMessage = formattedMessage.replace(timestampRegex, (match, minutes, seconds) => {
      const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
      return `<a href="#" class="timestamp-link" data-time="${totalSeconds}">${match}</a>`;
    });
  }
  
  messageEl.innerHTML = `
    <div class="message-content">
      <p>${formattedMessage}</p>
    </div>
  `;
  
  chatMessagesEl.appendChild(messageEl);
  
  // Add click event listeners to timestamp links
  messageEl.querySelectorAll('.timestamp-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const time = parseInt(link.dataset.time);
      sendMessageToContentScript('SEEK_VIDEO', { timestamp: time });
    });
  });
  
  // Scroll to bottom
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// Add system message to chat
function addSystemMessage(message) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message system';
  messageEl.innerHTML = `
    <p>${formatMessage(message)}</p>
  `;
  chatMessagesEl.appendChild(messageEl);
  
  // Scroll to bottom
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// Format message text (convert newlines to <br>, etc.)
function formatMessage(message) {
  return message
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// Clear chat messages
function clearChat() {
  chatMessagesEl.innerHTML = '';
}

// Request summary
function requestSummary() {
  // Check if transcript is loaded
  if (!ensureTranscriptLoaded()) {
    addSystemMessage('Loading transcript first...');
    
    // Wait for transcript to load before requesting summary
    const checkTranscript = setInterval(() => {
      if (transcriptLoaded) {
        clearInterval(checkTranscript);
        requestSummary();
      }
    }, 500);
    
    return;
  }
  
  // Hide summary content and show loading
  hideSummary();
  showSummaryLoading(true);
  
  // Send summary request to content script
  sendMessageToContentScript('SUMMARY_REQUEST');
}

// Handle summary response
function handleSummaryResponse(summary, keyPoints) {
  // Hide loading
  showSummaryLoading(false);
  
  // Update summary content
  summaryTextEl.innerHTML = formatMessage(summary);
  
  // Update key points
  keyPointsEl.innerHTML = '';
  keyPoints.forEach(point => {
    const li = document.createElement('li');
    li.innerHTML = formatMessage(point);
    keyPointsEl.appendChild(li);
  });
  
  // Show summary content
  summaryContentEl.classList.remove('hidden');
}

// Show/hide summary loading
function showSummaryLoading(show) {
  if (show) {
    summaryLoadingEl.classList.remove('hidden');
  } else {
    summaryLoadingEl.classList.add('hidden');
  }
}

// Hide summary content
function hideSummary() {
  summaryContentEl.classList.add('hidden');
  showSummaryLoading(false);
}

// Request quiz
function requestQuiz() {
  // Check if transcript is loaded
  if (!ensureTranscriptLoaded()) {
    addSystemMessage('Loading transcript first...');
    
    // Wait for transcript to load before requesting quiz
    const checkTranscript = setInterval(() => {
      if (transcriptLoaded) {
        clearInterval(checkTranscript);
        requestQuiz();
      }
    }, 500);
    
    return;
  }
  
  // Hide quiz content and show loading
  hideQuiz();
  showQuizLoading(true);
  
  // Get quiz options
  const numQuestions = parseInt(quizNumQuestionsSelect.value);
  const difficulty = quizDifficultySelect.value;
  
  // Send quiz request to content script
  sendMessageToContentScript('QUIZ_REQUEST', {
    numQuestions,
    difficulty
  });
}

// Handle quiz response
function handleQuizResponse(questions) {
  // Hide loading
  showQuizLoading(false);
  
  // Store quiz questions
  quizQuestions = questions;
  userAnswers = new Array(questions.length).fill(-1);
  
  // Render quiz questions
  renderQuizQuestions();
  
  // Show quiz content
  quizContentEl.classList.remove('hidden');
  quizResultsEl.classList.add('hidden');
}

// Render quiz questions
function renderQuizQuestions() {
  quizQuestionsEl.innerHTML = '';
  
  quizQuestions.forEach((question, questionIndex) => {
    const questionEl = document.createElement('div');
    questionEl.className = 'quiz-question';
    
    // Question text
    const questionTextEl = document.createElement('h3');
    questionTextEl.innerHTML = `Question ${questionIndex + 1}: ${formatMessage(question.question)}`;
    questionEl.appendChild(questionTextEl);
    
    // Options
    const optionsEl = document.createElement('div');
    optionsEl.className = 'quiz-options';
    
    question.options.forEach((option, optionIndex) => {
      const optionEl = document.createElement('div');
      optionEl.className = 'quiz-option';
      
      const optionInput = document.createElement('input');
      optionInput.type = 'radio';
      optionInput.name = `question-${questionIndex}`;
      optionInput.id = `question-${questionIndex}-option-${optionIndex}`;
      optionInput.value = optionIndex;
      optionInput.checked = userAnswers[questionIndex] === optionIndex;
      
      optionInput.addEventListener('change', () => {
        userAnswers[questionIndex] = optionIndex;
      });
      
      const optionLabel = document.createElement('label');
      optionLabel.htmlFor = `question-${questionIndex}-option-${optionIndex}`;
      optionLabel.innerHTML = formatMessage(option);
      
      optionEl.appendChild(optionInput);
      optionEl.appendChild(optionLabel);
      optionsEl.appendChild(optionEl);
    });
    
    questionEl.appendChild(optionsEl);
    
    // Explanation (hidden until answers are checked)
    const explanationEl = document.createElement('div');
    explanationEl.className = 'quiz-explanation hidden';
    explanationEl.innerHTML = formatMessage(question.explanation);
    questionEl.appendChild(explanationEl);
    
    quizQuestionsEl.appendChild(questionEl);
  });
}

// Check quiz answers
function checkQuizAnswers() {
  // Count correct answers
  let correctCount = 0;
  
  quizQuestions.forEach((question, index) => {
    const questionEl = quizQuestionsEl.children[index];
    const optionsEl = questionEl.querySelector('.quiz-options');
    const explanationEl = questionEl.querySelector('.quiz-explanation');
    
    // Show explanation
    explanationEl.classList.remove('hidden');
    
    // Check if answer is correct
    if (userAnswers[index] === question.correct_answer) {
      correctCount++;
      questionEl.classList.add('correct');
      questionEl.classList.remove('incorrect');
    } else {
      questionEl.classList.add('incorrect');
      questionEl.classList.remove('correct');
    }
    
    // Highlight correct answer
    const options = optionsEl.querySelectorAll('.quiz-option');
    options.forEach((option, optionIndex) => {
      if (optionIndex === question.correct_answer) {
        option.classList.add('correct');
      } else if (optionIndex === userAnswers[index]) {
        option.classList.add('incorrect');
      }
    });
  });
  
  // Show results
  correctAnswersEl.textContent = correctCount;
  totalQuestionsEl.textContent = quizQuestions.length;
  quizResultsEl.classList.remove('hidden');
}

// Reset quiz
function resetQuiz() {
  // Clear user answers
  userAnswers = new Array(quizQuestions.length).fill(-1);
  
  // Re-render questions
  renderQuizQuestions();
  
  // Hide results
  quizResultsEl.classList.add('hidden');
}

// Show/hide quiz loading
function showQuizLoading(show) {
  if (show) {
    quizLoadingEl.classList.remove('hidden');
  } else {
    quizLoadingEl.classList.add('hidden');
  }
}

// Hide quiz content
function hideQuiz() {
  quizContentEl.classList.add('hidden');
  showQuizLoading(false);
}

// Show error message
function showError(title, message) {
  errorTextEl.innerHTML = `<strong>${title}</strong><br>${message}`;
  errorMessageEl.classList.remove('hidden');
}

// Dismiss error message
function dismissError() {
  errorMessageEl.classList.add('hidden');
}

// Switch tabs
function switchTab(tabId) {
  // Hide all tab content
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show selected tab content
  document.getElementById(`${tabId}-tab`).classList.add('active');
  
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    if (button.dataset.tab === tabId) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Close sidebar
function closeSidebar() {
  window.parent.postMessage({
    type: 'CLOSE_SIDEBAR'
  }, '*');
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initialize);