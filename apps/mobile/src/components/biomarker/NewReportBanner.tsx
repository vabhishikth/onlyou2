/**
 * NewReportBanner — ambient notification banner for a newly available lab report.
 *
 * Ported from the Claude Design Bundle web prototype (dashboard.jsx:42-68).
 *
 * Gradient note: The web source used rgba(232,160,76,...) which derives from
 * a slightly different amber value. Here we use rgba values derived from
 * biomarkerPalette.amber (#B4641F → rgb(180,100,31)) with the same alpha
 * fractions as the original:
 *   gradientStart: 'rgba(180,100,31,0.12)'  ← biomarkerPalette.amber @ 12% opacity
 *   gradientEnd:   'rgba(180,100,31,0.06)'  ← biomarkerPalette.amber @  6% opacity
 *
 * Dot glow approximation: CSS box-shadow is unsupported in RN. A larger
 * semi-transparent View sits behind the solid dot (same pattern used by
 * RangeBar and Dial viz primitives).
 *
 * Animation: pulse animation deferred to Wave 5 (react-native-reanimated).
 * Arrow: rendered as a Unicode › character at amber color for simplicity;
 * matches visual weight of the web prototype's Icon.arrow('right').
 */

import {
  biomarkerFonts,
  biomarkerPalette,
} from "@onlyou/core/tokens/biomarker";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// ---------------------------------------------------------------------------
// Gradient colors — derived from biomarkerPalette.amber (#B4641F = rgb(180,100,31))
// ---------------------------------------------------------------------------

const GRADIENT_START = "rgba(180,100,31,0.12)"; // biomarkerPalette.amber @ 12% opacity
const GRADIENT_END = "rgba(180,100,31,0.06)"; // biomarkerPalette.amber @  6% opacity
const BORDER_COLOR = "rgba(180,100,31,0.25)"; // biomarkerPalette.amber @ 25% opacity
const DOT_RING_COLOR = "rgba(180,100,31,0.15)"; // dot icon bg
const DOT_RING_BORDER = "rgba(180,100,31,0.35)"; // dot icon border
const DOT_GLOW_COLOR = "rgba(180,100,31,0.40)"; // glow approximation behind dot

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NewReportBannerProps {
  /** Primary line — typically lab name + panel ID. */
  title: string;
  /** Secondary line — typically "New Report · Just Now". */
  subtitle: string;
  /** Called when the banner is tapped. */
  onPress: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewReportBanner({
  title,
  subtitle,
  onPress,
}: NewReportBannerProps) {
  return (
    <Pressable testID="new-report-banner" onPress={onPress}>
      <LinearGradient
        colors={[GRADIENT_START, GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Pulse dot icon */}
        <View style={styles.iconRing}>
          {/* Glow approximation: larger semi-transparent circle underneath */}
          <View style={styles.dotGlow} />
          {/* Solid dot */}
          <View style={styles.dot} />
        </View>

        {/* Text block */}
        <View style={styles.textBlock}>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Right arrow */}
        <Text style={styles.arrow}>›</Text>
      </LinearGradient>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  iconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DOT_RING_COLOR,
    borderWidth: 1,
    borderColor: DOT_RING_BORDER,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    // Position relative so glow layers stack
    position: "relative",
  },
  dotGlow: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: DOT_GLOW_COLOR,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: biomarkerPalette.amber,
  },
  textBlock: {
    flex: 1,
  },
  subtitle: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 9,
    color: biomarkerPalette.amber,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: biomarkerFonts.display,
    fontSize: 17,
    marginTop: 2,
    lineHeight: 20, // mirrors web line-height: 1.2
    color: biomarkerPalette.ink,
  },
  arrow: {
    fontFamily: biomarkerFonts.sansSemibold,
    fontSize: 22,
    color: biomarkerPalette.amber,
    lineHeight: 24,
  },
});
