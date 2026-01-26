// ============================================================
// BYPASS CONFIG: Testing mode settings
// ============================================================

/**
 * When true, hides all Stripe/payment related UI elements
 * Set to false to re-enable payment UI
 */
export const HIDE_STRIPE_UI = false;

/**
 * When true, all logged-in users get premium access without payment
 * This works in conjunction with the check-subscription edge function
 */
export const BYPASS_PAYMENTS_FOR_TESTING = true;
