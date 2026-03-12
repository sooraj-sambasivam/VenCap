// ============================================================
// VenCap — Local Leaderboard / High Scores
// Persists top 20 scores in localStorage.
// ============================================================

import type { CloudLeaderboardEntry, LeaderboardEntry } from "./types";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "vencap-leaderboard";
const MAX_ENTRIES = 20;

/** Read the full leaderboard, sorted by finalScore desc. */
export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const entries: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
    return entries.sort((a, b) => b.finalScore - a.finalScore);
  } catch {
    return [];
  }
}

/** Add an entry to the leaderboard. Keeps top 20. */
export function addToLeaderboard(entry: LeaderboardEntry): void {
  const entries = getLeaderboard();
  // Prevent duplicates by checking id
  if (entries.some((e) => e.id === entry.id)) return;
  entries.push(entry);
  entries.sort((a, b) => b.finalScore - a.finalScore);
  const trimmed = entries.slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/** Clear the entire leaderboard. */
export function clearLeaderboard(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Check if a score would make it into the top 3. */
export function isTopThreeScore(score: number): boolean {
  const entries = getLeaderboard();
  if (entries.length < 3) return true;
  return score > entries[2].finalScore;
}

/** Check if a score would make it into the top 20 (leaderboard). */
export function isHighScore(score: number): boolean {
  const entries = getLeaderboard();
  if (entries.length < MAX_ENTRIES) return true;
  return score > entries[entries.length - 1].finalScore;
}

// ============================================================
// CLOUD LEADERBOARD (Supabase)
// ============================================================

/** Fetch the global leaderboard from Supabase. */
export async function getCloudLeaderboard(
  limit = 50,
  scenarioId?: string,
  difficulty?: string,
): Promise<CloudLeaderboardEntry[]> {
  if (!supabase) return [];

  let query = supabase
    .from("leaderboard_entries")
    .select("*, profiles(username)")
    .order("final_score", { ascending: false })
    .limit(limit);

  if (scenarioId) query = query.eq("scenario_id", scenarioId);
  if (difficulty) query = query.eq("difficulty", difficulty);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch leaderboard:", error.message);
    return [];
  }
  return data ?? [];
}

/** Submit a score to the global Supabase leaderboard. */
export async function submitToCloudLeaderboard(
  userId: string,
  entry: Omit<
    CloudLeaderboardEntry,
    "id" | "user_id" | "completed_at" | "profiles"
  >,
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("leaderboard_entries")
    .insert({ ...entry, user_id: userId });

  if (error) {
    console.error("Failed to submit to leaderboard:", error.message);
    return false;
  }
  return true;
}
