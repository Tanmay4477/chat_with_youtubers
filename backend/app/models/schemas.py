from pydantic import BaseModel
from typing import List, Optional, Dict

class Transcript(BaseModel):
    """YouTube video transcript with timestamps"""
    text: str
    start: float
    duration: float

class VideoRequest(BaseModel):
    """Base request for video interactions"""
    video_id: str
    transcript: Optional[List[Transcript]] = None

class ChatRequest(VideoRequest):
    """Request for chatting with a video"""
    message: str
    chat_history: Optional[List[Dict[str, str]]] = None

class SummaryRequest(VideoRequest):
    """Request for generating a video summary"""
    pass

class QuizRequest(VideoRequest):
    """Request for generating a quiz from video content"""
    num_questions: Optional[int] = 5
    difficulty: Optional[str] = "medium"  # easy, medium, hard

class ChatResponse(BaseModel):
    """Response for chat messages"""
    response: str
    relevant_timestamps: Optional[List[float]] = None

class SummaryResponse(BaseModel):
    """Response for video summaries"""
    summary: str
    key_points: List[str]

class QuizQuestion(BaseModel):
    """Single quiz question"""
    question: str
    options: List[str]
    correct_answer: int  # Index of correct option
    explanation: str

class QuizResponse(BaseModel):
    """Response for quiz generation"""
    questions: List[QuizQuestion]