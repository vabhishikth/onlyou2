import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function MessagesIndex() {
  const user = usePatientState();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24 }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 30,
          color: colors.textPrimary,
          marginBottom: 16,
          letterSpacing: -0.6,
        }}
      >
        Messages
      </Text>

      {user.conversations.length === 0 ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            No messages yet. Your provider will reach out after your
            consultation.
          </Text>
        </View>
      ) : (
        user.conversations.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(`/(tabs)/messages/${c.id}`)}
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderLight,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {c.doctorName}
              </Text>
              {c.unreadCount > 0 ? (
                <View
                  style={{
                    minWidth: 20,
                    height: 20,
                    borderRadius: 999,
                    backgroundColor: colors.accent,
                    paddingHorizontal: 6,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: colors.white,
                    }}
                  >
                    {c.unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={{
                fontSize: 11,
                color: colors.textTertiary,
                marginBottom: 4,
              }}
            >
              {c.doctorSpecialty} · {c.vertical.replace("-", " ")}
            </Text>
            <Text
              style={{ fontSize: 13, color: colors.textSecondary }}
              numberOfLines={1}
            >
              {c.lastMessagePreview}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
