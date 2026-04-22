import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "../components/ui/BottomSheet";
import { FIXTURES, type PatientState } from "../fixtures/patient-states";
import { useDevScenarioStore } from "../stores/dev-scenario-store";
import { colors } from "../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const STATE_ORDER: PatientState[] = ["new", "reviewing", "ready", "active"];

const STATE_COPY: Record<PatientState, { label: string; desc: string }> = {
  new: { label: "New user", desc: "Nothing started. Empty home." },
  reviewing: {
    label: "Under review",
    desc: "Assessment submitted, waiting on doctor.",
  },
  ready: {
    label: "Plan ready",
    desc: "Doctor's plan ready — payment pending.",
  },
  active: {
    label: "Treatment active",
    desc: "Day-14 subscription, deliveries flowing.",
  },
};

export function ScenarioSwitcher({ visible, onClose }: Props) {
  const active = useDevScenarioStore((s) => s.activeScenario);
  const setScenario = useDevScenarioStore((s) => s.setScenario);
  const hasUnreadReport = useDevScenarioStore((s) => s.hasUnreadReport);
  const setHasUnreadReport = useDevScenarioStore((s) => s.setHasUnreadReport);

  if (!__DEV__) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Dev · Switch scenario"
    >
      <View style={{ gap: 8 }}>
        {STATE_ORDER.map((state) => {
          const fixture = FIXTURES[state];
          const copy = STATE_COPY[state];
          const isActive = state === active;
          return (
            <Pressable
              key={state}
              onPress={() => {
                setScenario(state, { source: "dev" });
                onClose();
              }}
              style={{
                borderWidth: 1.5,
                borderColor: isActive ? colors.accent : colors.border,
                backgroundColor: isActive ? colors.accentLight : colors.white,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: colors.textPrimary,
                  }}
                >
                  {fixture.name}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.textTertiary,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    fontWeight: "700",
                  }}
                >
                  {copy.label}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 4,
                }}
              >
                {copy.desc}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textTertiary,
                  marginTop: 6,
                }}
              >
                {fixture.phone} · {fixture.gender}
              </Text>
            </Pressable>
          );
        })}

        <View
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: colors.textTertiary,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              fontWeight: "700",
              marginBottom: 10,
            }}
          >
            Phase 2.5D · Biomarker
          </Text>
          <Pressable
            onPress={() => setHasUnreadReport(!hasUnreadReport)}
            style={{
              borderWidth: 1.5,
              borderColor: hasUnreadReport ? colors.accent : colors.border,
              backgroundColor: hasUnreadReport
                ? colors.accentLight
                : colors.white,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                New report banner
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: hasUnreadReport ? colors.accent : colors.textTertiary,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  fontWeight: "700",
                }}
              >
                {hasUnreadReport ? "ON" : "OFF"}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Toggle the home screen banner that routes to /lab-results.
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}
