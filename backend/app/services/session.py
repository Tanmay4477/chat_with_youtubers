from typing import Dict, List, Optional
from app.models.schemas import Transcript
import time

class SessionManager:
    """Simple in-memory session manager for storing transcripts"""
    
    def __init__(self):
        # Structure: {session_id: {video_id: {transcript: [], last_accessed: timestamp}}}
        self.sessions: Dict[str, Dict[str, Dict]] = {}
        
        # Session expiry time in seconds (30 minutes)
        self.session_expiry = 30 * 60
        
        # Maximum number of sessions to keep in memory
        self.max_sessions = 1000
    
    def get_transcript(self, session_id: str, video_id: str) -> Optional[List[Transcript]]:
        """
        Get transcript for a video from the session
        
        Args:
            session_id: Unique session identifier
            video_id: YouTube video ID
        
        Returns:
            Transcript list if found, None otherwise
        """
        # Clean expired sessions
        self._clean_expired_sessions()
        
        # Check if session exists
        if session_id not in self.sessions:
            return None
        
        # Check if video exists in session
        if video_id not in self.sessions[session_id]:
            return None
        
        # Update last accessed time
        self.sessions[session_id][video_id]["last_accessed"] = time.time()
        
        return self.sessions[session_id][video_id]["transcript"]
    
    def store_transcript(self, session_id: str, video_id: str, transcript: List[Transcript]) -> None:
        """
        Store transcript for a video in the session
        
        Args:
            session_id: Unique session identifier
            video_id: YouTube video ID
            transcript: List of transcript segments
        """
        # Clean expired sessions
        self._clean_expired_sessions()
        
        # Create session if it doesn't exist
        if session_id not in self.sessions:
            self.sessions[session_id] = {}
        
        # Store transcript with current timestamp
        self.sessions[session_id][video_id] = {
            "transcript": transcript,
            "last_accessed": time.time()
        }
        
        # Enforce session limit
        if len(self.sessions) > self.max_sessions:
            self._remove_oldest_session()
    
    def _clean_expired_sessions(self) -> None:
        """Remove expired sessions"""
        current_time = time.time()
        expired_sessions = []
        
        for session_id, videos in self.sessions.items():
            # Check if all videos in session are expired
            all_expired = True
            
            for video_data in videos.values():
                if current_time - video_data["last_accessed"] < self.session_expiry:
                    all_expired = False
                    break
            
            if all_expired:
                expired_sessions.append(session_id)
        
        # Remove expired sessions
        for session_id in expired_sessions:
            del self.sessions[session_id]
    
    def _remove_oldest_session(self) -> None:
        """Remove the oldest session"""
        oldest_session = None
        oldest_time = float('inf')
        
        for session_id, videos in self.sessions.items():
            # Find the most recently accessed video in this session
            most_recent = 0
            
            for video_data in videos.values():
                most_recent = max(most_recent, video_data["last_accessed"])
            
            # If this session's most recent activity is older than the current oldest
            if most_recent < oldest_time:
                oldest_time = most_recent
                oldest_session = session_id
        
        # Remove the oldest session
        if oldest_session:
            del self.sessions[oldest_session]

# Create a singleton instance
session_manager = SessionManager()