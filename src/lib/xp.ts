"use client";

import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";

/**
 * Award XP to the current user — updates Supabase + Zustand store atomically.
 * Extracted from 6+ pages that all duplicated the same 3-line pattern.
 *
 * @returns The new total XP, or 0 if no user is logged in.
 */
export async function awardXp(amount: number): Promise<number> {
    const user = useAppStore.getState().user;
    if (!user) return 0;

    const supabase = createClient();
    const newXp = (user.xp ?? 0) + amount;
    await supabase.from("profiles").update({ xp: newXp }).eq("id", user.id);
    useAppStore.getState().setUser({ ...user, xp: newXp });
    return newXp;
}
