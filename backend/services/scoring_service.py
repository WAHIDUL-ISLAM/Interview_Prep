# backend/services/scoring_service.py

import os
import requests
import json
import re
from typing import List, Dict
from supabase_client import supabase


# -------------------------------
# RAW GROQ API CONFIG
# -------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.1-8b-instant"


# =====================================================
# RAW CLIENT
# =====================================================
def groq_raw(prompt: str, max_tokens=200):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}"
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0,
        "max_tokens": max_tokens
    }

    response = requests.post(GROQ_URL, json=payload, headers=headers)

    try:
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print("❌ RAW API ERROR:", e)
        print("Response:", response.text)
        return ""


# =====================================================
# JSON SANITIZER
# =====================================================
def safe_parse_llm_json(raw: str):

    raw = raw.strip().replace("```json", "").replace("```", "")

    match = re.search(r"\{.*?\}", raw, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found.")

    json_str = match.group(0)

    data = json.loads(json_str)

    required = ["clarity", "relevance", "depth", "structure", "final_score"]
    for k in required:
        if k not in data:
            raise ValueError(f"Missing key: {k}")
        if not isinstance(data[k], int):
            raise ValueError(f"Key '{k}' must be integer.")

    total = data["clarity"] + data["relevance"] + data["depth"] + data["structure"]
    if total != data["final_score"]:
        raise ValueError("final_score must equal the sum of categories.")

    return data


# =====================================================
# FETCH QUESTIONS
# =====================================================
async def fetch_questions(attempt_id: str) -> List[Dict]:

    res = (
        supabase.table("questions")
        .select("id, question, ideal_answer, attempt_id, interview_id")
        .eq("attempt_id", attempt_id)
        .order("created_at", desc=False)
        .execute()
    )

    return res.data or []


# =====================================================
# FETCH ANSWERS
# =====================================================
async def fetch_answers(attempt_id: str) -> List[Dict]:

    res = (
        supabase.table("answers")
        .select("question_id, transcript, has_audio")
        .eq("attempt_id", attempt_id)
        .execute()
    )

    return res.data or []


# =====================================================
# MERGE Q & A
# =====================================================
def merge_questions_and_answers(questions, answers):

    answer_map = {
        a["question_id"]: (a.get("transcript") or "")
        for a in answers
    }

    merged = []
    for q in questions:
        merged.append({
            "attempt_id": q["attempt_id"],
            "question_id": q["id"],
            "question_text": q["question"],
            "ideal_answer": q.get("ideal_answer", ""),
            "user_transcript": answer_map.get(q["id"], "")
        })

    return merged


# =====================================================
# LLM SCORING
# =====================================================
async def llm_score_question(q_text, ideal_answer, user_answer):

    prompt = f"""
You are a strict scoring engine. 
Output ONLY ONE JSON object:

{{
  "clarity": 0,
  "relevance": 0,
  "depth": 0,
  "structure": 0,
  "final_score": 0
}}

Rules:
- No extra text.
- No markdown.
- All values 0–25, final_score = total.

Question: {q_text}
Ideal Answer: {ideal_answer}
User Answer: {user_answer}
"""

    raw = groq_raw(prompt)

    for _ in range(3):
        try:
            return safe_parse_llm_json(raw)
        except:
            raw = groq_raw(prompt)

    raise ValueError("LLM failed to give valid JSON.")


# =====================================================
# SCORE ALL QUESTIONS — NOW WITH TOTALS
# =====================================================
async def score_all_llm(merged_data):

    results = []
    final_scores = []

    total_clarity = 0
    total_relevance = 0
    total_depth = 0
    total_structure = 0

    for item in merged_data:
        category_scores = await llm_score_question(
            item["question_text"],
            item["ideal_answer"],
            item["user_transcript"]
        )

        # accumulate totals
        total_clarity += category_scores["clarity"]
        total_relevance += category_scores["relevance"]
        total_depth += category_scores["depth"]
        total_structure += category_scores["structure"]

        item["category_scores"] = category_scores
        results.append(item)
        final_scores.append(category_scores["final_score"])

    overall_score = round(sum(final_scores) / len(final_scores), 2) if final_scores else 0

    return {
        "results": results,
        "overall_score": overall_score,
        "total_clarity": total_clarity,
        "total_relevance": total_relevance,
        "total_depth": total_depth,
        "total_structure": total_structure,
    }


# =====================================================
# FEEDBACK GENERATION
# =====================================================
async def generate_feedback(overall_score, scored_items):

    prompt = f"""
# You are a professional interview evaluator.

# Write structured, helpful feedback using THIS exact format:

# SECTION 1 — Summary (4–6 sentences)
# Write a natural, balanced summary of overall performance.

# SECTION 2 — Detailed Analysis
# Clarity:
# - bullet point
# - bullet point
# - bullet point
# Relevance:
# - bullet point
# - bullet point
# - bullet point
# Depth:
# - bullet point
# - bullet point
# - bullet point
# Structure:
# - bullet point
# - bullet point
# - bullet point

# SECTION 3 — Improvement Plan (3 steps)
# 1. Practical suggestion
# 2. Practical suggestion
# 3. Practical suggestion

# RULES:
# - No emojis
# - No JSON
# - No markdown code blocks

# DATA:
# Overall Score: {overall_score}
# Question Scores: {json.dumps(scored_items, indent=2)}
# """

    text = groq_raw(prompt, max_tokens=400)
    return text.replace("```", "").strip()


# =====================================================
# SAVE FEEDBACK
# =====================================================
def save_feedback_to_db(user_id, interview_id, attempt_id, overall_score, feedback_text, total_clarity, total_relevance, total_depth, total_structure):

    payload = {
        "user_id": user_id,
        "interview_id": interview_id,
        "attempt_id": attempt_id,
        "overall_score": overall_score,
        "feedback_text": feedback_text,
        "total_clarity": total_clarity,
        "total_relevance": total_relevance,
        "total_depth": total_depth,
        "total_structure": total_structure,
    }
    
    
    try:
        res = supabase.table("feedback").insert(payload).execute()
    except Exception as e:
        raise Exception(f"[Supabase] Failed to insert feedback: {e}")

    print(f"[Supabase] Inserted feedback for attempt_id={attempt_id}")


    print(f"✔ Feedback saved for attempt {attempt_id}")
    print(f"total_clarity: {total_clarity}")
    print(f"total_relevance: {total_relevance}")
    print(f"total_depth: {total_depth}")
    print(f"total_structure: {total_structure}")



# =====================================================
# FULL SCORING PIPELINE
# =====================================================
async def run_full_scoring(attempt_id: str, user_id: str, interview_id: str):

    questions = await fetch_questions(attempt_id)
    answers = await fetch_answers(attempt_id)

    merged = merge_questions_and_answers(questions, answers)

    scoring = await score_all_llm(merged)

    scored_items = scoring["results"]
    overall_score = scoring["overall_score"]

    # totals
    totals = {
        "total_clarity": scoring["total_clarity"],
        "total_relevance": scoring["total_relevance"],
        "total_depth": scoring["total_depth"],
        "total_structure": scoring["total_structure"],
    }


    feedback_text = await generate_feedback(overall_score, scored_items)

    save_feedback_to_db(
        user_id=user_id,
        interview_id=interview_id,
        attempt_id=attempt_id,
        overall_score=overall_score,
        feedback_text=feedback_text,
        total_clarity=totals["total_clarity"],  
        total_relevance=totals["total_relevance"],
        total_depth=totals["total_depth"],
        total_structure=totals["total_structure"]
    )

    return {
        "overall_score": overall_score,
        "total_clarity": totals["total_clarity"],
        "total_relevance": totals["total_relevance"],
        "total_depth": totals["total_depth"],
        "total_structure": totals["total_structure"],
        "feedback": feedback_text,
        "questions": scored_items
    }
