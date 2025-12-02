# test_category_batch.py
import asyncio
from services.scoring_service import llm_score_question

TEST_DATA = [
    {
        "q": "What is polymorphism in OOP?",
        "ideal": "Polymorphism allows different objects to be treated through a common interface.",
        "user": "It means functions do different things."
    },
    {
        "q": "Explain encapsulation.",
        "ideal": "Encapsulation hides internal data and exposes controlled access through methods.",
        "user": "It hides information."
    },
    {
        "q": "What is inheritance?",
        "ideal": "Inheritance allows a class to acquire the properties and methods of another class.",
        "user": "One class can take things from another."
    },
    {
        "q": "What is a database index?",
        "ideal": "An index improves query speed by providing quick lookup access to table data.",
        "user": "It speeds up searching."
    },
    {
        "q": "Explain multithreading.",
        "ideal": "Multithreading allows concurrent execution of multiple threads within a process.",
        "user": "Running tasks at the same time."
    },
    {
        "q": "What is an API?",
        "ideal": "An API is an interface that allows software components to communicate using defined rules.",
        "user": "It lets programs talk."
    },
    {
        "q": "Define machine learning.",
        "ideal": "Machine learning enables systems to learn from data and make decisions without explicit programming.",
        "user": "Computers learn from examples."
    },
    {
        "q": "What is a RESTful service?",
        "ideal": "A RESTful service uses HTTP methods and stateless operations for communication.",
        "user": "Something that uses API calls."
    },
    {
        "q": "Explain TCP vs UDP.",
        "ideal": "TCP is reliable and connection-based; UDP is fast but unreliable and connectionless.",
        "user": "TCP is reliable. UDP is faster."
    },
    {
        "q": "What is cloud computing?",
        "ideal": "Cloud computing provides scalable computing resources over the internet.",
        "user": "Using online servers."
    },
]


async def run_batch_test():
    print("\n🔥 Running 10-question category scoring test...\n")

    all_scores = []

    for idx, item in enumerate(TEST_DATA, start=1):
        print(f"\n==============================")
        print(f"🧪 SCORING QUESTION {idx}/10")
        print("==============================")
        print("❓", item["q"])

        result = await llm_score_question(item["q"], item["ideal"], item["user"])

        print("\n🎯 CATEGORY SCORES:", result)

        all_scores.append(result["final_score"])

    # -------------------------------
    # FINAL OVERALL SCORE
    # -------------------------------
    print("\n\n=================================================")
    print("🎉 FINAL OVERALL SCORE SUMMARY")
    print("=================================================\n")

    overall = sum(all_scores) / len(all_scores)
    print(f"📌 Overall Score Across 10 Questions: {overall:.2f}/100")

    print(f"📈 Highest Score: {max(all_scores)}")
    print(f"📉 Lowest Score : {min(all_scores)}")

    print("\n🔥 Test Complete!")


asyncio.run(run_batch_test())
