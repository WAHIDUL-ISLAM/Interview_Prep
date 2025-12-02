"use client";

import { useEffect, useState } from "react";
import InterviewCard from "@/components/InterviewCard";
import { supabase } from "@/supabase/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Page() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllInterviews = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!userData.user || userError) return setLoading(false);

        setUser({ id: userData.user.id, email: userData.user.email });

        const { data: interviewsData, error: interviewsError } = await supabase
          .from("interviews")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false });

        if (interviewsError) {
          console.error(interviewsError);
          return setLoading(false);
        }

        setInterviews(interviewsData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllInterviews();
  }, []);

  async function handleDelete(id: string) {
    const ok = confirm("Are you sure you want to delete this interview?");
    if (!ok) return;

    await supabase.from("interviews").delete().eq("id", id);

    // Refresh UI
    setInterviews(prev => prev.filter(inter => inter.id !== id));
  }


  return (
    <>
      {/* --- Hero Section --- */}
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>
            Make yourself ready for the interviews with AI-Powered Practice & Feedback
          </h2>
          <p className="text-lg">
            Practice on industry-level questions and get feedback on your answers.
          </p>
          <Button asChild className="btn-primary max-sm:w-full">
            <Link href="/interview/create">Create an Interview</Link>
          </Button>
        </div>
        <Image
          src="/robot.png"
          alt="robot-image"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      {/* --- History Section --- */}
      <section className="flex flex-col gap-6 mt-8">
        <h2 className="text-2xl font-semibold">Your Interview History</h2>

        {loading ? (
          <div className="flex flex-wrap gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-[360px] max-sm:w-full min-h-96 border rounded-md p-4 animate-pulse bg-gray-100"
              >
                <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/4 mb-6"></div>
                <div className="h-8 bg-gray-300 rounded w-full mt-auto"></div>
              </div>
            ))}
          </div>
        ) : interviews.length > 0 ? (
          <div className="flex flex-wrap gap-6">
            {interviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack || []}
                createdAt={interview.created_at}
                totalScore={interview.totalScore}
                finalAssessment={interview.finalAssessment}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-400">
            No interviews available. Click “Create an Interview” to begin.
          </p>
        )}
      </section>
    </>
  );
}
