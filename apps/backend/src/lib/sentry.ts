import * as Sentry from "@sentry/node"

/**
 * Error tracking is the single highest-leverage observability gap in this
 * backend: without it, a failure in payment authorization, the reconciliation
 * job, or a webhook handler fails silently — nothing surfaces it until a
 * customer complains. Opt-in via SENTRY_DSN, consistent with how every other
 * integration in this project (Stripe, Resend, Chilexpress...) only
 * activates once configured, so this is safe to leave unset in development.
 *
 * Must be imported before anything else boots — see the top of
 * medusa-config.ts, which is guaranteed to load first.
 */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  })
}

export { Sentry }
