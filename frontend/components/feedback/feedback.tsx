"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react"; // If you don't have lucide, remove imports and use the SVGs provided in the code below

interface FeedbackProps {
    feedback: string;
}

const Feedback: React.FC<FeedbackProps> = ({ feedback }) => {
    // filtered lines prevents empty gap issues
    const lines = feedback.split("\n").filter((line) => line.trim() !== "");

    const components: React.ReactNode[] = [];

    // Configuration for "Professional" look
    // Using border-l-4 (left border) creates a clean anchor for the eye
    const sectionStyles: Record<string, any> = {
        s1: {
            label: "Analysis",
            color: "text-blue-400",
            borderColor: "border-blue-500",
            bg: "bg-blue-500/10",
            Icon: Info, // Fallback to SVG if no lucide
        },
        s2: {
            label: "Feedback",
            color: "text-amber-400", // Amber is better for 'warnings/improvements' than purple
            borderColor: "border-amber-500",
            bg: "bg-amber-500/10",
            Icon: AlertCircle,
        },
        s3: {
            label: "Verdict",
            color: "text-emerald-400",
            borderColor: "border-emerald-500",
            bg: "bg-emerald-500/10",
            Icon: CheckCircle2,
        },
    };

    const detectSection = (name: string) => {
        const n = name.toUpperCase();
        if (n.includes("SECTION 1")) return "s1";
        if (n.includes("SECTION 2")) return "s2";
        if (n.includes("SECTION 3")) return "s3";
        return null;
    };

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        const sectionKey = detectSection(trimmed);

        // --- RENDER SECTION HEADERS ---
        if (sectionKey) {
            const sec = sectionStyles[sectionKey];
            // Inline SVG Fallback if you don't use Lucide-React
            const Icon = sec.Icon || (() => <div className="w-2 h-2 rounded-full bg-current" />);

            components.push(
                <div key={`sec-${index}`} className="mt-6 mb-3 first:mt-0">
                    <div
                        className={`flex items-center gap-2 py-2 px-3 rounded-r-lg border-l-4 ${sec.borderColor} ${sec.bg}`}
                    >
                        <Icon className={`w-4 h-4 ${sec.color}`} />
                        <h3
                            className={`text-sm font-semibold tracking-wide uppercase ${sec.color}`}
                        >
                            {/* Use the text from the line, or map it to a cleaner label */}
                            {trimmed.replace(/:/g, "")}
                        </h3>
                    </div>
                </div>
            );
            return;
        }

        // --- RENDER BULLET POINTS ---
        if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
            components.push(
                <div key={index} className="flex items-start gap-3 pl-4 py-1">
                    <span className="text-slate-500 mt-1.5 text-[0.6rem]">●</span>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        {trimmed.replace(/^[-•]\s*/, "")}
                    </p>
                </div>
            );
            return;
        }

        // --- RENDER NUMBERED LISTS ---
        if (/^\d+\./.test(trimmed)) {
            components.push(
                <div key={index} className="flex items-start gap-3 pl-4 py-1">
                    <span className="font-mono text-slate-500 text-xs mt-0.5">
                        {trimmed.split(".")[0]}.
                    </span>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        {trimmed.slice(trimmed.indexOf(".") + 1).trim()}
                    </p>
                </div>
            );
            return;
        }

        // --- RENDER NORMAL PARAGRAPHS ---
        if (trimmed.length > 0) {
            components.push(
                <p key={index} className="text-slate-400 text-sm mb-2 leading-relaxed">
                    {trimmed}
                </p>
            );
        }
    });

    return (
        <div className="w-full h-full bg-slate-950/50 rounded-xl border border-slate-800 p-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-1 font-sans">{components}</div>
        </div>
    );
};

export default Feedback;