import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Initializes Sentry (if SENTRY_DSN is set) as early as possible — but only
// AFTER loadEnv() above has populated process.env, since sentry.ts reads
// SENTRY_DSN from it. A static `import` would get hoisted above loadEnv()
// and run with an empty environment, so this uses `require` deliberately to
// keep the ordering explicit. medusa-config.ts is guaranteed to load first,
// on every process (server, worker, CLI), so this is the earliest reliable
// hook available.
require('./src/lib/sentry')

// Refuses to boot in production with the placeholder secrets shipped in
// .env.example. JWT_SECRET/COOKIE_SECRET sign admin sessions — a known or
// weak value lets anyone forge an authenticated admin request. This has to
// run before defineConfig() reads them below.
if (process.env.NODE_ENV === 'production') {
  const INSECURE_VALUES = new Set(['supersecret', 'changeme', ''])
  for (const key of ['JWT_SECRET', 'COOKIE_SECRET']) {
    const value = process.env[key]
    if (!value || value.length < 32 || INSECURE_VALUES.has(value)) {
      throw new Error(
        `${key} is missing or insecure for production. Set a strong, unique value ` +
        `(e.g. \`openssl rand -base64 48\`) — never reuse the .env.example placeholder.`
      )
    }
  }
}

// Stripe, MercadoPago and Resend require the merchant's own credentials,
// which may not exist yet in every environment. Their providers throw in
// validateOptions when required fields are missing, which would otherwise
// crash the ENTIRE backend on boot — so they're only registered once
// configured. Webpay always has Transbank's public integration credentials
// as a fallback (see .env.example) and Chilexpress degrades to a flat
// rate on its own, so both are always safe to register.
const paymentProviders: Record<string, unknown>[] = [
  {
    resolve: "./src/modules/payment-webpay",
    id: "webpay",
    options: {
      commerceCode: process.env.TRANSBANK_COMMERCE_CODE,
      apiKey: process.env.TRANSBANK_API_KEY,
      environment: process.env.TRANSBANK_ENVIRONMENT || "integration",
      returnUrl: process.env.TRANSBANK_RETURN_URL,
    },
  },
]

if (process.env.STRIPE_SECRET_KEY) {
  paymentProviders.push({
    resolve: "@medusajs/medusa/payment-stripe",
    id: "stripe",
    options: {
      apiKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  })
}

if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
  paymentProviders.push({
    resolve: "./src/modules/payment-mercadopago",
    id: "mercadopago",
    options: {
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      successUrl: process.env.MERCADOPAGO_SUCCESS_URL,
      failureUrl: process.env.MERCADOPAGO_FAILURE_URL,
      notificationUrl: process.env.MERCADOPAGO_NOTIFICATION_URL,
    },
  })
}

const notificationProviders: Record<string, unknown>[] = [
  // Preserves Medusa's default local/feed notification provider (admin UI feed).
  {
    resolve: "@medusajs/medusa/notification-local",
    id: "local",
    options: {
      name: "Local Notification Provider",
      channels: ["feed"],
    },
  },
]

if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
  notificationProviders.push({
    resolve: "./src/modules/notification-resend",
    id: "resend",
    options: {
      channels: ["email"],
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL,
    },
  })
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: [
    {
      resolve: "./src/modules/landing",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: paymentProviders,
      },
    },
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          // Preserves Medusa's default manual fulfillment provider.
          {
            resolve: "@medusajs/medusa/fulfillment-manual",
            id: "manual",
          },
          {
            resolve: "./src/modules/fulfillment-chilexpress",
            id: "chilexpress",
            options: {
              apiKey: process.env.CHILEXPRESS_API_KEY,
              baseUrl: process.env.CHILEXPRESS_BASE_URL,
              originCoverageCode: process.env.CHILEXPRESS_ORIGIN_CODE,
              fallbackRate: process.env.CHILEXPRESS_FALLBACK_RATE
                ? Number(process.env.CHILEXPRESS_FALLBACK_RATE)
                : undefined,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: notificationProviders,
      },
    },
  ],
})
