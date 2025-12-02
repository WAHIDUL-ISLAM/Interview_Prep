import re
from typing import List
import fitz
import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sentence_transformers import SentenceTransformer

embed_model = SentenceTransformer("all-MiniLM-L6-v2")


def parse_pdf_to_text(file_path: str) -> str:
    text = ""
    with fitz.open(file_path) as pdf:
        for page in pdf:
            text += page.get_text("text") + "\n"
    return text.strip()


def parse_pdf_to_chunks_agglomerative(
    file_path: str,
    chunk_size: int = 2000,
    max_cluster_size: int = 8000,
    distance_threshold: float = 0.35, 
) -> List[str]:

    full_text = parse_pdf_to_text(file_path)
    if not full_text:
        return []

    # Step 1: split into paragraphs
    paragraphs = [p.strip() for p in re.split(r'\n+', full_text) if p.strip()]
    if not paragraphs:
        return []

    # Step 2: initial ~2k character chunks
    rough_chunks = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) > chunk_size:
            rough_chunks.append(current_chunk.strip())
            current_chunk = para + "\n"
        else:
            current_chunk += para + "\n"

    if current_chunk.strip():
        rough_chunks.append(current_chunk.strip())

    if len(rough_chunks) == 1:
        return rough_chunks

    # Step 3: embed all chunks
    embeddings = embed_model.encode(rough_chunks)

    # Step 4: Agglomerative clustering
    clustering = AgglomerativeClustering(
        affinity="cosine",
        linkage="average",
        distance_threshold=distance_threshold,
        n_clusters=None
    )

    labels = clustering.fit_predict(embeddings)

    # Step 5: merge chunks per cluster
    cluster_map = {}
    for idx, label in enumerate(labels):
        cluster_map.setdefault(label, []).append(rough_chunks[idx])

    final_chunks = []

    for label, cluster_chunks in cluster_map.items():
        merged = "\n".join(cluster_chunks)

        # enforce max_cluster_size
        if len(merged) > max_cluster_size:
            # split extremely large clusters
            for start in range(0, len(merged), max_cluster_size):
                final_chunks.append(merged[start:start + max_cluster_size])
        else:
            final_chunks.append(merged)

    return final_chunks
