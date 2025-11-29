from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from routes.question_endpoint import router as question_router
from routes.Interview_endpoint import router as interview_router
from routes.pdf_upload_endpoint import router as pdf_router

# -------------------------------
# FastAPI setup
# -------------------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(question_router, prefix="/interview")
app.include_router(interview_router, prefix="/interview")
app.include_router(pdf_router, prefix="/interview")




