"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/supabase/supabaseClient";
import { getCurrentUser } from "@/lib/supabaseAuth";
import { Loader2, FileText } from "lucide-react";

type CreateMode = "MANUAL" | "PDF";

const CreateInterview = () => {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mode, setMode] = useState<CreateMode>("MANUAL");
    const [formData, setFormData] = useState({ role: "", type: "", techstack: "" });
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (mode === "PDF") {
            setPdfFile(null);
            setMode("MANUAL");
        }
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (value: string) => {
        if (mode === "PDF") {
            setPdfFile(null);
            setMode("MANUAL");
        }
        setFormData(prev => ({ ...prev, type: value }));
    };

    const handlePdfSelect = (file: File | null) => {
        if (file) {
            setPdfFile(file);
            setMode("PDF");
            // Use sanitized file name as role
            const nameWithoutExt = file.name.replace(/\.pdf$/i, "");
            const formattedRole = nameWithoutExt.replace(/[_-]/g, " ");
            setFormData({ role: formattedRole, type: "", techstack: "" });
        } else {
            setPdfFile(null);
            setMode("MANUAL");
            setFormData({ role: "", type: "", techstack: "" });
        }
    };


    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type !== "application/pdf") return;
            handlePdfSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const user = await getCurrentUser();
            if (!user) throw new Error("You must be signed in to create an interview.");

            if (mode === "PDF" && pdfFile) {
                try {
                    const user = await getCurrentUser();
                    if (!user) throw new Error("You must be signed in to create an interview.");

                    setLoading(true);
                    setError("");

                    // Step 1: Immediately create the interview record with empty fields
                    const { data: interviewData, error: insertError } = await supabase
                        .from("interviews")
                        .insert([{
                            user_id: user.id,
                            role: formData.role,
                            type: "PDF",
                            techstack: [],
                            creation_method: "pdf_upload"
                        }])
                        .select()
                        .single();
                    if (insertError) throw insertError;

                    const interviewId = interviewData.id;

                    // Step 2: Prepare PDF upload and include the interview ID
                    const formDataObj = new FormData();
                    formDataObj.append("file", pdfFile);
                    formDataObj.append("userId", user.id);
                    formDataObj.append("interviewId", interviewId);
                    formDataObj.append("creation_method", "PDF");

                    const res = await fetch("http://localhost:8000/interview/upload-pdf", {
                        method: "POST",
                        body: formDataObj,
                    });
                    if (!res.ok) throw new Error("Failed to enqueue PDF parsing job");

                    const { websocketUrl, redisKey } = await res.json();

                    // Step 3: WebSocket for PDF parsing status
                    const wsKey = encodeURIComponent(redisKey);
                    const wsUrl = `ws://localhost:8000/interview/ws/pdf-status/${wsKey}`;
                    const socket = new WebSocket(wsUrl);

                    socket.onmessage = (event) => {
                        const data = JSON.parse(event.data);
                        console.log("PDF status update:", data);

                        if (data.status === "done") {
                            socket.close();
                            router.push("/");
                        } else if (data.status === "error") {
                            setError(data.error || "PDF parsing failed");
                            socket.close();
                            setLoading(false);
                        }
                    };

                    socket.onerror = () => {
                        setError("WebSocket connection failed");
                        setLoading(false);
                    };

                } catch (err: any) {
                    console.error(err);
                    setError(err.message || "Failed to create interview.");
                    setLoading(false);
                }
            }

            else if (mode === "MANUAL" && formData.role && formData.type) {
                const techstackArray = formData.techstack
                    ? formData.techstack.split(",").map(t => t.trim()).filter(Boolean)
                    : [];

                const { error: insertError } = await supabase
                    .from("interviews")
                    .insert([{ user_id: user.id, role: formData.role, type: formData.type, techstack: techstackArray, creation_method: "MANUAL" }]);
                if (insertError) throw insertError;

                router.push("/");
            } else {
                throw new Error("Please fill the form or upload a resume.");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to create interview.");
            setLoading(false);
        }
    };

    return (
        <div className="card-border p-6 w-full max-w-md mx-auto mt-10">
            <h2 className="text-xl font-semibold mb-4">Create New Interview</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <fieldset disabled={mode === "PDF"}>
                    <div>
                        <label className="block mb-1 font-medium">Role / Position</label>
                        <input
                            type="text"
                            name="role"
                            value={formData.role}
                            onChange={handleFormChange}
                            placeholder="e.g. Frontend Developer"
                            className="w-full border rounded-md p-2"
                            required={mode === "MANUAL"}
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Interview Type</label>
                        <Select value={formData.type} onValueChange={handleSelectChange}>
                            <SelectTrigger className="w-full border rounded-md p-2 bg-white">
                                <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent className="bg-dark-100 text-white">
                                <SelectItem value="Technical">Technical</SelectItem>
                                <SelectItem value="HR">HR</SelectItem>
                                <SelectItem value="Mixed">Mixed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Tech Stack</label>
                        <input
                            type="text"
                            name="techstack"
                            value={formData.techstack}
                            onChange={handleFormChange}
                            placeholder="e.g. React, Node.js, MongoDB"
                            className="w-full border rounded-md p-2"
                        />
                        <p className="text-sm text-gray-500 mt-1">Separate multiple technologies with commas.</p>
                    </div>
                </fieldset>

                <div className="text-center text-sm text-gray-500 my-2">— OR —</div>

                <div
                    className={`border-dashed border-2 rounded-md p-6 text-center cursor-pointer ${pdfFile ? "border-green-500" : "border-gray-300"
                        }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    {pdfFile ? (
                        <p className="flex items-center justify-center gap-2">
                            <FileText /> {pdfFile.name}
                        </p>
                    ) : (
                        <p className="flex items-center justify-center gap-2 text-gray-400">
                            <FileText /> Drag & drop PDF here or click to upload
                        </p>
                    )}
                    <input
                        type="file"
                        accept="application/pdf"
                        ref={fileInputRef}
                        onChange={(e) => handlePdfSelect(e.target.files?.[0] || null)}
                        className="hidden"
                    />
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <Button
                    type="submit"
                    className="btn-primary mt-3 flex items-center justify-center"
                    disabled={
                        loading ||
                        (mode === "MANUAL" && (!formData.role || !formData.type)) ||
                        (mode === "PDF" && !pdfFile)
                    }
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Start Interview"}
                </Button>
            </form>
        </div>
    );
};

export default CreateInterview;
