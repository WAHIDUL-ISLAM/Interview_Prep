# tasks.py
import os
import json
from services.pdf_parser import parse_pdf_to_chunks
from services.llm_utils import generate_chunk_metadata
from services.storage import save_chunks_to_supabase, save_chunk_metadata_to_supabase
import redis
from supabase_client import supabase
from postgrest.exceptions import APIError

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
redis_conn = redis.Redis.from_url(REDIS_URL)

def pdf_parsing_task(temp_file_path: str, redis_key: str, user_id: str, pdf_upload_id: str, interview_id: str = None):
    try:
        print(f"[DEBUG] Starting PDF parsing task for file: {temp_file_path}")
        
        # Step 1: Parse PDF into chunks
        chunks = parse_pdf_to_chunks(temp_file_path)
        total_chunks = len(chunks)
        print(f"[DEBUG] Total chunks extracted: {total_chunks}")

        # Step 2: Save raw chunks
        save_chunks_to_supabase(chunks, user_id, pdf_upload_id, interview_id)
        print(f"[DEBUG] Saved raw chunks to Supabase for user_id={user_id}")

        # Step 3: Generate metadata for each chunk
        metadata_data = []
        for idx, chunk in enumerate(chunks):
            print(f"[DEBUG] Processing chunk {idx + 1}/{total_chunks}")
            
            try:
                llm_chunk_json = generate_chunk_metadata([chunk])[0]
                print(f"[DEBUG] Chunk metadata: {llm_chunk_json}")
            except Exception as e:
                print(f"[ERROR] Failed to generate metadata for chunk {idx + 1}: {e}")
                llm_chunk_json = {
                    "chunk_preview": chunk[:50],
                    "topics": [],
                    "key_points": []
                }

            metadata_data.append(llm_chunk_json)

            # Update progress in Redis
            progress = round((idx + 1) / total_chunks * 100)
            redis_conn.set(redis_key, json.dumps({
                "status": "processing",
                "progress": progress
            }), ex=3600)
            print(f"[DEBUG] Updated Redis progress: {progress}%")

        # Step 4: Save metadata to Supabase
        save_chunk_metadata_to_supabase(metadata_data, user_id, pdf_upload_id, interview_id)
        print(f"[DEBUG] Saved metadata to Supabase for user_id={user_id}")

        # Step 5: Mark task done
        redis_conn.set(redis_key, json.dumps({"status": "done"}), ex=3600)
        print(f"[DEBUG] PDF parsing task completed successfully")

    except Exception as e:
        print(f"[ERROR] PDF parsing task failed: {e}")
        redis_conn.set(redis_key, json.dumps({"status": "error", "error": str(e)}), ex=3600)
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            print(f"[DEBUG] Temp file removed: {temp_file_path}")



# # tasks/pdf_task.py

# import os
# import json
# import redis
# from services.pdf_parser import parse_pdf_to_chunks
# from services.llm_utils import generate_chunk_metadata
# from services.storage import (
#     save_chunks_to_supabase,
#     save_chunk_metadata_to_supabase
# )

# # Redis connection
# REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
# redis_conn = redis.Redis.from_url(REDIS_URL)


# def pdf_parsing_task(
#     temp_file_path: str,
#     redis_key: str,
#     user_id: str,
#     pdf_upload_id: str,
#     interview_id: str = None
# ):
#     """
#     Background task for:
#     - Parsing PDF
#     - Splitting into chunks
#     - Generating metadata with LLM
#     - Saving everything to Supabase
#     - Updating progress via Redis
#     """

#     try:
#         print(f"[PDF] Starting PDF parsing: {temp_file_path}")

#         # ======================================================
#         # STEP 1 — PARSE PDF TO TEXT CHUNKS
#         # ======================================================
#         chunks = parse_pdf_to_chunks(temp_file_path)
#         total_chunks = len(chunks)
#         print(f"[PDF] Extracted {total_chunks} chunks")

#         # Save raw chunks to DB
#         save_chunks_to_supabase(chunks, user_id, pdf_upload_id, interview_id)
#         print(f"[PDF] Raw chunks saved for user {user_id}")

#         # ======================================================
#         # STEP 2 — PROCESS EACH CHUNK WITH LLM
#         # ======================================================
#         metadata_data = []

#         for idx, chunk in enumerate(chunks):
#             print(f"[PDF] Processing chunk {idx + 1}/{total_chunks}")

#             # Try LLM processing
#             try:
#                 chunk_metadata = generate_chunk_metadata([chunk])[0]
#             except Exception as e:
#                 print(f"[ERROR] LLM failed for chunk {idx + 1}: {e}")
#                 chunk_metadata = {
#                     "chunk_preview": chunk[:50],
#                     "topics": [],
#                     "key_points": []
#                 }

#             metadata_data.append(chunk_metadata)

#             # ---- Update Progress in Redis ----
#             progress = round(((idx + 1) / total_chunks) * 100)
#             redis_conn.set(
#                 redis_key,
#                 json.dumps({
#                     "status": "processing",
#                     "progress": progress
#                 }),
#                 ex=3600
#             )
#             print(f"[PDF] Progress updated: {progress}%")

#         # ======================================================
#         # STEP 3 — SAVE METADATA TO SUPABASE
#         # ======================================================
#         save_chunk_metadata_to_supabase(
#             metadata_data,
#             user_id,
#             pdf_upload_id,
#             interview_id
#         )
#         print(f"[PDF] Metadata saved successfully.")

#         # ======================================================
#         # STEP 4 — FINAL STATUS
#         # ======================================================
#         redis_conn.set(redis_key, json.dumps({"status": "done"}), ex=3600)
#         print(f"[PDF] PDF parsing task completed.")

#     except Exception as e:
#         print(f"[ERROR] PDF parsing failed: {e}")

#         # Notify the frontend
#         redis_conn.set(
#             redis_key,
#             json.dumps({"status": "error", "error": str(e)}),
#             ex=3600
#         )

#     finally:
#         # Always remove temp file
#         if os.path.exists(temp_file_path):
#             os.remove(temp_file_path)
#             print(f"[PDF] Temp file removed: {temp_file_path}")
