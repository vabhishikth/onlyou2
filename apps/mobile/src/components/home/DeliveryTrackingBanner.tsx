import { Pressable, Text } from "react-native";

import type { OrderStatus } from "../../fixtures/patient-states";
import { colors } from "../../theme/colors";

interface Props {
  status: OrderStatus;
  onPress: () => void;
}

const LABELS: Record<OrderStatus, string> = {
  preparing: "Preparing your order",
  dispatched: "Dispatched",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function DeliveryTrackingBanner({ status, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: colors.textTertiary,
          fontWeight: "800",
          marginBottom: 6,
        }}
      >
        Delivery
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: 2,
        }}
      >
        {LABELS[status]}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: colors.accent,
          letterSpacing: 0.3,
        }}
      >
        Track order →
      </Text>
    </Pressable>
  );
}
