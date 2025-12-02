"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import { useParams } from "next/navigation";
import AttemptFeedbackPopup from "@/components/feedback/feedback_popup";
import SpinnerButton from "@/components/SpinnerButton";
import AnswerAnalysisPopup from "@/components/feedback/AnswerAnalysis";

export default function AttemptsPage() {
    const { id } = useParams();
    const interviewId = Array.isArray(id) ? id[0] : id;

    const [attempts, setAttempts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);

    // --- STATES FOR ANALYSIS POPUP ---
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [analysisQA, setAnalysisQA] = useState<any[]>([]);
    const [analysisRole, setAnalysisRole] = useState<string>("");
    const [analysisScore, setAnalysisScore] = useState<number>(0);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    /** FETCH ATTEMPTS */
    useEffect(() => {
        if (!interviewId) return;

        const fetchAttempts = async () => {
            const { data, error } = await supabase
                .from("feedback")
                .select(`
                    id,
                    attempt_id,
                    interview_id,
                    overall_score,
                    feedback_text,
                    created_at
                `)
                .eq("interview_id", interviewId)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Supabase error:", error);
                setLoading(false);
                return;
            }

            if (data && data.length > 0) {
                const enriched = await Promise.all(
                    data.map(async (attempt) => {
                        const attemptId = attempt.attempt_id;

                        const { count: totalQuestions } = await supabase
                            .from("questions")
                            .select("*", { count: "exact", head: true })
                            .eq("attempt_id", attemptId);

                        const { count: answeredQuestions } = await supabase
                            .from("answers")
                            .select("*", { count: "exact", head: true })
                            .eq("attempt_id", attemptId);

                        const total = totalQuestions ?? 0;
                        const answered = answeredQuestions ?? 0;

                        return {
                            ...attempt,
                            totalQuestions: total,
                            answeredQuestions: answered,
                            skippedQuestions: total - answered,
                            percentage:
                                total === 0 ? 0 : Math.round((answered / total) * 100),
                        };
                    })
                );

                // Oldest = 1, newest = n
                const numbered = enriched.map((attempt, index) => ({
                    ...attempt,
                    attemptIndex: index + 1,
                }));

                // Reverse ONLY for UI so newest appears on top
                setAttempts(numbered.reverse());
            } else {
                setAttempts([]);
            }

            setLoading(false);
        };

        fetchAttempts();
    }, [interviewId]);

    /** FETCH QUESTION + ANSWER FOR ANALYSIS */
    const openAnalysis = async (attempt: any) => {
        if (!attempt) return;

        setShowAnalysis(true);       // open popup instantly
        setAnalysisLoading(true);    // show loader inside popup

        const attemptId = attempt.attempt_id;

        // Fetch interview role
        const { data: interviewData } = await supabase
            .from("interviews")
            .select("role")
            .eq("id", interviewId)
            .single();

        setAnalysisRole(interviewData?.role || "Interview");

        // Fetch questions
        const { data: questions } = await supabase
            .from("questions")
            .select("id, question, ideal_answer")
            .eq("attempt_id", attemptId);

        // Fetch answers
        const { data: answers } = await supabase
            .from("answers")
            .select("question_id, transcript")
            .eq("attempt_id", attemptId);

        // Build map
        const answerMap: Record<string, string> = {};
        answers?.forEach((ans) => {
            answerMap[ans.question_id] = ans.transcript;
        });

        // Build Q/A list
        const qaList =
            questions?.map((q) => ({
                question_id: q.id,
                question: q.question,
                ideal_answer: q.ideal_answer,
                user_answer: answerMap[q.id] || "Question has been skipped",
            })) || [];

        setAnalysisScore(attempt.overall_score);
        setAnalysisQA(qaList);

        setAnalysisLoading(false); // stop loader; popup stays open with data
    };

    // PAGE LOADING (for attempts list)
    if (loading)
        return (
            <div className="flex items-center justify-center min-h-screen">
                <SpinnerButton text="Loading..." />
            </div>
        );

    return (
        <div className="animate-fadeIn space-y-12">
            {/* PAGE TITLE */}
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-extrabold text-primary-200 tracking-wide">
                    📚 Previous Attempts
                </h2>
                <p className="text-light-100 text-lg">
                    Review your past performance and download reports.
                </p>
            </div>

            {/* TABLE */}
            <div className="max-w-6xl mx-auto w-full rounded-2xl border border-border overflow-hidden shadow-xl">
                <div
                    className="grid grid-cols-6 bg-dark-200 px-6 py-4 place-items-center
                                text-light-100 font-semibold text-sm border-b border-border"
                >
                    <div>Attempt</div>
                    <div>Score</div>
                    <div>Date</div>
                    <div className="text-right">Answer Analysis</div>
                    <div>Questions</div>
                    <div>Feedback</div>
                </div>

                <div className="divide-y divide-border">
                    {attempts.map((attempt) => {
                        const dateStr = attempt.created_at
                            ? new Date(attempt.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            })
                            : "Unknown";

                        return (
                            <div
                                key={attempt.attempt_id}
                                className="grid grid-cols-6 place-items-center px-6 py-4 hover:bg-dark-300/40 transition-all"
                            >
                                {/* ATTEMPT */}
                                <div className="font-semibold text-primary-200">
                                    #{attempt.attemptIndex}
                                </div>

                                {/* SCORE */}
                                <div
                                    className={
                                        attempt.overall_score < 40
                                            ? "text-destructive-100 font-bold"
                                            : "text-success-100 font-bold"
                                    }
                                >
                                    {attempt.overall_score}
                                </div>

                                {/* DATE */}
                                <div>{dateStr}</div>

                                {/* ANALYSIS */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => openAnalysis(attempt)}
                                        className="px-3 py-1 rounded-md border border-primary-200/40 text-primary-200 
                                                   text-xs font-bold hover:bg-primary-200/20 cursor-pointer"
                                    >
                                        Analysis
                                    </button>
                                </div>



                                {/* QUESTIONS */}
                                <div className="flex flex-col leading-tight">
                                    <span>
                                        <span className="font-semibold text-success-100">
                                            {attempt.answeredQuestions}
                                        </span>{" "}
                                        answered,{" "}
                                        <span className="font-semibold text-destructive-100">
                                            {attempt.skippedQuestions}
                                        </span>{" "}
                                        skipped
                                    </span>
                                </div>

                                {/* VIEW */}
                                <div className="flex justify-center">
                                    <button
                                        onClick={() => setSelectedAttempt(attempt)}
                                        className="px-3 py-1 rounded-md bg-primary-200 text-dark-100 
                                                   text-xs font-bold hover:bg-primary-200/80 cursor-pointer"
                                    >
                                        View
                                    </button>
                                </div>



                            </div>
                        );
                    })}

                    {attempts.length === 0 && (
                        <div className="text-center p-10 text-light-100">
                            No attempts found.
                        </div>
                    )}
                </div>
            </div>

            {/* FEEDBACK POPUP */}
            <AttemptFeedbackPopup
                isOpen={!!selectedAttempt}
                score={selectedAttempt?.overall_score || 0}
                feedback={selectedAttempt?.feedback_text || ""}
                onClose={() => setSelectedAttempt(null)}
            />

            {/* ANALYSIS POPUP */}
            <AnswerAnalysisPopup
                show={showAnalysis}
                onClose={() => setShowAnalysis(false)}
                interviewRole={analysisRole}
                score={analysisScore}
                qa={analysisQA}
                loading={analysisLoading}
            />
        </div>
    );
}
