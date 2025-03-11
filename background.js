// Log when background script initializes
console.log("YouTube Bookmarker: Background script initialized!");

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only proceed if URL is available and has changed
    if (changeInfo.url) {
        console.log("Tab updated:", tabId, "URL:", changeInfo.url);
        
        // Check if this is a YouTube video page
        if (changeInfo.url.includes("youtube.com/watch")) {
            console.log("YouTube video detected in tab:", tabId);
            
            try {
                const queryParameters = changeInfo.url.split("?")[1];
                const urlParameters = new URLSearchParams(queryParameters);
                const videoId = urlParameters.get("v");
                
                console.log("Extracted video ID:", videoId);
                
                if (videoId) {
                    // Send message to content script
                    console.log("Sending message to content script in tab:", tabId);
                    chrome.tabs.sendMessage(tabId, {
                        type: "NEW",
                        videoId: videoId
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            // This will happen if the content script isn't ready yet
                            console.log("Error sending message:", chrome.runtime.lastError.message);
                        } else {
                            console.log("Message sent successfully, response:", response);
                        }
                    });
                }
            } catch (error) {
                console.error("Error processing YouTube URL:", error);
            }
        }
    }
});