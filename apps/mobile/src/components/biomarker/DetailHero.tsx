/**
 * DetailHero — the full-bleed hero section at the top of the Detail screen.
 *
 * Ported from the Claude Design Bundle web prototype (detail.jsx:32-92).
 *
 * Composition (top-to-bottom):
 *  1. Italic serif biomarker name at 32px.
 *  2. Mono meta line: "FASTING · {collectedAt} · {lab}" in muted ink.
 *  3. Dial hero (size=220, stroke=9) with an absolutely positioned overlay
 *     containing status label + value (huge) + unit.
 *  4. Delta vs last test row: "VS. LAST TEST" label + pill chip with
 *     directional arrow + delta percent + "(prev → value)" annotation.
 *
 * Delta math guards against prev === 0 to avoid division by zero.
 * Arrow icon pattern is identical to BiomarkerCard (duplicated locally
 * as it is small enough and avoids coupling the card's internals).
 */

import {
  biomarkerFonts,
  biomarkerPalette,
} from "@onlyou/core/tokens/biomarker";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import type { BiomarkerMock } from "../../data/biomarker-mock";

import { statusColor, statusLabel } from "./status-helpers";
import { Dial } from "./viz/Dial";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetailHeroProps {
  /** The biomarker data row to display. */
  b: BiomarkerMock;
  /** Lab name shown in the meta line. Default: "Apex Diagnostics". */
  lab?: string;
  /** Time string shown in the meta line. Default: "08:14 AM". */
  collectedAt?: string;
}

// ---------------------------------------------------------------------------
// Arrow icon — same approach as BiomarkerCard.tsx; duplicated locally.
// ---------------------------------------------------------------------------

const ARROW_ROTATIONS: Record<"up" | "down" | "right" | "left", string> = {
  up: "-90deg",
  down: "90deg",
  right: "0deg",
  left: "180deg",
};

interface ArrowIconProps {
  dir: "up" | "down" | "right" | "left";
  color: string;
  size?: number;
}

function ArrowIcon({ dir, color, size = 10 }: ArrowIconProps) {
  return (
    <View style={{ transform: [{ rotate: ARROW_ROTATIONS[dir] }] }}>
      <Svg width={size} height={size} viewBox="0 0 10 10">
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
// Component
// ---------------------------------------------------------------------------

export function DetailHero({
  b,
  lab = "Apex Diagnostics",
  collectedAt = "08:14 AM",
}: DetailHeroProps) {
  const statusCol = statusColor(b.status);

  // Delta math — guard against prev === 0 (log defensive note per spec).
  // Defensive: if prev is 0 we cannot compute a meaningful %, so we treat delta as 0.
  const delta = b.prev !== 0 ? ((b.value - b.prev) / b.prev) * 100 : 0;
  const deltaSign = delta > 0 ? "+" : "";
  const deltaText = `${deltaSign}${delta.toFixed(1)}%`;

  // Trend direction for the arrow icon.
  const trendDir: "up" | "down" | "right" =
    b.value > b.prev ? "up" : b.value < b.prev ? "down" : "right";

  // Meta line: "FASTING · {collectedAt} · {lab}"
  const metaLine = `FASTING · ${collectedAt} · ${lab}`;

  return (
    <View style={styles.container}>
      {/* 1. Italic serif biomarker name */}
      <Text style={styles.name}>{b.name}</Text>

      {/* 2. Mono meta line */}
      <Text style={styles.meta}>{metaLine}</Text>

      {/* 3. Dial hero with overlay */}
      <View style={styles.dialContainer}>
        <Dial
          v={b.value}
          low={b.low}
          high={b.high}
          optLow={b.optLow}
          optHigh={b.optHigh}
          status={b.status}
          size={220}
          stroke={9}
        />

        {/* Overlay: status label + value + unit, centered over the Dial */}
        <View style={styles.dialOverlay}>
          {/* Status label */}
          <Text style={[styles.overlayStatus, { color: statusCol }]}>
            {statusLabel(b.status).toUpperCase()}
          </Text>

          {/* Big value */}
          <Text testID="detail-hero-value" style={styles.overlayValue}>
            {b.value}
          </Text>

          {/* Unit */}
          <Text testID="detail-hero-unit" style={styles.overlayUnit}>
            {b.unit}
          </Text>
        </View>
      </View>

      {/* 4. Delta vs last test row */}
      <View style={styles.deltaRow}>
        {/* "VS. LAST TEST" label */}
        <Text style={styles.vsLabel}>VS. LAST TEST</Text>

        {/* Delta chip */}
        <View
          style={[styles.deltaChip, { borderColor: biomarkerPalette.line2 }]}
        >
          <ArrowIcon dir={trendDir} color={statusCol} size={10} />
          <Text
            testID="detail-hero-delta"
            style={[styles.deltaText, { color: statusCol }]}
          >
            {deltaText}
          </Text>
          <Text style={styles.deltaPrev}>
            ({b.prev} → {b.value})
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles — no hardcoded hex; all values from biomarkerPalette / biomarkerFonts
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },

  // 1. Name
  name: {
    fontFamily: biomarkerFonts.displayItalic,
    fontSize: 32,
    color: biomarkerPalette.ink,
    textAlign: "center",
    lineHeight: 32 * 1.1,
  },

  // 2. Meta line
  meta: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 10,
    color: biomarkerPalette.muted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    textAlign: "center",
  },

  // 3. Dial container + overlay
  dialContainer: {
    position: "relative",
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  dialOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayStatus: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
    // color applied inline from statusCol
  },
  overlayValue: {
    fontFamily: biomarkerFonts.display,
    fontSize: 60,
    lineHeight: 60,
    color: biomarkerPalette.ink,
  },
  overlayUnit: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 11,
    color: biomarkerPalette.muted,
    marginTop: 2,
  },

  // 4. Delta row
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  vsLabel: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 9,
    color: biomarkerPalette.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  deltaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    // borderColor applied inline from biomarkerPalette.line2
  },
  deltaText: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 10,
    // color applied inline from statusCol
  },
  deltaPrev: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 9,
    color: biomarkerPalette.muted,
  },
});
