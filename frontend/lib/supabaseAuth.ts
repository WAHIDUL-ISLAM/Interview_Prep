import { supabase } from "../supabase/supabaseClient";

export async function getCurrentUser(): Promise<{ id: string } | null> {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        console.error("Error fetching user:", error?.message);
        return null;
    }

    return { id: data.user.id };
}
