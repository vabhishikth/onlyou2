import { router } from "expo-router";
import type { ReactNode } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/colors";
import { PremiumButton } from "../ui/PremiumButton";

import { ProgressCounter } from "./ProgressCounter";

interface Props {
  current: number;
  total: number;
  title: string;
  helper?: string;
  canProceed: boolean;
  onNext: () => void;
  children: ReactNode;
}

export function QuestionShell({
  current,
  total,
  title,
  helper,
  canProceed,
  onNext,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  function onExit() {
    Alert.alert(
      "Leave this assessment?",
      "Your answers will be saved for next time.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => router.dismissAll(),
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={{ width: 44, height: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: colors.textPrimary,
          }}
        >
          Consultation
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onExit}
          style={{
            width: 44,
            height: 44,
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 18, color: colors.textPrimary }}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
      >
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 18,
            color: colors.textPrimary,
            marginTop: 8,
            marginBottom: 20,
          }}
        >
          onlyou
        </Text>

        <ProgressCounter current={current} total={total} />

        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 24,
            color: colors.textPrimary,
            lineHeight: 28,
            letterSpacing: -0.4,
            marginBottom: helper ? 6 : 24,
          }}
        >
          {title}
        </Text>
        {helper ? (
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              marginBottom: 24,
              lineHeight: 18,
            }}
          >
            {helper}
          </Text>
        ) : null}

        {children}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.background,
        }}
      >
        <PremiumButton
          variant="warm"
          label="Next"
          disabled={!canProceed}
          onPress={onNext}
        />
      </View>
    </View>
  );
}
