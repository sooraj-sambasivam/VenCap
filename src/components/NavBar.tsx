import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Save } from "lucide-react";
import { useGameStore } from "@/engine/gameState";
import { getMonthName, getGameYear } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import SaveLoadDialog from "@/components/SaveLoadDialog";

const NAV_LINKS: readonly { to: string; label: string; tourId?: string }[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/deals", label: "Deals" },
  { to: "/portfolio", label: "Portfolio", tourId: "nav-portfolio" },
  { to: "/incubator", label: "Incubator" },
  { to: "/lab", label: "Lab" },
  { to: "/news", label: "News" },
  { to: "/reports", label: "Reports", tourId: "nav-reports" },
  { to: "/fundraising", label: "Fundraising" },
  { to: "/skills", label: "Skills" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const location = useLocation();
  const fund = useGameStore((s) => s.fund);
  const gamePhase = useGameStore((s) => s.gamePhase);

  const showLinks = gamePhase !== "setup";

  return (
    <>
      <nav
        role="navigation"
        aria-label="Main navigation"
        className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-card px-4"
      >
        {/* Logo */}
        <Link
          to="/"
          className="mr-6 text-lg font-bold tracking-tight text-foreground"
        >
          VenCap
        </Link>

        {/* Desktop nav links */}
        {showLinks && (
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                data-tour={link.tourId}
                aria-current={
                  location.pathname === link.to ? "page" : undefined
                }
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  location.pathname === link.to
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Current month/year */}
        {fund && fund.currentMonth !== undefined && (
          <>
            <span className="mr-3 hidden text-sm text-muted-foreground sm:inline">
              Year {getGameYear(fund.currentMonth)},{" "}
              {getMonthName(fund.currentMonth)}
            </span>
            <span className="mr-3 text-xs text-muted-foreground sm:hidden">
              Y{getGameYear(fund.currentMonth)},{" "}
              {getMonthName(fund.currentMonth).slice(0, 3)}
            </span>
          </>
        )}

        {/* Save/Load button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSaveDialogOpen(true)}
          title="Save / Load Game"
        >
          <Save className="size-5" />
          <span className="sr-only">Save / Load Game</span>
        </Button>

        {/* Mobile hamburger menu */}
        {showLinks && (
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  {open ? (
                    <X className="size-5" />
                  ) : (
                    <Menu className="size-5" />
                  )}
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                showCloseButton={false}
                className="w-64 p-0"
              >
                <div className="flex h-14 items-center border-b border-border px-4">
                  <span className="text-lg font-bold tracking-tight">
                    VenCap
                  </span>
                </div>
                <nav
                  aria-label="Mobile navigation"
                  className="flex flex-col gap-1 p-4"
                >
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setOpen(false)}
                      aria-current={
                        location.pathname === link.to ? "page" : undefined
                      }
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        location.pathname === link.to
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
                {fund && fund.currentMonth !== undefined && (
                  <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                    Year {getGameYear(fund.currentMonth)},{" "}
                    {getMonthName(fund.currentMonth)}
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        )}
      </nav>

      <SaveLoadDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
      />
    </>
  );
}
