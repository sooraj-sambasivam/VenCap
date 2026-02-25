// ============================================================
// VenCap — Vintage Year Benchmarking (Feature 4)
// Pure data. Based on Cambridge Associates quartile ranges.
// ============================================================

import type { BenchmarkDataPoint, BenchmarkComparison, FundStage } from './types';

// ============================================================
// BENCHMARK DATA — ~40 rows, vintage 2000-2021
// ============================================================

export const BENCHMARK_DATA: BenchmarkDataPoint[] = [
  // Seed funds
  { vintageYear: 2000, fundType: 'seed', topQuartileTvpi: 2.5, medianTvpi: 1.2, bottomQuartileTvpi: 0.7, topQuartileIrr: 18, medianIrr: 5, bottomQuartileIrr: -8, sampleSize: 42 },
  { vintageYear: 2002, fundType: 'seed', topQuartileTvpi: 3.1, medianTvpi: 1.5, bottomQuartileTvpi: 0.8, topQuartileIrr: 22, medianIrr: 8, bottomQuartileIrr: -5, sampleSize: 38 },
  { vintageYear: 2004, fundType: 'seed', topQuartileTvpi: 3.8, medianTvpi: 1.8, bottomQuartileTvpi: 0.9, topQuartileIrr: 26, medianIrr: 11, bottomQuartileIrr: -2, sampleSize: 55 },
  { vintageYear: 2006, fundType: 'seed', topQuartileTvpi: 4.2, medianTvpi: 2.1, bottomQuartileTvpi: 1.0, topQuartileIrr: 30, medianIrr: 14, bottomQuartileIrr: 2, sampleSize: 67 },
  { vintageYear: 2008, fundType: 'seed', topQuartileTvpi: 3.5, medianTvpi: 1.6, bottomQuartileTvpi: 0.7, topQuartileIrr: 24, medianIrr: 9, bottomQuartileIrr: -4, sampleSize: 72 },
  { vintageYear: 2010, fundType: 'seed', topQuartileTvpi: 5.2, medianTvpi: 2.4, bottomQuartileTvpi: 1.1, topQuartileIrr: 35, medianIrr: 17, bottomQuartileIrr: 4, sampleSize: 89 },
  { vintageYear: 2012, fundType: 'seed', topQuartileTvpi: 4.8, medianTvpi: 2.2, bottomQuartileTvpi: 1.0, topQuartileIrr: 33, medianIrr: 15, bottomQuartileIrr: 3, sampleSize: 102 },
  { vintageYear: 2014, fundType: 'seed', topQuartileTvpi: 3.9, medianTvpi: 1.9, bottomQuartileTvpi: 0.9, topQuartileIrr: 28, medianIrr: 12, bottomQuartileIrr: 1, sampleSize: 118 },
  { vintageYear: 2016, fundType: 'seed', topQuartileTvpi: 4.1, medianTvpi: 2.0, bottomQuartileTvpi: 1.0, topQuartileIrr: 29, medianIrr: 13, bottomQuartileIrr: 2, sampleSize: 134 },
  { vintageYear: 2018, fundType: 'seed', topQuartileTvpi: 3.3, medianTvpi: 1.7, bottomQuartileTvpi: 0.9, topQuartileIrr: 25, medianIrr: 11, bottomQuartileIrr: 0, sampleSize: 145 },
  { vintageYear: 2020, fundType: 'seed', topQuartileTvpi: 2.8, medianTvpi: 1.4, bottomQuartileTvpi: 0.8, topQuartileIrr: 21, medianIrr: 9, bottomQuartileIrr: -2, sampleSize: 121 },
  { vintageYear: 2021, fundType: 'seed', topQuartileTvpi: 2.2, medianTvpi: 1.2, bottomQuartileTvpi: 0.7, topQuartileIrr: 16, medianIrr: 7, bottomQuartileIrr: -3, sampleSize: 98 },

  // Growth funds
  { vintageYear: 2000, fundType: 'growth', topQuartileTvpi: 2.1, medianTvpi: 1.1, bottomQuartileTvpi: 0.6, topQuartileIrr: 15, medianIrr: 4, bottomQuartileIrr: -10, sampleSize: 35 },
  { vintageYear: 2002, fundType: 'growth', topQuartileTvpi: 2.6, medianTvpi: 1.3, bottomQuartileTvpi: 0.7, topQuartileIrr: 18, medianIrr: 6, bottomQuartileIrr: -7, sampleSize: 31 },
  { vintageYear: 2004, fundType: 'growth', topQuartileTvpi: 3.0, medianTvpi: 1.5, bottomQuartileTvpi: 0.8, topQuartileIrr: 22, medianIrr: 9, bottomQuartileIrr: -3, sampleSize: 44 },
  { vintageYear: 2006, fundType: 'growth', topQuartileTvpi: 3.2, medianTvpi: 1.7, bottomQuartileTvpi: 0.8, topQuartileIrr: 24, medianIrr: 11, bottomQuartileIrr: -1, sampleSize: 58 },
  { vintageYear: 2008, fundType: 'growth', topQuartileTvpi: 2.8, medianTvpi: 1.3, bottomQuartileTvpi: 0.6, topQuartileIrr: 20, medianIrr: 7, bottomQuartileIrr: -5, sampleSize: 61 },
  { vintageYear: 2010, fundType: 'growth', topQuartileTvpi: 4.1, medianTvpi: 1.9, bottomQuartileTvpi: 0.9, topQuartileIrr: 30, medianIrr: 13, bottomQuartileIrr: 2, sampleSize: 74 },
  { vintageYear: 2012, fundType: 'growth', topQuartileTvpi: 3.8, medianTvpi: 1.8, bottomQuartileTvpi: 0.9, topQuartileIrr: 27, medianIrr: 12, bottomQuartileIrr: 1, sampleSize: 85 },
  { vintageYear: 2014, fundType: 'growth', topQuartileTvpi: 3.2, medianTvpi: 1.6, bottomQuartileTvpi: 0.8, topQuartileIrr: 23, medianIrr: 10, bottomQuartileIrr: 0, sampleSize: 92 },
  { vintageYear: 2016, fundType: 'growth', topQuartileTvpi: 3.0, medianTvpi: 1.5, bottomQuartileTvpi: 0.8, topQuartileIrr: 22, medianIrr: 9, bottomQuartileIrr: -1, sampleSize: 98 },
  { vintageYear: 2018, fundType: 'growth', topQuartileTvpi: 2.5, medianTvpi: 1.3, bottomQuartileTvpi: 0.7, topQuartileIrr: 18, medianIrr: 8, bottomQuartileIrr: -2, sampleSize: 103 },
  { vintageYear: 2020, fundType: 'growth', topQuartileTvpi: 2.0, medianTvpi: 1.1, bottomQuartileTvpi: 0.6, topQuartileIrr: 15, medianIrr: 6, bottomQuartileIrr: -3, sampleSize: 89 },
  { vintageYear: 2021, fundType: 'growth', topQuartileTvpi: 1.7, medianTvpi: 1.0, bottomQuartileTvpi: 0.6, topQuartileIrr: 12, medianIrr: 4, bottomQuartileIrr: -4, sampleSize: 72 },

  // Multistage funds
  { vintageYear: 2006, fundType: 'multistage', topQuartileTvpi: 3.5, medianTvpi: 1.8, bottomQuartileTvpi: 0.9, topQuartileIrr: 26, medianIrr: 12, bottomQuartileIrr: 0, sampleSize: 48 },
  { vintageYear: 2008, fundType: 'multistage', topQuartileTvpi: 3.0, medianTvpi: 1.4, bottomQuartileTvpi: 0.7, topQuartileIrr: 22, medianIrr: 8, bottomQuartileIrr: -4, sampleSize: 52 },
  { vintageYear: 2010, fundType: 'multistage', topQuartileTvpi: 4.5, medianTvpi: 2.1, bottomQuartileTvpi: 1.0, topQuartileIrr: 32, medianIrr: 15, bottomQuartileIrr: 3, sampleSize: 64 },
  { vintageYear: 2012, fundType: 'multistage', topQuartileTvpi: 4.2, medianTvpi: 2.0, bottomQuartileTvpi: 1.0, topQuartileIrr: 30, medianIrr: 14, bottomQuartileIrr: 2, sampleSize: 71 },
  { vintageYear: 2014, fundType: 'multistage', topQuartileTvpi: 3.6, medianTvpi: 1.7, bottomQuartileTvpi: 0.9, topQuartileIrr: 26, medianIrr: 11, bottomQuartileIrr: 0, sampleSize: 79 },
  { vintageYear: 2016, fundType: 'multistage', topQuartileTvpi: 3.2, medianTvpi: 1.6, bottomQuartileTvpi: 0.8, topQuartileIrr: 23, medianIrr: 10, bottomQuartileIrr: -1, sampleSize: 84 },
  { vintageYear: 2018, fundType: 'multistage', topQuartileTvpi: 2.7, medianTvpi: 1.4, bottomQuartileTvpi: 0.8, topQuartileIrr: 19, medianIrr: 8, bottomQuartileIrr: -2, sampleSize: 88 },
  { vintageYear: 2020, fundType: 'multistage', topQuartileTvpi: 2.2, medianTvpi: 1.2, bottomQuartileTvpi: 0.7, topQuartileIrr: 16, medianIrr: 6, bottomQuartileIrr: -3, sampleSize: 76 },
  { vintageYear: 2021, fundType: 'multistage', topQuartileTvpi: 1.8, medianTvpi: 1.0, bottomQuartileTvpi: 0.6, topQuartileIrr: 12, medianIrr: 4, bottomQuartileIrr: -4, sampleSize: 61 },

  // Buyout funds
  { vintageYear: 2008, fundType: 'buyout', topQuartileTvpi: 2.8, medianTvpi: 1.5, bottomQuartileTvpi: 0.8, topQuartileIrr: 20, medianIrr: 9, bottomQuartileIrr: -3, sampleSize: 38 },
  { vintageYear: 2010, fundType: 'buyout', topQuartileTvpi: 3.4, medianTvpi: 1.8, bottomQuartileTvpi: 1.0, topQuartileIrr: 25, medianIrr: 12, bottomQuartileIrr: 1, sampleSize: 44 },
  { vintageYear: 2012, fundType: 'buyout', topQuartileTvpi: 3.1, medianTvpi: 1.7, bottomQuartileTvpi: 0.9, topQuartileIrr: 22, medianIrr: 11, bottomQuartileIrr: 0, sampleSize: 49 },
  { vintageYear: 2014, fundType: 'buyout', topQuartileTvpi: 2.8, medianTvpi: 1.5, bottomQuartileTvpi: 0.8, topQuartileIrr: 20, medianIrr: 9, bottomQuartileIrr: -1, sampleSize: 54 },
  { vintageYear: 2016, fundType: 'buyout', topQuartileTvpi: 2.6, medianTvpi: 1.4, bottomQuartileTvpi: 0.8, topQuartileIrr: 18, medianIrr: 8, bottomQuartileIrr: -1, sampleSize: 58 },
  { vintageYear: 2018, fundType: 'buyout', topQuartileTvpi: 2.3, medianTvpi: 1.3, bottomQuartileTvpi: 0.7, topQuartileIrr: 16, medianIrr: 7, bottomQuartileIrr: -2, sampleSize: 62 },
  { vintageYear: 2020, fundType: 'buyout', topQuartileTvpi: 1.9, medianTvpi: 1.1, bottomQuartileTvpi: 0.6, topQuartileIrr: 13, medianIrr: 5, bottomQuartileIrr: -3, sampleSize: 54 },
  { vintageYear: 2021, fundType: 'buyout', topQuartileTvpi: 1.6, medianTvpi: 0.9, bottomQuartileTvpi: 0.6, topQuartileIrr: 10, medianIrr: 3, bottomQuartileIrr: -4, sampleSize: 43 },
];

// ============================================================
// MAP GAME FUND TYPE/STAGE TO BENCHMARK CATEGORY
// ============================================================

function toBenchmarkType(fundType: import('./types').FundType, stage: FundStage): BenchmarkDataPoint['fundType'] {
  if (fundType === 'multistage') return 'multistage';
  if (fundType === 'family_office') return 'buyout';
  if (stage === 'growth') return 'growth';
  return 'seed';
}

function lookupBenchmark(benchType: BenchmarkDataPoint['fundType'], vintage: number): BenchmarkDataPoint | null {
  // Find closest vintage year
  const filtered = BENCHMARK_DATA.filter(d => d.fundType === benchType);
  if (filtered.length === 0) return null;

  // Clamp to available range
  const clampedVintage = Math.max(2000, Math.min(2021, vintage));

  // Find exact or closest
  let best = filtered[0];
  let bestDiff = Math.abs(filtered[0].vintageYear - clampedVintage);
  for (const row of filtered) {
    const diff = Math.abs(row.vintageYear - clampedVintage);
    if (diff < bestDiff) {
      best = row;
      bestDiff = diff;
    }
  }
  return best;
}

function calcPercentile(
  playerValue: number,
  bottom: number,
  median: number,
  top: number
): 'top_quartile' | 'second_quartile' | 'third_quartile' | 'bottom_quartile' {
  if (playerValue >= top) return 'top_quartile';
  if (playerValue >= median) return 'second_quartile';
  if (playerValue >= bottom) return 'third_quartile';
  return 'bottom_quartile';
}

export function getBenchmarkForFund(
  fundType: import('./types').FundType,
  stage: FundStage,
  vintageYear: number,
  playerTvpi: number,
  playerIrr: number
): BenchmarkComparison {
  const benchType = toBenchmarkType(fundType, stage);
  const row = lookupBenchmark(benchType, vintageYear);

  if (!row) {
    // Fallback
    return {
      benchmarkTvpi: { topQ: 3.0, median: 1.5, bottomQ: 0.8 },
      benchmarkIrr: { topQ: 20, median: 8, bottomQ: -2 },
      playerTvpiPercentile: calcPercentile(playerTvpi, 0.8, 1.5, 3.0),
      playerIrrPercentile: calcPercentile(playerIrr, -2, 8, 20),
      vintageYear,
    };
  }

  const proxyNote = vintageYear > 2021 ? 'Using 2021 vintage as proxy for recent fund.' : undefined;

  return {
    benchmarkTvpi: { topQ: row.topQuartileTvpi, median: row.medianTvpi, bottomQ: row.bottomQuartileTvpi },
    benchmarkIrr: { topQ: row.topQuartileIrr, median: row.medianIrr, bottomQ: row.bottomQuartileIrr },
    playerTvpiPercentile: calcPercentile(playerTvpi, row.bottomQuartileTvpi, row.medianTvpi, row.topQuartileTvpi),
    playerIrrPercentile: calcPercentile(playerIrr, row.bottomQuartileIrr, row.medianIrr, row.topQuartileIrr),
    vintageYear: row.vintageYear,
    proxyNote,
  };
}
