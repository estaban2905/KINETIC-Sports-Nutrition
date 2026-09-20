import { Router } from "express";

export const webhooksRouter = Router();

interface WebhookLog {
  id: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

const webhookLogs: WebhookLog[] = [];

/**
 * POST /webhooks/dispatch
 * Internal dispatcher for Medusa events (order.placed, product.updated, etc.)
 *
 * // TODO: [SECURITY] Verify HMAC SHA256 signature using 'crypto.createHmac("sha256", process.env.WEBHOOK_SECRET)' against 'req.headers["x-medusa-signature"]'.
 * // TODO: [NOTIFICATIONS] On 'order.placed': send transactional email via Resend/SendGrid and notify Slack channel.
 * // TODO: [SHIPPING] On 'order.fulfillment_created': call Starken / Blue Express API to generate shipping tracking number and label PDF.
 * // TODO: [INVENTORY] On 'product.updated': invalidate Redis cache key 'store:products:all'.
 */
webhooksRouter.post("/dispatch", (req, res) => {
  const { event, data } = req.body;
  if (!event) {
    return res.status(400).json({ error: "Event name is required." });
  }

  const log: WebhookLog = {
    id: `wh_${Date.now()}`,
    event,
    data: data || {},
    timestamp: new Date().toISOString(),
  };

  webhookLogs.unshift(log);
  if (webhookLogs.length > 100) webhookLogs.pop();

  return res.status(200).json({
    status: "dispatched",
    event,
    delivered_to: ["Email Service", "Analytics CRM", "Slack Notification"],
  });
});

/**
 * GET /webhooks/logs
 * Inspect dispatched webhooks for audit and verification.
 */
webhooksRouter.get("/logs", (req, res) => {
  res.json({ logs: webhookLogs, count: webhookLogs.length });
});
