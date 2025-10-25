import { Request, Response } from 'express';
import Stripe from 'stripe';
import { getStripe, constructWebhookEvent } from './stripe';
import * as db from './db';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Handle Stripe webhook events
 * This endpoint should be registered at /api/stripe/webhook
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event: Stripe.Event;

  try {
    // Construct event from webhook payload
    event = constructWebhookEvent(
      req.body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).send(`Webhook handler failed: ${error.message}`);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price.id;

  // Find user by Stripe customer ID
  const users = await db.getDb();
  if (!users) return;

  // You'll need to add a query to find user by stripeCustomerId
  // For now, we'll update by subscription ID if it exists
  const existingSubscription = await db.getDb().then(db => 
    db?.select().from(require('../drizzle/schema').subscriptions)
      .where(require('drizzle-orm').eq(require('../drizzle/schema').subscriptions.stripeSubscriptionId, subscriptionId))
      .limit(1)
  );

  if (existingSubscription && existingSubscription.length > 0) {
    // Update existing subscription
    await db.updateSubscription(existingSubscription[0].id, {
      status: status as any,
      stripePriceId: priceId,
      currentPeriodStart: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000) : undefined,
      currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : undefined,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
    });
  }

  console.log(`Subscription ${subscriptionId} updated to status: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;

  const existingSubscription = await db.getDb().then(db => 
    db?.select().from(require('../drizzle/schema').subscriptions)
      .where(require('drizzle-orm').eq(require('../drizzle/schema').subscriptions.stripeSubscriptionId, subscriptionId))
      .limit(1)
  );

  if (existingSubscription && existingSubscription.length > 0) {
    await db.updateSubscription(existingSubscription[0].id, {
      status: 'canceled',
      canceledAt: new Date(),
    });
  }

  console.log(`Subscription ${subscriptionId} deleted`);
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  // Send notification to user that trial is ending soon
  // You can implement email notification here
  console.log(`Trial ending soon for subscription: ${subscription.id}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Payment succeeded for invoice: ${invoice.id}`);
  
  // Reset credits on monthly renewal
  const subscriptionId = typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : (invoice as any).subscription?.id;
  
  if (subscriptionId) {
    const existingSubscription = await db.getDb().then(db => 
      db?.select().from(require('../drizzle/schema').subscriptions)
        .where(require('drizzle-orm').eq(require('../drizzle/schema').subscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1)
    );

    if (existingSubscription && existingSubscription.length > 0) {
      // Reset credits to 200 on successful payment
      await db.resetCredits(existingSubscription[0].userId);
      console.log(`Credits reset for user ${existingSubscription[0].userId}`);
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : (invoice as any).subscription?.id;
  
  if (subscriptionId) {
    const existingSubscription = await db.getDb().then(db => 
      db?.select().from(require('../drizzle/schema').subscriptions)
        .where(require('drizzle-orm').eq(require('../drizzle/schema').subscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1)
    );

    if (existingSubscription && existingSubscription.length > 0) {
      await db.updateSubscription(existingSubscription[0].id, {
        status: 'past_due',
      });
    }
  }

  console.log(`Payment failed for invoice: ${invoice.id}`);
}

