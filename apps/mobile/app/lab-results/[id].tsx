/**
 * BiomarkerDetail — full Detail screen for a single biomarker.
 *
 * Ported from the Claude Design Bundle web prototype (detail.jsx:4-145).
 *
 * Layout (top-to-bottom inside ScrollView):
 *   1. Top bar  — back chevron · mono category label · ellipsis icon
 *   2. DetailHero — dial, value, delta
 *   3. 1px solid divider (visual departure from dashed source — RN has no
 *      CSS background-image; a solid line is used instead)
 *   4. Trend section — range toggle + AreaChart in a rounded card
 *   5. Reference card — Optimal RefRow · divider · Clinical Range RefRow ·
 *      divider · Your Value row (value label + RangeBar)
 *   6. Explainer card — italic serif quote + mono footnote
 *
 * Port notes:
 *   - SafeAreaView handles status-bar inset; paddingTop:54 hack dropped.
 *   - Top bar is inside the ScrollView (sticky header via stickyHeaderIndices
 *     is skipped for simplicity; deferred to Phase 8 polish).
 *   - Range toggle is cosmetic only — does NOT filter trend data (spec).
 *   - AreaChart width = Dimensions.get('window').width - 48 (24px pad × 2).
 *   - Dashed divider from source → solid 1px line (comment below).
 *   - Not-found: renders a graceful fallback with testID="detail-not-found"
 *     (returning null would break Expo Router's navigation stack).
 */

import {
  biomarkerFonts,
  biomarkerPalette,
} from "@onlyou/core/tokens/biomarker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { DetailHero } from "../../src/components/biomarker/DetailHero";
import { RefRow } from "../../src/components/biomarker/RefRow";
import { statusColor } from "../../src/components/biomarker/status-helpers";
import { AreaChart } from "../../src/components/biomarker/viz/AreaChart";
import { RangeBar } from "../../src/components/biomarker/viz/RangeBar";
import { explainerFor } from "../../src/data/biomarker-explainers";
import { CATEGORIES } from "../../src/data/biomarker-mock";
import { useBiomarkerReports } from "../../src/hooks/use-biomarker-reports";

// ---------------------------------------------------------------------------
// Screen width — used for AreaChart and card sizing.
// Device-specific tweaks deferred to Phase 8.
// ---------------------------------------------------------------------------
const SCREEN_W = Dimensions.get("window").width;
// 24px screen padding each side → section width (SCREEN_W - 48).
// Card inside section has padding:16 each side + 1px border each side →
// subtract 34 more so the AreaChart fits inside the card without the last
// point's halo overflowing the card border.
const CHART_W = SCREEN_W - 48 - 34;

// ---------------------------------------------------------------------------
// Range toggle options (cosmetic only — no data filtering in Phase 2.5D)
// ---------------------------------------------------------------------------
const RANGE_OPTIONS = ["1M", "3M", "6M", "1Y"] as const;
type RangeOption = (typeof RANGE_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Small icon components (SVG, no hardcoded hex — colors from palette)
// ---------------------------------------------------------------------------

/** Back chevron: M6 1L1 7l5 6 */
function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 12 14">
      <Path
        d="M8 1L2 7l6 6"
        stroke={biomarkerPalette.ink}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Ellipsis (3 vertical dots) */
function EllipsisIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 4 16">
      <Path
        d="M2 3.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
        fill={biomarkerPalette.muted}
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Not-found fallback
// ---------------------------------------------------------------------------

function NotFoundScreen({ id }: { id: string }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View testID="detail-not-found" style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>Biomarker not found</Text>
        <Text style={styles.notFoundSub}>{id}</Text>
        <Pressable onPress={() => router.back()} style={styles.notFoundBack}>
          <Text style={styles.notFoundBackText}>Go back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function BiomarkerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeRange, setActiveRange] = useState<RangeOption>("6M");

  const { rows } = useBiomarkerReports();
  const b = rows.find((x) => x.id === id);

  if (!b) {
    return <NotFoundScreen id={id ?? ""} />;
  }

  const color = statusColor(b.status);
  const cat = CATEGORIES.find((c) => c.id === b.cat);
  const explainerText = explainerFor(b.id, b.name);

  // AreaChart Y-axis bounds — slightly wider than the data range for breathing room.
  const trendMin = Math.min(b.low, ...b.trend);
  const trendMax = Math.max(b.high, ...b.trend);
  const chartLow = trendMin * 0.95;
  const chartHigh = trendMax * 1.05;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------------------------------------------------------- */}
        {/* 1. Top bar                                                        */}
        {/* Note: not sticky (stickyHeaderIndices skipped for simplicity;    */}
        {/* deferred to Phase 8 polish per port notes).                      */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.topBarButton}
            hitSlop={12}
          >
            <BackIcon />
          </Pressable>

          <Text style={styles.topBarCategory}>{cat?.label ?? b.cat}</Text>

          <Pressable style={styles.topBarButton} hitSlop={12}>
            <EllipsisIcon />
          </Pressable>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* 2. Hero — dial + value + delta                                    */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.heroWrapper}>
          <DetailHero b={b} />
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* 3. Divider                                                        */}
        {/* Source used a CSS dashed background-image which has no direct RN */}
        {/* equivalent. A solid 1px line is used instead (visual departure). */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.divider} />

        {/* ---------------------------------------------------------------- */}
        {/* 4. Trend section                                                  */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          {/* Header row: "Trend" label + range toggle */}
          <View style={styles.trendHeader}>
            <Text style={styles.sectionTitle}>Trend</Text>
            <View style={styles.rangeToggle}>
              {RANGE_OPTIONS.map((opt) => {
                const isActive = opt === activeRange;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setActiveRange(opt)}
                    style={[
                      styles.rangePill,
                      isActive && styles.rangePillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.rangePillText,
                        isActive && styles.rangePillTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Chart card */}
          <View style={styles.card}>
            <AreaChart
              data={b.trend}
              color={color}
              low={chartLow}
              high={chartHigh}
              optLow={b.optLow}
              optHigh={b.optHigh}
              w={CHART_W}
              h={160}
            />
          </View>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* 5. Reference ranges card                                          */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reference</Text>
          <View style={styles.card}>
            {/* Optimal row */}
            <RefRow
              label="Optimal"
              from={b.optLow}
              to={b.optHigh}
              unit={b.unit}
              dot={biomarkerPalette.sage}
            />

            <View style={styles.cardDivider} />

            {/* Clinical range row */}
            <RefRow
              label="Clinical Range"
              from={b.low}
              to={b.high}
              unit={b.unit}
              dot={biomarkerPalette.muted}
            />

            <View style={styles.cardDivider} />

            {/* Your Value row */}
            <View style={styles.yourValueRow}>
              {/* Left: label + value */}
              <View style={styles.yourValueLeft}>
                <Text style={styles.yourValueLabel}>YOUR VALUE</Text>
                <Text style={[styles.yourValueNumber, { color }]}>
                  {b.value} <Text style={styles.yourValueUnit}>{b.unit}</Text>
                </Text>
              </View>

              {/* Right: RangeBar ~110px */}
              <View style={styles.yourValueBar}>
                <RangeBar
                  v={b.value}
                  low={b.low}
                  high={b.high}
                  optLow={b.optLow}
                  optHigh={b.optHigh}
                  status={b.status}
                  direction={b.rangeDirection}
                  width={110}
                />
              </View>
            </View>
          </View>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* 6. Explainer card                                                 */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What it means</Text>
          <View style={styles.card}>
            <Text testID="explainer-quote" style={styles.explainerQuote}>
              "{explainerText}"
            </Text>
            <Text style={styles.explainerFootnote}>
              — Clinical note, Dr. M. Rao
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles — no hardcoded hex; all values from biomarkerPalette / biomarkerFonts
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: biomarkerPalette.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ---- Top bar ----
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
  },
  topBarButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarCategory: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 11,
    color: biomarkerPalette.muted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  // ---- Hero wrapper ----
  heroWrapper: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  // ---- Divider (solid 1px — dashed CSS source has no RN equivalent) ----
  divider: {
    height: 1,
    backgroundColor: biomarkerPalette.line,
    marginHorizontal: 24,
    marginVertical: 4,
  },

  // ---- Section ----
  section: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  sectionTitle: {
    fontFamily: biomarkerFonts.display,
    fontSize: 18,
    color: biomarkerPalette.ink,
    marginBottom: 14,
  },

  // ---- Trend header ----
  trendHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  // ---- Range toggle ----
  rangeToggle: {
    flexDirection: "row",
    gap: 4,
  },
  rangePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  rangePillActive: {
    backgroundColor: biomarkerPalette.bg4,
    borderWidth: 1,
    borderColor: biomarkerPalette.line2,
  },
  rangePillText: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 11,
    color: biomarkerPalette.muted,
  },
  rangePillTextActive: {
    color: biomarkerPalette.ink,
  },

  // ---- Card ----
  card: {
    backgroundColor: biomarkerPalette.bg2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: biomarkerPalette.line,
    padding: 16,
    gap: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: biomarkerPalette.line,
  },

  // ---- Your Value row ----
  yourValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  yourValueLeft: {
    gap: 2,
  },
  yourValueLabel: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 9,
    color: biomarkerPalette.muted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  yourValueNumber: {
    fontFamily: biomarkerFonts.display,
    fontSize: 22,
    // color applied inline from statusColor
  },
  yourValueUnit: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 11,
    color: biomarkerPalette.muted,
  },
  yourValueBar: {
    width: 110,
  },

  // ---- Explainer card ----
  explainerQuote: {
    fontFamily: biomarkerFonts.displayItalic,
    fontSize: 17,
    lineHeight: 17 * 1.4,
    color: biomarkerPalette.ink2,
  },
  explainerFootnote: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 9,
    color: biomarkerPalette.muted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 14,
  },

  // ---- Not-found fallback ----
  notFoundContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  notFoundTitle: {
    fontFamily: biomarkerFonts.display,
    fontSize: 20,
    color: biomarkerPalette.ink,
  },
  notFoundSub: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 12,
    color: biomarkerPalette.muted,
  },
  notFoundBack: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: biomarkerPalette.line2,
  },
  notFoundBackText: {
    fontFamily: biomarkerFonts.mono,
    fontSize: 12,
    color: biomarkerPalette.ink,
  },
});
