import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function formatMultiple(value: number): string {
  // Trim trailing zeros: 1.00x → 1x, 1.50x → 1.5x, 2.34x → 2.34x
  const fixed = value.toFixed(2)
  const trimmed = fixed.replace(/\.?0+$/, '')
  return `${trimmed}x`
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatIRR(value: number): string {
  // Consistent IRR display: always 1 decimal, with sign for clarity
  return `${value.toFixed(1)}%`
}

export function formatFeeRate(rate: number): string {
  // Convert decimal rate to display percentage: 0.02 → "2%", 0.08 → "8%"
  const pct = rate * 100
  return pct % 1 === 0 ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1))
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function weightedRandom<T>(items: T[], weights: number[]): T {
  if (items.length !== weights.length || items.length === 0) {
    return items[0] // fallback; mismatched arrays
  }
  const total = weights.reduce((sum, w) => sum + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

export function uuid(): string {
  return crypto.randomUUID()
}

export function getMonthName(month: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[month % 12]
}

export function getGameYear(month: number): number {
  return Math.floor(month / 12) + 1
}

export function getGameMonth(month: number): number {
  return (month % 12) + 1
}
