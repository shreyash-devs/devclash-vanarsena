/**
 * Derived HUD values for the graph explorer (coupling + PageRank-style impact).
 * Keeps thresholds and copy out of the page component.
 */

/** API / Neo4j may occasionally surface counts as strings; normalize so the HUD never breaks. */
export function coerceCount(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function totalCouplingEdges(inDegree?: unknown, outDegree?: unknown): number {
  return coerceCount(inDegree) + coerceCount(outDegree);
}

export type CouplingTierCode = 'A' | 'B' | 'C' | 'D';

export interface CouplingTier {
  code: CouplingTierCode;
  /** Ordered severity in this scheme: A = heaviest coupling. */
  severity: string;
  description: string;
}

const COUPLING_TIERS: { minEdges: number; code: CouplingTierCode; severity: string; description: string }[] = [
  {
    minEdges: 12,
    code: 'A',
    severity: 'Severe',
    description: 'Very high fan-in and fan-out; this file sits in a dense part of the import graph.',
  },
  {
    minEdges: 7,
    code: 'B',
    severity: 'High',
    description: 'Strong connectivity — refactors here often disturb many neighbors.',
  },
  {
    minEdges: 4,
    code: 'C',
    severity: 'Moderate',
    description: 'Typical module coupling for a mid-sized graph.',
  },
  {
    minEdges: 0,
    code: 'D',
    severity: 'Light',
    description: 'Few direct import edges; relatively peripheral in this slice.',
  },
];

export function evaluateCouplingTier(inDegree?: unknown, outDegree?: unknown): CouplingTier {
  const total = totalCouplingEdges(inDegree, outDegree);
  for (const row of COUPLING_TIERS) {
    if (total >= row.minEdges) {
      return { code: row.code, severity: row.severity, description: row.description };
    }
  }
  return {
    code: 'D',
    severity: 'Light',
    description: COUPLING_TIERS[COUPLING_TIERS.length - 1].description,
  };
}

export type ImpactSpreadBand = 'isolated' | 'modest' | 'elevated' | 'central';

export interface ImpactSpread {
  /** 0–100 from `impact_score` (0–1 from backend PageRank). */
  percent: number;
  band: ImpactSpreadBand;
  caption: string;
}

export function evaluateImpactSpread(impactScore?: unknown): ImpactSpread {
  let v = coerceCount(impactScore);
  // Backend PageRank is 0–1; tolerate a 0–100 percent payload if it ever appears.
  if (v > 1) v = Math.min(1, v / 100);
  const normalized = Math.max(0, Math.min(1, v));
  const percent = Math.min(100, Math.max(0, Math.round(normalized * 100)));

  if (percent >= 70) {
    return {
      percent,
      band: 'central',
      caption: 'High centrality — many dependency paths are influenced by this node.',
    };
  }
  if (percent >= 40) {
    return {
      percent,
      band: 'elevated',
      caption: 'Above-average reach in the import graph; review blast radius before large edits.',
    };
  }
  if (percent >= 15) {
    return {
      percent,
      band: 'modest',
      caption: 'Moderate influence — typical for a non-entry module.',
    };
  }
  return {
    percent,
    band: 'isolated',
    caption: 'Low graph reach from here in the analyzed file set.',
  };
}

/** Tailwind utility string for the impact bar fill (by centrality band). */
export function impactSpreadBarClass(band: ImpactSpreadBand): string {
  switch (band) {
    case 'central':
      return 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_20px_rgba(251,191,36,0.4)]';
    case 'elevated':
      return 'bg-gradient-to-r from-accent to-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.5)]';
    case 'modest':
      return 'bg-gradient-to-r from-indigo-400 to-sky-500 shadow-[0_0_14px_rgba(56,189,248,0.35)]';
    default:
      return 'bg-gradient-to-r from-slate-500 to-slate-600';
  }
}
