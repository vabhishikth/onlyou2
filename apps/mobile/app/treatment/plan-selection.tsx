import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { VERTICALS } from "@/fixtures/verticals";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

type PlanId = "monthly" | "quarterly" | "six-month";

export default function PlanSelection() {
  const insets = useSafeAreaInsets();
  const user = usePatientState();
  const consultation = user.consultations[0];
  const [selected, setSelected] = useState<PlanId>("quarterly");

  if (!consultation) return null;
  const info = VERTICALS[consultation.vertical];

  const plans: Array<{
    id: PlanId;
    label: string;
    monthlyPaise: number;
    totalPaise: number;
    badge?: string;
  }> = [
    {
      id: "six-month",
      label: "6-month",
      monthlyPaise: Math.round(info.pricing.sixMonthTotalPaise / 6),
      totalPaise: info.pricing.sixMonthTotalPaise,
      badge: "Best value",
    },
    {
      id: "quarterly",
      label: "Quarterly",
      monthlyPaise: Math.round(info.pricing.quarterlyTotalPaise / 3),
      totalPaise: info.pricing.quarterlyTotalPaise,
      badge: "Popular",
    },
    {
      id: "monthly",
      label: "Monthly",
      monthlyPaise: info.pricing.monthlyPaise,
      totalPaise: info.pricing.monthlyPaise,
    },
  ];

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

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
      >
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 30,
            color: colors.textPrimary,
            marginTop: 16,
            marginBottom: 8,
            letterSpacing: -0.6,
          }}
        >
          Choose your plan
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            marginBottom: 24,
            lineHeight: 19,
          }}
        >
          Includes: {info.displayName} medication · monthly delivery · unlimited
          messaging · follow-ups
        </Text>

        {plans.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelected(plan.id)}
              style={{
                borderWidth: 2,
                borderColor: isSelected ? colors.accentWarm : colors.border,
                backgroundColor: isSelected ? colors.warmBg : colors.white,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: colors.textPrimary,
                    }}
                  >
                    {plan.label}
                  </Text>
                  {plan.badge ? (
                    <Text
                      style={{
                        fontSize: 10,
                        color: colors.accentWarm,
                        fontWeight: "800",
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        marginTop: 4,
                      }}
                    >
                      {plan.badge}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "800",
                      color: colors.textPrimary,
                    }}
                  >
                    ₹{Math.round(plan.monthlyPaise / 100)}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                    per month
                  </Text>
                </View>
              </View>
              {plan.id !== "monthly" ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textTertiary,
                    marginTop: 8,
                  }}
                >
                  ₹{(plan.totalPaise / 100).toFixed(0)} billed{" "}
                  {plan.id === "quarterly" ? "quarterly" : "once for 6 months"}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
      >
        <PremiumButton
          variant="warm"
          label="Continue to payment"
          onPress={() =>
            router.push({
              pathname: "/treatment/payment",
              params: { plan: selected, vertical: consultation.vertical },
            })
          }
        />
      </View>
    </View>
  );
}
