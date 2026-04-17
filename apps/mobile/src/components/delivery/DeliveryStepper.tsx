import { Text, View } from "react-native";

import type { Delivery } from "../../fixtures/patient-states";
import { colors } from "../../theme/colors";

interface Props {
  progress: Delivery["progress"];
  /**
   * When true (default) each completed step shows its localized date beneath
   * the label. Callers rendering a compact stepper may pass false.
   */
  showDates?: boolean;
}

/**
 * Vertical stepper showing delivery progress. Shared by the home tracking
 * detail screen (Task 5) and the activity detail screen (Task 20) so both
 * surfaces stay visually identical.
 */
export function DeliveryStepper({ progress, showDates = true }: Props) {
  return (
    <View>
      {progress.map((step) => (
        <View
          key={step.label}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 18,
          }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              borderWidth: 2,
              borderColor: step.done ? colors.accent : colors.border,
              backgroundColor: step.done ? colors.accent : colors.white,
              marginRight: 14,
              marginTop: 2,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: step.done ? colors.textPrimary : colors.textTertiary,
              }}
            >
              {step.label}
            </Text>
            {showDates && step.done && step.at > 0 ? (
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textTertiary,
                  marginTop: 2,
                }}
              >
                {new Date(step.at).toLocaleDateString("en-IN")}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
