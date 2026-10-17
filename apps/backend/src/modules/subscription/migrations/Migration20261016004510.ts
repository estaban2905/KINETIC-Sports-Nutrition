import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261016004510 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "subscription_cycle" drop constraint if exists "subscription_cycle_subscription_id_period_key_unique";`);
    this.addSql(`create table if not exists "subscription" ("id" text not null, "customer_id" text not null, "variant_id" text not null, "quantity" integer not null default 1, "status" text check ("status" in ('pending_card', 'active', 'paused', 'past_due', 'cancelled')) not null default 'pending_card', "frequency_days" integer not null default 30, "discount_percent" integer not null default 15, "next_billing_date" text null, "payment_token_ref" text null, "card_brand" text null, "card_last4" text null, "shipping_address" jsonb null, "welcome_gift_given" boolean not null default false, "terms_accepted_at" timestamptz null, "cancelled_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "subscription_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_deleted_at" ON "subscription" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_customer_id" ON "subscription" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_status_next_billing_date" ON "subscription" ("status", "next_billing_date") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "subscription_cycle" ("id" text not null, "subscription_id" text not null, "period_key" text not null, "status" text check ("status" in ('reserved', 'charged_pending_order', 'completed', 'failed')) not null default 'reserved', "attempt" integer not null default 1, "amount" integer null, "order_id" text null, "attempted_at" timestamptz null, "error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "subscription_cycle_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_cycle_deleted_at" ON "subscription_cycle" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_subscription_cycle_subscription_id_period_key_unique" ON "subscription_cycle" ("subscription_id", "period_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_cycle_status" ON "subscription_cycle" ("status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "subscription" cascade;`);

    this.addSql(`drop table if exists "subscription_cycle" cascade;`);
  }

}
