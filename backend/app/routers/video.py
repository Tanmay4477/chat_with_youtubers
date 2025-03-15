from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional, List
from uuid import uuid4

from app.models.schemas import (
    ChatRequest, ChatResponse,
    SummaryRequest, SummaryResponse,
    QuizRequest, QuizResponse,
    Transcript
)
from app.services.transcript import TranscriptService
from app.services.gemini import GeminiService
from app.services.session import session_manager

router = APIRouter(
    prefix="/video",
    tags=["video"],
)

# Initialize services
transcript_service = TranscriptService()
gemini_service = GeminiService()

async def get_or_fetch_transcript(
    video_id: str,
    session_id: str,
    provided_transcript: Optional[List[Transcript]] = None
) -> List[Transcript]:
    """
    Get transcript from session or fetch from YouTube
    
    Args:
        video_id: YouTube video ID
        session_id: Session identifier
        provided_transcript: Optional transcript provided in the request
        
    Returns:
        Transcript list
        
    Raises:
        HTTPException: If transcript cannot be obtained
    """
    # If transcript is provided in the request, use it
    if provided_transcript:
        # Store in session for future use
        session_manager.store_transcript(session_id, video_id, provided_transcript)
        return provided_transcript
    
    # Try to get from session
    transcript = session_manager.get_transcript(session_id, video_id)
    if transcript:
        return transcript
    
    # Fetch from YouTube
    transcript = await transcript_service.get_transcript(video_id)
    if not transcript:
        raise HTTPException(
            status_code=404,
            detail="Transcript not available for this video"
        )
    
    # Store in session
    session_manager.store_transcript(session_id, video_id, transcript)
    return transcript

def get_session_id(x_session_id: Optional[str] = Header(None)):
    """
    Get or create session ID from header
    
    Args:
        x_session_id: Optional session ID from header
        
    Returns:
        Session ID to use
    """
    if not x_session_id:
        return str(uuid4())
    return x_session_id

@router.post("/chat", response_model=ChatResponse)
async def chat_with_video(
    request: ChatRequest,
    session_id: str = Depends(get_session_id)
):
    """
    Chat with a video using its transcript
    """
    # Get transcript
    transcript = await get_or_fetch_transcript(
        request.video_id,
        session_id,
        request.transcript
    )
    
    # Format transcript for Gemini
    formatted_transcript = transcript_service.format_transcript_for_gemini(transcript)
    
    # Call Gemini for chat response
    response = await gemini_service.chat_with_video(
        formatted_transcript,
        request.message,
        request.chat_history
    )
    
    return ChatResponse(
        response=response["response"],
        relevant_timestamps=response["relevant_timestamps"]
    )

@router.post("/summary", response_model=SummaryResponse)
async def get_video_summary(
    request: SummaryRequest,
    session_id: str = Depends(get_session_id)
):
    """
    Generate a summary of a video
    """
    # Get transcript
    transcript = await get_or_fetch_transcript(
        request.video_id,
        session_id,
        request.transcript
    )
    
    # Format transcript for Gemini
    formatted_transcript = transcript_service.format_transcript_for_gemini(transcript)
    
    # Call Gemini for summary generation
    summary_data = await gemini_service.generate_summary(formatted_transcript)
    
    return SummaryResponse(
        summary=summary_data["summary"],
        key_points=summary_data["key_points"]
    )

@router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(
    request: QuizRequest,
    session_id: str = Depends(get_session_id)
):
    """
    Generate a quiz based on video content
    """
    # Get transcript
    transcript = await get_or_fetch_transcript(
        request.video_id,
        session_id,
        request.transcript
    )
    
    # Format transcript for Gemini
    formatted_transcript = transcript_service.format_transcript_for_gemini(transcript)
    
    # Call Gemini for quiz generation
    quiz_data = await gemini_service.generate_quiz(
        formatted_transcript,
        request.num_questions,
        request.difficulty
    )
    
    return QuizResponse(
        questions=quiz_data["questions"]
    )