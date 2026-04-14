import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { ConditionCard } from "@/components/explore/ConditionCard";
import { visibleFor } from "@/fixtures/verticals";
import { useGender } from "@/hooks/use-gender";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function ExploreIndex() {
  const gender = useGender();
  const user = usePatientState();
  const verticals = visibleFor(gender);
  const activeVerticals = new Set(user.subscriptions.map((s) => s.vertical));

  // Pair up verticals 2 per row
  const rows: (typeof verticals)[] = [];
  for (let i = 0; i < verticals.length; i += 2) {
    rows.push(verticals.slice(i, i + 2));
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 34,
          color: colors.textPrimary,
          lineHeight: 36,
          letterSpacing: -0.8,
          marginBottom: 6,
        }}
      >
        Explore care
      </Text>
      <Text
        style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}
      >
        Private specialists. Free first review.
      </Text>

      {rows.map((row, rowIdx) => (
        <View
          key={rowIdx}
          style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}
        >
          {row.map((info) => (
            <ConditionCard
              key={info.id}
              info={info}
              isActive={activeVerticals.has(info.id)}
              onPress={() => router.push(`/(tabs)/explore/${info.id}`)}
            />
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </ScrollView>
  );
}
