/**
 * CategoryFilterPills — horizontal scrolling filter strip for the biomarker
 * dashboard category selector.
 *
 * Ported from the Claude Design Bundle web prototype (dashboard.jsx:80-94).
 * Active pill uses ink background with bg text; inactive uses transparent
 * background with ink2 text and a line2 border.
 */

import {
  biomarkerFonts,
  biomarkerPalette,
} from "@onlyou/core/tokens/biomarker";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategoryEntry {
  id: string;
  label: string;
}

export interface CategoryFilterPillsProps {
  /** Currently selected filter value. Use "All" for the all-categories state. */
  value: string;
  /** Called when a pill is tapped with its id (or "All"). */
  onChange: (v: string) => void;
  /** List of category entries to render as pills. */
  categories: CategoryEntry[];
}

// ---------------------------------------------------------------------------
// Pill entry (including the synthetic "All" entry)
// ---------------------------------------------------------------------------

interface PillEntry {
  id: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CategoryFilterPills({
  value,
  onChange,
  categories,
}: CategoryFilterPillsProps) {
  const pills: PillEntry[] = [
    { id: "All", label: "All" },
    ...categories.map((c) => ({ id: c.id, label: c.label })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {pills.map((pill) => {
        const isActive = pill.id === value;
        return (
          <Pressable
            key={pill.id}
            testID={`pill-${pill.id}`}
            onPress={() => onChange(pill.id)}
            style={[
              styles.pill,
              isActive ? styles.pillActive : styles.pillInactive,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                isActive ? styles.pillTextActive : styles.pillTextInactive,
              ]}
            >
              {pill.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: "row",
    paddingHorizontal: 4,
    gap: 8,
    alignItems: "center",
  },
  pill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    flexShrink: 0,
  },
  pillActive: {
    backgroundColor: biomarkerPalette.ink,
    borderColor: biomarkerPalette.ink,
  },
  pillInactive: {
    backgroundColor: "transparent",
    borderColor: biomarkerPalette.line2,
  },
  pillText: {
    fontFamily: biomarkerFonts.sansMed,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  pillTextActive: {
    color: biomarkerPalette.bg,
  },
  pillTextInactive: {
    color: biomarkerPalette.ink2,
  },
});
