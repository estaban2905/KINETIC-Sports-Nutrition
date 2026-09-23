import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260923131121 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "landing_final_cta" ("id" text not null, "badge_text" text not null, "headline" text not null, "headline_highlight" text not null, "subtext" text not null, "guarantee_text" text not null, "cta_text" text not null default 'Comprar Ahora', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_final_cta_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_landing_final_cta_deleted_at" ON "landing_final_cta" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "landing_guarantee" ("id" text not null, "icon" text not null, "title" text not null, "subtitle" text not null, "context" text not null default 'product_section', "active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_guarantee_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_landing_guarantee_deleted_at" ON "landing_guarantee" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "landing_nav_link" ("id" text not null, "label" text not null, "url" text not null, "group" text not null, "active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_nav_link_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_landing_nav_link_deleted_at" ON "landing_nav_link" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "landing_product_section" ("id" text not null, "eyebrow" text not null, "headline" text not null, "tagline" text not null, "micro_label" text not null, "formula_heading" text not null, "advantages_heading" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_product_section_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_landing_product_section_deleted_at" ON "landing_product_section" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "landing_trust_badge" ("id" text not null, "icon" text null, "text" text not null, "active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_trust_badge_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_landing_trust_badge_deleted_at" ON "landing_trust_badge" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "landing_usage_tip" ("id" text not null, "title" text not null, "body" text not null, "active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "landing_usage_tip_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_landing_usage_tip_deleted_at" ON "landing_usage_tip" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "landing_banner" add column if not exists "tag" text null;`);

    this.addSql(`alter table if exists "landing_hero" add column if not exists "headline_highlight" text null;`);

    this.addSql(`alter table if exists "landing_settings" add column if not exists "footer_description" text null, add column if not exists "whatsapp_message_template" text null, add column if not exists "whatsapp_tooltip_text" text null, add column if not exists "offer_fallback_headline" text null, add column if not exists "offer_fallback_subtitle" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "landing_final_cta" cascade;`);

    this.addSql(`drop table if exists "landing_guarantee" cascade;`);

    this.addSql(`drop table if exists "landing_nav_link" cascade;`);

    this.addSql(`drop table if exists "landing_product_section" cascade;`);

    this.addSql(`drop table if exists "landing_trust_badge" cascade;`);

    this.addSql(`drop table if exists "landing_usage_tip" cascade;`);

    this.addSql(`alter table if exists "landing_banner" drop column if exists "tag";`);

    this.addSql(`alter table if exists "landing_hero" drop column if exists "headline_highlight";`);

    this.addSql(`alter table if exists "landing_settings" drop column if exists "footer_description", drop column if exists "whatsapp_message_template", drop column if exists "whatsapp_tooltip_text", drop column if exists "offer_fallback_headline", drop column if exists "offer_fallback_subtitle";`);
  }

}
