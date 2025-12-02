import asyncio

async def wait_for_required_transcripts(attempt_id: str, timeout=60):
    from services.scoring_service import fetch_answers, fetch_questions
    
    for _ in range(timeout):
        questions = await fetch_questions(attempt_id)
        answers = await fetch_answers(attempt_id)

        ans_map = {a["question_id"]: a for a in answers}

        all_done = True

        for q in questions:
            qid = q["id"]

            a = ans_map.get(qid)

            # User skipped this question → don't wait
            if not a or not a.get("has_audio"):
                continue

            # User answered but transcript not ready → wait
            if not a.get("transcript"):
                all_done = False

        if all_done:
            return True

        await asyncio.sleep(1)

    return False
