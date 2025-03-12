import google.generativeai as genai
from typing import List, Dict, Optional
import os
import json

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class GeminiService:
    """Service for interacting with Google's Gemini API"""
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-pro')
    
    async def chat_with_video(
        self,
        transcript: str,
        message: str,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict:
        """
        Chat with a video using Gemini
        
        Args:
            transcript: Formatted video transcript
            message: User's chat message
            chat_history: Optional chat history
            
        Returns:
            Dict with response text and relevant timestamps
        """
        # Initialize chat history if not provided
        if chat_history is None:
            chat_history = []
        
        # Build the system prompt
        system_prompt = f"""
        You are an AI assistant that helps users understand YouTube videos.
        You have access to the transcript of the video. When answering questions,
        refer to specific parts of the video when relevant.
        
        Transcript:
        {transcript}
        
        When answering, try to mention relevant timestamps from the video.
        Format your response as regular text, but include timestamps like [MM:SS] when referencing specific parts.
        """
        
        # Convert chat history to format expected by Gemini
        gemini_history = []
        for entry in chat_history:
            role = "user" if entry["role"] == "user" else "model"
            gemini_history.append({"role": role, "parts": [entry["content"]]})
        
        # Create a chat session with history
        chat = self.model.start_chat(history=gemini_history)
        
        # Send the new message with the system prompt
        response = chat.send_message([system_prompt, message])
        
        # Extract any timestamps mentioned in the response (format [MM:SS])
        import re
        timestamp_pattern = r'\[(\d{2}):(\d{2})\]'
        timestamps = []
        
        for match in re.finditer(timestamp_pattern, response.text):
            minutes, seconds = match.groups()
            time_seconds = int(minutes) * 60 + int(seconds)
            timestamps.append(time_seconds)
        
        return {
            "response": response.text,
            "relevant_timestamps": timestamps
        }
    
    async def generate_summary(self, transcript: str) -> Dict:
        """
        Generate a summary of the video
        
        Args:
            transcript: Formatted video transcript
            
        Returns:
            Dict with summary text and key points
        """
        prompt = f"""
        Create a comprehensive summary of the following video transcript.
        Include both a concise overall summary and a list of key points.
        
        Transcript:
        {transcript}
        
        Format your response as JSON with the following structure:
        {{
            "summary": "Overall summary of the video",
            "key_points": ["Key point 1", "Key point 2", ...]
        }}
        """
        
        response = self.model.generate_content(prompt)
        
        try:
            # Try to parse JSON from the response
            json_str = response.text.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:-3].strip()
            elif json_str.startswith("```"):
                json_str = json_str[3:-3].strip()
                
            result = json.loads(json_str)
            return result
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            summary = response.text
            return {
                "summary": summary,
                "key_points": ["Unable to extract structured key points"]
            }
    
    async def generate_quiz(
        self,
        transcript: str,
        num_questions: int = 5,
        difficulty: str = "medium"
    ) -> Dict:
        """
        Generate a quiz based on the video content
        
        Args:
            transcript: Formatted video transcript
            num_questions: Number of questions to generate
            difficulty: Quiz difficulty (easy, medium, hard)
            
        Returns:
            Dict with quiz questions
        """
        prompt = f"""
        Create a multiple-choice quiz based on the following video transcript.
        Generate {num_questions} questions with {difficulty} difficulty.
        
        Transcript:
        {transcript}
        
        Format your response as JSON with the following structure:
        {{
            "questions": [
                {{
                    "question": "Question text",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": 0,  // Index of correct option (0-based)
                    "explanation": "Explanation of why this answer is correct"
                }},
                // More questions...
            ]
        }}
        
        Each question should:
        - Be clear and specific
        - Have exactly 4 options
        - Have exactly 1 correct answer
        - Include a brief explanation
        """
        
        response = self.model.generate_content(prompt)
        
        try:
            # Try to parse JSON from the response
            json_str = response.text.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:-3].strip()
            elif json_str.startswith("```"):
                json_str = json_str[3:-3].strip()
                
            result = json.loads(json_str)
            return result
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return {
                "questions": [
                    {
                        "question": "Error generating quiz questions",
                        "options": ["Try again", "Refresh", "Use different video", "Contact support"],
                        "correct_answer": 0,
                        "explanation": "There was an error generating quiz questions from this video."
                    }
                ]
            }