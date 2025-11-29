from faster_whisper import WhisperModel
from supabase_client import WHISPER_MODEL_SIZE, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE

print(f"Loading Whisper Model ({WHISPER_MODEL_SIZE})...")
model = WhisperModel(WHISPER_MODEL_SIZE, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE_TYPE)
print("Whisper Model Loaded.")

def transcribe_file(file_path: str) -> str:
    """
    Takes a file path, runs Whisper, and returns the text string.
    """
    segments, _ = model.transcribe(file_path, beam_size=5)
    text = " ".join([segment.text for segment in segments]).strip()
    return text