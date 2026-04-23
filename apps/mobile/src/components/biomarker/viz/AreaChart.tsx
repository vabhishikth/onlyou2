/**
 * AreaChart — 7-point historical trend chart for a single biomarker.
 *
 * Ported from the Claude Design Bundle web prototype (viz.jsx:120-180).
 * Web version used an <svg> element with CSS filters and SVG <animate>.
 *
 * Key translation notes:
 *  - Elements use capitalised imports from react-native-svg (Svg, Path, Circle,
 *    Line, Rect, Text, Defs, LinearGradient, Stop) instead of lowercase HTML
 *    SVG tags.
 *  - CSS `filter: drop-shadow(...)` on the line is NOT supported in RN SVG.
 *    Glow is approximated by rendering a duplicate <Path> at the same `d`
 *    with a higher strokeWidth (3.5) and lower opacity (0.35), NO linecap —
 *    same pattern as RangeBar and Dial.
 *  - SVG <animate> elements for the halo pulse are NOT supported in
 *    react-native-svg. A static halo is rendered instead (r=7, fillOpacity=0.2).
 *    Animated pulse is deferred to Phase 8 polish (Reanimated).
 *    See docs/DEFERRED.md → Phase 8 → "AreaChart halo pulse animation".
 *  - Gradient ID uses useId() (React 18) with ":" stripped — prevents SSR
 *    mismatches and collisions when multiple AreaChart instances are mounted.
 *  - CSS vars (`var(--bg)`, `var(--muted-2)`) replaced with literal palette
 *    values: biomarkerPalette.bg and biomarkerPalette.muted2.
 *  - Hardcoded "#7A8B6A" sage replaced with biomarkerPalette.sage.
 *  - fontFamily="JetBrains Mono" replaced with biomarkerFonts.mono.
 *  - Single-point guard: `data.length - 1 || 1` prevents division-by-zero
 *    when the series has exactly one data point.
 */

import {
  biomarkerFonts,
  biomarkerPalette,
} from "@onlyou/core/tokens/biomarker";
import React, { useId } from "react";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text,
} from "react-native-svg";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AreaChartProps {
  /** Ordered array of numeric data points (oldest first, 7 expected). */
  data: number[];
  /**
   * Stroke / fill colour for the trend line and area gradient.
   * Defaults to biomarkerPalette.amber.
   */
  color?: string;
  /** SVG canvas width in pixels. Default 320. */
  w?: number;
  /** SVG canvas height in pixels. Default 140. */
  h?: number;
  /** Lower bound of the reference range (used for Y-axis scaling). */
  low: number;
  /** Upper bound of the reference range (used for Y-axis scaling). */
  high: number;
  /** Lower bound of the optimal sub-range (horizontal band). */
  optLow: number;
  /** Upper bound of the optimal sub-range (horizontal band). */
  optHigh: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AreaChart({
  data,
  color = biomarkerPalette.amber,
  w = 320,
  h = 140,
  low,
  high,
  optLow,
  optHigh,
}: AreaChartProps) {
  // Stable, unique gradient ID. ":" stripped for SVG ID compatibility.
  const rawId = useId().replace(/:/g, "_");
  const gid = `ac_${rawId}`;

  // Nothing to render for an empty series.
  if (!data || data.length === 0) return null;

  // ---------------------------------------------------------------------------
  // Geometry helpers
  // ---------------------------------------------------------------------------
  const pad = { l: 30, r: 8, t: 8, b: 18 };
  const iw = w - pad.l - pad.r; // inner width
  const ih = h - pad.t - pad.b; // inner height

  // Map a value to a Y pixel coordinate (inverted — higher values at top).
  // Guard against zero-range (high === low) to avoid NaN.
  const yRange = high - low || 1;
  const toY = (v: number) => pad.t + ih - ((v - low) / yRange) * ih;

  // Map a data index to an X pixel coordinate.
  // Guard against single-point series (data.length - 1 === 0).
  const toX = (i: number) => pad.l + (i / (data.length - 1 || 1)) * iw;

  // Pixel coordinates for every data point.
  const pts = data.map((d, i): [number, number] => [toX(i), toY(d)]);

  // ---------------------------------------------------------------------------
  // SVG path strings
  // ---------------------------------------------------------------------------

  // Line path: M x0,y0 L x1,y1 … L xN,yN
  const linePath = pts
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`,
    )
    .join(" ");

  // Area path: line path closed down to the bottom baseline and back.
  // For a single point, this still produces a valid (degenerate) path.
  const areaPath =
    linePath +
    ` L${pts[pts.length - 1][0].toFixed(1)},${(pad.t + ih).toFixed(1)}` +
    ` L${pts[0][0].toFixed(1)},${(pad.t + ih).toFixed(1)} Z`;

  // ---------------------------------------------------------------------------
  // Optimal band Y positions
  // ---------------------------------------------------------------------------
  const oy1 = toY(optHigh); // upper dashed line (higher value → smaller Y)
  const oy2 = toY(optLow); // lower dashed line

  // ---------------------------------------------------------------------------
  // Last point (most recent) for halo + larger dot
  // ---------------------------------------------------------------------------
  const last = pts[pts.length - 1];

  // ---------------------------------------------------------------------------
  // X-axis labels — derived from data.length so variable-length series
  // (e.g. single-point real data from the hook) don't render misaligned text.
  //
  // Rules:
  //  length === 1  → ["now"]
  //  length 2..6   → first slot = "Nmo" (N = length-1), last = "now",
  //                  middle slots blank — only first and last rendered.
  //  length >= 7   → classic 7-slot cadence (backward-compatible).
  // ---------------------------------------------------------------------------
  function xLabelFor(i: number, len: number): string {
    if (len === 1) return "now";
    if (len >= 7) {
      // Original 7-slot labels: 6mo, 5, 4, 3, 2, 1, now
      const seven = ["6mo", "5", "4", "3", "2", "1", "now"];
      return seven[i] ?? "";
    }
    // 2..6: show label only at first and last index; blank in between
    if (i === 0) return `${len - 1}mo`;
    if (i === len - 1) return "now";
    return "";
  }

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        {/* Vertical gradient: opaque at top, transparent at bottom */}
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* -------------------------------------------------------------------- */}
      {/* Optimal band                                                          */}
      {/* -------------------------------------------------------------------- */}

      {/* Shaded band background */}
      <Rect
        x={pad.l}
        y={oy1}
        width={iw}
        height={oy2 - oy1}
        fill={biomarkerPalette.sage}
        opacity={0.08}
      />

      {/* Upper dashed boundary */}
      <Line
        x1={pad.l}
        y1={oy1}
        x2={pad.l + iw}
        y2={oy1}
        stroke={biomarkerPalette.sage}
        strokeOpacity={0.35}
        strokeDasharray="2 3"
      />

      {/* Lower dashed boundary */}
      <Line
        x1={pad.l}
        y1={oy2}
        x2={pad.l + iw}
        y2={oy2}
        stroke={biomarkerPalette.sage}
        strokeOpacity={0.35}
        strokeDasharray="2 3"
      />

      {/* optHigh label */}
      <Text
        x={pad.l - 4}
        y={oy1 + 3}
        fontSize={8}
        fill={biomarkerPalette.sage}
        textAnchor="end"
        fontFamily={biomarkerFonts.mono}
      >
        {optHigh}
      </Text>

      {/* optLow label */}
      <Text
        x={pad.l - 4}
        y={oy2 + 3}
        fontSize={8}
        fill={biomarkerPalette.sage}
        textAnchor="end"
        fontFamily={biomarkerFonts.mono}
      >
        {optLow}
      </Text>

      {/* -------------------------------------------------------------------- */}
      {/* Area fill                                                              */}
      {/* -------------------------------------------------------------------- */}
      <Path d={areaPath} fill={`url(#${gid})`} />

      {/* -------------------------------------------------------------------- */}
      {/* Line — glow approximation (duplicate path, thicker + lower opacity)   */}
      {/* CSS filter:drop-shadow is unsupported in react-native-svg.            */}
      {/* -------------------------------------------------------------------- */}
      <Path
        d={linePath}
        fill="none"
        stroke={color}
        strokeOpacity={0.35}
        strokeWidth={3.5}
      />

      {/* Main trend line */}
      <Path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* -------------------------------------------------------------------- */}
      {/* Data point dots                                                        */}
      {/* -------------------------------------------------------------------- */}
      {pts.map((p, i) => {
        const isLast = i === pts.length - 1;
        return (
          <Circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={isLast ? 3.5 : 1.8}
            fill={isLast ? color : biomarkerPalette.bg}
            stroke={color}
            strokeWidth={1}
          />
        );
      })}

      {/* -------------------------------------------------------------------- */}
      {/* Last-point halo — static (SVG <animate> unsupported in RN SVG).       */}
      {/* Animated pulse deferred to Phase 8 (Reanimated).                     */}
      {/* See docs/DEFERRED.md → Phase 8 → "AreaChart halo pulse animation".   */}
      {/* -------------------------------------------------------------------- */}
      <Circle cx={last[0]} cy={last[1]} r={7} fill={color} fillOpacity={0.2} />

      {/* -------------------------------------------------------------------- */}
      {/* X-axis labels                                                          */}
      {/* -------------------------------------------------------------------- */}
      {data.map((_, i) => (
        <Text
          key={i}
          x={toX(i)}
          y={h - 4}
          fontSize={8}
          fill={biomarkerPalette.muted2}
          textAnchor="middle"
          fontFamily={biomarkerFonts.mono}
        >
          {xLabelFor(i, data.length)}
        </Text>
      ))}
    </Svg>
  );
}
