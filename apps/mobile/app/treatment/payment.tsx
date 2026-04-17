import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import type { Vertical } from "@/fixtures/patient-states";
import { VERTICALS } from "@/fixtures/verticals";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

type PlanId = "monthly" | "quarterly" | "six-month";

const PLAN_LABELS: Record<PlanId, string> = {
  monthly: "Monthly plan",
  quarterly: "Quarterly plan",
  "six-month": "6-month plan",
};

function formatInr(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString("en-IN")}`;
}

function resolveTotalPaise(vertical: Vertical, plan: PlanId): number {
  const pricing = VERTICALS[vertical].pricing;
  switch (plan) {
    case "monthly":
      return pricing.monthlyPaise;
    case "quarterly":
      return pricing.quarterlyTotalPaise;
    case "six-month":
      return pricing.sixMonthTotalPaise;
  }
}

export default function Payment() {
  const insets = useSafeAreaInsets();
  const user = usePatientState();
  const params = useLocalSearchParams<{ plan?: string; vertical?: string }>();
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [processing, setProcessing] = useState(false);

  const fallbackVertical =
    (user.consultations[0]?.vertical as Vertical | undefined) ?? "hair-loss";
  const vertical = ((): Vertical => {
    const v = params.vertical;
    if (v && v in VERTICALS) return v as Vertical;
    return fallbackVertical;
  })();
  const plan = ((): PlanId => {
    const p = params.plan;
    if (p === "monthly" || p === "quarterly" || p === "six-month") return p;
    return "quarterly";
  })();

  const totalPaise = resolveTotalPaise(vertical, plan);
  const totalLabel = formatInr(totalPaise);
  const planLabel = PLAN_LABELS[plan];

  async function onPay() {
    setProcessing(true);
    // Mocked Razorpay — no SDK, simulate sheet + success
    await new Promise((r) => setTimeout(r, 1500));
    setProcessing(false);
    router.replace("/treatment/subscription-confirmed");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 30,
            color: colors.textPrimary,
            marginTop: 16,
            marginBottom: 24,
            letterSpacing: -0.6,
          }}
        >
          Payment
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
          {(["upi", "card"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMethod(m)}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: method === m ? colors.accentWarm : colors.border,
                backgroundColor: method === m ? colors.warmBg : colors.white,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {m === "upi" ? "UPI" : "Card"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View
          style={{
            padding: 16,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.white,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: colors.textTertiary,
              fontWeight: "700",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Order summary
          </Text>
          <Row label={planLabel} value={totalLabel} />
          <View
            style={{
              height: 1,
              backgroundColor: colors.borderLight,
              marginVertical: 8,
            }}
          />
          <Row label="Total" value={totalLabel} bold />
        </View>

        <Text
          style={{ fontSize: 11, color: colors.textTertiary, lineHeight: 16 }}
        >
          By tapping Pay you agree to onlyou&apos;s subscription terms. Cancel
          any time. 256-bit TLS · secured by Razorpay.
        </Text>
      </View>

      <View
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
      >
        <PremiumButton
          variant="warm"
          label={processing ? "Processing…" : `Pay ${totalLabel}`}
          disabled={processing}
          onPress={onPay}
        />
        {processing ? (
          <View style={{ marginTop: 12, alignItems: "center" }}>
            <ActivityIndicator color={colors.accentWarm} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
      <Text
        style={{
          fontSize: bold ? 15 : 13,
          fontWeight: bold ? "800" : "500",
          color: colors.textPrimary,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
