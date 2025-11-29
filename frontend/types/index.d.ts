// =====================
// 📄 Shared TypeScript Types
// =====================

// 🧠 Feedback entity
export interface Feedback {
  id: string;
  interviewId: string;
  totalScore: number;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
}

// 💬 Question entity (matches Supabase `questions` table)
export interface Question {
  id: string;
  interview_id: string;
  user_id: string;
  question: string;
  type: string;
  difficulty?: string | null;
  topic?: string | null;
  ideal_answer?: string | null;
  key_points?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

// 🧩 Interview entity (matches Supabase `interviews` table)
export interface Interview {
  id: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  createdAt: string;
  userId: string;
  finalized: boolean;
  questions?: Question[];
}

// 🧑 User entity (matches Supabase `users` table)
export interface User {
  id: string;
  name: string;
  email: string;
}

// ⚙️ Parameters for feedback creation
export interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

// ⚙️ Query parameter types
export interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

export interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

// 🔐 Authentication-related
export interface SignInParams {
  email: string;
  idToken: string;
}

export interface SignUpParams {
  uid: string;
  name: string;
  email: string;
  password: string;
}

export type FormType = "sign-in" | "sign-up";

// 💼 UI Props for various components
export interface InterviewCardProps {
  interviewId?: string;
  userId?: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt?: string;
}


export interface InterviewFormProps {
  interviewId: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  amount: number;
}

export interface TechIconProps {
  techStack: string[];
}

export interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

export interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: { new(): ISpeechRecognition };
    SpeechRecognition: { new(): ISpeechRecognition };
  }
}
export interface SpeechRecognitionResult {
  [index: number]: { transcript: string };
  length: number;
}

export interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

