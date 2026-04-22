import {
  biomarkerFonts,
  biomarkerPalette,
} from "@onlyou/core/tokens/biomarker";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

// Wave 3 (Task 3.2) replaces this stub with the full Detail screen
// (sticky top bar, Dial hero, trend chart, reference card, explainer).
// Stub exists now so Expo Router's typed-routes generator picks up the
// pathname `/lab-results/[id]` that the Dashboard's card taps already use.
export default function BiomarkerDetailStub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: biomarkerPalette.bg,
        padding: 24,
      }}
    >
      <Text
        style={{
          fontFamily: biomarkerFonts.display,
          fontSize: 24,
          color: biomarkerPalette.ink,
        }}
      >
        Biomarker · {id}
      </Text>
      <Text
        style={{
          fontFamily: biomarkerFonts.mono,
          fontSize: 11,
          color: biomarkerPalette.muted,
          marginTop: 8,
        }}
      >
        Detail screen — Wave 3
      </Text>
    </View>
  );
}
