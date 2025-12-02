"use client";

import Cookies from "js-cookie";
import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import SpinnerButton from "@/components/SpinnerButton";
import { Loader2Icon } from "lucide-react";
import { getCurrentUser } from "@/lib/supabaseAuth";
import AttemptsChart from "@/components/AttemptsChart";
import RadarGraphLatest from "@/components/RadarGraphLatest";

export default function Page() {
    const [interviewId, setInterviewId] = useState<string | undefined>();
    const [interview, setInterview] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [creatingQuestions, setCreatingQuestions] = useState(false);

    // NEW —
    const [pastAttempts, setPastAttempts] = useState<any[]>([]);

    const router = useRouter();

    // Load interview ID from cookies
    useEffect(() => {
        const id = Cookies.get("current_interview");
        setInterviewId(id);
    }, []);

    // Fetch interview details
    useEffect(() => {
        if (!interviewId) return;

        const fetchInterview = async () => {
            setLoading(true);

            const { data, error } = await supabase
                .from("interviews")
                .select("role, type, techstack, creation_method")
                .eq("id", interviewId)
                .single();

            if (error) {
                console.error("Error fetching interview:", error.message);
                setInterview(null);
            } else {
                setInterview(data);
            }

            setLoading(false);
        };

        fetchInterview();
    }, [interviewId]);

    // NEW — Fetch previous attempts (feedback)
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
                total_clarity,
                total_relevance,
                total_depth,
                total_structure,
                created_at
            `)
                .eq("interview_id", interviewId)
                .order("created_at", { ascending: true });

            if (!error && data) {
                setPastAttempts(data);
            }
        };

        fetchAttempts();
    }, [interviewId]);


    // Utility: Generate unique attempt ID
    function generateUniqueAttemptId() {
        if (typeof window !== "undefined" && window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }

        return (
            "uuid-fallback-" +
            Date.now().toString(36) +
            Math.random().toString(36).substring(2, 9)
        );
    }

    // Start interview attempt
    const handleStartInterview = async () => {
        if (!interviewId || !interview) return;

        setCreatingQuestions(true);

        try {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                alert("User not logged in");
                setCreatingQuestions(false);
                return;
            }

            // Determine backend route
            let endpoint: string;
            let payload: any;

            const attemptId = generateUniqueAttemptId();

            if (interview.creation_method === "MANUAL") {
                endpoint = "/interview/manual-questions";
                payload = {
                    userId: currentUser.id,
                    interviewId,
                    role: interview.role,
                    techstack: interview.techstack,
                    type: interview.type,
                    attemptId,
                };
            } else {
                endpoint = "/interview/pdf-questions";
                payload = {
                    userId: currentUser.id,
                    interviewId,
                    attemptId,
                };
            }

            console.log("Payload to send:", payload);

            const response = await fetch(`http://localhost:8000${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok)
                throw new Error(result.detail || "Failed to create questions");

            Cookies.set("current_attempt", payload.attemptId);

            router.push(`/interview/${interviewId}`);
        } catch (err: any) {
            console.error("Error creating questions:", err);
            alert(err.message || "Error creating questions");
        } finally {
            setCreatingQuestions(false);
        }
    };

    // UI Loading
    if (loading) return <SpinnerButton />;

    // Interview Not Found
    if (!interview)
        return (
            <div className="root-layout flex-center min-h-screen blue-gradient-dark">
                <p className="text-2xl text-primary-200">Interview not found!</p>
            </div>
        );
    return (
        <div className="p-8 space-y-8 rounded-2xl dark-gradient border border-border shadow-lg animate-fadeIn">

            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                {/* Title & Subtitle */}
                <div>
                    <h2 className="text-3xl font-bold text-primary-200">
                        {interview.role} Interview
                    </h2>
                </div>

                {/* PRIMARY ACTION BUTTON — WHITE STYLE */}
                <button
                    className="
                        px-5 py-2.5 rounded-lg text-sm font-semibold
                        bg-primary-200/20 text-primary-200 
                        border border-primary-200/40
                        shadow-md
                        hover:bg-primary-200/40 hover:text-white
                        transition-all duration-200
                        flex items-center gap-2
                        whitespace-nowrap cursor-pointer"
                    onClick={handleStartInterview}
                    disabled={creatingQuestions}
                >
                    {creatingQuestions ? (
                        <>
                            <Loader2Icon className="w-4 h-4 animate-spin" />
                            Preparing...
                        </>
                    ) : pastAttempts.length > 0 ? (
                        <>
                            ⚡ Start New Attempt
                        </>
                    ) : (
                        <>
                            🚀 Take First Attempt
                        </>
                    )}
                </button>
            </div>

            {/* DIVIDER */}
            <div className="h-px w-full bg-border/40" />

            {/* --- DATA SECTION --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Left: History Chart */}
                <div className="p-6 dark-gradient rounded-xl border border-border flex flex-col h-full bg-black/20">
                    <h3 className="text-lg font-semibold text-primary-200 mb-2 flex items-center gap-2">
                        📈 Performance History
                    </h3>
                    <div className="w-full h-72 flex-1">
                        <AttemptsChart attempts={pastAttempts} />
                    </div>
                </div>

                {/* Right: Latest Breakdown */}
                <div className="p-6 dark-gradient rounded-xl border border-border flex flex-col h-full bg-black/20">
                    <h3 className="text-lg font-semibold text-primary-200 mb-2 flex items-center gap-2">
                        🎯 Latest Analysis
                    </h3>
                    <div className="w-full h-72 flex-1 flex items-center justify-center">
                        {pastAttempts.length > 0 ? (
                            <RadarGraphLatest latest={pastAttempts[pastAttempts.length - 1]} />
                        ) : (
                            <div className="text-center text-gray-500">
                                <p>No data yet.</p>
                                <p className="text-xs mt-1">Take an interview to see your breakdown.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- FOOTER SECTION --- */}
            {pastAttempts.length > 0 && (
                <div className="flex justify-center pt-4">
                    <button
                        className="
                        px-5 py-2 rounded-lg text-sm font-semibold
                        bg-primary-200/20 text-primary-200
                        border border-primary-200/40
                        shadow-md
                        hover:bg-primary-200/40 hover:text-white
                        transition-all duration-200
                        flex items-center gap-2 cursor-pointer
                    "
                        onClick={() => router.push(`/interview/${interviewId}/attempts`)}
                    >
                        📚 View detailed feedback & answer history
                    </button>
                </div>
            )}
        </div>
    );


}
