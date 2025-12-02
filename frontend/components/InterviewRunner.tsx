"use client";

import { useState, useRef, useEffect } from "react";
import Agent, { InterviewUIState } from "@/components/Agent";
import AudioVisualizer from "./AudioVisualizer";
import { Loader2 } from "lucide-react";
import { Question } from "@/types";
import { useRouter } from "next/navigation";



interface InterviewRunnerProps {
    user?: { id?: string; name?: string | null };
    interviewId: string;
    questions: Question[];
    attemptId?: string | null;
}

export default function InterviewRunner({ user, interviewId, questions, attemptId }: InterviewRunnerProps) {
    // --- Existing State ---
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [interviewStarted, setInterviewStarted] = useState(false);
    const [loadingAudio, setLoadingAudio] = useState(false);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [uiTranscript, setUiTranscript] = useState("");
    const isLastQuestion = currentQuestionIndex === questions.length - 1;


    // --- NEW: Recording State ---
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // --- NEW: Dual-Stream State ---
    const [liveTranscript, setLiveTranscript] = useState("");
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

    // --- Refs ---
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioQueue = useRef<Map<string, Blob>>(new Map());
    const ws = useRef<WebSocket | null>(null);
    const currentIndexRef = useRef(currentQuestionIndex);

    // --- Recording Refs ---
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<any>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    //--Scoring Ref--//
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [finalResult, setFinalResult] = useState<any | null>(null);

    const router = useRouter();

    useEffect(() => {
        currentIndexRef.current = currentQuestionIndex;
    }, [currentQuestionIndex]);

    useEffect(() => {
        ws.current = new WebSocket("ws://localhost:8000/interview/ws");
        ws.current.onopen = () => console.log("WS connected");
        ws.current.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event !== "ready") return;
                const questionId = data.questionId;
                const blob = await fetchAudio(questionId);
                if (!blob) return;
                audioQueue.current.set(questionId, blob);

                if (questions[currentIndexRef.current]?.id === questionId) {
                    if (currentIndexRef.current !== 0) {
                        playAudio(blob);
                    }
                    setLoadingAudio(false);
                }
            } catch (err) { console.error("WS error:", err); }
        };
        return () => ws.current?.close();
    }, []);


    const [timeIsUp, setTimeIsUp] = useState(false);
    const showOverlayCondition = interviewStarted && currentQuestionIndex === 0;

    useEffect(() => {
        if (showOverlayCondition) {
            setTimeIsUp(false);
            const timerId = setTimeout(() => {
                setTimeIsUp(true);
            }, 5000);
            return () => clearTimeout(timerId);
        }
        setTimeIsUp(false);
    }, [showOverlayCondition]);

    useEffect(() => {
        const currentQId = questions[currentQuestionIndex]?.id;
        const blob = currentQId ? audioQueue.current.get(currentQId) : null;

        const audioReady = showOverlayCondition && !loadingAudio && blob;
        const timeIsReady = timeIsUp;

        if (audioReady && timeIsReady) {
            playAudio(blob);
        }

    }, [loadingAudio, timeIsUp, currentQuestionIndex, questions, showOverlayCondition]);

    useEffect(() => {
        // This function runs when the component unmounts or before recordedAudioUrl changes
        return () => {
            if (recordedAudioUrl) {
                URL.revokeObjectURL(recordedAudioUrl);
            }
        };
    }, [recordedAudioUrl]);


    // ---Interview Start Logic ---
    async function startInterview() {
        if (!questions || questions.length === 0) return;

        const newAttemptId = attemptId ?? "";
        setUiTranscript("Starting new interview session...");

        try {
            const response = await fetch("http://localhost:8000/interview/start_attempt", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    attemptId: newAttemptId,
                    interviewId: interviewId,
                    userId: user?.id,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to initialize attempt record: ${response.status} - ${errorText}`);
            }

            setInterviewStarted(true);
            setUiTranscript("Session initialized. Preparing audio...");
            setLoadingAudio(true);

            questions.forEach((q) => {
                ws.current?.send(JSON.stringify({
                    action: "start_question",
                    interviewId,
                    questionId: q.id,
                    text: q.question,
                    attemptId: newAttemptId
                }));
            });

        } catch (error) {
            console.error("Interview start failed:", error);
            setUiTranscript(`ERROR starting interview: Could not establish session in the database. ${error.message}`);
            setInterviewStarted(false);
        }
    }

    // NEW: Interview Finalization
    async function endInterview() {
        if (isRecording) stopRecording();

        if (attemptId && interviewId) {
            setIsFinalizing(true);   // <-- SHOW LOADER
            setUiTranscript("Analyzing your responses...");

            try {
                const response = await fetch("http://localhost:8000/interview/complete_attempt", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        attemptId,
                        interviewId,
                        userId: user?.id,
                    }),
                });

                if (!response.ok) throw new Error(`Failed to complete attempt: ${response.status}`);

                router.push(`/interview`);

            } catch (error: any) {
                console.error("Interview finalization failed:", error);
                setUiTranscript(`ERROR finalizing interview: ${error.message}`);
            } finally {

            }
        }

        setCurrentQuestionIndex(questions.length);
    }

    // ...

    async function fetchAudio(questionId: string) {
        try {
            const res = await fetch(`http://localhost:8000/interview/audio?interviewId=${interviewId}&questionId=${questionId}`);
            if (!res.ok) return null;
            return await res.blob();
        } catch (err) { return null; }
    }

    function playAudio(blob: Blob) {
        if (!blob) return;
        if (audioRef.current) {
            audioRef.current.pause();
            URL.revokeObjectURL(audioRef.current.src);
        }
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        setUiTranscript("");
        setLoadingAudio(false);
        audio.onplay = () => setIsAudioPlaying(true);
        audio.onended = () => {
            setIsAudioPlaying(false);
            URL.revokeObjectURL(url);
        };
        audio.play();
    }

    //Enhanced Recording Logic
    async function startRecording() {
        try {
            // 1. Get Stream & Set for Visualizer
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMediaStream(stream);

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                const url = URL.createObjectURL(audioBlob);
                setRecordedAudioUrl(url);

                stream.getTracks().forEach(track => track.stop());
                setMediaStream(null);

                await uploadAnswer(audioBlob);
            };

            mediaRecorder.start();

            // 3. Start Browser Speech Recognition (For Instant UI Text)
            if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
                const SpeechRecognition =
                    (window as any).SpeechRecognition ||
                    (window as any).webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = "en-US";

                recognition.onresult = (event: any) => {
                    let finalTranscript = "";
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                    setLiveTranscript(finalTranscript);
                };

                recognitionRef.current = recognition;
                recognition.start();
            }

            setIsRecording(true);
            setUiTranscript("Listening...");
            setLiveTranscript("");
        } catch (err) {
            console.error("Could not start recording:", err);
            alert("Microphone access denied");
        }
    }

    function stopRecording() {
        // 1. Stop Audio Recorder
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        // 2. Stop Speech Recognition
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsRecording(false);
    }

    async function uploadAnswer(audioBlob: Blob) {
        setIsUploading(true);
        setUiTranscript("Saving answer...");

        const currentQId = questions[currentQuestionIndex].id;
        if (!attemptId) {
            console.error("Attempt ID is missing. Cannot save answer correctly.");
            setIsUploading(false);
            setUiTranscript("Error: Missing attempt ID.");
            return;
        }
        const formData = new FormData();
        formData.append("file", audioBlob, "answer.webm");
        formData.append("questionId", currentQId);
        formData.append("interviewId", interviewId);
        formData.append("attemptId", attemptId);
        if (user?.id) {
            formData.append("userId", user.id);
        }

        try {
            const res = await fetch("http://localhost:8000/interview/answer", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                setUiTranscript("Answer saved.");
            } else {
                setUiTranscript("Error saving answer.");
            }
        } catch (error) {
            console.error("Upload error", error);
        } finally {
            setIsUploading(false);
        }
    }

    // ------------------------------
    // Navigation
    // ------------------------------
    function nextQuestion() {
        if (isRecording) stopRecording();

        setLiveTranscript("");
        if (recordedAudioUrl) {
            URL.revokeObjectURL(recordedAudioUrl);
            setRecordedAudioUrl(null);
        }

        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex >= questions.length) return;

        setCurrentQuestionIndex(nextIndex);
        setUiTranscript("");

        const nextQuestionId = questions[nextIndex].id;
        const blob = audioQueue.current.get(nextQuestionId);

        if (blob) {
            playAudio(blob);
        } else {
            setLoadingAudio(true);
            setUiTranscript("Preparing audio...");
        }
    }

    const uiState = !interviewStarted
        ? InterviewUIState.NOT_STARTED
        : currentQuestionIndex > questions.length - 1
            ? InterviewUIState.FINISHED
            : InterviewUIState.IN_PROGRESS;

    const shouldDisplayOverlay = showOverlayCondition && (loadingAudio || !timeIsUp);
    const hideQuestion = currentQuestionIndex === 0 && !timeIsUp;
    if (isFinalizing) {
        return (
            <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 animate-fadeIn">
                <div className="p-10 rounded-2xl dark-gradient border border-primary-200/50 shadow-2xl max-w-xl w-full flex flex-col items-center text-center space-y-6">

                    <Loader2 className="w-12 h-12 text-primary-200 animate-spin" />

                    <h2 className="text-3xl font-bold text-success-100">
                        Analyzing Your Interview…
                    </h2>

                    <p className="text-lg text-foreground/80 leading-relaxed">
                        Please wait while we process your responses,
                        evaluate your performance, and prepare your personalized feedback.
                    </p>

                    <div className="mt-4 text-sm text-primary-200 animate-pulse">
                        This may take a few seconds…
                    </div>
                </div>
            </div>
        );
    }
    return (

        <>
            <Agent
                userName={user?.name}
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                uiTranscript={uiTranscript}
                isAudioPlaying={isAudioPlaying}
                uiState={uiState}
                hideQuestion={hideQuestion}
            />

            <div className="w-full flex flex-col items-center justify-center mt-6 gap-4 px-4">

                {isRecording && (
                    <div className="w-full max-w-2xl flex flex-col items-center gap-4 animate-fadeIn">
                        <AudioVisualizer stream={mediaStream} />
                        <div className="w-full p-4 bg-white border-2 border-blue-100 rounded-xl shadow-sm min-h-[60px] text-center">
                            <p className="text-lg text-gray-700 font-medium">
                                {liveTranscript || <span className="text-gray-300 italic">Listening...</span>}
                            </p>
                        </div>
                    </div>
                )}

                {!isRecording && recordedAudioUrl && (
                    <div className="w-full max-w-md p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase mb-2">Your Recorded Answer</span>
                        <audio controls src={recordedAudioUrl} className="w-full h-8" />
                    </div>
                )}

                {uiState === InterviewUIState.NOT_STARTED && (
                    <button className="btn-call" onClick={startInterview}>
                        Start Interview
                    </button>
                )}


                {shouldDisplayOverlay && (
                    <div
                        className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 transition-opacity duration-300"
                    >
                        <div className="flex flex-col items-center max-w-2xl w-full rounded-2xl shadow-2xl p-8 dark-gradient border border-input">
                            <h2 className="text-3xl font-extrabold text-success-100 mb-4">
                                Interview Commencing...
                            </h2>
                            <p className="text-lg text-foreground mb-6">
                                While we prepare the first question&aposs audio, please review the rules.
                            </p>

                            <div className="w-full text-left space-y-3 p-4 bg-secondary border-l-4 border-primary-200 rounded-lg">
                                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <svg className="w-6 h-6 text-primary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-9.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.14-2.052-.418-3.016z"></path></svg>
                                    Interview Rules
                                </h3>
                                <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
                                    <li>
                                        The interviewer will ask a question, and you will hear the audio.
                                    </li>
                                    <li>
                                        To record your answer, wait for the audio to finish, then click the **● Record Answer** button.
                                    </li>
                                    <li>
                                        Click the **■ Stop Recording** button when you are done speaking. Your response will be saved.
                                    </li>
                                    <li>
                                        After your answer is saved, click **Next Question →** to proceed.
                                    </li>
                                </ul>
                            </div>
                            <div className="mt-6 flex items-center gap-3 text-lg font-medium text-foreground">
                                <Loader2 className="w-5 h-5 text-primary-200 animate-spin" />
                                Setting up the interview for you (Please wait)
                            </div>
                        </div>
                    </div>
                )}

                {uiState === InterviewUIState.IN_PROGRESS && (
                    <div className="flex gap-4 items-center mt-2">
                        {!isRecording ? (
                            <button
                                onClick={startRecording}
                                disabled={isAudioPlaying || isUploading}
                                className={`px-6 py-3 rounded-full font-bold transition-all flex items-center justify-center gap-2 ${isAudioPlaying
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-red-500 hover:bg-red-600 text-white shadow-lg hover:scale-105"
                                    }`}
                            >
                                {isUploading && <Loader2 className="w-5 h-5 animate-spin" />}
                                {isUploading ? "Uploading..." : "● Record Answer"}
                            </button>

                        ) : (
                            <button
                                onClick={stopRecording}
                                className="px-6 py-3 rounded-full font-bold bg-gray-800 text-white animate-pulse border-2 border-red-500"
                            >
                                ■ Stop Recording
                            </button>
                        )}

                        {isLastQuestion ? (
                            <button
                                onClick={endInterview}
                                disabled={isRecording || isAudioPlaying || isUploading}
                                className="px-6 py-3 rounded-full font-bold bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                End Interview 🎉
                            </button>
                        ) : (
                            <button
                                onClick={nextQuestion}
                                disabled={isRecording || isAudioPlaying || isUploading}
                                className="btn-next disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next Question →
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}