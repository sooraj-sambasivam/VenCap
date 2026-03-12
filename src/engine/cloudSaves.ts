import { supabase } from "@/lib/supabase";
import type { CloudSave } from "./types";

export async function getCloudSaves(userId: string): Promise<CloudSave[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("cloud_saves")
    .select(
      "id, user_id, name, fund_name, month, tvpi_gross, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch cloud saves:", error.message);
    return [];
  }
  return data ?? [];
}

export async function saveToCloud(
  userId: string,
  name: string,
  fundName: string,
  month: number,
  tvpiGross: number,
  gameState: Record<string, unknown>,
): Promise<CloudSave | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("cloud_saves")
    .insert({
      user_id: userId,
      name,
      fund_name: fundName,
      month,
      tvpi_gross: tvpiGross,
      game_state: gameState,
    })
    .select(
      "id, user_id, name, fund_name, month, tvpi_gross, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("Failed to save to cloud:", error.message);
    return null;
  }
  return data;
}

export async function loadFromCloud(
  saveId: string,
): Promise<Record<string, unknown> | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("cloud_saves")
    .select("game_state")
    .eq("id", saveId)
    .single();

  if (error) {
    console.error("Failed to load cloud save:", error.message);
    return null;
  }
  return data?.game_state as Record<string, unknown> | null;
}

export async function updateCloudSave(
  saveId: string,
  name: string,
  fundName: string,
  month: number,
  tvpiGross: number,
  gameState: Record<string, unknown>,
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("cloud_saves")
    .update({
      name,
      fund_name: fundName,
      month,
      tvpi_gross: tvpiGross,
      game_state: gameState,
      updated_at: new Date().toISOString(),
    })
    .eq("id", saveId);

  if (error) {
    console.error("Failed to update cloud save:", error.message);
    return false;
  }
  return true;
}

export async function deleteCloudSave(saveId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("cloud_saves")
    .delete()
    .eq("id", saveId);

  if (error) {
    console.error("Failed to delete cloud save:", error.message);
    return false;
  }
  return true;
}
