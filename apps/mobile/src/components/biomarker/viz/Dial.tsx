/**
 * Dial — WHOOP-style radial ring visualisation for a single biomarker value.
 *
 * Ported from the Claude Design Bundle web prototype (viz.jsx:45-91).
 * Web version used an <svg> element with CSS filters and transitions.
 *
 * Key translation notes:
 *  - Elements use capitalised imports from react-native-svg (Svg, Circle,
 *    Line, G) instead of lowercase HTML SVG tags.
 *  - CSS `filter: drop-shadow(...)` is NOT supported in RN SVG. Glow is
 *    approximated by rendering a duplicate shape beneath with a larger
 *    stroke/radius and reduced opacity (same pattern as RangeBar).
 *  - CSS `transition:` is dropped — RN animations require Reanimated and
 *    are deferred to a later phase.
 *  - `style={{ overflow: 'visible' }}` is dropped — not supported in RN SVG.
 *  - SVG `rotate(angle cx cy)` transform string IS supported on <Circle> in
 *    react-native-svg, so we pass it as a template literal directly.
 *  - Tick colour was `rgba(232,160,76,0.15)` in the web source (dark-mode
 *    amber). We translate to `biomarkerPalette.amber` + `strokeOpacity={0.15}`
 *    for light-mode consistency.
 *  - Track uses `biomarkerPalette.line` which is already an RGBA string.
 *  - Optimal arc uses `biomarkerPalette.sage` + `strokeOpacity={0.25}`.
 *  - The `unit` prop is kept for consumer use but Dial renders only geometry —
 *    value/unit text overlay is the consumer's responsibility.
 */

import { biomarkerPalette } from "@onlyou/core/tokens/biomarker";
import React from "react";
import Svg, { Circle, G, Line } from "react-native-svg";

import { rangePct, statusColor } from "../status-helpers";
import type { BiomarkerStatus } from "../status-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DialProps {
  /** The measured value to display. */
  v: number;
  /** Lower bound of the reference range. */
  low: number;
  /** Upper bound of the reference range. */
  high: number;
  /** Lower bound of the optimal sub-range. */
  optLow: number;
  /** Upper bound of the optimal sub-range. */
  optHigh: number;
  /** Status controls the progress arc and needle colour. Default "optimal". */
  status?: BiomarkerStatus;
  /** Diameter of the SVG canvas in pixels. Default 180. */
  size?: number;
  /** Stroke width of the progress arc in pixels. Default 10. */
  stroke?: number;
  /**
   * Unit string (e.g. "mg/dL"). Kept for consumer use — Dial renders no text.
   * The Detail screen overlays value + unit on top of the ring geometry.
   */
  unit?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Dial({
  v,
  low,
  high,
  optLow,
  optHigh,
  status = "optimal",
  size = 180,
  stroke = 10,
  unit: _unit = "",
}: DialProps) {
  // Convert value to a 0-1 fraction using rangePct (clamped 2-98 → /100).
  const pct = rangePct(v, low, high) / 100;

  // Ring geometry.
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r; // full circumference
  const cx = size / 2;
  const cy = size / 2;

  // Status-driven colour for progress arc and needle dot.
  const color = statusColor(status);

  // ---------------------------------------------------------------------------
  // Tick marks — 60 evenly-spaced radial lines just inside the stroke ring.
  // ---------------------------------------------------------------------------
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    // r1: outer tick radius (inner edge of stroke band)
    const r1 = r - stroke / 2 - 4;
    // r2: inner tick radius
    const r2 = r - stroke / 2 - 9;
    ticks.push(
      <Line
        key={i}
        x1={cx + r1 * Math.cos(angle)}
        y1={cy + r1 * Math.sin(angle)}
        x2={cx + r2 * Math.cos(angle)}
        y2={cy + r2 * Math.sin(angle)}
        stroke={biomarkerPalette.amber}
        strokeOpacity={0.15}
        strokeWidth={1}
      />,
    );
  }

  // ---------------------------------------------------------------------------
  // Optimal arc geometry — the highlighted segment spanning [optLow, optHigh].
  // ---------------------------------------------------------------------------
  const optLen = (c * (optHigh - optLow)) / (high - low);
  const optOffset = -c * ((optLow - low) / (high - low));
  const optTransform = `rotate(-90 ${cx} ${cy})`;

  // ---------------------------------------------------------------------------
  // Progress arc geometry — from 0 to pct of full circumference.
  // ---------------------------------------------------------------------------
  const progressLen = c * pct;
  const progressTransform = `rotate(-90 ${cx} ${cy})`;

  // ---------------------------------------------------------------------------
  // Needle dot — small circle at the tip of the progress arc.
  // ---------------------------------------------------------------------------
  const needleAngle = pct * 2 * Math.PI - Math.PI / 2;
  const needleX = cx + r * Math.cos(needleAngle);
  const needleY = cy + r * Math.sin(needleAngle);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Tick marks */}
      <G>{ticks}</G>

      {/* Optimal arc — sage tint, positioned via dasharray + dashoffset */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={biomarkerPalette.sage}
        strokeOpacity={0.25}
        strokeWidth={stroke}
        strokeDasharray={`${optLen} ${c}`}
        strokeDashoffset={optOffset}
        transform={optTransform}
      />

      {/* Track — full ring at reduced stroke weight */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={biomarkerPalette.line}
        strokeWidth={stroke * 0.4}
      />

      {/* Progress arc glow — thicker, lower-opacity duplicate beneath main arc */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeOpacity={0.35}
        strokeWidth={stroke + 4}
        strokeDasharray={`${progressLen} ${c}`}
        transform={progressTransform}
      />

      {/* Progress arc — main coloured ring */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${progressLen} ${c}`}
        transform={progressTransform}
      />

      {/* Needle dot glow — larger translucent circle */}
      <Circle
        cx={needleX}
        cy={needleY}
        r={10}
        fill={color}
        fillOpacity={0.35}
      />

      {/* Needle dot — main */}
      <Circle cx={needleX} cy={needleY} r={6} fill={color} />
    </Svg>
  );
}
