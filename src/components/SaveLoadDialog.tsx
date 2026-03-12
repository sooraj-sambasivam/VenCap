import { useState, useCallback, useEffect } from "react";
import { Save, Trash2, Download, Upload, HardDrive } from "lucide-react";
import { useGameStore } from "@/engine/gameState";
import { getSaveSlots, deleteSlot } from "@/engine/saveSlots";
import { getMonthName, getGameYear } from "@/lib/utils";

const MAX_SLOTS = 3;
import type { SaveSlot } from "@/engine/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SLOT_IDS = ["slot-1", "slot-2", "slot-3"];

interface SaveLoadDialogProps {
  open: boolean;
  onClose: () => void;
}

type ConfirmAction =
  | { type: "overwrite"; slotId: string; slotName: string }
  | { type: "load"; slotId: string; slotName: string }
  | { type: "delete"; slotId: string; slotName: string };

export default function SaveLoadDialog({ open, onClose }: SaveLoadDialogProps) {
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [saveName, setSaveName] = useState("");
  const [activeEmptySlot, setActiveEmptySlot] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const gamePhase = useGameStore((s) => s.gamePhase);
  const saveToSlot = useGameStore((s) => s.saveToSlot);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const refreshSlots = useCallback(() => {
    setSlots(getSaveSlots());
  }, []);

  useEffect(() => {
    if (open) {
      refreshSlots();
      setSaveName("");
      setActiveEmptySlot(null);
      setConfirm(null);
    }
  }, [open, refreshSlots]);

  const canSave = gamePhase === "playing" || gamePhase === "ended";

  const getSlotData = (slotId: string): SaveSlot | undefined =>
    slots.find((s) => s.id === slotId);

  const handleSaveToEmpty = (slotId: string) => {
    const name = saveName.trim() || `Save ${slotId.split("-")[1]}`;
    saveToSlot(slotId, name);
    refreshSlots();
    setSaveName("");
    setActiveEmptySlot(null);
    toast.success(`Game saved to "${name}"`);
  };

  const handleConfirmAction = () => {
    if (!confirm) return;

    switch (confirm.type) {
      case "overwrite": {
        const name = saveName.trim() || confirm.slotName;
        saveToSlot(confirm.slotId, name);
        refreshSlots();
        setSaveName("");
        toast.success(`Save overwritten: "${name}"`);
        break;
      }
      case "load": {
        const success = loadFromSlot(confirm.slotId);
        if (success) {
          toast.success(`Loaded save: "${confirm.slotName}"`);
          onClose();
        } else {
          toast.error("Failed to load save — data may be corrupted");
        }
        break;
      }
      case "delete": {
        deleteSlot(confirm.slotId);
        refreshSlots();
        toast.success(`Deleted save: "${confirm.slotName}"`);
        break;
      }
    }
    setConfirm(null);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Confirmation overlay
  if (confirm) {
    const actionLabels: Record<ConfirmAction["type"], string> = {
      overwrite: "Overwrite",
      load: "Load",
      delete: "Delete",
    };
    const actionDescriptions: Record<ConfirmAction["type"], string> = {
      overwrite: `This will overwrite the save "${confirm.slotName}". Your current game will be saved in its place.`,
      load: `This will load "${confirm.slotName}" and replace your current game state. Any unsaved progress will be lost.`,
      delete: `This will permanently delete "${confirm.slotName}". This cannot be undone.`,
    };
    const isDestructive = confirm.type === "delete";

    return (
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setConfirm(null);
            onClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm {actionLabels[confirm.type]}</DialogTitle>
            <DialogDescription>
              {actionDescriptions[confirm.type]}
            </DialogDescription>
          </DialogHeader>

          {confirm.type === "overwrite" && (
            <input
              type="text"
              placeholder={confirm.slotName}
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={isDestructive ? "destructive" : "default"}
              onClick={handleConfirmAction}
            >
              {actionLabels[confirm.type]}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="size-5" />
            Save / Load Game
          </DialogTitle>
          <DialogDescription>
            Manage up to {MAX_SLOTS} save slots. Save your progress or load a
            previous game.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {SLOT_IDS.map((slotId, idx) => {
            const slot = getSlotData(slotId);

            if (!slot) {
              // Empty slot
              return (
                <div
                  key={slotId}
                  className="rounded-lg border border-dashed border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Slot {idx + 1} — Empty
                      </p>
                    </div>
                    {canSave && activeEmptySlot !== slotId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveEmptySlot(slotId);
                          setSaveName("");
                        }}
                      >
                        <Save className="mr-1.5 size-3.5" />
                        Save Here
                      </Button>
                    )}
                  </div>
                  {activeEmptySlot === slotId && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        placeholder={`Save ${idx + 1}`}
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveToEmpty(slotId);
                        }}
                        className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveToEmpty(slotId)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveEmptySlot(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              );
            }

            // Occupied slot
            return (
              <div
                key={slotId}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {slot.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {slot.fundName}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Year {getGameYear(slot.month)},{" "}
                        {getMonthName(slot.month)}
                      </span>
                      <span>TVPI {slot.tvpiGross.toFixed(2)}x</span>
                      <span>{formatDate(slot.savedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setConfirm({ type: "load", slotId, slotName: slot.name })
                    }
                  >
                    <Download className="mr-1.5 size-3.5" />
                    Load
                  </Button>
                  {canSave && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSaveName("");
                        setConfirm({
                          type: "overwrite",
                          slotId,
                          slotName: slot.name,
                        });
                      }}
                    >
                      <Upload className="mr-1.5 size-3.5" />
                      Overwrite
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      setConfirm({
                        type: "delete",
                        slotId,
                        slotName: slot.name,
                      })
                    }
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {!canSave && (
          <p className="text-xs text-muted-foreground text-center">
            Start a game to enable saving.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
