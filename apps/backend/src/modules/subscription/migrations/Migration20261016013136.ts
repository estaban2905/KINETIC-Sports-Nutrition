import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261016013136 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "subscription" add column if not exists "reminder_sent_for" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "subscription" drop column if exists "reminder_sent_for";`);
  }

}
