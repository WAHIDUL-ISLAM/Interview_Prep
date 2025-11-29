import os
import json
from typing import Dict, Any, List
from groq import Groq
import dotenv

# Load env vars
dotenv.load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

GROQ_MODEL = "llama-3.1-8b-instant"

def generate_chunk_metadata(chunks: List[str]) -> List[Dict[str, Any]]:
    metadata_list = []

    for idx, chunk in enumerate(chunks):
        print(f"\n--- Processing chunk {idx+1}/{len(chunks)} ---")
        print(f"Chunk preview (first 50 chars): {chunk[:50]}")

        prompt = (
            "Extract the main topics and key points from the text.\n"
            "Return ONLY valid JSON in the structure:\n"
            "{\n"
            '  \"chunk_preview\": \"<first 50 chars>\",\n'
            '  \"topics\": [\"topic1\", \"topic2\"],\n'
            '  \"key_points\": [\"point1\", \"point2\"]\n'
            "}\n\n"
            f"Text chunk:\n{chunk}"
        )

        try:
            # --- Groq Inference ---
            completion = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
            )

            raw = completion.choices[0].message.content.strip()
            print(f"Raw completion:\n{raw}")

            chunk_metadata = json.loads(raw)

            # Ensure chunk_preview exists
            if "chunk_preview" not in chunk_metadata:
                print("chunk_preview missing, adding manually.")
                chunk_metadata["chunk_preview"] = chunk[:50]

        except json.JSONDecodeError as e:
            print(f"JSONDecodeError: {e}")
            print("Falling back to default metadata structure.")
            chunk_metadata = {
                "chunk_preview": chunk[:50],
                "topics": [],
                "key_points": []
            }
        except Exception as e:
            print(f"Unexpected error: {e}")
            chunk_metadata = {
                "chunk_preview": chunk[:50],
                "topics": [],
                "key_points": []
            }

        metadata_list.append(chunk_metadata)
        print(f"Chunk metadata appended: {chunk_metadata}")

    return metadata_list
