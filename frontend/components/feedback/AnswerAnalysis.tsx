"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle2, User, Sparkles, Trophy } from "lucide-react";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

export default function AnswerAnalysisModal({
    show,
    onClose,
    interviewRole = "Software Engineer",
    score = 0,
    qa = [],
    loading = false,
}) {
    const [isVisible, setIsVisible] = useState(false);

    // Carousel State
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
            document.body.style.overflow = "hidden";
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = "unset";
            return () => clearTimeout(timer);
        }
    }, [show]);

    useEffect(() => {
        if (!api) return;
        setCount(api.scrollSnapList().length);
        setCurrent(api.selectedScrollSnap() + 1);

        api.on("select", () => {
            setCurrent(api.selectedScrollSnap() + 1);
        });
    }, [api, qa]);

    if (!show && !isVisible) return null;

    const getScoreColor = (s) => {
        if (s >= 80) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
        if (s >= 50) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
        return "text-rose-400 bg-rose-400/10 border-rose-400/20";
    };

    return (
        // 1. CENTERED WRAPPER
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 isolate">

            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"
                    }`}
                onClick={onClose}
            />

            {/* 2. MODAL CONTAINER (Floating Center) */}
            <div
                className={`relative w-full max-w-4xl max-h-[90vh] bg-[#0f1117] border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col transform transition-all duration-300 ${show ? "scale-100 opacity-100" : "scale-95 opacity-0"
                    }`}
            >
                {/* --- HEADER --- */}
                <div className="shrink-0 p-6 border-b border-white/10 flex items-start justify-between bg-[#13161f]">
                    <div>
                        <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                            Analysis Report
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            {interviewRole} Interview
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {!loading && (
                            <div
                                className={`px-4 py-1.5 rounded-full border text-sm font-bold flex items-center gap-2 ${getScoreColor(
                                    score
                                )}`}
                            >
                                <Trophy className="w-4 h-4" />
                                Score: {score}
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* --- BODY (Carousel) --- */}
                <div className="flex-1 overflow-hidden p-6 bg-black/20 flex flex-col items-center justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-4 text-gray-400 py-20">
                            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-medium">Generating insights...</p>
                        </div>
                    ) : qa.length === 0 ? (
                        <div className="text-gray-500 text-sm py-20">No analysis data available.</div>
                    ) : (
                        <div className="w-full h-full flex flex-col">
                            <Carousel setApi={setApi} className="w-full h-full flex flex-col">
                                <CarouselContent className="h-full">
                                    {qa.map((item, idx) => (
                                        <CarouselItem key={idx} className="h-full pt-1">
                                            {/* 3. CARD DESIGN
                         Calculated height to fit within modal without double scrollbars 
                      */}
                                            <Card className="h-[40vh] border border-white/10 bg-[#161922] shadow-inner flex flex-col">

                                                {/* Question */}
                                                <div className="p-5 border-b border-white/5 bg-white/2">
                                                    <div className="flex items-start gap-4">
                                                        <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-xs font-mono text-gray-400 border border-white/10">
                                                            {String(idx + 1).padStart(2, '0')}
                                                        </span>
                                                        <h3 className="text-lg font-medium text-gray-100 leading-snug">
                                                            {item.question}
                                                        </h3>
                                                    </div>
                                                </div>

                                                {/* Scrollable Answers */}
                                                <CardContent className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {/* User Answer Side */}
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2 text-blue-300/80">
                                                                <User className="w-4 h-4" />
                                                                <span className="text-xs font-bold uppercase tracking-wider">Your Response</span>
                                                            </div>
                                                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-gray-300 text-sm leading-relaxed whitespace-pre-line min-h-[120px]">
                                                                {item.user_answer || <span className="italic opacity-50">No answer provided</span>}
                                                            </div>
                                                        </div>

                                                        {/* Ideal Answer Side */}
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2 text-emerald-300/80">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                <span className="text-xs font-bold uppercase tracking-wider">Ideal Approach</span>
                                                            </div>
                                                            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-gray-300 text-sm leading-relaxed whitespace-pre-line min-h-[120px]">
                                                                {item.ideal_answer}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>

                                {/* Footer Controls */}
                                <div className="flex items-center justify-between mt-4 px-2">
                                    <CarouselPrevious className="static translate-y-0 hover:bg-white/10 hover:text-white border-white/10 text-gray-400" />

                                    <span className="text-sm font-medium text-gray-400 tabular-nums">
                                        Question {current} of {count}
                                    </span>

                                    <CarouselNext className="static translate-y-0 hover:bg-white/10 hover:text-white border-white/10 text-gray-400" />
                                </div>
                            </Carousel>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}