import { Router } from 'express';
import { handleStripeWebhook } from '../stripeWebhook';

const router = Router();

// Stripe webhook endpoint
// This needs raw body, so it should be registered before JSON body parser
router.post('/webhook', handleStripeWebhook);

export default router;

