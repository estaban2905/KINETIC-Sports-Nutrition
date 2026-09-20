import { Router } from "express";
import { landingServiceInstance } from "../../modules/landing/service.ts";
import { ecommerceServiceInstance } from "../../modules/ecommerce/service.ts";

export const storeLandingRouter = Router();

/**
 * GET /store/landing/hero
 * Returns the currently active landing hero section.
 */
storeLandingRouter.get("/hero", async (req, res) => {
  try {
    const hero = await landingServiceInstance.getActiveHero();
    if (!hero) {
      return res.status(404).json({
        type: "not_found",
        message: "No active Hero section configured.",
      });
    }
    return res.json({ hero });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * GET /store/landing/benefits
 * Returns all active benefits ordered by sort_order.
 */
storeLandingRouter.get("/benefits", async (req, res) => {
  try {
    const benefits = await landingServiceInstance.getActiveBenefits();
    return res.json({
      benefits,
      count: benefits.length,
    });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * GET /store/landing/testimonials
 * Returns all active customer testimonials (marked clearly as demo data).
 */
storeLandingRouter.get("/testimonials", async (req, res) => {
  try {
    const testimonials = await landingServiceInstance.getActiveTestimonials();
    return res.json({
      testimonials,
      count: testimonials.length,
    });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * GET /store/landing/faq
 * Returns active FAQs ordered by sort_order.
 */
storeLandingRouter.get("/faq", async (req, res) => {
  try {
    const faq = await landingServiceInstance.getActiveFAQs();
    return res.json({
      faq,
      count: faq.length,
    });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * GET /store/landing/banners
 * Returns active promotional banners where start_date <= now <= end_date.
 */
storeLandingRouter.get("/banners", async (req, res) => {
  try {
    const banners = await landingServiceInstance.getActiveBanners();
    return res.json({
      banners,
      count: banners.length,
    });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * GET /store/landing/settings
 * Returns public brand identity, styling, contact, and SEO metadata.
 */
storeLandingRouter.get("/settings", async (req, res) => {
  try {
    const settings = await landingServiceInstance.getPublicSettings();
    return res.json({ settings });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * GET /store/landing/featured-products
 * Returns products with metadata.landing_featured = true, sorted by landing_order.
 */
storeLandingRouter.get("/featured-products", async (req, res) => {
  try {
    const products = await ecommerceServiceInstance.getFeaturedProducts();
    return res.json({
      products,
      count: products.length,
    });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * GET /store/landing/categories
 * Returns all active categories with product counts.
 */
storeLandingRouter.get("/categories", async (req, res) => {
  try {
    const categories = await ecommerceServiceInstance.getCategories();
    return res.json({
      categories,
      count: categories.length,
    });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * GET /store/landing/collections
 * Returns collections for creating themed visual sections.
 */
storeLandingRouter.get("/collections", async (req, res) => {
  try {
    const collections = await ecommerceServiceInstance.getCollections();
    return res.json({
      collections,
      count: collections.length,
    });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});
