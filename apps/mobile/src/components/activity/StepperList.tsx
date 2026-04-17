import { Pressable, Text, View } from "react-native";

import type { Order, OrderStatus } from "../../fixtures/patient-states";
import { colors } from "../../theme/colors";

const STATUS_LABELS: Record<OrderStatus, string> = {
  preparing: "Preparing",
  dispatched: "Dispatched",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface Props {
  orders: Order[];
  onSelect: (id: string) => void;
  emptyLabel?: string;
}

export function StepperList({ orders, onSelect, emptyLabel }: Props) {
  if (orders.length === 0) {
    return (
      <View style={{ paddingVertical: 40, alignItems: "center" }}>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
          {emptyLabel ?? "No orders yet."}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {orders.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => onSelect(o.id)}
          style={{
            padding: 16,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.white,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: colors.textTertiary,
              fontWeight: "800",
              marginBottom: 6,
            }}
          >
            {STATUS_LABELS[o.status]}
          </Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: colors.textPrimary,
              marginBottom: 2,
            }}
          >
            {o.vertical.replace("-", " ")} · {o.itemCount} items
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            ₹{(o.totalPaise / 100).toFixed(0)} · placed{" "}
            {new Date(o.placedAt).toLocaleDateString("en-IN")}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
