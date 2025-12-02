# backend/kokoro_local.py

import torch
import numpy as np
from kokoro import KPipeline
import soundfile as sf
import io

print("🔊 Loading Kokoro TTS model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
pipeline = KPipeline(lang_code="a", device=device)
print(f"✅ Kokoro loaded using {device}")


def tts_to_wav(text: str, voice="af_heart") -> bytes:
    """
    Run Kokoro TTS and return WAV bytes (playable by browser <audio>).
    """

    # Kokoro returns segmented output: (start_time, end_time, audio_chunk)
    segments = pipeline(text, voice=voice)

    audio = []
    for _, _, segment_audio in segments:
        audio.extend(segment_audio)

    # Convert to numpy float32 array
    audio_np = np.array(audio, dtype=np.float32)
    sample_rate = 24000  

    # Encode into WAV container
    buf = io.BytesIO()
    sf.write(buf, audio_np, sample_rate, format="WAV")
    return buf.getvalue()
