import { describe, it, expect } from 'vitest'
import { getBenchmarkForFund } from './benchmarkData'

// ============ getBenchmarkForFund ============

describe('getBenchmarkForFund', () => {
  it('returns a valid BenchmarkComparison structure', () => {
    const result = getBenchmarkForFund('national', 'seed', 2015, 1.5, 12)
    expect(result.benchmarkTvpi).toBeDefined()
    expect(result.benchmarkIrr).toBeDefined()
    expect(result.benchmarkTvpi.topQ).toBeGreaterThan(result.benchmarkTvpi.median)
    expect(result.benchmarkTvpi.median).toBeGreaterThan(result.benchmarkTvpi.bottomQ)
    expect(result.vintageYear).toBeGreaterThan(0)
    expect(typeof result.playerTvpiPercentile).toBe('string')
    expect(typeof result.playerIrrPercentile).toBe('string')
  })

  it('classifies player above top quartile as top_quartile', () => {
    // Seed top-quartile TVPI is ~3.8+ for most vintages — use a very high value
    const result = getBenchmarkForFund('national', 'seed', 2015, 10.0, 50)
    expect(result.playerTvpiPercentile).toBe('top_quartile')
  })

  it('classifies player below bottom quartile as bottom_quartile', () => {
    const result = getBenchmarkForFund('national', 'seed', 2015, 0.1, -10)
    expect(result.playerTvpiPercentile).toBe('bottom_quartile')
  })

  it('classifies player between median and top as second_quartile', () => {
    // Get the actual benchmark to compute an in-range value
    const ref = getBenchmarkForFund('national', 'seed', 2015, 1.5, 12)
    const midUpperTvpi = (ref.benchmarkTvpi.median + ref.benchmarkTvpi.topQ) / 2
    const result = getBenchmarkForFund('national', 'seed', 2015, midUpperTvpi, 12)
    expect(result.playerTvpiPercentile).toBe('second_quartile')
  })

  it('classifies player between bottom and median as third_quartile', () => {
    const ref = getBenchmarkForFund('national', 'seed', 2015, 1.5, 12)
    const midLowerTvpi = (ref.benchmarkTvpi.bottomQ + ref.benchmarkTvpi.median) / 2
    const result = getBenchmarkForFund('national', 'seed', 2015, midLowerTvpi, 12)
    expect(result.playerTvpiPercentile).toBe('third_quartile')
  })

  it('maps different fund types to appropriate benchmark categories', () => {
    // growth stage → growth benchmark (higher multiples than seed)
    const seedResult = getBenchmarkForFund('national', 'seed', 2015, 2.0, 15)
    const growthResult = getBenchmarkForFund('national', 'growth', 2015, 2.0, 15)
    // Both should return valid results
    expect(['top_quartile', 'second_quartile', 'third_quartile', 'bottom_quartile']).toContain(seedResult.playerTvpiPercentile)
    expect(['top_quartile', 'second_quartile', 'third_quartile', 'bottom_quartile']).toContain(growthResult.playerTvpiPercentile)
  })

  it('handles family_office fund type', () => {
    const result = getBenchmarkForFund('family_office', 'seed', 2010, 1.5, 8)
    expect(result.benchmarkTvpi.topQ).toBeGreaterThan(0)
  })

  it('uses proxy for very recent vintage year and sets proxyNote', () => {
    const result = getBenchmarkForFund('national', 'seed', 2024, 1.5, 12)
    expect(result.proxyNote).toBeTruthy()
    expect(result.proxyNote).toContain('proxy')
  })

  it('uses proxy for vintage year beyond data range', () => {
    const result = getBenchmarkForFund('national', 'seed', 2030, 1.5, 12)
    expect(result.proxyNote).toBeTruthy()
  })

  it('benchmark TVPI values are positive and ordered correctly', () => {
    const result = getBenchmarkForFund('multistage', 'series_a', 2012, 2.0, 18)
    expect(result.benchmarkTvpi.topQ).toBeGreaterThan(0)
    expect(result.benchmarkTvpi.median).toBeGreaterThan(0)
    expect(result.benchmarkTvpi.bottomQ).toBeGreaterThan(0)
    expect(result.benchmarkTvpi.topQ).toBeGreaterThan(result.benchmarkTvpi.median)
    expect(result.benchmarkTvpi.median).toBeGreaterThan(result.benchmarkTvpi.bottomQ)
  })

  it('benchmark IRR values are ordered correctly', () => {
    const result = getBenchmarkForFund('national', 'seed', 2015, 1.5, 12)
    expect(result.benchmarkIrr.topQ).toBeGreaterThan(result.benchmarkIrr.median)
    expect(result.benchmarkIrr.median).toBeGreaterThan(result.benchmarkIrr.bottomQ)
  })
})
