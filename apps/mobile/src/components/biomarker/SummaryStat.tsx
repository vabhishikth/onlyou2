/**
 * SummaryStat — compact stat tile for the biomarker dashboard header row.
 *
 * Ported from the Claude Design Bundle web prototype (dashboard.jsx:144-158).
 * Renders a labelled stat with a large serif value. The accent color is
 * supplied by the consumer; defaults to biomarkerPalette.ink.
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

export interface SummaryStatProps {
  /** Short uppercase label (e.g. "IN RANGE"). */
  label: string;
  /** The numeric or text value to display large. */
  value: string | number;
  /**
   * Accent color for the value text.
   * Defaults to biomarkerPalette.ink.
   */
  accent?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SummaryStat({ label, value, accent }: SummaryStatProps) {
  const resolvedAccent = accent ?? biomarkerPalette.ink;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text
        testID="summary-stat-value"
        style={[styles.value, { color: resolvedAccent }]}
      >
        {String(value)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: biomarkerPalette.bg2,
    borderWidth: 1,
    borderColor: biomarkerPalette.line,
  },
  label: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 9,
    color: biomarkerPalette.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  value: {
    fontFamily: biomarkerFonts.display,
    fontSize: 28,
    marginTop: 4,
    lineHeight: 28, // lineHeight 1× font size mirrors web `line-height: 1`
    // color is applied via inline style override from `accent` prop
  },
});
