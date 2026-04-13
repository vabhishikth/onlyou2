import { useState } from 'react'
import { TextInput, View, Text, type TextInputProps } from 'react-native'

import { colors } from '../../theme/colors'
import { radii } from '../../theme/spacing'

export interface PremiumInputProps extends TextInputProps {
  label?: string
  error?: string
}

export function PremiumInput({ label, error, onFocus, onBlur, style, ...props }: PremiumInputProps) {
  const [focused, setFocused] = useState(false)
  const borderColor = error ? colors.error : focused ? colors.borderFocus : colors.border

  return (
    <View>
      {label && (
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>{label}</Text>
      )}
      <TextInput
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        style={[
          {
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor,
            borderRadius: radii.base,
            paddingVertical: 14,
            paddingHorizontal: 16,
            fontSize: 16,
            color: colors.textPrimary,
            fontFamily: 'PlusJakartaSans_400Regular',
          },
          style,
        ]}
        {...props}
      />
      {error && (
        <Text style={{ fontSize: 13, color: colors.error, marginTop: 4 }}>{error}</Text>
      )}
    </View>
  )
}
