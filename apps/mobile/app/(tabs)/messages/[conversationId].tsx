import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumInput } from "@/components/ui/PremiumInput";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function ChatScreen() {
  const user = usePatientState();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const conv = user.conversations.find((c) => c.id === conversationId);
  const insets = useSafeAreaInsets();

  if (!conv) {
    return (
      <View
        style={{ flex: 1, padding: 24, backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.textSecondary }}>
          Conversation not found.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: colors.textPrimary,
            marginTop: 4,
          }}
        >
          {conv.doctorName}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textTertiary }}>
          {conv.doctorSpecialty}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {conv.messages.map((m) => (
          <View
            key={m.id}
            style={{
              alignSelf: m.fromPatient ? "flex-end" : "flex-start",
              maxWidth: "75%",
              marginBottom: 10,
              padding: 12,
              borderRadius: 14,
              backgroundColor: m.fromPatient
                ? colors.textPrimary
                : colors.offWhite,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: m.fromPatient ? colors.white : colors.textPrimary,
                lineHeight: 19,
              }}
            >
              {m.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <PremiumInput
          label="Message your doctor"
          editable={false}
          testID="chat-input-disabled"
        />
        <Text
          style={{
            marginTop: 8,
            fontSize: 11,
            color: colors.textTertiary,
            textAlign: "center",
          }}
        >
          Coming soon — direct chat with your doctor
        </Text>
      </View>
    </View>
  );
}
