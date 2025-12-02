import os
import tempfile
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from typing import Dict
import asyncio
import redis
import rq
from uuid import UUID
import uuid
from pydantic import BaseModel
from services.storage import  get_cached_audio,create_attempt_record_in_db, update_attempt_status_to_completed,mark_question_as_answered
from services.scoring_service import run_full_scoring




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
whisper_queue = rq.Queue("whisper_queue", connection=redis_conn)


# --- Upload & Transcribe Endpoint ---
@router.post("/answer")
def save_answer(
    file: UploadFile = File(...),
    questionId: str = Form(...),
    interviewId: str = Form(...),
    userId: Optional[str] = Form(None),
    attemptId: str = Form(...)
):
    temp_path = None
    try:
        # Save uploaded audio to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(file.file.read())
            temp_path = tmp.name

        
        mark_question_as_answered(attemptId, questionId, interviewId, userId)

        print(f"[AI] Queuing Whisper transcription for question {questionId}...")

        # ---------------------------------------------------
        # 🚀 ENQUEUE WHISPER TRANSCRIPTION TO RQ WORKER
        # ---------------------------------------------------
        whisper_queue.enqueue(
            "tasks.whisper_task.whisper_transcribe_task",
            temp_path,      
            interviewId,
            questionId,
            userId,
            attemptId
        )

        # DO NOT delete the file here — worker needs it.
        print("[AI] Whisper task queued successfully.")

        return {
            "status": "queued",
            "message": "Transcription started...",
            "questionId": questionId,
            "attemptId": attemptId
        }

    except Exception as e:
        print(f"[Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))


#--- Start Attempt Endpoint ---
@router.post("/start_attempt")
async def start_attempt(request: StartAttemptRequest):
    print("\n==============================")
    print("📌 START_ATTEMPT REQUEST RECEIVED")
    print("==============================")
    print(f"➡ attemptId (from frontend): {request.attemptId}")
    print(f"➡ interviewId: {request.interviewId}")
    print(f"➡ userId: {request.userId}")

    try:
        try:
            print("📌 Calling create_attempt_record_in_db()...")
            create_attempt_record_in_db(
                attempt_id=request.attemptId,
                interview_id=request.interviewId,
                user_id=request.userId
            )
            print("✅ Attempt record created successfully.")

        except Exception as e:
            print("❌ ERROR inside create_attempt_record_in_db")
            print("🧨 Exception Trace Below:")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"DB Insert Error: {str(e)}")

        print("📤 Sending response back to frontend...")
        return {
            "message": "Attempt record initialized successfully",
            "attemptId": request.attemptId
        }

    except Exception as e:
        print("❌ OUTER ERROR: Something went wrong in start_attempt")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"start_attempt failed: {str(e)}")



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
                                tts_queue.enqueue("tasks.tts_task.generate_audio_task", text, i_id, q_id)
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

    print("\n==============================")
    print("📩 Incoming /complete_attempt request")
    print("==============================")

    print("🆔 attemptId:", request.attemptId)
    print("🗂 interviewId:", request.interviewId)
    print("👤 userId:", request.userId)

    attempt_id = request.attemptId

    print(f"\n--- Finalizing Attempt: {attempt_id} ---")

    try:
        print("\n🔧 Step 1: Updating attempt status to COMPLETED...")

        await asyncio.to_thread(update_attempt_status_to_completed, attempt_id)

        print("✅ Attempt status updated.\n")
        
        
        # -----------------------------
        # 2️⃣ Wait for required transcripts
        # -----------------------------
        print("⏳ Step 2: Waiting for required Whisper transcripts...")
        from services.wait_utils import wait_for_required_transcripts
        await wait_for_required_transcripts(attempt_id, timeout=60)
        print("✅ Transcript wait finished (or timeout reached).")

        
        print("🔍 Step 2: Running full scoring pipeline...")
        print("⏳ Calling run_full_scoring() ...")

        llm_results = await run_full_scoring(
            attempt_id=request.attemptId,
            user_id=request.userId,
            interview_id=request.interviewId
        )

        print("\n🎯 Scoring completed successfully!")
        print("📊 Overall:", llm_results["overall_score"])
        print("📝 Feedback length:", len(llm_results["feedback"]))
        print("🧩 Questions scored:", len(llm_results["questions"]))

    except Exception as e:
        import traceback
        print("\n❌ ERROR inside complete_attempt:")
        print("Error message:", e)
        print("\n--- TRACEBACK ---")
        print(traceback.format_exc())
        print("--- END TRACEBACK ---\n")

        raise HTTPException(
            status_code=500,
            detail=f"Failed to finalize attempt: {e}"
        )

    print("\n🚀 Returning final response...\n")

    return {
        "message": "Scoring Complete",
        "attemptId": attempt_id,
        "overall_score": llm_results["overall_score"],
        "feedback": llm_results["feedback"],
        "questions": llm_results["questions"]
    }
