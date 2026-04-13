type WebShadow = string
type NativeShadow = {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number
}

type Shadow = { web: WebShadow; native: NativeShadow }

export const shadows: Record<'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl', Shadow> = {
  none: {
    web: 'none',
    native: { shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  },
  xs: {
    web: '0 1px 2px rgba(0, 0, 0, 0.04)',
    native: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  },
  sm: {
    web: '0 1px 3px rgba(0, 0, 0, 0.06)',
    native: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  },
  md: {
    web: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
    native: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  },
  lg: {
    web: '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
    native: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 8 },
  },
  xl: {
    web: '0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06)',
    native: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.12, shadowRadius: 48, elevation: 16 },
  },
}

export type ShadowKey = keyof typeof shadows
