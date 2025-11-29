from kokoro_local import tts_to_wav
from services.storage import cache_audio
import redis
import os
print("CWD:", os.getcwd())

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_conn = redis.Redis.from_url(REDIS_URL)

def generate_audio_task(text: str, interview_id: str, question_id: str):
    """
    Heavy TTS task for Kokoro 82M.
    Runs in RQ worker process.
    """
    try:
        wav_bytes = tts_to_wav(text)
        cache_audio(interview_id, question_id, wav_bytes)
        print(f"[RQ] Audio generated for {interview_id}-{question_id}")
    except Exception as e:
        print(f"[RQ] TTS generation error: {e}")



