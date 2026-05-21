export const PLAN_LIMITS = {
  FREE: {
    wallets: 3,
    aiAnalysesPerDay: 0,
    delayedAlerts: true
  },
  PREMIUM: {
    wallets: 50,
    aiAnalysesPerDay: 100,
    delayedAlerts: false
  },
  PRO: {
    wallets: 250,
    aiAnalysesPerDay: 1000,
    delayedAlerts: false
  }
} as const;
