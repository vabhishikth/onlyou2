/**
 * RangeBar — horizontal biomarker range visualisation.
 *
 * Ported from the Claude Design Bundle web prototype (viz.jsx:4-43).
 * Web version used CSS linear-gradient + position:absolute with percentage
 * widths. RN SVG requires explicit pixel coordinates, so width is either
 * passed as a prop (default 200 for unit tests) or measured via onLayout
 * when used inside a flex parent (e.g. BiomarkerCard).
 *
 * Gradient colour note: The web source used RGBA values like (200,107,90)
 * for rose which differ slightly from biomarkerPalette.rose (#A24636).
 * We use the palette values for consistency with the design register.
 *
 * Glow approximation: CSS boxShadow is not supported in RN SVG.
 * For the marker dot we render a larger translucent Circle underneath the
 * main dot to approximate the glow. The vertical line glow is omitted —
 * the dot provides sufficient visual weight at small sizes.
 */

import { biomarkerPalette } from "@onlyou/core/tokens/biomarker";
import React, { useId, useState } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { rangePct, statusColor } from "../status-helpers";
import type { BiomarkerStatus } from "../status-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RangeBarProps {
  /** The measured value to display. */
  v: number;
  /** The lower bound of the reference range. */
  low: number;
  /** The upper bound of the reference range. */
  high: number;
  /** Lower bound of the optimal sub-range window. */
  optLow: number;
  /** Upper bound of the optimal sub-range window. */
  optHigh: number;
  /** Status controls the marker / dot colour. */
  status?: BiomarkerStatus;
  /** Compact mode uses a thinner track (5 px vs 7 px). */
  compact?: boolean;
  /**
   * Explicit pixel width for the SVG canvas.
   * Default 200 keeps unit tests simple.
   * Pass the actual measured width from onLayout when used in BiomarkerCard.
   */
  width?: number;
  /**
   * Range direction. "bidirectional" is the default original gradient.
   * "unboundedHigh" (e.g. HDL) suppresses the honey/rose stops on the right
   * side — gradient terminates in sage. "unboundedLow" mirrors on the left.
   */
  direction?: "bidirectional" | "unboundedLow" | "unboundedHigh";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RangeBar({
  v,
  low,
  high,
  optLow,
  optHigh,
  status = "optimal",
  compact = false,
  width: widthProp,
  direction = "bidirectional",
}: RangeBarProps) {
  // Allow parent to override width via onLayout; fall back to prop or 200.
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const width = measuredWidth ?? widthProp ?? 200;

  // Track height mirrors web prototype: 7 px default, 5 px compact.
  const trackH = compact ? 5 : 7;
  // Total SVG height: track needs 9 px top margin (for the dot that extends
  // above) + trackH + 9 px bottom margin. Web had h + 18 total.
  const svgH = trackH + 18;
  // Track y-position: centred vertically with 9 px headroom for marker top.
  const trackY = 9;

  // Percentage positions (already clamped 2–98 by rangePct).
  const pct = rangePct(v, low, high);
  const optL = rangePct(optLow, low, high);
  const optH = rangePct(optHigh, low, high);

  // Convert percentages to pixel x-coordinates.
  const pctToPx = (p: number) => (p / 100) * width;
  const markerX = pctToPx(pct);
  const optStartX = pctToPx(optL);
  const optWidth = pctToPx(optH) - pctToPx(optL);

  const color = statusColor(status);

  // Unique gradient IDs (avoids collisions when multiple RangeBar instances
  // are rendered on the same screen — useId() returns a stable per-instance id).
  const trackGradId = useId().replace(/:/g, "_") + "_track";
  const optGradId = useId().replace(/:/g, "_") + "_opt";

  return (
    <View
      style={{ width: "100%" }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setMeasuredWidth(w);
      }}
    >
      <Svg width={width} height={svgH}>
        <Defs>
          {/* Track gradient: rose → honey → sage (centre) → honey → rose.
              Direction variants suppress the honey/rose stops on the
              unbounded side and terminate in sage instead.
              Built as an array so conditional nulls can be filtered out —
              react-native-svg's LinearGradient crashes on null children. */}
          <LinearGradient id={trackGradId} x1="0" y1="0" x2="1" y2="0">
            {[
              direction === "unboundedLow" ? (
                <Stop
                  key="s-low-sage"
                  offset="0%"
                  stopColor={biomarkerPalette.sage}
                  stopOpacity={0.3}
                />
              ) : null,
              direction !== "unboundedLow" ? (
                <Stop
                  key="s-low-rose"
                  offset="0%"
                  stopColor={biomarkerPalette.rose}
                  stopOpacity={0.35}
                />
              ) : null,
              direction !== "unboundedLow" ? (
                <Stop
                  key="s-low-honey"
                  offset="18%"
                  stopColor={biomarkerPalette.honey}
                  stopOpacity={0.3}
                />
              ) : null,
              <Stop
                key="s-mid-l"
                offset="30%"
                stopColor={biomarkerPalette.sage}
                stopOpacity={0.3}
              />,
              <Stop
                key="s-mid-r"
                offset="70%"
                stopColor={biomarkerPalette.sage}
                stopOpacity={0.3}
              />,
              direction !== "unboundedHigh" ? (
                <Stop
                  key="s-high-honey"
                  offset="82%"
                  stopColor={biomarkerPalette.honey}
                  stopOpacity={0.3}
                />
              ) : null,
              direction === "unboundedHigh" ? (
                <Stop
                  key="s-high-sage"
                  offset="100%"
                  stopColor={biomarkerPalette.sage}
                  stopOpacity={0.3}
                />
              ) : null,
              direction !== "unboundedHigh" ? (
                <Stop
                  key="s-high-rose"
                  offset="100%"
                  stopColor={biomarkerPalette.rose}
                  stopOpacity={0.35}
                />
              ) : null,
            ].filter((node): node is React.ReactElement => node !== null)}
          </LinearGradient>

          {/* Optimal window gradient: sage with higher opacity in the centre */}
          <LinearGradient id={optGradId} x1="0" y1="0" x2="1" y2="0">
            <Stop
              offset="0%"
              stopColor={biomarkerPalette.sage}
              stopOpacity={0.7}
            />
            <Stop
              offset="50%"
              stopColor={biomarkerPalette.sage}
              stopOpacity={0.9}
            />
            <Stop
              offset="100%"
              stopColor={biomarkerPalette.sage}
              stopOpacity={0.7}
            />
          </LinearGradient>
        </Defs>

        {/* Track */}
        <Rect
          x={0}
          y={trackY}
          width={width}
          height={trackH}
          rx={trackH / 2}
          fill={`url(#${trackGradId})`}
        />

        {/* Optimal window overlay */}
        <Rect
          x={optStartX}
          y={trackY}
          width={optWidth}
          height={trackH}
          fill={`url(#${optGradId})`}
        />

        {/* Vertical marker line */}
        {/* Web: top=2, height=h+14. We place it so it spans from y=2 to y=svgH-2. */}
        <Rect
          x={markerX - 1}
          y={2}
          width={2}
          height={trackH + 14}
          fill={color}
        />

        {/* Glow approximation: larger translucent circle behind the dot.
            CSS boxShadow is unsupported in RN SVG — a semi-transparent ring
            at r=7 gives a visual glow approximation. */}
        <Circle
          cx={markerX}
          cy={trackY - 4}
          r={7}
          fill={color}
          fillOpacity={0.35}
        />

        {/* Main marker dot */}
        <Circle cx={markerX} cy={trackY - 4} r={4} fill={color} />
      </Svg>
    </View>
  );
}
