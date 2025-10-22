import Stripe from 'stripe';

// Initialize Stripe - API key should be provided by user
let stripeInstance: Stripe | null = null;

export function initializeStripe(apiKey: string) {
  if (!stripeInstance) {
    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2025-09-30.clover',
    });
  }
  return stripeInstance;
}

export function getStripe() {
  if (!stripeInstance) {
    throw new Error('Stripe not initialized. Please configure your Stripe API key.');
  }
  return stripeInstance;
}

// Create a customer
export async function createStripeCustomer(email: string, name?: string) {
  const stripe = getStripe();
  return await stripe.customers.create({
    email,
    name,
  });
}

// Create a subscription with 30-day trial
export async function createSubscription(customerId: string, priceId: string) {
  const stripe = getStripe();
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: 30,
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });
}

// Create checkout session
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  const stripe = getStripe();
  return await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 30,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return await stripe.subscriptions.cancel(subscriptionId);
}

// Get subscription
export async function getSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return await stripe.subscriptions.retrieve(subscriptionId);
}

// Create portal session for managing subscription
export async function createPortalSession(customerId: string, returnUrl: string) {
  const stripe = getStripe();
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// Webhook signature verification
export function constructWebhookEvent(payload: string | Buffer, signature: string, secret: string) {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

