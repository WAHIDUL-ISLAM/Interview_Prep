"use client";

import React from "react";
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
}

export default function InterviewCard({
    interviewId,
    role,
    type,
    createdAt,
    totalScore,
    finalAssessment,
}: InterviewCardProps) {
    const formattedDate = createdAt
        ? dayjs(new Date(createdAt)).format("MMM D, YYYY")
        : "N/A";

    const normalizedType = /mix/gi.test(type) ? "Mixed" : type;
    const router = useRouter();


    return (
        <div className="card-border w-[360px] max-sm:w-full min-h-96">
            <div className="card-interview">
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

                <div className="flex flex-row justify-between mt-4">
                    <Button
                        className="btn-primary"
                        onClick={() => {
                            Cookies.set("current_interview", interviewId, { expires: 1 });
                            router.push("/interview");
                        }}
                    >
                        View Interview
                    </Button>
                </div>
            </div>
        </div>
    );
}
