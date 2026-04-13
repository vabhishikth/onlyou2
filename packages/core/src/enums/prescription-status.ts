export const PRESCRIPTION_STATUSES = [
  'CREATED', 'SIGNED', 'SENT_TO_PHARMACY', 'FULFILLED', 'EXPIRED', 'CANCELLED',
] as const
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number]
