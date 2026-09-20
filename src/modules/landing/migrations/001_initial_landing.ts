/**
 * Migration 001: Initial Landing Content Tables
 * Creates relational PostgreSQL schema for marketing and brand content
 */

export const upSql = `
-- 1. Hero Content
CREATE TABLE IF NOT EXISTS landing_hero_content (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT NOT NULL,
  badge VARCHAR(100) DEFAULT 'NUEVA FÓRMULA CFM',
  primary_cta_text VARCHAR(100) DEFAULT 'Comprar Ahora',
  primary_cta_url VARCHAR(255) DEFAULT '#producto',
  secondary_cta_text VARCHAR(100) DEFAULT 'Ver Beneficios',
  secondary_cta_url VARCHAR(255) DEFAULT '#beneficios',
  image_url VARCHAR(500) NOT NULL,
  mobile_image_url VARCHAR(500),
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Landing Benefits
CREATE TABLE IF NOT EXISTS landing_benefit (
  id VARCHAR(64) PRIMARY KEY,
  icon VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Landing Testimonials
CREATE TABLE IF NOT EXISTS landing_testimonial (
  id VARCHAR(64) PRIMARY KEY,
  customer_name VARCHAR(150) NOT NULL,
  customer_image VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  is_demo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Landing FAQ
CREATE TABLE IF NOT EXISTS landing_faq (
  id VARCHAR(64) PRIMARY KEY,
  question VARCHAR(300) NOT NULL,
  answer TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Promotional Banners
CREATE TABLE IF NOT EXISTS landing_banner (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(300) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  button_text VARCHAR(100) DEFAULT 'Ver Oferta',
  button_url VARCHAR(255) DEFAULT '#oferta',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Brand Settings & SEO
CREATE TABLE IF NOT EXISTS landing_settings (
  id VARCHAR(64) PRIMARY KEY,
  brand_name VARCHAR(150) NOT NULL,
  logo_url VARCHAR(500) NOT NULL,
  favicon_url VARCHAR(500) NOT NULL,
  primary_color VARCHAR(30) DEFAULT '#a3e635',
  secondary_color VARCHAR(30) DEFAULT '#dc2626',
  whatsapp_number VARCHAR(50) NOT NULL,
  instagram_url VARCHAR(255) NOT NULL,
  tiktok_url VARCHAR(255) NOT NULL,
  facebook_url VARCHAR(255) NOT NULL,
  contact_email VARCHAR(150) NOT NULL,
  shipping_information TEXT NOT NULL,
  footer_text TEXT NOT NULL,
  privacy_policy VARCHAR(500) NOT NULL,
  terms_and_conditions VARCHAR(500) NOT NULL,
  seo_title VARCHAR(255) NOT NULL,
  seo_description TEXT NOT NULL,
  og_image VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

export const downSql = `
DROP TABLE IF EXISTS landing_settings CASCADE;
DROP TABLE IF EXISTS landing_banner CASCADE;
DROP TABLE IF EXISTS landing_faq CASCADE;
DROP TABLE IF EXISTS landing_testimonial CASCADE;
DROP TABLE IF EXISTS landing_benefit CASCADE;
DROP TABLE IF EXISTS landing_hero_content CASCADE;
`;
