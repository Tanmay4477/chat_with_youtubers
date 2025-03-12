from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from app.routers import video

load_dotenv()

app = FastAPI(
    title="YouTube Video Interaction API",
    description="API for interacting with YouTube videos through chat, summaries, and quizzes",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Have to Replace it in future with my extension's origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(video.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "YouTube Video Interaction API is running!"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)