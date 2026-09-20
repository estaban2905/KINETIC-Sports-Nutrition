import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { storeLandingRouter } from "./src/api/store/landingRoutes.ts";
import { storeCommerceRouter } from "./src/api/store/commerceRoutes.ts";
import { adminRouter } from "./src/api/admin/adminRoutes.ts";
import { webhooksRouter } from "./src/api/webhooks/webhookRoutes.ts";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json());

  // CORS Configuration matching Medusa 2.x standards
  const storeCors = (process.env.STORE_CORS || "http://localhost:3000,http://localhost:5173").split(",");
  const adminCors = (process.env.ADMIN_CORS || "http://localhost:3000,http://localhost:7001").split(",");

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, postman, same-origin)
        if (!origin) return callback(null, true);
        const allowed = [...storeCors, ...adminCors];
        if (allowed.some((a) => origin.startsWith(a.trim())) || process.env.NODE_ENV !== "production") {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in preview environment
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-publishable-api-key"],
    })
  );

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      version: "2.21.0",
      engine: "Medusa 2.x + Sports Nutrition Architecture",
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================================================
  // MOUNT MEDUSA STORE & ADMIN API ROUTES
  // ==========================================================================
  // Store API: Landing Content Module
  app.use("/store/landing", storeLandingRouter);

  // Store API: Core Commerce (Products, Carts, Orders, Shipping, Discounts)
  app.use("/store", storeCommerceRouter);

  // Admin API: Content & Commerce Management
  app.use("/admin", adminRouter);

  // Webhooks Dispatcher
  app.use("/webhooks", webhooksRouter);

  // ==========================================================================
  // VITE MIDDLEWARE / PRODUCTION STATIC FALLBACK
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
    console.log(`⚡ Medusa Backend & Storefront running on http://0.0.0.0:${PORT}`);
    console.log(`   - Store API: http://localhost:${PORT}/store/...`);
    console.log(`   - Landing Content API: http://localhost:${PORT}/store/landing/...`);
    console.log(`   - Admin API: http://localhost:${PORT}/admin/...`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start backend server:", err);
});
