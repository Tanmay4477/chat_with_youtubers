(() => {
    let youtubeLeftControls, youtubePlayer;
    let currentVideo = "";
    let currentVideoBookmarks = [];
  
    // Add debug logging
    console.log("YouTube Bookmarker content script loaded");
  
    // Function to safely get YouTube elements
    const getYoutubeControls = () => {
      try {
        youtubeLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
        youtubePlayer = document.getElementsByClassName('video-stream')[0];
        return youtubeLeftControls && youtubePlayer;
      } catch (err) {
        console.error("Error getting YouTube controls:", err);
        return false;
      }
    };
  
    const fetchBookmarks = () => {
      return new Promise((resolve) => {
        try {
          chrome.storage.sync.get([currentVideo], (obj) => {
            // Added error handling for JSON parsing
            try {
              resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
            } catch (err) {
              console.error("Error parsing bookmarks:", err);
              resolve([]);
            }
          });
        } catch (err) {
          console.error("Error fetching bookmarks:", err);
          resolve([]);
        }
      });
    };
  
    const addNewBookmarkEventHandler = async () => {
      try {
        if (!youtubePlayer) {
          console.error("YouTube player not found");
          return;
        }
        
        const currentTime = youtubePlayer.currentTime;
        const newBookmark = {
          time: currentTime,
          desc: "Bookmark at " + getTime(currentTime),
        };
  
        console.log("Adding new bookmark at", getTime(currentTime));
        
        currentVideoBookmarks = await fetchBookmarks();
  
        chrome.storage.sync.set({
          [currentVideo]: JSON.stringify([...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time))
        });
      } catch (err) {
        console.error("Error adding bookmark:", err);
      }
    };
  
    const newVideoLoaded = async () => {
      try {
        console.log("New video loaded, ID:", currentVideo);
        
        if (!currentVideo) {
          console.log("No video ID available");
          return;
        }
        
        const bookmarkBtnExists = document.getElementsByClassName("bookmark-btn")[0];
        console.log("Bookmark button exists:", !!bookmarkBtnExists);
  
        currentVideoBookmarks = await fetchBookmarks();
  
        // Wait for YouTube player to load
        let retries = 0;
        const maxRetries = 10;
        
        const tryAddButton = () => {
          if (bookmarkBtnExists) {
            console.log("Bookmark button already exists");
            return;
          }
          
          if (getYoutubeControls()) {
            console.log("YouTube controls found, adding bookmark button");
            
            const bookmarkBtn = document.createElement("img");
            
            // Ensure the path is correct
            try {
              bookmarkBtn.src = chrome.runtime.getURL("/assets/icon/bookmark.png");
              console.log("Button image URL:", bookmarkBtn.src);
            } catch (err) {
              console.error("Error setting button image:", err);
              bookmarkBtn.textContent = "BM"; // Fallback text
            }
            
            bookmarkBtn.className = "ytp-button bookmark-btn";
            bookmarkBtn.title = "Click to bookmark current timestamp";
            bookmarkBtn.style.cursor = "pointer";
  
            // Safely append the button
            try {
              youtubeLeftControls.appendChild(bookmarkBtn);
              console.log("Bookmark button added to player");
              bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);
            } catch (err) {
              console.error("Error appending bookmark button:", err);
            }
          } else if (retries < maxRetries) {
            retries++;
            console.log(`YouTube controls not found, retrying (${retries}/${maxRetries})...`);
            setTimeout(tryAddButton, 1000);
          } else {
            console.error("Failed to find YouTube controls after retries");
          }
        };
        
        tryAddButton();
      } catch (err) {
        console.error("Error in newVideoLoaded:", err);
      }
    };
  
    // Fix the message listener
    chrome.runtime.onMessage.addListener((obj, sender, response) => {
      try {
        console.log("Message received:", obj);
        const { type, value, videoId } = obj;
  
        if (type === "NEW") {
          currentVideo = videoId;
          newVideoLoaded();
        } else if (type === "PLAY" && youtubePlayer) {
          youtubePlayer.currentTime = value;
        } else if (type === "DELETE") {
          currentVideoBookmarks = currentVideoBookmarks.filter((b) => b.time != value);
          chrome.storage.sync.set({ 
            [currentVideo]: JSON.stringify(currentVideoBookmarks) 
          }, () => {
            response(currentVideoBookmarks);
          });
          return true; // Keep the message channel open for the async response
        }
      } catch (err) {
        console.error("Error handling message:", err);
      }
    });
  
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        console.log("DOM loaded, checking for current video");
        // Try to get video ID from URL
        try {
          const url = window.location.href;
          if (url.includes("youtube.com/watch")) {
            const urlParams = new URLSearchParams(new URL(url).search);
            currentVideo = urlParams.get("v");
            if (currentVideo) {
              console.log("Found video ID from URL:", currentVideo);
              setTimeout(newVideoLoaded, 1500); // Give YouTube time to load
            }
          }
        } catch (err) {
          console.error("Error extracting video ID:", err);
        }
      });
    } else {
      // DOM already loaded
      console.log("DOM already loaded, checking for YouTube video");
      try {
        const url = window.location.href;
        if (url.includes("youtube.com/watch")) {
          const urlParams = new URLSearchParams(new URL(url).search);
          currentVideo = urlParams.get("v");
          if (currentVideo) {
            console.log("Found video ID from URL:", currentVideo);
            setTimeout(newVideoLoaded, 1500); // Give YouTube time to load
          }
        }
      } catch (err) {
        console.error("Error extracting video ID:", err);
      }
    }
  })();
  
  // Keep this function outside the IIFE to match your original structure
  const getTime = t => {
    try {
      var date = new Date(0);
      date.setSeconds(t);
      return date.toISOString().substr(11, 8);
    } catch (err) {
      console.error("Error formatting time:", err);
      return "00:00:00";
    }
  };