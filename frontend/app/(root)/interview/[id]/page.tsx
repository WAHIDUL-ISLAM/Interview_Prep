"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/supabase/supabaseClient";
import { getCurrentUser } from "@/lib/supabaseAuth";
import { Interview, Question } from "@/types";
import InterviewRunner from "@/components/InterviewRunner";
import SpinnerButton from "@/components/SpinnerButton";
import Cookies from "js-cookie";


export default function InterviewPage() {
    const { id } = useParams();
    const interviewId = Array.isArray(id) ? id[0] : id;
    const [interview, setInterview] = useState<Interview | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [user, setUser] = useState<{ id: string; name?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(null);


    // --- WAIT FOR QUESTIONS TO BE GENERATED ---
    async function waitForQuestions(attemptId: string) {
        const maxRetries = 20;
        let retries = 0;

        while (retries < maxRetries) {
            const { data: questionsData } = await supabase
                .from("questions")
                .select("*")
                .eq("attempt_id", attemptId)
                .order("created_at", { ascending: true });

            if (questionsData && questionsData.length > 0) {
                return questionsData;
            }

            await new Promise((res) => setTimeout(res, 500));
            retries++;
        }

        return [];
    }


    useEffect(() => {
        if (!interviewId) return;

        const fetchData = async () => {
            try {
                setLoading(true);

                const currentUser = await getCurrentUser();
                if (!currentUser) throw new Error("User not logged in.");

                // Fetch username
                const { data: userRow } = await supabase
                    .from("users")
                    .select("name")
                    .eq("id", currentUser.id)
                    .single();

                setUser({
                    id: currentUser.id,
                    name: userRow?.name || "Candidate",
                });

                // Fetch interview info
                const { data: interviewData, error: interviewError } = await supabase
                    .from("interviews")
                    .select("role, type, techstack, creation_method")
                    .eq("id", interviewId)
                    .single();

                if (interviewError) throw interviewError;
                if (!interviewData) throw new Error("Interview not found.");

                setInterview(interviewData);

                const currentattemptId = Cookies.get("current_attempt");
                setAttemptId(currentattemptId || null);

                if (!currentattemptId) {
                    console.error("No attempt id found in cookies!");
                }

                // Wait until questions exist
                const questionsData = await waitForQuestions(currentattemptId);

                if (!questionsData || questionsData.length === 0) {
                    throw new Error("Questions not ready yet. Please retry.");
                }

                const latestQuestions =
                    questionsData?.map((q: any) => ({
                        id: q.id,
                        interview_id: q.interview_id,
                        user_id: q.user_id,
                        question: q.question,
                        type: q.type,
                        difficulty: q.difficulty,
                        topic: q.topic,
                        ideal_answer: q.ideal_answer,
                        key_points: q.key_points,
                        created_at: q.created_at,
                        updated_at: q.updated_at,
                    })) ?? [];


                setQuestions(latestQuestions);
            } catch (err: any) {
                console.error("❌ Error:", err.message);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [interviewId]);

    if (loading)
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <SpinnerButton />
            </div>
        );

    if (error)
        return <p className="p-6 text-destructive-100 font-semibold">Error: {error}</p>;

    if (!interview)
        return <p className="p-6 text-light-100">No interview found.</p>;

    const { role, type, techstack } = interview;

    return (
        <div className="p-8 space-y-8 rounded-2xl dark-gradient border border-border shadow-lg animate-fadeIn">
            <div className="space-y-3 text-center">
                <h2 className="text-3xl font-bold text-primary-200 tracking-wide">
                    {role} Interview
                </h2>

                {/* Only for manual mode */}
                {interview.creation_method === "MANUAL" && (
                    <>
                        <p className="text-light-100 text-base">
                            <span className="font-semibold text-primary-100">Type:</span> {type}
                        </p>
                        <p className="text-light-100 text-base">
                            <span className="font-semibold text-primary-100">Tech stack:</span>{" "}
                            {Array.isArray(techstack) ? techstack.join(", ") : techstack || "N/A"}
                        </p>
                    </>
                )}
            </div>

            <div className="h-px bg-border/40 w-full" />

            <InterviewRunner
                user={user}
                interviewId={String(interviewId)}
                questions={questions}
                attemptId={attemptId || null}
            />
        </div>
    );
}
