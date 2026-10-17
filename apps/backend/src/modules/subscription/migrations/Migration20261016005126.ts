import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261016005126 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "subscription" add column if not exists "inscription_token" text null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_inscription_token" ON "subscription" ("inscription_token") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_subscription_inscription_token";`);
    this.addSql(`alter table if exists "subscription" drop column if exists "inscription_token";`);
  }

}
