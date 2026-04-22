/**
 * Sparkline — compact trend line visualisation for biomarker history.
 *
 * Ported from the Claude Design Bundle web prototype (viz.jsx:94-118).
 * Web version used an <svg> element with inline CSS. React Native SVG
 * requires capitalised component names imported from react-native-svg.
 *
 * Edge-case handling:
 *  - Empty array:      returns null (nothing to render).
 *  - Single point:     step=0, dot rendered at x=2, no path line drawn.
 *  - Flat series:      rng falls back to 1 to avoid division-by-zero NaN.
 *
 * Web `style={{ overflow: 'visible' }}` is dropped — RN SVG does not
 * support inline styles on <Svg>. The last-point dot is fully within
 * the canvas (dot radius is 2 px, canvas has 2 px padding on each edge).
 *
 * Colour default changed from web's dark-mode amber (#E8A04C) to
 * biomarkerPalette.amber (#B4641F) to match the design register.
 */

import { biomarkerPalette } from "@onlyou/core/tokens/biomarker";
import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SparklineProps {
  /** Ordered array of numeric data points (oldest first). */
  data: number[];
  /**
   * Stroke / dot fill colour.
   * Defaults to biomarkerPalette.amber (#B4641F) for light-mode consistency.
   */
  color?: string;
  /** SVG canvas width in pixels. Default 60. */
  w?: number;
  /** SVG canvas height in pixels. Default 20. */
  h?: number;
  /** Render a filled dot at the last (most recent) data point. Default true. */
  showDot?: boolean;
  /** Render the sparkline with a dashed stroke. Default false. */
  dashed?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Sparkline({
  data,
  color = biomarkerPalette.amber,
  w = 60,
  h = 20,
  showDot = true,
  dashed = false,
}: SparklineProps) {
  // Nothing to render for an empty series.
  if (!data || data.length === 0) return null;

  // Normalise data range. Use 1 as fallback to avoid division-by-zero for
  // flat series (all values identical → max - min === 0).
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;

  // Map each data point to an [x, y] pixel coordinate.
  // x: spread evenly across [2, w-2] (2 px padding on each side).
  // y: inverted so higher values appear at the top.
  // Single-point case: step === 0, so all x values collapse to 2 px.
  const step = data.length > 1 ? (w - 4) / (data.length - 1) : 0;
  const pts = data.map((d, i) => {
    const x = i * step + 2;
    const y = h - 2 - ((d - min) / rng) * (h - 4);
    return [x, y] as [number, number];
  });

  // Build SVG path string. Single-point series produces no visible line —
  // just the dot (rendered separately below).
  const path =
    pts.length > 1
      ? pts
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`,
          )
          .join(" ")
      : "";

  const last = pts[pts.length - 1];

  return (
    <Svg width={w} height={h}>
      {path.length > 0 && (
        <Path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashed ? "2 2" : undefined}
          opacity={0.9}
        />
      )}
      {showDot && <Circle cx={last[0]} cy={last[1]} r={2} fill={color} />}
    </Svg>
  );
}
