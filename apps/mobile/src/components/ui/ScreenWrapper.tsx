import { ScrollView, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

export interface ScreenWrapperProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}

export function ScreenWrapper({
  children,
  scroll = true,
  style,
}: ScreenWrapperProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={{
        padding: spacing[6],
        paddingBottom: spacing[16],
      }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: spacing[6] }}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
    >
      {content}
    </SafeAreaView>
  );
}
