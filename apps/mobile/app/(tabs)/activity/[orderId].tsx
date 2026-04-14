import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { DeliveryStepper } from "@/components/delivery/DeliveryStepper";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function ActivityDetail() {
  const user = usePatientState();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const order = user.orders.find((o) => o.id === orderId);
  const delivery = user.deliveries.find((d) => d.orderId === orderId);

  if (!order) {
    return (
      <View
        style={{ flex: 1, padding: 24, backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.textSecondary }}>Order not found.</Text>
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
          marginBottom: 8,
          letterSpacing: -0.6,
        }}
      >
        Order {order.id}
      </Text>
      <Text
        style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 24 }}
      >
        {order.vertical.replace("-", " ")} · ₹
        {(order.totalPaise / 100).toFixed(0)}
      </Text>

      {delivery ? (
        <DeliveryStepper progress={delivery.progress} />
      ) : (
        <Text style={{ fontSize: 13, color: colors.textTertiary }}>
          Delivery tracking will appear here once the order is dispatched.
        </Text>
      )}
    </ScrollView>
  );
}
