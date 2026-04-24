/**
 * Lab-Results Dashboard screen.
 *
 * Composes Wave 1/2 components into the full biomarker overview:
 *   header → new-report banner → summary stats → category filter → card list → upload CTA
 *
 * Navigation to detail screens:
 *   router.push({ pathname: '/lab-results/[id]', params: { id } })
 *   Using object form avoids Expo Router TypeScript complaints about unknown
 *   string routes — see apps/mobile/app/(tabs)/explore/[condition].tsx for the
 *   same pattern.
 *
 * Upload CTA (bottom):
 *   Rendered as a disabled placeholder for Phase 2.5D.
 *   Full upload flow (photo-picker → OCR → ingest) ships in Phase 2.5E.
 *   TODO(phase-2.5e): wire onPress to /photo-upload and remove disabled styling.
 */

import {
  biomarkerFonts,
  biomarkerPalette,
} from "@onlyou/core/tokens/biomarker";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BiomarkerCard } from "@/components/biomarker/BiomarkerCard";
import { CategoryFilterPills } from "@/components/biomarker/CategoryFilterPills";
import { NewReportBanner } from "@/components/biomarker/NewReportBanner";
import { SummaryStat } from "@/components/biomarker/SummaryStat";
import { CATEGORIES } from "@/data/biomarker-mock";
import { useBiomarkerReports } from "@/hooks/use-biomarker-reports";
import { useDisplayUser } from "@/hooks/use-display-user";
import { getIstDateLine, getIstGreeting } from "@/lib/ist-greeting";

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function LabResultsDashboard() {
  const [filter, setFilter] = useState<string>("All");
  const { isLoading, isEmpty, isError, rows } = useBiomarkerReports();
  const displayUser = useDisplayUser();
  const firstName = (displayUser?.name ?? "").split(" ")[0] || "there";
  const avatarLetter =
    (displayUser?.name ?? "").trim().charAt(0).toUpperCase() || "?";
  const now = new Date();
  const greeting = getIstGreeting(now);
  const dateLine = getIstDateLine(now);

  // Derived counts from live (or mock) data.
  const toWatchCount = rows.filter((b) => b.status !== "optimal").length;
  const inRangeCount = rows.length - toWatchCount;

  const filtered =
    filter === "All" ? rows : rows.filter((b) => b.cat === filter);

  // ── Loading / Error / Empty states ──────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: biomarkerPalette.bg }}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text
            style={{
              fontFamily: biomarkerFonts.mono,
              fontSize: 11,
              color: biomarkerPalette.muted,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            Loading reports…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: biomarkerPalette.bg }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              fontFamily: biomarkerFonts.display,
              fontSize: 18,
              color: biomarkerPalette.ink,
              marginBottom: 8,
            }}
          >
            Couldn't load reports.
          </Text>
          <Text
            style={{
              fontFamily: biomarkerFonts.mono,
              fontSize: 11,
              color: biomarkerPalette.muted,
              textAlign: "center",
            }}
          >
            Check your connection and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isEmpty) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: biomarkerPalette.bg }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              fontFamily: biomarkerFonts.display,
              fontSize: 20,
              color: biomarkerPalette.ink,
              marginBottom: 8,
            }}
          >
            No reports yet.
          </Text>
          <Text
            style={{
              fontFamily: biomarkerFonts.mono,
              fontSize: 11,
              color: biomarkerPalette.muted,
              textAlign: "center",
            }}
          >
            Upload a lab report to see your biomarkers here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: biomarkerPalette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
        {/* ── Header block ── */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 6,
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          {/* Left: date + greeting */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: biomarkerFonts.mono,
                fontSize: 10,
                color: biomarkerPalette.muted,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              {dateLine}
            </Text>
            <Text
              style={{
                fontFamily: biomarkerFonts.display,
                fontSize: 30,
                color: biomarkerPalette.ink,
                marginTop: 4,
                lineHeight: 34,
              }}
            >
              {`Good ${greeting}, `}
              <Text style={{ fontFamily: biomarkerFonts.displayItalic }}>
                {firstName}
              </Text>
            </Text>
          </View>

          {/* Right: avatar circle */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: biomarkerPalette.amber,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 18,
              marginLeft: 12,
            }}
          >
            <Text
              style={{
                fontFamily: biomarkerFonts.display,
                fontSize: 18,
                color: biomarkerPalette.bg,
                lineHeight: 20,
              }}
            >
              {avatarLetter}
            </Text>
          </View>
        </View>

        {/* ── New Report Banner ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 14 }}>
          {/*
           * Always rendered in 2.5D because there is mock data available.
           * Task 2.5 will add the home-screen banner gate (only show when a
           * real unread report exists). See docs/DEFERRED.md §phase-2.5E.
           */}
          <NewReportBanner
            title="Apex Diagnostics · Panel #4207"
            subtitle="New Report · Just Now"
            onPress={() =>
              router.push({
                pathname: "/lab-results/[id]",
                params: { id: "ldl" },
              })
            }
          />
        </View>

        {/* ── Summary stats row ── */}
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: 24,
            paddingTop: 18,
          }}
        >
          <SummaryStat label="Biomarkers" value={rows.length} />
          <SummaryStat
            label="In Range"
            value={inRangeCount}
            accent={biomarkerPalette.sage}
          />
          <SummaryStat
            label="To Watch"
            value={toWatchCount}
            accent={biomarkerPalette.honey}
          />
        </View>

        {/* ── Category filter pills ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          <CategoryFilterPills
            value={filter}
            onChange={setFilter}
            categories={CATEGORIES}
          />
        </View>

        {/* ── Biomarker card list ── */}
        <View style={{ paddingHorizontal: 24, gap: 8, paddingTop: 12 }}>
          {filtered.map((b, i) => (
            <BiomarkerCard
              key={b.id}
              b={b}
              onPress={() =>
                router.push({
                  pathname: "/lab-results/[id]",
                  params: { id: b.id },
                })
              }
              delay={i * 30}
            />
          ))}
        </View>

        {/* ── Upload CTA — DISABLED PLACEHOLDER (Phase 2.5E) ── */}
        {/*
         * Full upload flow wires to /photo-upload in Phase 2.5E.
         * For now render a muted disabled card so the layout is complete.
         * TODO(phase-2.5e): replace no-op onPress with router.push('/photo-upload')
         *                   and remove muted/disabled styling.
         */}
        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          <Pressable
            onPress={() => {
              /* no-op: upload flow not yet implemented — Phase 2.5E */
            }}
            style={{
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 20,
              backgroundColor: biomarkerPalette.bg2,
              borderWidth: 1,
              borderColor: biomarkerPalette.line,
              alignItems: "center",
              opacity: 0.5,
            }}
          >
            <Text
              style={{
                fontFamily: biomarkerFonts.mono,
                fontSize: 9,
                color: biomarkerPalette.muted,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Coming soon
            </Text>
            <Text
              style={{
                fontFamily: biomarkerFonts.display,
                fontSize: 16,
                color: biomarkerPalette.muted,
              }}
            >
              Upload a lab report elsewhere
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
