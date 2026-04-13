export const SUBSCRIPTION_PLANS = ['MONTHLY', 'QUARTERLY', 'SIX_MONTH'] as const
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number]
export const SUBSCRIPTION_STATUSES = ['CREATED', 'ACTIVE', 'PAUSED', 'HALTED', 'CANCELLED', 'EXPIRED'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]
