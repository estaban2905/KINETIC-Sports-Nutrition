import dotenv from "dotenv";

dotenv.config();

/**
 * Medusa 2.x Backend Configuration for Sports Nutrition & Supplement Store
 *
 * This configuration defines:
 * - PostgreSQL relational database persistence
 * - Redis event bus & cache
 * - Strict Store, Admin, and Auth CORS protection
 * - Landing Content Module registration
 * - Storage and multi-currency region providers (Chile CLP, USD, etc.)
 */

export const projectConfig = {
  databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/medusa_kinetic",
  redisUrl: process.env.REDIS_URL,
  http: {
    storeCors: process.env.STORE_CORS || "http://localhost:3000,http://localhost:5173",
    adminCors: process.env.ADMIN_CORS || "http://localhost:3000,http://localhost:7001",
    authCors: process.env.AUTH_CORS || "http://localhost:3000,http://localhost:5173",
    jwtSecret: process.env.JWT_SECRET || "kinetic_default_jwt_secret_change_in_prod",
    cookieSecret: process.env.COOKIE_SECRET || "kinetic_default_cookie_secret_change_in_prod",
  },
};

export const modules = [
  // Custom Landing Content Module (isolated from core commerce)
  {
    resolve: "./src/modules/landing",
    options: {
      defaultLocale: "es-CL",
      enableCache: true,
    },
  },
  // TODO: [STORAGE] Register cloud file service module (@medusajs/file-s3 or @medusajs/file-local):
  // {
  //   resolve: "@medusajs/file-s3",
  //   options: {
  //     s3_url: process.env.STORAGE_URL,
  //     bucket: process.env.STORAGE_BUCKET,
  //     access_key_id: process.env.STORAGE_ACCESS_KEY_ID,
  //     secret_access_key: process.env.STORAGE_SECRET_ACCESS_KEY,
  //   },
  // },
  // TODO: [PAYMENTS] Register official payment providers (@medusajs/payment-stripe / mercadopago plugin):
  // {
  //   resolve: "@medusajs/payment-stripe",
  //   options: {
  //     api_key: process.env.STRIPE_API_KEY,
  //     webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  //   },
  // },
];

export default {
  projectConfig,
  modules,
};
