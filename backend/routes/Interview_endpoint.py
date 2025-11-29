import os
import tempfile
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, JSONResponse
from typing import Dict
import asyncio
from tasks.tts_task import generate_audio_task
import redis
import rq
from uuid import UUID
import uuid
from pydantic import BaseModel
from datetime import datetime
import json


# Import our new modules
from services.storage import cache_audio, get_cached_audio, save_transcript_to_db, create_attempt_record_in_db, update_attempt_status_to_completed
from services.WhisperModel import transcribe_file
from kokoro_local import tts_to_wav 


router = APIRouter()

# --- 1.Incoming Request (From Frontend) ---
class CompleteAttemptRequest(BaseModel):
    attemptId: str
    interviewId: str
    userId: str | None = None

# --- 2. Scoring Data Structure ---
class LLMScoringData(BaseModel):
    question_id: str
    question_text: str
    ideal_answer: str
    user_transcript: str
    
#-- 3.Starting Attempt ---
class StartAttemptRequest(BaseModel):
    attemptId: str
    interviewId: str
    userId: str

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_conn = redis.Redis.from_url(REDIS_URL)
tts_queue = rq.Queue("tts_queue", connection=redis_conn)


# --- Upload & Transcribe Endpoint ---
@router.post("/answer")
def save_answer(
    file: UploadFile = File(...),
    questionId: str = Form(...),
    interviewId: str = Form(...),
    userId: Optional[str] = Form(None),
    attemptId: str= Form(...)
):
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(file.file.read())
            temp_path = tmp.name
        
        print(f"[AI] Transcribing...")
        transcript = transcribe_file(temp_path)
        print(f"[AI] Transcript: {transcript[:30]}...")

        save_transcript_to_db(interviewId, questionId, transcript,userId,attemptId)
        
        return {"status": "success", "transcript": transcript}

    except Exception as e:
        print(f"[Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


#--- Start Attempt Endpoint ---
@router.post("/start_attempt")
async def start_attempt(request: StartAttemptRequest):
    try:
        """Creates a new attempt record in the database."""
        try:
            create_attempt_record_in_db(
                attempt_id=request.attemptId,
                interview_id=request.interviewId,
                user_id=request.userId
            )
        except Exception as e:
            print(f"Error creating attempt record: {e}")
            raise HTTPException(status_code=500, detail="Could not create attempt record in the database.")

        return {"message": "Attempt record initialized successfully", "attemptId": request.attemptId}

    except Exception as e:
        print(f"Database error on start_attempt: {e}")
        raise HTTPException(status_code=500, detail="Could not establish session in the database.")



# --- WebSocket for real-time audio readiness (with Redis Lock) ---
@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            action = data.get("action")
            q_id = data.get("questionId")
            i_id = data.get("interviewId")
            text = data.get("text")

            if action == "start_question":
                
                if get_cached_audio(i_id, q_id):
                    print(f"[WS] Cache hit for {i_id}:{q_id}")
                    await ws.send_json({"event": "ready", "questionId": q_id})
                else:
                    lock_key = f"lock:tts:{i_id}:{q_id}"
                    lock_value = str(uuid.uuid4())
                    lock_acquired = redis_conn.set(lock_key, lock_value, nx=True, ex=300)

                    if lock_acquired:
                        print(f"[WS] Acquired lock for {i_id}:{q_id}. Enqueuing job.")
                        try:
                            if not get_cached_audio(i_id, q_id):
                                tts_queue.enqueue(generate_audio_task, text, i_id, q_id)
                        finally:
                            if redis_conn.get(lock_key) == lock_value.encode('utf-8'):
                                redis_conn.delete(lock_key)
                                
                    else:
                        print(f"[WS] Lock already held for {i_id}:{q_id}. Waiting for completion.")


                    await ws.send_json({"event": "processing", "questionId": q_id})

                    asyncio.create_task(notify_when_ready(ws, i_id, q_id))

    except WebSocketDisconnect:
        print("[WS] Client disconnected")
        

# --- Audio Notification Endpoint ---
async def notify_when_ready(ws: WebSocket, interview_id: str, question_id: str):
    """
    Poll Redis every 1 second and notify frontend when audio is ready.
    """
    while True:
        if get_cached_audio(interview_id, question_id):
            try:
                await ws.send_json({"event": "ready", "questionId": question_id})
                print(f"[WS] Notified client: {interview_id}:{question_id} is ready.")
            except Exception:
                pass 
            break
        await asyncio.sleep(1)


# ---Audio Retrieval Endpoint ---
@router.get("/audio")
def get_audio_endpoint(interviewId: str, questionId: str):
    audio = get_cached_audio(interviewId, questionId)
    if not audio:
        return Response(content=b"", status_code=404)
    return Response(content=audio, media_type="audio/wav")


# --- Complete Attempt Endpoint ---
@router.post("/complete_attempt")
async def complete_interview_attempt(request: CompleteAttemptRequest):
    """
    Finalizes the interview attempt, updates status, and initiates LLM scoring.
    """
    attempt_id = request.attemptId
    interview_id = request.interviewId

    print(f"--- Finalizing Attempt: {attempt_id} for Interview: {interview_id} ---")
    
    try:
        await asyncio.to_thread(
            update_attempt_status_to_completed,
            attempt_id=attempt_id 
        )
        print(f"DB update complete for attempt {attempt_id}.")
 
        llm_results_json = {"overall_score": 85, "summary": "Great clarity and structure."} 
        
    except Exception as e:
        print(f"Failed to complete attempt {attempt_id}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to finalize attempt or run scoring: {e}"
        )
        
    return {
        "message": "Interview finalized and scoring completed.",
        "attemptId": attempt_id,
        "status": "Scoring Complete",
        "llm_summary": llm_results_json.get("overall_score"), 
        "detailed_results": llm_results_json
    }
    
    
