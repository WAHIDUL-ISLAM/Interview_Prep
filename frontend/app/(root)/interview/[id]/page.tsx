"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/supabase/supabaseClient";
import { getCurrentUser } from "@/lib/supabaseAuth";
import { Interview, Question } from "@/types";
import InterviewRunner from "@/components/InterviewRunner";
import SpinnerButton from "@/components/SpinnerButton";


export default function InterviewPage() {
    const { id } = useParams();
    const interviewId = Array.isArray(id) ? id[0] : id;

    const [interview, setInterview] = useState<Interview | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [user, setUser] = useState<{ id: string; name?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!interviewId) return;

        const fetchData = async () => {
            try {
                setLoading(true);

                const currentUser = await getCurrentUser();
                if (!currentUser) throw new Error("User not logged in.");

                const { data: userRow, error: userError } = await supabase
                    .from("users")
                    .select("name")
                    .eq("id", currentUser.id)
                    .single();

                setUser({
                    id: currentUser.id,
                    name: userRow?.name || "Candidate",
                });

                // Fetch interview basic info
                const { data: interviewData, error: interviewError } = await supabase
                    .from("interviews")
                    .select("role, type, techstack")
                    .eq("id", interviewId)
                    .single();

                if (interviewError) throw interviewError;
                if (!interviewData) throw new Error("Interview not found.");

                setInterview(interviewData);

                // Fetch latest 10 questions for this interview
                const { data: questionsData, error: questionsError } = await supabase
                    .from("questions")
                    .select("*")
                    .eq("interview_id", interviewId)
                    .order("created_at", { ascending: false })
                    .limit(10);

                if (questionsError) throw questionsError;

                const latestQuestions = questionsData?.map((q: any) => ({
                    id: q.id,
                    question: q.question,
                    type: q.type,
                    difficulty: q.difficulty,
                    topic: q.topic,
                    ideal_answer: q.ideal_answer,
                    key_points: q.key_points,
                })) ?? [];

                setQuestions(latestQuestions);
            } catch (err: any) {
                console.error("❌ Error fetching interview/questions:", err.message);
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
    const userName = user?.name || "Candidate";

    return (
        <div className="p-8 space-y-8 rounded-2xl dark-gradient border border-border shadow-lg animate-fadeIn">

            <div className="space-y-3 text-center">
                <h2 className="text-3xl font-bold text-primary-200 tracking-wide">
                    {role} Interview
                </h2>
                <p className="text-light-100 text-base">
                    <span className="font-semibold text-primary-100">Type:</span> {type}
                </p>
                <p className="text-light-100 text-base">
                    <span className="font-semibold text-primary-100">Tech stack:</span>{" "}
                    {Array.isArray(techstack) ? techstack.join(", ") : techstack || "N/A"}
                </p>
            </div>

            <div className="h-px bg-border/40 w-full" />

            <InterviewRunner
                user={user}
                interviewId={String(interviewId)}
                questions={questions}
            />


        </div>
    );
}
