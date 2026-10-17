import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261016005927 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "subscription" add column if not exists "failed_attempts" integer not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "subscription" drop column if exists "failed_attempts";`);
  }

}
