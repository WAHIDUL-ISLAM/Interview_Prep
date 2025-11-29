// lib/action/auth.action.ts
'use server'

import { supabase } from '@/supabase/supabaseClient'

// ✅ Sign Up
export async function signUpAction(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                display_name: name,
            },
        },
    })
    if (error) throw new Error(error.message)
    return data
}

// ✅ Sign In
export async function signInAction(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })
    if (error) throw new Error(error.message)
    return data
}

// ✅ Check if authenticated
export async function isAuthenticated() {
    const { data } = await supabase.auth.getSession()
    return !!data.session
}
