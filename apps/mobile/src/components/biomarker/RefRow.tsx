/**
 * RefRow — one row in the reference-range legend on the Detail screen.
 *
 * Ported from the Claude Design Bundle web prototype (detail.jsx:147-160).
 *
 * Renders a small colored dot, a mono label, and the "{from} – {to} {unit}"
 * range string. All colors come from biomarkerPalette; the dot color is
 * injected via the `dot` prop so the caller can set status-specific colors
 * (e.g. sage for optimal, rose for high/low).
 */

import {
  biomarkerFonts,
  biomarkerPalette,
} from "@onlyou/core/tokens/biomarker";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RefRowProps {
  /** Short uppercase label, e.g. "OPTIMAL", "REFERENCE". */
  label: string;
  /** Lower bound of this range band. */
  from: number;
  /** Upper bound of this range band. */
  to: number;
  /** Unit string, e.g. "mg/dL". */
  unit: string;
  /** Background color for the status dot. Pass from statusColor() or palette. */
  dot: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RefRow({ label, from, to, unit, dot }: RefRowProps) {
  return (
    <View style={styles.row}>
      {/* Left: dot + label */}
      <View style={styles.labelGroup}>
        <View
          testID="ref-row-dot"
          style={[styles.dot, { backgroundColor: dot }]}
        />
        <Text style={styles.label}>{label}</Text>
      </View>

      {/* Right: range + unit */}
      <View style={styles.rangeGroup}>
        <Text style={styles.range}>
          {from} – {to}
        </Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles — no hardcoded hex; all values from biomarkerPalette / biomarkerFonts
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    // backgroundColor injected inline from dot prop
  },
  label: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 11,
    color: biomarkerPalette.ink2,
    letterSpacing: 0.3,
  },
  rangeGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  range: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 12,
    color: biomarkerPalette.ink,
  },
  unit: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 12,
    color: biomarkerPalette.muted,
  },
});
