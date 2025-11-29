import os
import tempfile
import uuid
import json
import asyncio
from fastapi import APIRouter, UploadFile, Form, WebSocket, HTTPException
from fastapi.responses import JSONResponse
import redis
import rq
from urllib.parse import unquote
from tasks.pdf_task import pdf_parsing_task

router = APIRouter()

# Redis connection
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
redis_conn = redis.Redis.from_url(REDIS_URL)
pdf_queue = rq.Queue("pdf_queue", connection=redis_conn)


# --- PDF Upload Endpoint ---
@router.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile, 
    userId: str = Form(...),
    creation_method: str = Form(...),
    interviewId: str = Form(None)):
    
    try:
        print(f"[DEBUG] Received upload request for userId={userId} with file={file.filename}")

        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files allowed")
        
        if creation_method not in ["PDF"]:
            raise HTTPException(400, "Invalid creation_method for PDF upload")
        
        # Generate unique PDF upload ID
        pdf_upload_id = str(uuid.uuid4())
        print(f"[DEBUG] Generated pdf_upload_id={pdf_upload_id}")

        # Save temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        temp_file.write(await file.read())
        temp_file.close()
        print(f"[DEBUG] Temporary file saved at {temp_file.name}")

        # Create Redis key to track status
        redis_key = f"pdf_parse:{uuid.uuid4()}"
        print(f"[DEBUG] Redis key for tracking: {redis_key}")

        # Enqueue background task
        pdf_queue.enqueue(pdf_parsing_task, temp_file.name, redis_key, userId, pdf_upload_id, interviewId)
        print(f"[DEBUG] Enqueued pdf_parsing_task in pdf_queue")

        # Return WebSocket URL for progress tracking
        ws_url = f"ws://localhost:8000/ws/pdf-status/{redis_key}"  # adjust host/port
        return JSONResponse(content={"websocketUrl": ws_url, "redisKey": redis_key})
    
    except Exception as e:
        print(f"[ERROR] Error in /upload-pdf endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- WebSocket Endpoint ---
@router.websocket("/ws/pdf-status/{redis_key}")
async def websocket_pdf_status(ws: WebSocket, redis_key: str):
    redis_key = unquote(redis_key)
    print(f"[DEBUG] WebSocket connection opened for Redis key: {redis_key}")
    await ws.accept()
    try:
        while True:
            data = redis_conn.get(redis_key)
            if data:
                status_data = json.loads(data)
                await ws.send_json(status_data)
                print(f"[DEBUG] Sent status over WebSocket: {status_data}")
                if status_data.get("status") in ["done", "error"]:
                    print(f"[DEBUG] Status is final: {status_data.get('status')}, closing WebSocket")
                    break
            await asyncio.sleep(1)
    except Exception as e:
        print(f"[ERROR] WebSocket error for {redis_key}: {e}")
        await ws.send_json({"status": "error", "error": str(e)})
    finally:
        await ws.close()
        print(f"[DEBUG] WebSocket closed for Redis key: {redis_key}")
