import type { ReactNode, CSSProperties } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Wraps page content with a subtle fade-in + slide-up animation on mount.
 * Uses pure CSS keyframes (defined in index.css) — no JS animation library.
 */
export function PageTransition({
  children,
  className = "",
  style,
}: PageTransitionProps) {
  return (
    <div
      className={className}
      style={{
        animation: "fadeInUp 250ms ease-out both",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
