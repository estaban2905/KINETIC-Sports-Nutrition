import { defineMiddlewares, errorHandler, getHttpResponseFromError } from "@medusajs/framework/http"
import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { rateLimit } from "express-rate-limit"
import { Sentry } from "../lib/sentry"

/**
 * order-lookup accepts a guest-facing {display_id, email} pair as the sole
 * proof of order ownership (see its route handler). display_id is a
 * sequential integer, so without a limit here an attacker who knows one
 * customer's email can iterate display_id to enumerate every order they've
 * ever placed — this is the only thing standing between that and an open
 * endpoint. IP-based only for now: per-email limiting needs shared state
 * across processes, which needs Redis (see DEBT-A1) to be meaningful once
 * this scales past one instance.
 */
const orderLookupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados intentos. Intenta de nuevo en unos minutos." },
})

/**
 * Reports every 5xx to Sentry, then delegates to Medusa's own error handler
 * unchanged — reusing its status-code classification (getHttpResponseFromError)
 * instead of reimplementing it, so this stays additive and doesn't risk
 * regressing any route's error response shape. 4xx (validation, not-found,
 * auth) are expected client conditions and deliberately not reported — the
 * whole point of Sentry here is surfacing the two P0 categories that were
 * previously silent: payment authorization failures and anything unexpected.
 */
const coreErrorHandler = errorHandler()
function reportingErrorHandler(
  err: unknown,
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const { statusCode } = getHttpResponseFromError(err)
  if (statusCode >= 500) {
    Sentry.captureException(err)
  }
  return coreErrorHandler(err as any, req, res, next)
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/order-lookup",
      method: "POST",
      middlewares: [orderLookupRateLimit],
    },
  ],
  errorHandler: reportingErrorHandler,
})
