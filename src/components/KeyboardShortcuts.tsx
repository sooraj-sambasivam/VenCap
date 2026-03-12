import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGameStore } from "@/engine/gameState";
import { toast } from "sonner";

const SHORTCUTS = [
  { key: "d", label: "Dashboard", path: "/dashboard" },
  { key: "l", label: "Deal Flow", path: "/deals" },
  { key: "p", label: "Portfolio", path: "/portfolio" },
  { key: "i", label: "Incubator", path: "/incubator" },
  { key: "b", label: "Venture Lab", path: "/lab" },
  { key: "n", label: "News", path: "/news" },
  { key: "r", label: "Reports", path: "/reports" },
  { key: "f", label: "Fundraising", path: "/fundraising" },
] as const;

export function KeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const gamePhase = useGameStore((s) => s.gamePhase);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in inputs, textareas, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle Cmd+Z / Ctrl+Z for undo — must come before the modifier early-return
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "z" &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const { history, undoAdvance } = useGameStore.getState();
        if (history.length > 0) {
          undoAdvance();
          toast.info("Reverted to previous month.");
        }
        return;
      }

      // Ignore when modifier keys are held (except shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // ? key — toggle help
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setHelpOpen((prev) => !prev);
        return;
      }

      // Escape — close help if open
      if (e.key === "Escape" && helpOpen) {
        setHelpOpen(false);
        return;
      }

      // Only handle navigation shortcuts when game is playing
      if (gamePhase !== "playing") return;

      // Navigation shortcuts
      for (const shortcut of SHORTCUTS) {
        if (e.key === shortcut.key && location.pathname !== shortcut.path) {
          e.preventDefault();
          navigate(shortcut.path);
          return;
        }
      }
    },
    [navigate, location.pathname, gamePhase, helpOpen],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Navigation
            </p>
            <div className="space-y-1">
              {SHORTCUTS.map((s) => (
                <ShortcutRow key={s.key} shortcut={s.key} label={s.label} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Actions
            </p>
            <ShortcutRow shortcut="⌘Z" label="Undo last month" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              General
            </p>
            <ShortcutRow shortcut="?" label="Toggle this help" />
            <ShortcutRow shortcut="Esc" label="Close dialog / help" />
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Shortcuts are disabled when typing in text fields.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({ shortcut, label }: { shortcut: string; label: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded border border-border bg-secondary text-xs font-mono font-medium">
        {shortcut}
      </kbd>
    </div>
  );
}
