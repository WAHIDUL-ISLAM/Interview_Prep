# import redis
# import os
# from supabase_client import supabase
# from uuid import UUID
# from typing import Optional,Union
# import uuid
# from datetime import datetime


# # --- Redis Client ---
# REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# # Redis setup

# redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=False)

# def redis_key(interview_id: str, question_id: str):
#     return f"tts:{interview_id}:{question_id}"

# def cache_audio(interview_id: str, question_id: str, wav_bytes: bytes):
#     redis_client.setex(redis_key(interview_id, question_id), 86400, wav_bytes)
#     print(f"[Redis] Cached audio for interview={interview_id}, question={question_id}")

# def get_cached_audio(interview_id: str, question_id: str):
#     audio = redis_client.get(redis_key(interview_id, question_id))
#     if audio:
#         print(f"[Redis] Cache hit for interview={interview_id}, question={question_id}")
#     else:
#         print(f"[Redis] Cache miss for interview={interview_id}, question={question_id}")
#     return audio

# #-- Saving answer transcripts to Supabase --
# def save_transcript_to_db(interview_id: str, question_id: str, text: str, userId: str,attemptId: str):
#     """Inserts transcript into Supabase"""
#     data = {
#         ""
#         "interview_id": interview_id,
#         "question_id": question_id,
#         "transcript": text,
#         "user_id": userId,
#         "attempt_id": attemptId
#     }
#     return supabase.table("answers").insert(data).execute()


# #-- Managing attempt records in Supabase --
# def create_attempt_record_in_db(
#     attempt_id: Union[str, UUID], 
#     interview_id: Union[str, UUID], 
#     user_id: Optional[Union[str, UUID]]
# ):
#     """
#     Inserts the initial record into the 'attempts' table.
#     This is the crucial step that prevents the Foreign Key error on the 'answers' table.
#     """
    
#     data = {
#         "attempt_id": str(attempt_id),
#         "interview_id": str(interview_id), 
#         "user_id": str(user_id) if user_id else None,
#     }
    
#     response = supabase.table("attempts").insert(data).execute()
    
#     if 'error' in response and response['error'] is not None:
#         print(f"[Supabase Error] Failed to create attempt record: {response['error']}")
#         raise Exception(f"Supabase attempt insertion failed: {response['error']}")
        
#     print(f"[Supabase] Created new attempt record: {attempt_id}")
#     return response


# #-- Completing attempt records in Supabase --
# def update_attempt_status_to_completed(
#     attempt_id: Union[str, UUID]
# ):
#     """
#     Updates the status column of an existing record in the 'attempts' table to 'completed'.

#     Args:
#         attempt_id: The unique ID of the interview attempt to finalize.
#     """
    
#     update_data = {
#         "status": "completed",
#         "finish_time": supabase.func.now()
#     }
    
#     response = (
#         supabase.table("attempts")
#         .update(update_data)
#         .eq("attempt_id", str(attempt_id))
#         .execute()
#     )
    
#     if 'error' in response and response['error'] is not None:
#         print(f"[Supabase Error] Failed to finalize attempt {attempt_id}: {response['error']}")
#         raise Exception(f"Supabase status update failed for {attempt_id}: {response['error']}")
        
#     print(f"[Supabase] Finalized attempt {attempt_id}. Status set to 'completed'.")
    
#     return response



# def save_chunks_to_supabase(chunks: list[str], user_id: str, pdf_upload_id: str, interview_id: str = None):
#     """
#     Save chunks to Supabase table 'pdf_chunks' with unique chunk ID and PDF upload ID.
#     """
#     records = [
#         {
#             "id": str(uuid.uuid4()),
#             "user_id": user_id,
#             "pdf_upload_id": pdf_upload_id,   
#             "interview_id": interview_id,     
#             "chunk_text": chunk,
#         }
#         for chunk in chunks
#     ]

#     # Insert all chunks at once (v2)
#     res = supabase.from_("pdf_chunks").insert(records).execute()
#     # Check for error
#     if hasattr(res, "error") and res.error:
#         raise Exception(f"Supabase insert failed: {res.error}")
#     print(f"[DEBUG] Inserted {len(chunks)} chunks for pdf_upload_id={pdf_upload_id}")
    

# def save_chunk_metadata_to_supabase(metadata_list, user_id, pdf_upload_id, interview_id=None):
#     records = [
#         {
#             "id": str(uuid.uuid4()),
#             "pdf_upload_id": pdf_upload_id,
#             "user_id": user_id,
#             "interview_id": interview_id,
#             "chunk_preview": meta.get("chunk_preview", "")[:200],
#             "topics": meta.get("topics", []),
#             "key_points": meta.get("key_points", []),
#         }
#         for meta in metadata_list
#     ]
    
#     res = supabase.table("pdf_structured_data").insert(records).execute()
    
#     if res.error is not None:
#         raise Exception(f"Supabase metadata insert failed: {res.error}")
    
#     print(f"[DEBUG] Inserted {len(metadata_list)} metadata rows for pdf_upload_id={pdf_upload_id}")
    
#     return res.data




import redis
import os
from supabase_client import supabase
from uuid import UUID
from typing import Optional, Union
import uuid
from datetime import datetime
from postgrest.exceptions import APIError # Import specific PostgREST error

# --- Redis Client ---
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
# Redis setup
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=False)


def redis_key(interview_id: str, question_id: str):
    return f"tts:{interview_id}:{question_id}"


def cache_audio(interview_id: str, question_id: str, wav_bytes: bytes):
    """Caches audio bytes in Redis with a 24-hour expiration."""
    # 86400 seconds = 24 hours
    redis_client.setex(redis_key(interview_id, question_id), 86400, wav_bytes)
    print(f"[Redis] Cached audio for interview={interview_id}, question={question_id}")


def get_cached_audio(interview_id: str, question_id: str):
    """Retrieves cached audio bytes from Redis."""
    audio = redis_client.get(redis_key(interview_id, question_id))
    if audio:
        print(f"[Redis] Cache hit for interview={interview_id}, question={question_id}")
    else:
        print(f"[Redis] Cache miss for interview={interview_id}, question={question_id}")
    return audio


# --- Supabase Functions (Refactored for Robust Error Handling) ---

def save_transcript_to_db(interview_id: str, question_id: str, text: str, user_id: str, attempt_id: str):
    """Inserts transcript into Supabase 'answers' table."""
    data = {
        "interview_id": interview_id,
        "question_id": question_id,
        "transcript": text,
        "user_id": user_id,
        "attempt_id": attempt_id
    }
    try:
        # Client raises APIError on failure, no need for manual .error check
        res = supabase.table("answers").insert(data).execute()
        return res.data
    except APIError as e:
        raise Exception(f"[Supabase] Failed to insert transcript: {e}")


def create_attempt_record_in_db(
    attempt_id: Union[str, UUID],
    interview_id: Union[str, UUID],
    user_id: Optional[Union[str, UUID]] = None
):
    """Insert a new attempt record into Supabase 'attempts' table."""
    data = {
        "attempt_id": str(attempt_id),
        "interview_id": str(interview_id),
        "user_id": str(user_id) if user_id else None,
    }

    try:
        res = supabase.table("attempts").insert(data).execute()
        print(f"[Supabase] Created new attempt record: {attempt_id}")
        return res.data
    except APIError as e:
        # Catch and re-raise if the creation failed
        raise Exception(f"[Supabase] Failed to create attempt record: {e}")


def update_attempt_status_to_completed(attempt_id: Union[str, UUID]):
    """Mark attempt as completed in 'attempts' table."""
    update_data = {
        "status": "completed",
        "finish_time": supabase.func.now()
    }

    try:
        res = supabase.table("attempts").update(update_data).eq("attempt_id", str(attempt_id)).execute()
        print(f"[Supabase] Attempt {attempt_id} marked as completed")
        return res.data
    except APIError as e:
        # Catch and re-raise if the update failed
        raise Exception(f"[Supabase] Failed to update attempt status: {e}")


def save_chunks_to_supabase(chunks: list[str], user_id: str, pdf_upload_id: str, interview_id: Optional[str] = None):
    """Save PDF chunks to Supabase 'pdf_chunks' table."""
    records = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "pdf_upload_id": pdf_upload_id,
            "interview_id": interview_id,
            "chunk_text": chunk,
        }
        for chunk in chunks
    ]

    try:
        res = supabase.table("pdf_chunks").insert(records).execute()
        print(f"[Supabase] Inserted {len(chunks)} chunks for pdf_upload_id={pdf_upload_id}")
        return res.data
    except APIError as e:
        raise Exception(f"[Supabase] Failed to insert chunks: {e}")


def save_chunk_metadata_to_supabase(metadata_list: list[dict], user_id: str, pdf_upload_id: str, interview_id: Optional[str] = None):
    """Save structured metadata for PDF chunks to 'pdf_structured_data' table."""
    records = [
        {
            "id": str(uuid.uuid4()),
            "pdf_upload_id": pdf_upload_id,
            "user_id": user_id,
            "interview_id": interview_id,
            "chunk_preview": meta.get("chunk_preview", "")[:200],
            "topics": meta.get("topics", []),
            "key_points": meta.get("key_points", []),
        }
        for meta in metadata_list
    ]

    try:
        res = supabase.table("pdf_structured_data").insert(records).execute()
        print(f"[Supabase] Inserted {len(metadata_list)} metadata rows for pdf_upload_id={pdf_upload_id}")
        return res.data
    except APIError as e:
        raise Exception(f"[Supabase] Failed to insert chunk metadata: {e}")
    
    
