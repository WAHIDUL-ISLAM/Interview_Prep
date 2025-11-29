// "use client";

// import Cookies from "js-cookie";
// import Image from "next/image";
// import React, { useEffect, useState } from "react";
// import { supabase } from "@/supabase/supabaseClient";
// import { getCurrentUser } from "@/lib/supabaseAuth";
// import { useRouter } from "next/navigation";
// import SpinnerButton from "@/components/SpinnerButton";
// import { Loader2Icon } from "lucide-react";


// export default function Page() {
//     const [interviewId, setInterviewId] = useState();
//     const [interview, setInterview] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [creatingQuestions, setCreatingQuestions] = useState(false);
//     const router = useRouter();

//     useEffect(() => {
//         const id = Cookies.get("current_interview");
//         setInterviewId(id);
//     }, []);

//     useEffect(() => {
//         if (!interviewId) return;

//         const fetchInterview = async () => {
//             setLoading(true);

//             const { data, error } = await supabase
//                 .from("interviews")
//                 .select("role, type, techstack")
//                 .eq("id", interviewId)
//                 .single();

//             if (error) {
//                 console.error("Error fetching interview:", error.message);
//                 setInterview(null);
//             } else {
//                 setInterview(data);
//             }

//             setLoading(false);
//         };

//         fetchInterview();
//     }, [interviewId]);

//     // --- Add this function inside the component ---
//     const handleStartInterview = async () => {
//         if (!interviewId || !interview) return;

//         setCreatingQuestions(true);

//         try {
//             const currentUser = await getCurrentUser();
//             if (!currentUser) {
//                 alert("User not logged in");
//                 setCreatingQuestions(false);
//                 return;
//             }

//             const payload = {
//                 userId: currentUser.id,
//                 interviewId,
//                 role: interview.role,
//                 techstack: interview.techstack,
//                 type: interview.type,
//             };

//             console.log("Payload to send:", payload);

//             const response = await fetch("http://localhost:8000/interview/questions", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify(payload),
//             });

//             const result = await response.json();

//             if (!response.ok) throw new Error(result.detail || "Failed to create questions");

//             router.push(`/interview/${interviewId}`);
//         } catch (err: any) {
//             console.error("Error creating questions:", err);
//             alert(err.message || "Error creating questions");
//         }
//     };

//     if (loading)
//         return (
//             <>
//                 <SpinnerButton />
//             </>)

//     if (!interview)
//         return (
//             <div className="root-layout flex-center min-h-screen blue-gradient-dark">
//                 <p className="text-2xl text-primary-200">Interview not found!</p>
//             </div>
//         );

//     return (
//         <div className="p-8 space-y-8 rounded-2xl dark-gradient border border-border shadow-lg animate-fadeIn">
//             <div className="space-y-3 text-center">
//                 <h2 className="text-3xl font-bold text-primary-200 tracking-wide">
//                     {interview.role} Interview
//                 </h2>
//                 <p className="text-light-100 text-base">
//                     <span className="font-semibold text-primary-100">Type:</span>{" "}
//                     {interview.type}
//                 </p>
//                 <p className="text-light-100 text-base">
//                     <span className="font-semibold text-primary-100">Tech stack:</span>{" "}
//                     {interview.techstack ? interview.techstack.join(", ") : "N/A"}
//                 </p>
//             </div>

//             <div className="h-px bg-border/40 w-full" />

//             <div className="interview-call flex items-center justify-center gap-6">
//                 <div className="card-interviewer flex flex-col items-center gap-2">
//                     <div className="avatar relative w-24 h-24">
//                         <Image
//                             src="/Robot-1.jpg"
//                             alt="agent-avatar"
//                             fill
//                             className="object-cover rounded-full"
//                         />
//                         <span className="absolute inset-0 rounded-full bg-primary-200 opacity-75 animate-ping" />
//                     </div>
//                     <h3 className="text-primary-200 font-semibold">AI Interviewer</h3>
//                 </div>
//             </div>

//             <div className="flex-center mt-6">
//                 <button
//                     className="btn-primary flex items-center justify-center gap-2"
//                     onClick={handleStartInterview}
//                     disabled={creatingQuestions}
//                 >
//                     {creatingQuestions ? (
//                         <>
//                             <Loader2Icon className="w-5 h-5 text-white animate-spin" />
//                             Creating Questions...
//                         </>
//                     ) : (
//                         "Take Attempt"
//                     )}
//                 </button>
//             </div>
//         </div>
//     );
// }


"use client";

import Cookies from "js-cookie";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";

import { useRouter } from "next/navigation";
import SpinnerButton from "@/components/SpinnerButton";
import { Loader2Icon } from "lucide-react";
import { getCurrentUser } from "@/lib/supabaseAuth";

export default function Page() {
    const [interviewId, setInterviewId] = useState<string | undefined>();
    const [interview, setInterview] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [creatingQuestions, setCreatingQuestions] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const id = Cookies.get("current_interview");
        setInterviewId(id);
    }, []);

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

            // Determine endpoint and payload based on interview type
            let endpoint: string;
            let payload: any;

            if (interview.creation_method === "MANUAL") {
                endpoint = "/interview/manual-questions";
                payload = {
                    userId: currentUser.id,
                    interviewId,
                    role: interview.role,
                    techstack: interview.techstack,
                    type: interview.type,
                };
            } else {
                // PDF or auto-generated interview
                endpoint = "/interview/pdf-questions";
                payload = {
                    userId: currentUser.id,
                    interviewId,
                };
            }

            console.log("Payload to send:", payload);

            const response = await fetch(`http://localhost:8000${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.detail || "Failed to create questions");

            router.push(`/interview/${interviewId}`);
        } catch (err: any) {
            console.error("Error creating questions:", err);
            alert(err.message || "Error creating questions");
        } finally {
            setCreatingQuestions(false);
        }
    };

    if (loading) return <SpinnerButton />;

    if (!interview)
        return (
            <div className="root-layout flex-center min-h-screen blue-gradient-dark">
                <p className="text-2xl text-primary-200">Interview not found!</p>
            </div>
        );

    return (
        <div className="p-8 space-y-8 rounded-2xl dark-gradient border border-border shadow-lg animate-fadeIn">
            <div className="space-y-3 text-center">
                <h2 className="text-3xl font-bold text-primary-200 tracking-wide">
                    {interview.role} Interview
                </h2>
                <p className="text-light-100 text-base">
                    <span className="font-semibold text-primary-100">Type:</span>{" "}
                    {interview.type}
                </p>
                <p className="text-light-100 text-base">
                    <span className="font-semibold text-primary-100">Tech stack:</span>{" "}
                    {interview.techstack ? interview.techstack.join(", ") : "N/A"}
                </p>
                <p className="text-light-100 text-base">
                    <span className="font-semibold text-primary-100">Mode:</span>{" "}
                    {interview.creation_method === "manual" ? "Manual" : "PDF"}
                </p>
            </div>

            <div className="h-px bg-border/40 w-full" />

            <div className="interview-call flex items-center justify-center gap-6">
                <div className="card-interviewer flex flex-col items-center gap-2">
                    <div className="avatar relative w-24 h-24">
                        <Image
                            src="/Robot-1.jpg"
                            alt="agent-avatar"
                            fill
                            className="object-cover rounded-full"
                        />
                        <span className="absolute inset-0 rounded-full bg-primary-200 opacity-75 animate-ping" />
                    </div>
                    <h3 className="text-primary-200 font-semibold">AI Interviewer</h3>
                </div>
            </div>

            <div className="flex-center mt-6">
                <button
                    className="btn-primary flex items-center justify-center gap-2"
                    onClick={handleStartInterview}
                    disabled={creatingQuestions}
                >
                    {creatingQuestions ? (
                        <>
                            <Loader2Icon className="w-5 h-5 text-white animate-spin" />
                            {interview.creation_method === "MANUAL"
                                ? "Creating Questions..."
                                : "Generating from PDF..."}
                        </>
                    ) : (
                        "Take Attempt"
                    )}
                </button>
            </div>
        </div>
    );
}
