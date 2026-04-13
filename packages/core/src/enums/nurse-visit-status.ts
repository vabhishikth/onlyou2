export const NURSE_VISIT_STATUSES = [
  'SCHEDULED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED',
] as const
export type NurseVisitStatus = (typeof NURSE_VISIT_STATUSES)[number]
