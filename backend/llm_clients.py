from langchain_groq import ChatGroq
from groq import Groq
import os

import dotenv
dotenv.load_dotenv()

# LLM for cleaning/correction
llm_cleaner = ChatGroq(
    model="llama-3.1-8b-instant",
    groq_api_key=os.getenv("GROQ_API_KEY")
)

# LLM for interviewing / question generation
llm_interviewer = ChatGroq(
    model="llama-3.3-70b-versatile",
    groq_api_key=os.getenv("GROQ_API_KEY")
)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))