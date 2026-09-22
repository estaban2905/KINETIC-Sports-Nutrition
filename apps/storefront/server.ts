import express from "express";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;

// Origins the page legitimately talks to: Google Fonts (stylesheet + font
// files), Unsplash product imagery, Stripe.js (loaded for card payments),
// and the Medusa backend itself (configurable — VITE_MEDUSA_BACKEND_URL —
// since it differs between dev/staging/production).
const MEDUSA_BACKEND_URL = process.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000";

async function startServer() {
  const app = express();
  app.disable("x-powered-by");

  // Vite's dev middleware injects inline scripts/eval for HMR, which a
  // strict CSP would block — only enforce it in production, where the
  // built bundle has none.
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === "production"
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "https://js.stripe.com"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
                connectSrc: ["'self'", MEDUSA_BACKEND_URL, "https://api.stripe.com"],
                frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
              },
            }
          : false,
    })
  );
  app.use(compression());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      engine: "KINETIC Storefront Server (static assets)",
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================================================
  // WEBPAY RETURN HANDOFF
  // Transbank redirects the customer's browser back here with a real HTML
  // form POST (not a fetch/XHR the SPA can intercept), so a tiny server
  // route is needed to receive it and hand off to the client-side confirm
  // page via a 302 + query string. The actual payment confirmation (calling
  // cart.complete(), which triggers WebpayPaymentProviderService.authorizePayment)
  // happens client-side on /checkout/confirmar using the cart_id already in
  // this browser's localStorage.
  // ==========================================================================
  app.use(express.urlencoded({ extended: true }));
  app.post("/webpay/return", (req, res) => {
    const tokenWs = req.body?.token_ws;
    if (typeof tokenWs === "string" && tokenWs) {
      res.redirect(302, `/checkout/confirmar?provider=webpay&token_ws=${encodeURIComponent(tokenWs)}`);
      return;
    }
    // TBK_TOKEN/TBK_ORDEN_COMPRA are sent instead of token_ws when the
    // customer cancels or the form times out on Transbank's side.
    res.redirect(302, "/checkout/confirmar?provider=webpay&cancelled=1");
  });

  // ==========================================================================
  // VITE MIDDLEWARE / PRODUCTION STATIC FALLBACK
  // Ecommerce (products, carts, checkout, orders) and landing content are
  // handled by the real Medusa backend in apps/backend — this server only
  // serves the React app. See src/lib/medusa.ts and src/lib/landing.ts.
  // ==========================================================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`⚡ KINETIC Storefront running on http://0.0.0.0:${PORT}`);
    console.log(`   - Ecommerce & landing content: real Medusa backend, see apps/backend`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start backend server:", err);
});
