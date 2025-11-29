import uuid
import json
from datetime import datetime
from llm_clients import llm_interviewer  
import re

def generate_questions(role: str, techstack: list[str], interview_type: str):
    system_prompt = f"""
        You are a senior technical interviewer conducting a realistic, structured interview.

        Candidate role: {role}
        Tech stack: {', '.join(techstack)}
        Interview type: {interview_type}

        🎯 Objectives:
        1. Generate exactly 10 interview questions.
        2. Questions should simulate a real interview:
        - Start with basic concepts and gradually increase in difficulty.
        - Each question should logically follow from the previous one.
        - Include a mix of conceptual, coding, and scenario-based questions relevant to the role and tech stack.
        3. Return the output strictly as a JSON array of question objects.
        4. Each question object must have the following fields:
        - "question": the text of the question
        - "difficulty": "easy", "medium", or "hard"
        - "category": "concept", "coding", or "scenario"
        - "topic": a specific subject or technology area (e.g., "Python OOP", "React State Management", "REST API Design")
        - "ideal_answer": a concise, accurate reference answer (2–5 sentences or a code snippet)
        - "key_points": a list of 3–6 critical ideas, concepts, or keywords that a correct answer must include
        5. Ensure the questions feel like a continuous, realistic interview flow.
        6. Do NOT include any explanations or text outside the JSON array.

        Example output:
        [
        {{
            "question": "Explain OOP concepts in Python.",
            "difficulty": "easy",
            "category": "concept",
            "topic": "Python OOP",
            "ideal_answer": "Object-oriented programming in Python organizes code using classes and objects. It supports principles like encapsulation, inheritance, and polymorphism to make code modular and reusable.",
            "key_points": ["Classes and objects", "Encapsulation", "Inheritance", "Polymorphism"]
        }},
        {{
            "question": "Write a function to reverse a linked list.",
            "difficulty": "medium",
            "category": "coding",
            "topic": "Data Structures - Linked List",
            "ideal_answer": "Use iterative or recursive logic to reverse the pointers of each node in the linked list until all nodes point to the previous one.",
            "key_points": ["Pointer manipulation", "Iterative or recursive approach", "Head node reassignment"]
        }}
        ]
        """

    # llm is defined in llm_clients.py
    raw_output = llm_interviewer.invoke(system_prompt)  
   
    if hasattr(raw_output, "content"):
        raw_output = raw_output.content.strip()
    else:
        raw_output = str(raw_output).strip()

    try:
        question_list = json.loads(raw_output)
    except json.JSONDecodeError:
        question_list = []
    
    questions = []
    for q in question_list:
        if "question" in q and q["question"].strip():
            questions.append({
                "id": str(uuid.uuid4()),
                "question": q["question"].strip(),
                "difficulty": q.get("difficulty", "medium"),
                "topic": q.get("topic", "concept"),
                "type": interview_type,
                "ideal_answer": q.get("ideal_answer", None),    
                "key_points": q.get("key_points", []), 
            })

    return questions



def generate_questions_from_pdf(chunks_data: list[dict], structured_data: list[dict]):
    """
    Generates exactly 10 interview questions from PDF chunks and structured data.
    Always ensures 10 questions are returned, with placeholders if necessary.
    """
    # Combine all text for context
    combined_text = "\n".join(chunk.get("chunk_text", "") for chunk in chunks_data[:30])
    combined_text += "\n" + "\n".join(struct.get("chunk_preview", "") for struct in structured_data[:30])

    # Extract topics and key points safely
    topics_list = []
    key_points_list = []
    for struct in structured_data:
        topics_list.extend(struct.get("topics", []))
        key_points_list.extend(struct.get("key_points", []))

    topics_list = topics_list or ["general"]
    key_points_list = key_points_list or []

    # System prompt with **example**
    system_prompt = f"""
    You are a senior technical interviewer generating exactly 10 questions from structured PDF content.

    Context text: {combined_text}
    Topics: {', '.join(topics_list)}
    Key points: {', '.join(key_points_list)}

    🎯 Objectives:
    1. Generate exactly 10 interview questions, no more, no less.
    2. Each question should simulate a real interview:
       - Start with easier questions, gradually increasing difficulty.
       - Include conceptual, coding, and scenario-based questions relevant to the context.
    3. Return strictly a JSON array of question objects with fields:
       - "question": text
       - "difficulty": "easy", "medium", or "hard"
       - "category": "concept", "coding", or "scenario"
       - "topic": relevant subject/technology from context
       - "ideal_answer": concise correct answer
       - "key_points": 3-6 key ideas/keywords
    4. Do NOT include any extra text outside the JSON array.
    5. If there is insufficient context, invent plausible questions that align with the topics/key points to ensure exactly 10 questions.

    Example output:
    [
        {{
            "question": "Explain the difference between CPU and GPU.",
            "difficulty": "easy",
            "category": "concept",
            "topic": "Computer Architecture",
            "ideal_answer": "CPU is optimized for sequential processing, GPU is optimized for parallel tasks.",
            "key_points": ["CPU vs GPU", "Sequential vs parallel", "Processing units"]
        }},
        {{
            "question": "Write a Python function to reverse a linked list.",
            "difficulty": "medium",
            "category": "coding",
            "topic": "Data Structures - Linked List",
            "ideal_answer": "Iteratively or recursively reverse the pointers of each node until the list is reversed.",
            "key_points": ["Linked list", "Iteration or recursion", "Pointer manipulation"]
        }}
    ]
    """

    # Invoke LLM
    raw_output = llm_interviewer.invoke(system_prompt)
    if hasattr(raw_output, "content"):
        raw_output = raw_output.content.strip()
    else:
        raw_output = str(raw_output).strip()

    # Extract JSON array
    match = re.search(r"\[.*\]", raw_output, re.DOTALL)
    json_text = match.group(0) if match else raw_output

    try:
        question_list = json.loads(json_text)
    except json.JSONDecodeError:
        question_list = []

    # Convert to question dicts
    questions = []
    for q in question_list:
        if isinstance(q, dict) and q.get("question", "").strip():
            questions.append({
                "id": str(uuid.uuid4()),
                "question": q["question"].strip(),
                "difficulty": q.get("difficulty", "medium"),
                "topic": q.get("topic", "general"),
                "type": "pdf",
                "ideal_answer": q.get("ideal_answer", None),
                "key_points": q.get("key_points", []),
            })

    # Ensure exactly 10 questions
    while len(questions) < 10:
        questions.append({
            "id": str(uuid.uuid4()),
            "question": f"Placeholder question {len(questions)+1} based on PDF content",
            "difficulty": "medium",
            "topic": "general",
            "type": "pdf",
            "ideal_answer": "No ideal answer available.",
            "key_points": [],
        })

    if len(questions) > 10:
        questions = questions[:10]

    return questions