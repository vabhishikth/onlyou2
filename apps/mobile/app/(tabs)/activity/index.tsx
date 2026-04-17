import { router } from "expo-router";
import { ScrollView, Text } from "react-native";

import { StepperList } from "@/components/activity/StepperList";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function ActivityIndex() {
  const user = usePatientState();
  const active = user.orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  );
  const completed = user.orders.filter(
    (o) => o.status === "delivered" || o.status === "cancelled",
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 30,
          color: colors.textPrimary,
          marginBottom: 16,
          letterSpacing: -0.6,
        }}
      >
        Activity
      </Text>

      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: colors.textTertiary,
          fontWeight: "800",
          marginBottom: 10,
        }}
      >
        Active
      </Text>
      <StepperList
        orders={active}
        onSelect={(id) => router.push(`/(tabs)/activity/${id}`)}
        emptyLabel="No active orders."
      />

      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: colors.textTertiary,
          fontWeight: "800",
          marginTop: 24,
          marginBottom: 10,
        }}
      >
        Completed
      </Text>
      <StepperList
        orders={completed}
        onSelect={(id) => router.push(`/(tabs)/activity/${id}`)}
        emptyLabel="No completed orders yet."
      />
    </ScrollView>
  );
}
