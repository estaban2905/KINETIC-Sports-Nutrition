import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260923011953 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_content" ("id" text not null, "badge" text null, "rating" real not null default 5, "features" jsonb null, "nutrition_facts" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_content_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_content_deleted_at" ON "product_content" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_content" cascade;`);
  }

}
