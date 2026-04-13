export const PAYMENT_STATUSES = ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]
