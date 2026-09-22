import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260920215943 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "landing_banner" ("id" text not null, "title" text not null, "subtitle" text not null, "image_url" text not null, "button_text" text not null default 'Ver Oferta', "button_url" text not null default '#oferta', "start_date" timestamptz not null, "end_date" timestamptz not null, "active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_banner_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_landing_banner_deleted_at" ON "landing_banner" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "landing_benefit" ("id" text not null, "icon" text not null, "title" text not null, "description" text not null, "stat" text null, "stat_label" text null, "active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_benefit_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_landing_benefit_deleted_at" ON "landing_benefit" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "landing_faq" ("id" text not null, "question" text not null, "answer" text not null, "category" text null, "active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_faq_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_landing_faq_deleted_at" ON "landing_faq" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "landing_hero" ("id" text not null, "title" text not null, "subtitle" text not null, "badge" text not null default 'NUEVA FÓRMULA CFM', "primary_cta_text" text not null default 'Comprar Ahora', "primary_cta_url" text not null default '#producto', "secondary_cta_text" text not null default 'Ver Beneficios', "secondary_cta_url" text not null default '#beneficios', "image_url" text not null, "mobile_image_url" text null, "active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_hero_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_landing_hero_deleted_at" ON "landing_hero" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "landing_settings" ("id" text not null, "brand_name" text not null, "logo_url" text not null, "favicon_url" text not null, "primary_color" text not null default '#a3e635', "secondary_color" text not null default '#dc2626', "whatsapp_number" text not null, "instagram_url" text null, "tiktok_url" text null, "facebook_url" text null, "contact_email" text not null, "shipping_information" text not null, "footer_text" text not null, "privacy_policy" text null, "terms_and_conditions" text null, "seo_title" text not null, "seo_description" text not null, "og_image" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_landing_settings_deleted_at" ON "landing_settings" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "landing_testimonial" ("id" text not null, "customer_name" text not null, "customer_image" text null, "role" text null, "content" text not null, "rating" integer not null default 5, "product_purchased" text null, "verified" boolean not null default true, "active" boolean not null default true, "sort_order" integer not null default 0, "is_demo" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_testimonial_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_landing_testimonial_deleted_at" ON "landing_testimonial" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "landing_banner" cascade;`);

    this.addSql(`drop table if exists "landing_benefit" cascade;`);

    this.addSql(`drop table if exists "landing_faq" cascade;`);

    this.addSql(`drop table if exists "landing_hero" cascade;`);

    this.addSql(`drop table if exists "landing_settings" cascade;`);

    this.addSql(`drop table if exists "landing_testimonial" cascade;`);
  }

}
