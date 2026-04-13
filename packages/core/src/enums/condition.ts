export const CONDITIONS = ['HAIR_LOSS', 'ED', 'PE', 'WEIGHT', 'PCOS'] as const
export type Condition = (typeof CONDITIONS)[number]
