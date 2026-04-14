/* eslint-disable onlyou/no-hardcoded-hex -- Design-system showcase page displays raw token hex values as labels for visual documentation; this is the one file where hex literals are the content itself. */
import { View, Text, ScrollView } from "react-native";

import { Logo } from "../src/components/ui/Logo";
import { PremiumButton } from "../src/components/ui/PremiumButton";
import { PremiumInput } from "../src/components/ui/PremiumInput";
import { ScreenWrapper } from "../src/components/ui/ScreenWrapper";
import { colors } from "../src/theme/colors";
import { textStyles } from "../src/theme/typography";

export default function DesignScreen() {
  return (
    <ScreenWrapper>
      <Logo size={48} />
      <Text
        style={{
          fontSize: 11,
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginTop: 8,
          marginBottom: 32,
        }}
      >
        Design system — @onlyou/mobile
      </Text>

      <Section title="Typography">
        <Text style={textStyles.h1}>Your care, private</Text>
        <Text style={[textStyles.h2, { marginTop: 12 }]}>
          Treatment that fits you
        </Text>
        <Text style={[textStyles.h3, { marginTop: 12 }]}>
          Book a free consultation
        </Text>
        <Text style={[textStyles.body, { marginTop: 16 }]}>
          A board-certified doctor reviews your case and creates a personalized
          plan — you only pay if they prescribe.
        </Text>
        <Text
          style={[
            textStyles.bodySecondary,
            { color: colors.textSecondary, marginTop: 8 },
          ]}
        >
          Takes about 5 minutes. Your answers stay private.
        </Text>
        <Text
          style={[
            textStyles.small,
            { color: colors.textTertiary, marginTop: 8 },
          ]}
        >
          Reviewed within 24 hours · Free · No card required
        </Text>
      </Section>

      <Section title="Core Palette">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Swatch name="Primary" hex="#141414" />
          <Swatch name="Background" hex="#FAFAF8" />
          <Swatch name="Off-White" hex="#F8F8F6" />
          <Swatch name="Lavender" hex="#9B8EC4" />
          <Swatch name="Warm Gold" hex="#C4956B" />
        </ScrollView>
      </Section>

      <Section title="Status Colors">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Swatch name="Success" hex="#2D9F5D" />
          <Swatch name="Warning" hex="#D4880F" />
          <Swatch name="Error" hex="#CC3333" />
          <Swatch name="Info" hex="#0284C7" />
        </ScrollView>
      </Section>

      <Section title="PremiumButton">
        <View style={{ gap: 12 }}>
          <PremiumButton label="Continue" variant="primary" />
          <PremiumButton label="Back" variant="secondary" />
          <PremiumButton label="Skip for now" variant="ghost" />
          <PremiumButton label="Loading" variant="primary" loading />
          <PremiumButton label="Disabled" variant="primary" disabled />
        </View>
      </Section>

      <Section title="PremiumInput">
        <View style={{ gap: 16 }}>
          <PremiumInput label="Phone number" placeholder="+91 98xxx xxxxx" />
          <PremiumInput
            label="Email"
            placeholder="you@example.in"
            error="This email is not valid"
          />
        </View>
      </Section>

      <Section title="Status Badges">
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Chip
            label="COMPLETED"
            color={colors.success}
            bg={colors.successBg}
          />
          <Chip
            label="AWAITING REVIEW"
            color={colors.warning}
            bg={colors.warningBg}
          />
          <Chip label="URGENT" color={colors.error} bg={colors.errorBg} />
          <Chip label="IN PROGRESS" color={colors.info} bg={colors.infoBg} />
          <Chip label="NEW" color={colors.accent} bg={colors.accentLight} />
        </View>
      </Section>
    </ScreenWrapper>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_700Bold",
          fontSize: 24,
          marginBottom: 16,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <View style={{ marginRight: 12, width: 100 }}>
      <View
        style={{
          height: 80,
          borderRadius: 12,
          backgroundColor: hex,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      />
      <Text
        style={{
          fontSize: 12,
          fontFamily: "PlusJakartaSans_600SemiBold",
          marginTop: 8,
        }}
      >
        {name}
      </Text>
      <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>
        {hex}
      </Text>
    </View>
  );
}

function Chip({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
      }}
    >
      <Text
        style={{ color, fontSize: 11, fontFamily: "PlusJakartaSans_700Bold" }}
      >
        {label}
      </Text>
    </View>
  );
}
