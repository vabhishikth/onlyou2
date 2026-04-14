import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { PremiumButton } from "@/components/ui/PremiumButton";
import type { Vertical } from "@/fixtures/patient-states";
import { VERTICALS } from "@/fixtures/verticals";
import { colors } from "@/theme/colors";

export default function ConditionDetail() {
  const { condition } = useLocalSearchParams<{ condition: Vertical }>();
  const info = VERTICALS[condition];

  if (!info) {
    return (
      <View
        style={{ flex: 1, padding: 24, backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.textSecondary }}>Unknown condition.</Text>
      </View>
    );
  }

  if (!info.availableInPhase2) {
    return (
      <View
        style={{
          flex: 1,
          padding: 24,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            width: 44,
            height: 44,
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 32,
            color: colors.textPrimary,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          {info.displayName}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: colors.accent,
            fontWeight: "800",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Coming soon
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
            maxWidth: 280,
          }}
        >
          {info.displayName} launches in a later phase. We&apos;ll notify you
          when it&apos;s available.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>

      <Text
        style={{
          fontSize: 10,
          color: colors.accent,
          fontWeight: "800",
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginTop: 24,
          marginBottom: 8,
        }}
      >
        {info.category}
      </Text>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 36,
          color: colors.textPrimary,
          lineHeight: 40,
          letterSpacing: -0.8,
          marginBottom: 12,
        }}
      >
        {info.displayName}
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: colors.textSecondary,
          lineHeight: 22,
          marginBottom: 32,
        }}
      >
        {info.tagline}
      </Text>

      <SectionHeader>How it works</SectionHeader>
      <Step
        number={1}
        title="Free review"
        body="Answer a short assessment. A specialist reviews within 24 hours."
      />
      <Step
        number={2}
        title="Your plan"
        body="If treatment makes sense, your doctor writes a personalised plan."
      />
      <Step
        number={3}
        title="Pay & ship"
        body="Only when you like the plan. Delivered in 2–4 days."
      />

      <SectionHeader>Pricing</SectionHeader>
      <PriceRow
        label="Monthly"
        value={info.pricing.monthlyPaise}
        suffix="/month"
      />
      <PriceRow
        label="Quarterly"
        value={Math.round(info.pricing.quarterlyTotalPaise / 3)}
        suffix="/month (billed quarterly)"
      />
      <PriceRow
        label="6-month"
        value={Math.round(info.pricing.sixMonthTotalPaise / 6)}
        suffix="/month (best value)"
      />

      <SectionHeader>FAQ</SectionHeader>
      <Faq
        q="Is my consultation free?"
        a="Yes. A doctor reviews your case for free. You only pay if you subscribe after seeing your plan."
      />
      <Faq
        q="How does shipping work?"
        a="Standard delivery in 2–4 business days across metro cities."
      />
      <Faq
        q="Can I cancel anytime?"
        a="Yes. Cancel from your Subscriptions screen any time before the next billing date."
      />

      <View style={{ marginTop: 24 }}>
        <PremiumButton
          variant="warm"
          label="Start your free review"
          onPress={() => router.push(`/questionnaire/${info.id}`)}
        />
      </View>
    </ScrollView>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 10,
        color: colors.textTertiary,
        fontWeight: "800",
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginTop: 32,
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: number;
  title: string;
  body: string;
}) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 14 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          backgroundColor: colors.textPrimary,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>
          {number}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: 2,
          }}
        >
          {title}
        </Text>
        <Text
          style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}

function PriceRow({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <Text
        style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
        ₹{(value / 100).toFixed(0)}
        <Text style={{ color: colors.textTertiary }}>{suffix}</Text>
      </Text>
    </View>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <View
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: 4,
        }}
      >
        {q}
      </Text>
      <Text
        style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}
      >
        {a}
      </Text>
    </View>
  );
}
