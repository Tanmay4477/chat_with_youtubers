# YouTube Video Assistant Chrome Extension

This Chrome extension allows users to interact with YouTube videos through AI-powered features:
- Chat with videos (ask questions about video content)
- Get video summaries
- Test comprehension with automatically generated quizzes

## Project Structure

The project consists of two main components:

1. **Chrome Extension**: Frontend UI that appears as a sidebar on YouTube videos
2. **FastAPI Backend**: Server that processes requests and interacts with the Gemini API

## Setup Instructions

### Backend Setup

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Create a `.env` file by copying the example:
   ```
   cp .env.example .env
   ```

3. Add your Gemini API key to the `.env` file:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Run the server:
   ```
   python run.py
   ```

The server will start on `http://localhost:8000` by default.

### Chrome Extension Setup

1. Create an `images` folder and add the required icon files:
   - `images/icon16.png`
   - `images/icon48.png`
   - `images/icon128.png`

2. Open Chrome and go to `chrome://extensions/`

3. Enable "Developer mode" (toggle in the top-right corner)

4. Click "Load unpacked" and select the directory containing your extension files

5. The extension should now appear in your browser toolbar

## Using the Extension

1. Go to any YouTube video page

2. Click the extension icon in the YouTube video player controls (or from your browser toolbar)

3. The sidebar will open with three tabs:
   - **Chat**: Ask questions about the video content
   - **Summary**: Get a concise summary of the video
   - **Quiz**: Test your understanding with MCQ questions

4. The sidebar will automatically fetch the video transcript when needed

## Development Notes

### Backend API Endpoints

- `/api/v1/video/chat` - Chat with a video
- `/api/v1/video/summary` - Generate a video summary
- `/api/v1/video/quiz` - Generate a quiz from video content

### Configuration

- Edit `background.js` to change the backend API URL if needed
- Modify the appearance by editing `styles.css`

## Troubleshooting

- If the extension can't connect to the backend, make sure the FastAPI server is running
- If transcript extraction fails, the video may not have captions available
- Check browser console logs for any error messages

## Future Enhancements

- Add options page for customizing settings
- Implement authentication for API requests
- Add support for more languages
- Optimize transcript handling for longer videos