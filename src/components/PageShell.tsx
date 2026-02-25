import type { ReactNode } from 'react'

interface PageShellProps {
  children: ReactNode
  className?: string
}

export function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div className={`animate-in fade-in duration-300 ${className}`}>
      {children}
    </div>
  )
}
