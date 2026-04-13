export const durations = { instant: 0, fast: 150, base: 200, slow: 300, slower: 500 } as const
export const easings = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const
export type Duration = keyof typeof durations
export type Easing = keyof typeof easings
