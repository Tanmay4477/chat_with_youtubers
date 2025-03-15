from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from app.models.schemas import Transcript
from typing import List, Optional

class TranscriptService:
    """Service for extracting and processing YouTube video transcripts"""
    
    @staticmethod
    def get_transcript(video_id: str) -> Optional[List[Transcript]]:
        """
        Get transcript for a YouTube video
        
        Args:
            video_id: YouTube video ID
        
        Returns:
            List of transcript segments with text and timestamps or None if no transcript available
        """
        try:
            # Get transcript from YouTube
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id) # may be .fetch canbe used instead of .get_transcript
            
            # Convert to our Transcript model
            return [
                Transcript(
                    text=item["text"],
                    start=item["start"],
                    duration=item["duration"]
                )
                for item in transcript_list
            ]
        except (TranscriptsDisabled, NoTranscriptFound):
            # Handle videos without transcripts
            print("No Transcript found")
            return None
        except Exception as e:
            # Log any other errors
            print(f"Error fetching transcript for video {video_id}: {str(e)}")
            return None
    
    @staticmethod
    def format_transcript_for_gemini(transcript: List[Transcript]) -> str:
        """
        Format transcript into a clean text format for sending to Gemini
        
        Args:
            transcript: List of transcript segments
        
        Returns:
            Formatted transcript text with timestamps
        """
        if not transcript:
            return ""
        
        formatted_text = "Video Transcript with Timestamps:\n\n"
        
        for segment in transcript:
            # Convert time to minutes:seconds format
            minutes = int(segment.start // 60)
            seconds = int(segment.start % 60)
            time_str = f"{minutes:02d}:{seconds:02d}"
            
            # Add formatted line
            formatted_text += f"[{time_str}] {segment.text}\n"
        
        return formatted_text