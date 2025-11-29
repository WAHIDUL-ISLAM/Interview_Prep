"use client";

import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SpinnerButton from "@/components/SpinnerButton";


const Rootlayout = ({ children }: { children: ReactNode }) => {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) router.push("/sign-in");
            setLoading(false);
        };
        checkAuth();
    }, [router]);

    if (loading)
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <SpinnerButton />
                <p className="mt-4 text-gray-400 text-sm">Checking authentication...</p>
            </div>
        );

    return (
        <div className="root-layout">
            <nav>
                <Link href="/" className="flex items-center gap-2">
                    <Image src="/logo.svg" alt="logo" width={38} height={32} />
                    <h2 className="text-primary-100">Interview Prep</h2>
                </Link>
            </nav>
            {children}
        </div>
    );
};

export default Rootlayout;
