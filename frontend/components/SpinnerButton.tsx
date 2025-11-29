"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function SpinnerButton({
    text = "Loading...",
    variant = "default",
    size = "sm",
}: {
    text?: string;
    variant?: "default" | "outline" | "secondary";
    size?: "sm" | "default" | "lg";
}) {
    return (
        <div className="flex justify-center items-center">
            <Button disabled variant={variant} size={size} className="gap-2">
                <Spinner />
                {text}
            </Button>
        </div>
    );
}
