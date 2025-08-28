import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
// Replace with your actual Stripe publishable key
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here');

// Payment description
export const PAYMENT_DESCRIPTION = 'Vancouver Pickleball Smash - Season Registration Fee';

// Coupon codes
export const COUPON_CODES = {
  'ACDBE': {
    discount: 100, // 100% off
    description: '100% off registration fee'
  },
  'KXJMR': {
    discount: 50, // 50% off
    description: '50% off registration fee'
  }
}; 