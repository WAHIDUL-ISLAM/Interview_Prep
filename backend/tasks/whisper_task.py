# tasks/whisper_task.py

import os
from faster_whisper import WhisperModel
from services.WhisperModel import transcribe_with_model
from services.storage import save_transcript_to_db

# -----------------------------------------------------
# LOAD WHISPER MODEL ONCE WHEN THE WORKER STARTS
# -----------------------------------------------------

print("🎤 Loading Whisper Model in worker...")

model_size = os.getenv("WHISPER_MODEL_SIZE", "medium") 
device = os.getenv("WHISPER_DEVICE", "cpu")        
compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8") 

model = WhisperModel(
    model_size,
    device=device,
    compute_type=compute_type
)

print("✅ Whisper Model Loaded in worker.")

# -----------------------------------------------------
# TASK: TRANSCRIBE AUDIO FILE
# -----------------------------------------------------

def whisper_transcribe_task(file_path, interview_id, question_id, user_id, attempt_id):
    """
    Runs Whisper ASR using the preloaded model.
    Saves transcript to the DB.
    """
    try:
        transcript = transcribe_with_model(model, file_path)
        save_transcript_to_db(interview_id, question_id, transcript, user_id, attempt_id)
        print(f"[RQ] Whisper transcription complete for Q:{question_id}")
        return transcript

    except Exception as e:
        print(f"[RQ] Whisper transcription error: {e}")
        return ""

    finally:
        # WORKER deletes temp file (NOT FastAPI)
        if os.path.exists(file_path):
            os.remove(file_path)
