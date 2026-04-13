export const ROLES = ['PATIENT', 'DOCTOR', 'ADMIN', 'NURSE', 'LAB_TECH', 'PHARMACY_STAFF'] as const
export type Role = (typeof ROLES)[number]
