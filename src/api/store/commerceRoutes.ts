import { Router } from "express";
import { ecommerceServiceInstance } from "../../modules/ecommerce/service.ts";

export const storeCommerceRouter = Router();

/**
 * GET /store/products
 * Query catalog products with full variants, pricing, and stock status.
 */
storeCommerceRouter.get("/products", async (req, res) => {
  try {
    const products = await ecommerceServiceInstance.getProducts();
    return res.json({
      products,
      count: products.length,
      limit: 50,
      offset: 0,
    });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * GET /store/products/:id
 * Retrieve single product by id or handle.
 */
storeCommerceRouter.get("/products/:id", async (req, res) => {
  try {
    const product = await ecommerceServiceInstance.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ type: "not_found", message: "Product not found." });
    }
    return res.json({ product });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * GET /store/shipping-options
 * List shipping methods for the active region.
 */
storeCommerceRouter.get("/shipping-options", async (req, res) => {
  try {
    const shipping_options = await ecommerceServiceInstance.getShippingOptions();
    return res.json({ shipping_options });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * POST /store/carts
 * Initialize a new cart session.
 */
storeCommerceRouter.post("/carts", async (req, res) => {
  try {
    const cart = await ecommerceServiceInstance.createCart();
    return res.status(201).json({ cart });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * GET /store/carts/:id
 * Retrieve active cart.
 */
storeCommerceRouter.get("/carts/:id", async (req, res) => {
  try {
    const cart = await ecommerceServiceInstance.getCart(req.params.id);
    if (!cart) {
      return res.status(404).json({ type: "not_found", message: "Cart not found." });
    }
    return res.json({ cart });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});

/**
 * POST /store/carts/:id/line-items
 * Add variant to cart with real inventory validation.
 */
storeCommerceRouter.post("/carts/:id/line-items", async (req, res) => {
  try {
    const { variant_id, quantity } = req.body;
    if (!variant_id || typeof quantity !== "number" || quantity <= 0) {
      return res.status(400).json({
        type: "invalid_data",
        message: "variant_id and a positive integer quantity are required.",
      });
    }

    const cart = await ecommerceServiceInstance.addItemToCart(
      req.params.id,
      variant_id,
      quantity
    );
    return res.json({ cart });
  } catch (error: any) {
    return res.status(400).json({ type: "bad_request", message: error.message });
  }
});

/**
 * POST /store/carts/:id/line-items/:line_id
 * Update quantity of a line item.
 */
storeCommerceRouter.post("/carts/:id/line-items/:line_id", async (req, res) => {
  try {
    const { quantity } = req.body;
    if (typeof quantity !== "number" || quantity < 0) {
      return res.status(400).json({
        type: "invalid_data",
        message: "A non-negative integer quantity is required.",
      });
    }

    const cart = await ecommerceServiceInstance.updateCartItemQuantity(
      req.params.id,
      req.params.line_id,
      quantity
    );
    return res.json({ cart });
  } catch (error: any) {
    return res.status(400).json({ type: "bad_request", message: error.message });
  }
});

/**
 * DELETE /store/carts/:id/line-items/:line_id
 * Remove line item from cart.
 */
storeCommerceRouter.delete("/carts/:id/line-items/:line_id", async (req, res) => {
  try {
    const cart = await ecommerceServiceInstance.removeCartItem(
      req.params.id,
      req.params.line_id
    );
    return res.json({ cart });
  } catch (error: any) {
    return res.status(400).json({ type: "bad_request", message: error.message });
  }
});

/**
 * POST /store/carts/:id/promotions
 * Apply promotional coupon code.
 *
 * // TODO: [SECURITY] Add express-rate-limit middleware to prevent coupon enumeration / brute-force attacks.
 */
storeCommerceRouter.post("/carts/:id/promotions", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({
        type: "invalid_data",
        message: "Promotional code is required.",
      });
    }

    const cart = await ecommerceServiceInstance.applyPromotion(
      req.params.id,
      code
    );
    return res.json({ cart });
  } catch (error: any) {
    return res.status(400).json({ type: "promotion_error", message: error.message });
  }
});

/**
 * POST /store/carts/:id/shipping-methods
 * Select shipping method for checkout.
 */
storeCommerceRouter.post("/carts/:id/shipping-methods", async (req, res) => {
  try {
    const { option_id } = req.body;
    if (!option_id) {
      return res.status(400).json({
        type: "invalid_data",
        message: "option_id is required.",
      });
    }

    const cart = await ecommerceServiceInstance.setShippingOption(
      req.params.id,
      option_id
    );
    return res.json({ cart });
  } catch (error: any) {
    return res.status(400).json({ type: "bad_request", message: error.message });
  }
});

/**
 * POST /store/carts/:id/customer
 * Attach customer email and shipping address to cart.
 */
storeCommerceRouter.post("/carts/:id/customer", async (req, res) => {
  try {
    const { email, address } = req.body;
    if (!email || !address || !address.first_name || !address.address_1) {
      return res.status(400).json({
        type: "invalid_data",
        message: "email and complete address are required.",
      });
    }

    const cart = await ecommerceServiceInstance.setCustomerInfo(
      req.params.id,
      email,
      address
    );
    return res.json({ cart });
  } catch (error: any) {
    return res.status(400).json({ type: "bad_request", message: error.message });
  }
});

/**
 * POST /store/carts/:id/complete
 * Transition cart to placed order, decrement stock, and generate order display id.
 *
 * // TODO: [PAYMENTS] Integrate Transbank Webpay Plus:
 * //       1. Call 'new WebpayPlus.Transaction().create(buyOrder, sessionId, amount, returnUrl)'
 * //       2. Return '{ token, url }' to frontend for form POST redirect to Transbank Webpay.
 * //       3. Expose 'POST /store/payments/webpay/return' to confirm transaction via 'commit(token)'.
 * // TODO: [PAYMENTS] Integrate Mercado Pago Checkout Pro (mercadopago.preferences.create) & IPN webhook.
 * // TODO: [PAYMENTS] Integrate Stripe PaymentIntent (stripe.paymentIntents.create) for international USD cards.
 * // TODO: [EMAILS] Trigger transactional order confirmation email via SendGrid / Resend / AWS SES.
 */
storeCommerceRouter.post("/carts/:id/complete", async (req, res) => {
  try {
    const { payment_provider } = req.body;
    const order = await ecommerceServiceInstance.completeCartOrder(
      req.params.id,
      payment_provider || "webpay"
    );
    return res.status(201).json({
      type: "order",
      order,
    });
  } catch (error: any) {
    return res.status(400).json({ type: "checkout_error", message: error.message });
  }
});

/**
 * GET /store/orders/:id
 * Retrieve order confirmation details.
 */
storeCommerceRouter.get("/orders/:id", async (req, res) => {
  try {
    const order = await ecommerceServiceInstance.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ type: "not_found", message: "Order not found." });
    }
    return res.json({ order });
  } catch (error: any) {
    return res.status(500).json({ type: "server_error", message: error.message });
  }
});
