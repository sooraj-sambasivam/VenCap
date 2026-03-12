// ============================================================
// VenCap — Save Slot Storage Utilities
// Manages up to 3 named save slots in localStorage.
// ============================================================

import type { SaveSlot } from "./types";

const META_KEY = "vencap-save-slots-meta";
const SLOT_KEY_PREFIX = "vencap-save-slot-";

/** Read all save slot metadata. */
export function getSaveSlots(): SaveSlot[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save current game state to a slot. */
export function saveToSlot(slotId: string, name: string, state: unknown): void {
  localStorage.setItem(`${SLOT_KEY_PREFIX}${slotId}`, JSON.stringify(state));

  const meta = getSaveSlots();
  const stateObj = state as Record<string, unknown>;
  const fund = stateObj.fund as Record<string, unknown> | null;

  const slot: SaveSlot = {
    id: slotId,
    name,
    savedAt: Date.now(),
    fundName: (fund?.name as string) ?? "Unknown Fund",
    month: (fund?.currentMonth as number) ?? 0,
    tvpiGross: (fund?.tvpiEstimate as number) ?? 1.0,
  };

  const idx = meta.findIndex((s) => s.id === slotId);
  if (idx >= 0) {
    meta[idx] = slot;
  } else {
    meta.push(slot);
  }
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

/** Load game state from a slot. Returns null if not found. */
export function loadFromSlot(slotId: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(`${SLOT_KEY_PREFIX}${slotId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Delete a save slot. */
export function deleteSlot(slotId: string): void {
  localStorage.removeItem(`${SLOT_KEY_PREFIX}${slotId}`);
  const meta = getSaveSlots().filter((s) => s.id !== slotId);
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}
