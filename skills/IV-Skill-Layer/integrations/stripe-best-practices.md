# stripe:best-practices

Skill: integrate Stripe payments safely.

## When to use
Checkout, subscriptions, webhooks, customer portal, tax, refunds.

## Core idea
Webhook handlers are the source of truth, never the client. Idempotency keys on every mutation. Use Stripe's hosted surfaces (Checkout, Portal) before custom UI.
