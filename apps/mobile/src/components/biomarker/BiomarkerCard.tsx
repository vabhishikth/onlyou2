/**
 * BiomarkerCard — one biomarker row on the Dashboard.
 *
 * Ported from the Claude Design Bundle web prototype (dashboard.jsx:160-217).
 *
 * Animation: cards rise-in sequentially via FadeInUp entry animation from
 * react-native-reanimated. The `delay` prop (index × 30 ms) staggers each
 * card so they cascade upward as the list mounts.
 */

import {
  biomarkerFonts,
  biomarkerPalette,
} from "@onlyou/core/tokens/biomarker";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeInUp } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import {
  BIOMARKERS_MOCK as _BIOMARKERS_MOCK,
  CATEGORIES,
  type BiomarkerMock,
} from "../../data/biomarker-mock";

import { statusColor, statusLabel } from "./status-helpers";
import { RangeBar } from "./viz/RangeBar";
import { Sparkline } from "./viz/Sparkline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BiomarkerCardProps {
  /** The biomarker data row to display. */
  b: BiomarkerMock;
  /** Called when the card is pressed. */
  onPress: () => void;
  /**
   * Entry animation stagger delay in ms (index × 30).
   * Drives the FadeInUp rise animation so cards cascade sequentially.
   */
  delay?: number;
}

// ---------------------------------------------------------------------------
// Arrow icon
// ---------------------------------------------------------------------------

/**
 * Small inline arrow icon equivalent to Icon.arrow(dir, color) from viz.jsx.
 * Direction is expressed as a rotation applied to a right-pointing chevron path.
 */
const ARROW_ROTATIONS: Record<"up" | "down" | "right" | "left", string> = {
  up: "-90deg",
  down: "90deg",
  right: "0deg",
  left: "180deg",
};

interface ArrowIconProps {
  dir: "up" | "down" | "right" | "left";
  color: string;
}

function ArrowIcon({ dir, color }: ArrowIconProps) {
  return (
    <View style={{ transform: [{ rotate: ARROW_ROTATIONS[dir] }] }}>
      <Svg width={10} height={10} viewBox="0 0 10 10">
        <Path
          d="M2 2 L7 5 L2 8"
          stroke={color}
          strokeWidth={1.3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// downIsGood list — verbatim from dashboard.jsx:169
// ---------------------------------------------------------------------------

const DOWN_IS_GOOD = new Set([
  "ldl",
  "trig",
  "apob",
  "glucose",
  "hba1c",
  "hscrp",
  "homo",
  "cortisol",
  "alt",
  "ast",
  "insulin",
]);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BiomarkerCard({ b, onPress, delay }: BiomarkerCardProps) {
  const statusCol = statusColor(b.status);
  const cat = CATEGORIES.find((c) => c.id === b.cat);

  // Delta percentage change vs previous value.
  // Guard against prev === 0 (first-ever report) — mirrors DetailHero.tsx:92.
  const delta = b.prev !== 0 ? ((b.value - b.prev) / b.prev) * 100 : 0;
  const deltaSign = delta > 0 ? "+" : "";

  // Trend direction for the arrow icon.
  const trendDir: "up" | "down" | "right" =
    b.value > b.prev ? "up" : b.value < b.prev ? "down" : "right";

  // For downIsGood biomarkers (glucose, ldl, etc.) lower values are good;
  // flip the "good" interpretation accordingly.
  const downIsGood = DOWN_IS_GOOD.has(b.id);
  const goodTrend = downIsGood ? b.value < b.prev : b.value > b.prev;
  const trendColor = goodTrend ? biomarkerPalette.sage : biomarkerPalette.honey;

  return (
    <Animated.View
      entering={FadeInUp.delay(delay ?? 0)
        .duration(500)
        .easing(Easing.out(Easing.ease))}
    >
      <Pressable testID="biomarker-card" onPress={onPress} style={styles.card}>
        {/* ── Top row: name/category + value/delta ── */}
        <View style={styles.topRow}>
          {/* Left: category dot + name */}
          <View style={styles.nameCol}>
            <View style={styles.catRow}>
              <View
                style={[
                  styles.catDot,
                  { backgroundColor: cat?.color ?? biomarkerPalette.muted },
                ]}
              />
              <Text style={styles.catLabel}>{cat?.label ?? b.cat}</Text>
            </View>
            <Text style={styles.name}>{b.name}</Text>
          </View>

          {/* Right: value + unit + delta */}
          <View style={styles.valueCol}>
            <View style={styles.valueRow}>
              <Text style={styles.value}>{b.value}</Text>
              <Text style={styles.unit}>{b.unit}</Text>
            </View>
            <View style={styles.deltaRow}>
              <ArrowIcon dir={trendDir} color={trendColor} />
              <Text
                testID="biomarker-delta"
                style={[styles.deltaText, { color: trendColor }]}
              >
                {deltaSign}
                {delta.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* ── Range bar + sparkline ── */}
        <View style={styles.vizRow}>
          <View style={styles.rangeBarWrapper}>
            <RangeBar
              v={b.value}
              low={b.low}
              high={b.high}
              optLow={b.optLow}
              optHigh={b.optHigh}
              status={b.status}
              compact
            />
          </View>
          <Sparkline data={b.trend} color={statusCol} w={50} h={16} />
        </View>

        {/* ── Range labels: low · status · high ── */}
        <View style={styles.rangeLabels}>
          <Text style={styles.rangeEdge}>{b.low}</Text>
          <Text style={[styles.statusLabel, { color: statusCol }]}>
            {statusLabel(b.status)}
          </Text>
          <Text style={styles.rangeEdge}>{b.high}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles — all colours from biomarkerPalette, no hardcoded hex
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: biomarkerPalette.bg2,
    borderWidth: 1,
    borderColor: biomarkerPalette.line,
    gap: 10,
  },

  // Top row
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  // Left column (name + category)
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  catDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    opacity: 0.7,
  },
  catLabel: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 9,
    color: biomarkerPalette.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  name: {
    fontFamily: biomarkerFonts.display,
    fontSize: 18,
    lineHeight: 18 * 1.1,
    color: biomarkerPalette.ink,
  },

  // Right column (value + delta)
  valueCol: {
    alignItems: "flex-end",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    justifyContent: "flex-end",
  },
  value: {
    fontFamily: biomarkerFonts.display,
    fontSize: 26,
    lineHeight: 26,
    color: biomarkerPalette.ink,
  },
  unit: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 9,
    color: biomarkerPalette.muted,
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "flex-end",
    marginTop: 3,
  },
  deltaText: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 9,
    // color applied inline from trendColor
  },

  // Range bar + sparkline
  vizRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rangeBarWrapper: {
    flex: 1,
  },

  // Range labels
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -6,
  },
  rangeEdge: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 9,
    color: biomarkerPalette.muted2,
  },
  statusLabel: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 9,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    // color applied inline from statusCol
  },
});
