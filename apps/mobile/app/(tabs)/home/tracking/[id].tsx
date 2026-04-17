import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { DeliveryStepper } from "@/components/delivery/DeliveryStepper";
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

      <DeliveryStepper progress={delivery.progress} />
    </ScrollView>
  );
}
