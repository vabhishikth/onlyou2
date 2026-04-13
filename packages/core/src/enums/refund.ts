export const REFUND_SOURCES = ['DOCTOR_INITIATED', 'PATIENT_CANCELLATION', 'PLATFORM_FAULT'] as const
export type RefundSource = (typeof REFUND_SOURCES)[number]
export const REFUND_DESTINATIONS = ['WALLET', 'ORIGINAL_PAYMENT'] as const
export type RefundDestination = (typeof REFUND_DESTINATIONS)[number]
export const REFUND_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED'] as const
export type RefundStatus = (typeof REFUND_STATUSES)[number]
