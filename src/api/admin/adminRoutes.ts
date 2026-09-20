import { Router } from "express";
import { landingServiceInstance } from "../../modules/landing/service.ts";
import { ecommerceServiceInstance } from "../../modules/ecommerce/service.ts";

export const adminRouter = Router();

// ============================================================================
// ADMIN SECURITY & MIDDLEWARE
// ============================================================================
// TODO: [AUTH] Attach JWT verification middleware:
//       adminRouter.use(async (req, res, next) => {
//         const token = req.headers.authorization?.replace("Bearer ", "");
//         if (!token || !verifyAdminJwt(token)) return res.status(401).json({ error: "Unauthorized" });
//         next();
//       });
// TODO: [RBAC] Verify administrative permissions ('admin' vs 'editor' vs 'fulfillment').
// TODO: [AUDIT] Log administrative mutations (e.g. inventory adjustments, price changes) to audit_log table.

// ============================================================================
// ADMIN LANDING CONTENT MANAGEMENT
// ============================================================================

// Hero
adminRouter.get("/landing/hero", async (req, res) => {
  const hero = await landingServiceInstance.getActiveHero();
  res.json({ hero });
});

adminRouter.post("/landing/hero", async (req, res) => {
  try {
    const updated = await landingServiceInstance.updateHero(req.body);
    res.json({ success: true, hero: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Benefits
adminRouter.get("/landing/benefits", async (req, res) => {
  const benefits = await landingServiceInstance.getActiveBenefits();
  res.json({ benefits });
});

adminRouter.post("/landing/benefits", async (req, res) => {
  try {
    const created = await landingServiceInstance.createBenefit(req.body);
    res.status(201).json({ success: true, benefit: created });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

adminRouter.put("/landing/benefits/:id", async (req, res) => {
  try {
    const updated = await landingServiceInstance.updateBenefit(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Benefit not found" });
    res.json({ success: true, benefit: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

adminRouter.delete("/landing/benefits/:id", async (req, res) => {
  const deleted = await landingServiceInstance.deleteBenefit(req.params.id);
  res.json({ success: deleted });
});

// FAQ
adminRouter.get("/landing/faq", async (req, res) => {
  const faq = await landingServiceInstance.getActiveFAQs();
  res.json({ faq });
});

adminRouter.post("/landing/faq", async (req, res) => {
  try {
    const created = await landingServiceInstance.createFAQ(req.body);
    res.status(201).json({ success: true, faq: created });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

adminRouter.put("/landing/faq/:id", async (req, res) => {
  try {
    const updated = await landingServiceInstance.updateFAQ(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "FAQ not found" });
    res.json({ success: true, faq: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

adminRouter.delete("/landing/faq/:id", async (req, res) => {
  const deleted = await landingServiceInstance.deleteFAQ(req.params.id);
  res.json({ success: deleted });
});

// Banners
adminRouter.get("/landing/banners", async (req, res) => {
  const banners = await landingServiceInstance.getActiveBanners();
  res.json({ banners });
});

adminRouter.post("/landing/banners", async (req, res) => {
  try {
    const created = await landingServiceInstance.createBanner(req.body);
    res.status(201).json({ success: true, banner: created });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

adminRouter.delete("/landing/banners/:id", async (req, res) => {
  const deleted = await landingServiceInstance.deleteBanner(req.params.id);
  res.json({ success: deleted });
});

// Brand Settings & SEO
adminRouter.get("/landing/settings", async (req, res) => {
  const settings = await landingServiceInstance.getPublicSettings();
  res.json({ settings });
});

adminRouter.post("/landing/settings", async (req, res) => {
  try {
    const updated = await landingServiceInstance.updateSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// ADMIN COMMERCE OPERATIONS (ORDERS & INVENTORY)
// ============================================================================

adminRouter.get("/orders", async (req, res) => {
  const orders = await ecommerceServiceInstance.getAllOrders();
  res.json({ orders, count: orders.length });
});

adminRouter.put("/orders/:id/status", async (req, res) => {
  const { status, fulfillment_status } = req.body;
  const order = await ecommerceServiceInstance.updateOrderStatus(
    req.params.id,
    status,
    fulfillment_status
  );
  if (!order) return res.status(404).json({ error: "Order not found." });
  res.json({ success: true, order });
});

adminRouter.put("/inventory/:variant_id", async (req, res) => {
  const { quantity } = req.body;
  if (typeof quantity !== "number") {
    return res.status(400).json({ error: "quantity must be a number." });
  }
  const variant = await ecommerceServiceInstance.updateVariantInventory(
    req.params.variant_id,
    quantity
  );
  if (!variant) return res.status(404).json({ error: "Variant not found." });
  res.json({ success: true, variant });
});
