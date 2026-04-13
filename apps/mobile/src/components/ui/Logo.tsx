import { Text, type TextStyle } from 'react-native'

import { colors } from '../../theme/colors'
import { textStyles } from '../../theme/typography'

export interface LogoProps {
  size?: number
  inverse?: boolean
  style?: TextStyle
}

export function Logo({ size = 36, inverse, style }: LogoProps) {
  return (
    <Text
      style={[
        textStyles.logo,
        { fontSize: size, lineHeight: size * 1.2, color: inverse ? '#FFFFFF' : colors.textPrimary },
        style,
      ]}
    >
      onlyou
    </Text>
  )
}
