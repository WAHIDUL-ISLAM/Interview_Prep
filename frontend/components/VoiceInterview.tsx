"use client";
import { useState, useRef } from "react";

export default function VoiceInterview() {
    const [status, setStatus] = useState("Ready to begin the interview.");
    const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
    const [interviewStarted, setInterviewStarted] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    // 🗣️ Text-to-speech
    const speak = (text: string, onEnd?: () => void) => {
        const synth = window.speechSynthesis;
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1;
        utter.pitch = 1;
        utter.onend = () => {
            setTimeout(() => onEnd && onEnd(), 700);
        };
        synth.speak(utter);
    };

    // 🎬 Start the interview
    const startInterview = async () => {
        setInterviewStarted(true);
        setStatus("Interview starting...");

        const res = await fetch("http://127.0.0.1:8000/api/interview-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Start the interview by greeting the candidate.",
                history: [],
            }),
        });

        const data = await res.json();
        const aiOpening = data.reply;
        setHistory([{ role: "assistant", content: aiOpening }]);
        speak(aiOpening, () => setTimeout(startRecording, 1000));
    };

    // 🎤 Start recording with noise reduction and silence detection
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 48000,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false,
                },
            });

            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            const dataArray = new Uint8Array(analyser.fftSize);


            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/mp4";

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                audioBitsPerSecond: 128000,
            });
            mediaRecorderRef.current = mediaRecorder;

            const chunks: BlobPart[] = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

            // Silence detection
            let silenceStart = Date.now();
            const silenceThreshold = 7000;
            const silenceLevel = 20;
            const startTime = Date.now();

            const checkSilence = () => {
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                const now = Date.now();

                if (avg < silenceLevel) {
                    if (now - silenceStart > silenceThreshold) {
                        mediaRecorder.stop();
                        setStatus("🧠 Processing speech...");
                        return;
                    }
                } else {
                    silenceStart = now;
                }

                if (now - startTime > 15000) {
                    mediaRecorder.stop();
                    setStatus("🧠 Processing (timeout)...");
                    return;
                }

                requestAnimationFrame(checkSilence);
            };

            // When recording stops
            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: mimeType });


                if (blob.size < 5000) {
                    setStatus("Silence detected. Try again.");
                    setTimeout(startRecording, 1000);
                    return;
                }

                const formData = new FormData();
                formData.append("file", blob, "voice.webm");

                // Transcribe speech
                const res = await fetch("http://127.0.0.1:8000/api/transcribe", {
                    method: "POST",
                    body: formData,
                });
                const { text } = await res.json();

                if (!text.trim()) {
                    setStatus("Didn’t catch that. Please repeat.");
                    setTimeout(startRecording, 1000);
                    return;
                }

                setStatus("✍️ Refining your speech...");
                const newHistory = [...history, { role: "user", content: text }];
                setHistory(newHistory);

                //Get AI reply
                const aiRes = await fetch("http://127.0.0.1:8000/api/interview-agent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: text,
                        history: newHistory.slice(-10),
                    }),
                });

                const aiData = await aiRes.json();
                const aiReply = aiData.reply || "Could you please repeat?";
                const corrected = aiData.corrected || text;

                setHistory([
                    ...newHistory,
                    { role: "system", content: `📝 Corrected: ${corrected}` },
                    { role: "assistant", content: aiReply },
                ]);

                setStatus("🤖 AI responding...");
                speak(aiReply, () => {
                    setStatus("🎤 Listening...");
                    setTimeout(() => startRecording(), 1500);
                });
            };
            mediaRecorder.start();
            setStatus("🎤 Listening...");
            checkSilence();
        } catch (err) {
            console.error("Mic error:", err);
            setStatus("Microphone access failed.");
        }
    };

    // 🧱 UI
    return (
        <div className="flex flex-col items-center justify-center gap-4 h-screen px-4">
            <h1 className="text-3xl font-bold">🎤 AI Interview Platform</h1>
            <p className="text-gray-700">{status}</p>

            <div className="w-full max-w-2xl bg-gray-100 rounded-lg p-4 h-64 overflow-y-auto shadow-inner">
                {history.map((msg, i) => (
                    <p
                        key={i}
                        className={`my-1 ${msg.role === "user"
                            ? "text-blue-700"
                            : msg.role === "assistant"
                                ? "text-green-700"
                                : "text-gray-500 italic"
                            }`}
                    >
                        <strong>
                            {msg.role === "user"
                                ? "You:"
                                : msg.role === "assistant"
                                    ? "AI:"
                                    : ""}
                        </strong>{" "}
                        {msg.content}
                    </p>
                ))}
            </div>

            <button
                onClick={startInterview}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                disabled={interviewStarted}
            >
                {interviewStarted ? "Interview in Progress..." : "Start Interview"}
            </button>
        </div>
    );
}
