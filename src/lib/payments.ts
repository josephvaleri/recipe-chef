/**
 * Paddle Hosted Checkout Configuration
 * 
 * These URLs are provided by Paddle Dashboard for Hosted Checkout.
 * Each URL corresponds to a specific subscription plan.
 */

export const paddleHostedCheckout = {
  monthly: process.env.NEXT_PUBLIC_PADDLE_MONTHLY_CHECKOUT_URL || '',
  annual: process.env.NEXT_PUBLIC_PADDLE_ANNUAL_CHECKOUT_URL || '',
} as const

/**
 * Validate that checkout URLs are configured
 */
export function validateCheckoutUrls(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  
  if (!paddleHostedCheckout.monthly) {
    missing.push('NEXT_PUBLIC_PADDLE_MONTHLY_CHECKOUT_URL')
  }
  
  if (!paddleHostedCheckout.annual) {
    missing.push('NEXT_PUBLIC_PADDLE_ANNUAL_CHECKOUT_URL')
  }
  
  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Get checkout URL for a plan type
 */
export function getCheckoutUrl(planType: 'monthly' | 'annual'): string | null {
  const url = paddleHostedCheckout[planType]
  return url || null
}

/**
 * Check if checkout URLs are configured (for runtime validation)
 */
export function isCheckoutConfigured(): boolean {
  return validateCheckoutUrls().valid
}

