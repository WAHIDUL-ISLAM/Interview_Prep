"use client";

import React from "react";
import Feedback from "./feedback";
import { X, FileText, Activity } from "lucide-react"; // Install lucide-react or use SVG fallbacks

interface AttemptFeedbackPopupProps {
    isOpen: boolean;
    onClose: () => void;
    score: number;
    feedback: string;
}

export default function AttemptFeedbackPopup({
    isOpen,
    onClose,
    score,
    feedback,
}: AttemptFeedbackPopupProps) {
    if (!isOpen) return null;

    // Determine score color based on performance
    const getScoreColor = (s: number) => {
        if (s >= 80) return "text-emerald-400"; // Green
        if (s >= 50) return "text-amber-400";   // Yellow/Orange
        return "text-rose-400";                 // Red
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">

            {/* Modal Container: Fixed height, distinct sections */}
            <div
                className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[65vh] animate-in zoom-in-95 duration-200"
                role="dialog"
            >

                {/* --- HEADER --- */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-md border border-slate-700">
                            <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-100">Interview Analysis</h2>
                            <p className="text-xs text-slate-500">Detailed performance review</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Score Metric */}
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Score</span>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-mono font-bold ${getScoreColor(score)}`}>
                                    {score}
                                </span>
                                <span className="text-sm text-slate-600 font-mono">/100</span>
                            </div>
                        </div>

                        <div className="h-8 w-[px] bg-slate-800 mx-2 hidden sm:block"></div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors cursor-pointer"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>


                <div className="flex-1 overflow-y-auto bg-slate-950/30 p-0">
                    <div className="p-6">
                        <Feedback feedback={feedback} />
                    </div>
                </div>

                {/* --- FOOTER --- */}
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 rounded-b-xl flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Activity className="w-3 h-3" />
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 hover:bg-white text-slate-900 text-sm font-medium rounded-md shadow-sm transition-all cursor-pointer"
                    >
                        Done
                    </button>
                </div>

            </div>
        </div>
    );
}