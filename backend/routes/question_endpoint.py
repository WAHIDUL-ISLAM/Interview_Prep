from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel
from typing import List
from supabase_client import supabase  
from question_generation.generate_questions import generate_questions, generate_questions_from_pdf


router = APIRouter()

class QuestionRequest(BaseModel):
    userId: str
    interviewId: str
    role: str
    techstack: List[str]
    type: str  
    attemptId: str

@router.post("/manual-questions")
async def create_questions(req: QuestionRequest = Body(...)):
    if not req.techstack:
        raise HTTPException(status_code=400, detail="Techstack is required")

    try:
        attempt_insert = supabase.table("interview_attempts").insert({
            "user_id": req.userId,
            "interview_id": req.interviewId,
            "attempt_id": req.attemptId
        }).execute()

        if not attempt_insert.data:
                raise HTTPException(status_code=500, detail="Failed to create attempt record")

        questions =  generate_questions(req.role, req.techstack, req.type, req.userId, req.interviewId)

        if not questions:
            raise HTTPException(status_code=500, detail="No questions generated")
        
        # Supabase insert
        records = [{
            "id": q["id"],
            "interview_id": req.interviewId,
            "user_id": req.userId,
            "question": q["question"],
            "difficulty": q["difficulty"],  
            "topic": q["topic"],             
            "type": q["type"],
            "ideal_answer": q["ideal_answer"],
            "key_points": q["key_points"],
            "attempt_id": req.attemptId
        } for q in questions]


        try:
            res = supabase.table("questions").insert(records).execute()
            
            if res.data:
                print("Insert successful:", res.data)
            else:
                print("No data returned - check response:", res)
        except Exception as e:
            print("Operation failed:", e)
        

        return {
            "status": "success",
            "questions_created": len(records),
            "interview_id": req.interviewId,
            "questions": questions,
        }

    except Exception as e:
        print("[ERROR] /questions crashed:", e)
        raise HTTPException(status_code=500, detail=str(e))



class PDFQuestionRequest(BaseModel):
    userId: str
    interviewId: str
    attemptId: str

@router.post("/pdf-questions")
async def create_pdf_questions(req: PDFQuestionRequest = Body(...)):
    try:
        # 1. Fetch PDF chunks
        chunks_res = supabase.table("pdf_chunks").select("*").eq("interview_id", req.interviewId).execute()
        chunks_data = chunks_res.data if chunks_res.data else []

        if not chunks_data:
            raise HTTPException(status_code=404, detail="No PDF chunks found for this interview")

        # 2. Fetch structured data
        struct_res = supabase.table("pdf_structured_data").select("*").eq("interview_id", req.interviewId).execute()
        struct_data = struct_res.data if struct_res.data else []

        if not struct_data:
            raise HTTPException(status_code=404, detail="No structured data found for this interview")
        
        attempt_insert = supabase.table("interview_attempts").insert({
            "user_id": req.userId,
            "interview_id": req.interviewId,
            "attempt_id": req.attemptId
        }).execute()

        if not attempt_insert.data:
                raise HTTPException(status_code=500, detail="Failed to create attempt record")
        

        # 3. Generate questions from both chunks and structured data
        questions = generate_questions_from_pdf(chunks_data, struct_data,req.userId, req.interviewId)

        if not questions:
            raise HTTPException(status_code=500, detail="No questions generated from PDF/structured data")
        

        # 4. Prepare records for insertion into "questions" table
        records = [{
            "id": q["id"], 
            "interview_id": req.interviewId,
            "user_id": req.userId,
            "question": q["question"],
            "type": q.get("type", "pdf"),
            "difficulty": q.get("difficulty", "medium"),
            "topic": q.get("topic", ""),
            "ideal_answer": q.get("ideal_answer", ""),
            "key_points": q.get("key_points", []),
            "attempt_id": req.attemptId
        } for q in questions]

        # 5. Insert into Supabase
        try:
            res = supabase.table("questions").insert(records).execute()
            if res.data:
                print("PDF insert successful:", res.data)
            else:
                print("No data returned - check response:", res)
        except Exception as e:
            print("PDF insertion failed:", e)
            raise HTTPException(status_code=500, detail=str(e))

        return {
            "status": "success",
            "questions_created": len(records),
            "interview_id": req.interviewId,
            "questions": questions
        }

    except Exception as e:
        print("[ERROR] /pdf-questions crashed:", e)
        raise HTTPException(status_code=500, detail=str(e))