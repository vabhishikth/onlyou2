import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function TrackingDetail() {
  const user = usePatientState();
  const { id } = useLocalSearchParams<{ id: string }>();

  const delivery = user.deliveries.find((d) => d.orderId === id);
  const order = user.orders.find((o) => o.id === id);

  if (!delivery || !order) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}
      >
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
          Order not found.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>

      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 4,
        }}
      >
        Delivery tracking
      </Text>
      <Text
        style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 24 }}
      >
        Order {order.id} · {order.itemCount} items · ₹
        {(order.totalPaise / 100).toFixed(0)}
      </Text>

      {delivery.progress.map((step) => (
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
            {step.done && step.at > 0 ? (
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
    </ScrollView>
  );
}
