import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlaceholderScreen } from "@/components/placeholder-screen";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

/**
 * Plan 2A — foundation preview. Plan 2B replaces this with the real splash
 * → (auth)/welcome gate.
 */
export default function Index() {
  const user = usePatientState();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <PlaceholderScreen
        title={`Hello, ${user.name.split(" ")[0]}`}
        phase="Phase 2B"
        reason="The real splash + auth flow ships in Plan 2B. Meanwhile the scenario switcher is live — wire up a triple-tap handler in Plan 2B's tab layout."
      />
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 24,
          left: 24,
          right: 24,
        }}
      >
        <Pressable
          onPress={() => {
            // Plan 2B wires the real triple-tap from the (tabs) header.
          }}
          style={{
            padding: 12,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: colors.textTertiary,
              letterSpacing: 0.3,
            }}
          >
            Active fixture: {user.name} · {user.state}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
