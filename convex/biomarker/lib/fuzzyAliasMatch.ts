import { jaroWinkler } from "./jaroWinkler";

export interface RangeForMatch {
  canonicalId: string;
  canonicalUnit: string;
  aliases: string[];
}

export interface FuzzyMatchArgs {
  normalizedName: string;
  rawUnit: string | null | undefined;
  canonicalIdGuess: string | null;
  ranges: RangeForMatch[];
  threshold?: number;
  unitConversions?: Array<{ from: string; to: string; canonicalId: string }>;
}

const DEFAULT_THRESHOLD = 0.92;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function unitMatches(
  rawUnit: string | null | undefined,
  canonicalUnit: string,
  canonicalId: string,
  conversions: Array<{ from: string; to: string; canonicalId: string }> = [],
): boolean {
  if (!rawUnit) return false;
  const r = rawUnit.toLowerCase().replace(/\s+/g, "");
  const c = canonicalUnit.toLowerCase().replace(/\s+/g, "");
  if (r === c) return true;
  return conversions.some(
    (conv) =>
      conv.canonicalId === canonicalId &&
      r.includes(conv.from.toLowerCase()) &&
      conv.to.toLowerCase() === c,
  );
}

export function fuzzyAliasMatch(args: FuzzyMatchArgs): string | null {
  const threshold = args.threshold ?? DEFAULT_THRESHOLD;
  const target = normalize(args.normalizedName);

  type Best = { canonicalId: string; score: number; canonicalUnit: string };
  const scored: Best[] = args.ranges.map((r) => {
    const best = Math.max(
      ...r.aliases.map((a) => jaroWinkler(target, normalize(a))),
      jaroWinkler(target, r.canonicalId),
    );
    return {
      canonicalId: r.canonicalId,
      score: best,
      canonicalUnit: r.canonicalUnit,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score < threshold) return null;

  const second = scored[1];
  if (second && second.score >= threshold && top.score - second.score < 0.02) {
    return null;
  }

  if (
    !unitMatches(
      args.rawUnit,
      top.canonicalUnit,
      top.canonicalId,
      args.unitConversions,
    )
  ) {
    return null;
  }

  if (
    args.canonicalIdGuess !== null &&
    args.canonicalIdGuess !== top.canonicalId
  ) {
    return null;
  }

  return top.canonicalId;
}
