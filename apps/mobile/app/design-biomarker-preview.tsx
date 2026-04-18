// apps/mobile/app/design-biomarker-preview.tsx
//
// TEMPORARY visual sanity check for Phase 2.5A tokens + fonts.
// DELETED at end of plan in Task 17. Do not import from other screens.
import { biomarkerFonts, biomarkerPalette } from "@onlyou/core/tokens";
import { ScrollView, Text, View } from "react-native";

export default function BiomarkerPreviewScreen() {
  return (
    <ScrollView
      style={{ backgroundColor: biomarkerPalette.pageBg, flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingTop: 80, gap: 24 }}
    >
      <Text
        style={{
          color: biomarkerPalette.ink,
          fontFamily: biomarkerFonts.display,
          fontSize: 44,
          letterSpacing: -0.5,
        }}
      >
        Biomarker Report
      </Text>

      <Text
        style={{
          color: biomarkerPalette.muted,
          fontFamily: biomarkerFonts.mono,
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        The Clinical Curator
      </Text>

      <Text
        style={{
          color: biomarkerPalette.ink2,
          fontFamily: biomarkerFonts.sans,
          fontSize: 16,
          lineHeight: 24,
        }}
      >
        Overall, your metabolic health is trending in the right direction.
        Vitamin D and ferritin remain below the optimal range — your doctor will
        discuss this with you.
      </Text>

      <View
        style={{
          backgroundColor: biomarkerPalette.bg3,
          borderColor: biomarkerPalette.line2,
          borderRadius: 12,
          borderWidth: 1,
          padding: 16,
        }}
      >
        {[
          { name: "Vitamin D", status: "sub_optimal", value: "22 ng/mL" },
          { name: "LDL Cholesterol", status: "optimal", value: "92 mg/dL" },
          { name: "HS-CRP", status: "unclassified", value: "1.2 mg/L" },
          { name: "TSH", status: "action_required", value: "8.4 µIU/mL" },
        ].map((m) => (
          <View
            key={m.name}
            style={{
              borderBottomColor: biomarkerPalette.line,
              borderBottomWidth: 1,
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 12,
            }}
          >
            <View>
              <Text
                style={{
                  color: biomarkerPalette.ink,
                  fontFamily: biomarkerFonts.sansSemibold,
                  fontSize: 16,
                }}
              >
                {m.name}
              </Text>
              <Text
                style={{
                  color:
                    m.status === "optimal"
                      ? biomarkerPalette.sage
                      : m.status === "sub_optimal"
                        ? biomarkerPalette.lavender
                        : m.status === "action_required"
                          ? biomarkerPalette.rose
                          : biomarkerPalette.grey,
                  fontFamily: biomarkerFonts.mono,
                  fontSize: 10,
                  letterSpacing: 1,
                  marginTop: 4,
                  textTransform: "uppercase",
                }}
              >
                {m.status.replace("_", " ")}
              </Text>
            </View>
            <Text
              style={{
                color: biomarkerPalette.ink,
                fontFamily: biomarkerFonts.monoMed,
                fontSize: 15,
              }}
            >
              {m.value}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
