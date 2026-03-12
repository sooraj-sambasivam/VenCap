import { useState, useCallback, useEffect } from "react";
import {
  Save,
  Trash2,
  Download,
  Upload,
  HardDrive,
  Cloud,
  Loader2,
} from "lucide-react";
import { useGameStore } from "@/engine/gameState";
import { useAuth } from "@/engine/auth";
import { getSaveSlots, deleteSlot } from "@/engine/saveSlots";
import {
  getCloudSaves,
  saveToCloud,
  loadFromCloud,
  deleteCloudSave,
} from "@/engine/cloudSaves";
import { getMonthName, getGameYear } from "@/lib/utils";

const MAX_SLOTS = 3;
import type { SaveSlot, CloudSave } from "@/engine/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  | { type: "delete"; slotId: string; slotName: string }
  | { type: "cloud-load"; saveId: string; saveName: string }
  | { type: "cloud-delete"; saveId: string; saveName: string };

export default function SaveLoadDialog({ open, onClose }: SaveLoadDialogProps) {
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [saveName, setSaveName] = useState("");
  const [activeEmptySlot, setActiveEmptySlot] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  // Cloud state
  const { user } = useAuth();
  const [cloudSaves, setCloudSaves] = useState<CloudSave[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudSaveName, setCloudSaveName] = useState("");
  const [cloudSaving, setCloudSaving] = useState(false);

  const gamePhase = useGameStore((s) => s.gamePhase);
  const fund = useGameStore((s) => s.fund);
  const saveToSlot = useGameStore((s) => s.saveToSlot);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);

  const refreshSlots = useCallback(() => {
    setSlots(getSaveSlots());
  }, []);

  const refreshCloudSaves = useCallback(async () => {
    if (!user) return;
    setCloudLoading(true);
    const saves = await getCloudSaves(user.id);
    setCloudSaves(saves);
    setCloudLoading(false);
  }, [user]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      refreshSlots();
      refreshCloudSaves();
      setSaveName("");
      setCloudSaveName("");
      setActiveEmptySlot(null);
      setConfirm(null);
    }
  }, [open, refreshSlots, refreshCloudSaves]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const getSerializableState = (): Record<string, unknown> => {
    const state = useGameStore.getState();
    const serializable: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(state)) {
      if (typeof v !== "function" && k !== "history") {
        serializable[k] = v;
      }
    }
    return serializable;
  };

  const handleCloudSave = async () => {
    if (!user || !fund) return;
    const name = cloudSaveName.trim() || `${fund.name} Save`;
    setCloudSaving(true);
    const result = await saveToCloud(
      user.id,
      name,
      fund.name,
      fund.currentMonth,
      fund.tvpiEstimate ?? 1.0,
      getSerializableState(),
    );
    setCloudSaving(false);
    if (result) {
      toast.success(`Saved to cloud: "${name}"`);
      setCloudSaveName("");
      await refreshCloudSaves();
    } else {
      toast.error("Failed to save to cloud");
    }
  };

  const handleCloudLoad = async (saveId: string, saveName: string) => {
    const state = await loadFromCloud(saveId);
    if (state) {
      useGameStore.setState({
        ...(state as Record<string, unknown>),
        history: [],
      });
      toast.success(`Loaded cloud save: "${saveName}"`);
      onClose();
    } else {
      toast.error("Failed to load cloud save");
    }
  };

  const handleCloudDelete = async (saveId: string, saveName: string) => {
    const success = await deleteCloudSave(saveId);
    if (success) {
      toast.success(`Deleted cloud save: "${saveName}"`);
      await refreshCloudSaves();
    } else {
      toast.error("Failed to delete cloud save");
    }
  };

  const handleConfirmAction = async () => {
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
      case "cloud-load": {
        await handleCloudLoad(confirm.saveId, confirm.saveName);
        break;
      }
      case "cloud-delete": {
        await handleCloudDelete(confirm.saveId, confirm.saveName);
        break;
      }
    }
    setConfirm(null);
  };

  const formatDate = (timestamp: number | string): string => {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp);
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
      "cloud-load": "Load",
      "cloud-delete": "Delete",
    };
    const actionDescriptions: Record<ConfirmAction["type"], string> = {
      overwrite: `This will overwrite the save "${confirm.type === "overwrite" || confirm.type === "load" || confirm.type === "delete" ? confirm.slotName : "saveName" in confirm ? confirm.saveName : ""}". Your current game will be saved in its place.`,
      load: `This will load and replace your current game state. Any unsaved progress will be lost.`,
      delete: `This will permanently delete the save. This cannot be undone.`,
      "cloud-load": `This will load the cloud save and replace your current game state. Any unsaved progress will be lost.`,
      "cloud-delete": `This will permanently delete the cloud save. This cannot be undone.`,
    };
    const isDestructive =
      confirm.type === "delete" || confirm.type === "cloud-delete";

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

  const localSavesContent = (
    <div className="flex flex-col gap-3">
      {SLOT_IDS.map((slotId, idx) => {
        const slot = getSlotData(slotId);

        if (!slot) {
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
                  <Button size="sm" onClick={() => handleSaveToEmpty(slotId)}>
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
                    Year {getGameYear(slot.month)}, {getMonthName(slot.month)}
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
                  setConfirm({
                    type: "load",
                    slotId,
                    slotName: slot.name,
                  })
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

      {!canSave && (
        <p className="text-xs text-muted-foreground text-center">
          Start a game to enable saving.
        </p>
      )}
    </div>
  );

  const cloudSavesContent = (
    <div className="flex flex-col gap-3">
      {/* Save to cloud */}
      {canSave && (
        <div className="rounded-lg border border-dashed border-border bg-card p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={fund ? `${fund.name} Save` : "Save name"}
              value={cloudSaveName}
              onChange={(e) => setCloudSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCloudSave();
              }}
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" onClick={handleCloudSave} disabled={cloudSaving}>
              {cloudSaving ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Cloud className="mr-1.5 size-3.5" />
              )}
              {cloudSaving ? "Saving..." : "Save to Cloud"}
            </Button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {cloudLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading cloud saves...
        </div>
      )}

      {/* Cloud save list */}
      {!cloudLoading && cloudSaves.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No cloud saves yet. Save your game to access it from any device.
        </p>
      )}

      {!cloudLoading &&
        cloudSaves.map((save) => (
          <div
            key={save.id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {save.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {save.fund_name}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Year {getGameYear(save.month)}, {getMonthName(save.month)}
                </span>
                <span>TVPI {Number(save.tvpi_gross).toFixed(2)}x</span>
                <span>{formatDate(save.updated_at)}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setConfirm({
                    type: "cloud-load",
                    saveId: save.id,
                    saveName: save.name,
                  })
                }
              >
                <Download className="mr-1.5 size-3.5" />
                Load
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  setConfirm({
                    type: "cloud-delete",
                    saveId: save.id,
                    saveName: save.name,
                  })
                }
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Delete
              </Button>
            </div>
          </div>
        ))}
    </div>
  );

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
            {user
              ? "Save locally or to the cloud for cross-device access."
              : `Manage up to ${MAX_SLOTS} local save slots.`}
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <Tabs defaultValue="cloud">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cloud">
                <Cloud className="mr-1.5 size-3.5" />
                Cloud
              </TabsTrigger>
              <TabsTrigger value="local">
                <HardDrive className="mr-1.5 size-3.5" />
                Local
              </TabsTrigger>
            </TabsList>
            <TabsContent value="cloud" className="mt-3">
              {cloudSavesContent}
            </TabsContent>
            <TabsContent value="local" className="mt-3">
              {localSavesContent}
            </TabsContent>
          </Tabs>
        ) : (
          localSavesContent
        )}
      </DialogContent>
    </Dialog>
  );
}
