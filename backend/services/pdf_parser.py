import re
from typing import List
import fitz
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Load embedding model once per worker
embed_model = SentenceTransformer("all-MiniLM-L6-v2")


def parse_pdf_to_text(file_path: str) -> str:
    """Extract full text from PDF."""
    text = ""
    with fitz.open(file_path) as pdf:
        for page in pdf:
            text += page.get_text("text") + "\n"
    return text.strip()


def parse_pdf_to_chunks(
    file_path: str,
    chunk_size: int = 2000,
    max_merged_size: int = 8000,
    similarity_threshold: float = 0.7
) -> List[str]:
    """
    Parse PDF into semantic-aware chunks using greedy similarity merging.
    """
    full_text = parse_pdf_to_text(file_path)
    if not full_text:
        return []

    # Step 1: split into paragraphs
    paragraphs = [p.strip() for p in re.split(r'\n+', full_text) if p.strip()]
    if not paragraphs:
        return []

    # Step 2: create initial 2k-character chunks
    chunks = []
    current_chunk = ""
    for para in paragraphs:
        if len(current_chunk) + len(para) > chunk_size:
            chunks.append(current_chunk.strip())
            current_chunk = para + "\n"
        else:
            current_chunk += para + "\n"
    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    if len(chunks) == 1:
        return chunks  # only one chunk, nothing to merge

    # Step 3: compute embeddings
    chunk_embeddings = embed_model.encode(chunks)

    # Step 4: greedy similarity merging
    merged_flags = [False] * len(chunks)
    merged_chunks = []

    sim_matrix = cosine_similarity(chunk_embeddings)

    for i in range(len(chunks)):
        if merged_flags[i]:
            continue
        merge_group = [i]
        for j in range(i + 1, len(chunks)):
            if merged_flags[j]:
                continue
            if sim_matrix[i][j] >= similarity_threshold:
                merge_group.append(j)
                merged_flags[j] = True

        merged_text = "\n".join(chunks[k] for k in merge_group)

        # Step 5: enforce max_merged_size
        if len(merged_text) > max_merged_size:
            for start in range(0, len(merged_text), max_merged_size):
                merged_chunks.append(merged_text[start:start + max_merged_size])
        else:
            merged_chunks.append(merged_text)

    return merged_chunks
