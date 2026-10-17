import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261015040438 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "invoice_document" drop constraint if exists "invoice_document_order_id_unique";`);
    this.addSql(`create table if not exists "invoice_document" ("id" text not null, "order_id" text not null, "tipo" text check ("tipo" in ('boleta', 'factura')) not null, "status" text check ("status" in ('emitting', 'emitted', 'review')) not null default 'emitting', "folio" integer null, "codigo_tipo" integer null, "fecha" text null, "ambiente" integer null, "total" integer null, "last_error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_document_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_document_deleted_at" ON "invoice_document" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoice_document_order_id_unique" ON "invoice_document" ("order_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "invoice_document" cascade;`);
  }

}
