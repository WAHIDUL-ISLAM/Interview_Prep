// "use client";

// import React, { useState } from "react";
// import dayjs from "dayjs";
// import Image from "next/image";
// import { Button } from "./ui/button";
// import Cookies from "js-cookie";
// import { useRouter } from "next/navigation";
// import { MoreVertical, Trash2 } from "lucide-react";

// interface InterviewCardProps {
//     interviewId: string;
//     role: string;
//     type: string;
//     techstack: string[];
//     createdAt: string;
//     totalScore?: number;
//     finalAssessment?: string;
//     onDelete?: (id: string) => void;
// }

// export default function InterviewCard({
//     interviewId,
//     role,
//     type,
//     createdAt,
//     totalScore,
//     finalAssessment,
//     onDelete,
// }: InterviewCardProps) {
//     const [menuOpen, setMenuOpen] = useState(false);

//     const formattedDate = createdAt
//         ? dayjs(new Date(createdAt)).format("MMM D, YYYY")
//         : "N/A";

//     const normalizedType = /mix/gi.test(type) ? "Mixed" : type;
//     const router = useRouter();

//     return (
//         <div className="card-border w-[360px] max-sm:w-full min-h-96 relative">
//             <div className="card-interview relative">

//                 {/* 3 DOT BUTTON */}
//                 <button
//                     onClick={() => setMenuOpen(!menuOpen)}
//                     className="absolute top-3 right-3 p-2 rounded-full bg-dark-300 hover:bg-dark-200 transition"
//                 >
//                     <MoreVertical className="w-5 h-5 text-light-100" />
//                 </button>

//                 {/* DROPDOWN MENU */}
//                 {menuOpen && (
//                     <div className="absolute top-12 right-3 bg-dark-200 border border-border rounded-lg shadow-xl w-40 z-20 animate-fadeIn">
//                         <button
//                             onClick={() => {
//                                 setMenuOpen(false);
//                                 onDelete?.(interviewId);
//                             }}
//                             className="w-full flex items-center gap-2 px-3 py-2 hover:bg-dark-300 text-red-400 transition"
//                         >
//                             <Trash2 className="w-4 h-4" />
//                             Delete Interview
//                         </button>
//                     </div>
//                 )}

//                 {/* TYPE BADGE */}
//                 <div className="absolute top-0 right-0 w-fit px-4 py-2 rounded-bl-lg bg-light-600">
//                     <p className="badge-text">{normalizedType}</p>
//                 </div>

//                 <h3 className="mt-5 capitalize">{role} Interview</h3>

//                 <div className="flex flex-row gap-5 mt-3">
//                     <div className="flex flex-row gap-2">
//                         <Image src="/calendar.svg" alt="calendar" width={24} height={24} />
//                         <p>{formattedDate}</p>
//                     </div>
//                     <div className="flex flex-row gap-2 items-center">
//                         <Image src="/star.svg" alt="star" width={24} height={24} />
//                         <p>{totalScore ?? "---"}/100</p>
//                     </div>
//                 </div>

//                 <p className="line-clamp-2 mt-5">
//                     {finalAssessment ??
//                         "You haven't given any interview yet. Take an interview to make yourself better."}
//                 </p>

//                 <div className="flex flex-row justify-between mt-4">
//                     <Button
//                         className="btn-primary"
//                         onClick={() => {
//                             Cookies.set("current_interview", interviewId, { expires: 1 });
//                             router.push("/interview");
//                         }}
//                     >
//                         View Interview
//                     </Button>
//                 </div>
//             </div>
//         </div>
//     );
// }




"use client";

import React, { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import Image from "next/image";
import { Button } from "./ui/button";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

interface InterviewCardProps {
    interviewId: string;
    role: string;
    type: string;
    techstack: string[];
    createdAt: string;
    totalScore?: number;
    finalAssessment?: string;
    onDelete?: (id: string) => void;
}

export default function InterviewCard({
    interviewId,
    role,
    type,
    createdAt,
    totalScore,
    finalAssessment,
    onDelete,
}: InterviewCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const formattedDate = createdAt
        ? dayjs(new Date(createdAt)).format("MMM D, YYYY")
        : "N/A";

    const normalizedType = /mix/gi.test(type) ? "Mixed" : type;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="card-border w-[360px] max-sm:w-full min-h-96 relative">
            <div className="card-interview relative flex flex-col justify-between h-full">

                {/* --- TOP SECTION --- */}
                <div>
                    <div className="absolute top-0 right-0 w-fit px-4 py-2 rounded-bl-lg bg-light-600">
                        <p className="badge-text">{normalizedType}</p>
                    </div>

                    <h3 className="mt-5 capitalize">{role} Interview</h3>

                    <div className="flex flex-row gap-5 mt-3">
                        <div className="flex flex-row gap-2">
                            <Image src="/calendar.svg" alt="calendar" width={24} height={24} />
                            <p>{formattedDate}</p>
                        </div>
                        <div className="flex flex-row gap-2 items-center">
                            <Image src="/star.svg" alt="star" width={24} height={24} />
                            <p>{totalScore ?? "---"}/100</p>
                        </div>
                    </div>

                    <p className="line-clamp-2 mt-5">
                        {finalAssessment ??
                            "You haven't given any interview yet. Take an interview to make yourself better."}
                    </p>
                </div>

                {/* --- BOTTOM SECTION --- */}
                <div className="flex flex-row justify-between items-center mt-4 relative">
                    <Button
                        className="btn-primary"
                        onClick={() => {
                            Cookies.set("current_interview", interviewId, { expires: 1 });
                            router.push("/interview");
                        }}
                    >
                        View Interview
                    </Button>

                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-full cursor-pointer hover:bg-black/5 transition-colors focus:outline-none"
                            aria-label="Options"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`text-gray-500 transition-transform duration-200 ${isMenuOpen ? "rotate-90" : ""}`}
                            >
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                            </svg>
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 bottom-full mb-3 w-32 z-10 animate-in fade-in zoom-in-95 duration-100">

                                <div className="bg-dark-200 rounded-md shadow-2xl border border-border overflow-hidden relative">
                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            onDelete?.(interviewId);
                                        }}
                                        className="w-full cursor-pointer text-left px-4 py-3 text-sm text-white hover:bg-dark-300 flex items-center gap-2 transition-colors"
                                    >
                                        <span>🗑️</span> Delete
                                    </button>
                                </div>

                                <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-dark-200 rotate-45 border-b border-r border-border"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
