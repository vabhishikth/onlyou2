import { biomarkerPalette } from "@onlyou/core/tokens/biomarker";

export type BiomarkerStatus = "optimal" | "watch" | "high" | "low";

export function statusColor(s: BiomarkerStatus): string {
  if (s === "optimal") return biomarkerPalette.sage;
  if (s === "watch") return biomarkerPalette.honey;
  if (s === "high" || s === "low") return biomarkerPalette.rose;
  return biomarkerPalette.muted;
}

export function statusLabel(s: BiomarkerStatus): string {
  const map: Record<BiomarkerStatus, string> = {
    optimal: "In Range",
    watch: "Watch",
    high: "Out",
    low: "Low",
  };
  return map[s];
}

export function rangePct(v: number, low: number, high: number): number {
  const p = ((v - low) / (high - low)) * 100;
  return Math.max(2, Math.min(98, p));
}
