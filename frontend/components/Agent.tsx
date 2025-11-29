"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import React from "react";

export enum InterviewUIState {
    NOT_STARTED = "NOT_STARTED",
    IN_PROGRESS = "IN_PROGRESS",
    FINISHED = "FINISHED",
}

interface AgentProps {
    userName: string;
    questions: { id: string | number; question: string }[];
    currentQuestionIndex: number;
    uiTranscript?: string;
    isAudioPlaying?: boolean;
    uiState: InterviewUIState;
    hideQuestion?: boolean;
}

const Agent: React.FC<AgentProps> = ({
    userName,
    questions,
    currentQuestionIndex,
    uiTranscript = "",
    isAudioPlaying = false,
    uiState,
    hideQuestion = false,
}) => {
    const lastMessage =
        hideQuestion && currentQuestionIndex === 0
            ? null
            : questions[currentQuestionIndex] ?? null;


    return (
        <>
            <div className="call-view">
                <div className="card-interviewer">
                    <div className="avatar relative">
                        <Image
                            src="/ai-avatar.png"
                            alt="agent-avatar"
                            width={65}
                            height={54}
                            className="object-cover"
                        />
                        {isAudioPlaying && (
                            <span className="absolute size-5/6 rounded-full bg-primary-200 opacity-75 animate-ping" />
                        )}
                    </div>
                    <h3>AI Interviewer</h3>
                </div>

                <div className="card-border">
                    <div className="card-content">
                        <Image
                            src="/user-avatar.png"
                            alt="user avatar"
                            width={120}
                            height={120}
                            className="rounded-full object-cover"
                        />
                        <h3>{userName}</h3>
                    </div>
                </div>
            </div>

            {lastMessage && (
                <div className="transcript-border">
                    <div className="transcript">
                        <p
                            key={lastMessage.id}
                            className={cn(
                                "transition-opacity duration-500 opacity-0",
                                "animate-fadeIn opacity-100"
                            )}
                        >
                            {lastMessage.question}
                        </p>

                        {/* {uiState === InterviewUIState.IN_PROGRESS && (
                            <p className="text-gray-600 mt-2 text-sm">
                                <strong>You:</strong> {uiTranscript || "Listening..."}
                            </p>
                        )} */}
                    </div>
                </div>
            )}
        </>
    );
};

export default Agent;
