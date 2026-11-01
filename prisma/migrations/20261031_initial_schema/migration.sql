-- ============================================================
-- PDF Field Mapper - Initial Supabase PostgreSQL migration
-- Save to: prisma/migrations/20261031_initial_schema/migration.sql
-- ============================================================
-- The first section corresponds to the Prisma schema (including
-- the additional AdminUser model). Keep schema.prisma in sync.
-- The latter section adds Supabase-specific authorization,
-- row-level security, and database-managed updated_at timestamps.
-- Do not run this file through the Supabase SQL Editor if you plan
-- to track it with Prisma Migrate; use `prisma migrate deploy`.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FieldCategory" AS ENUM ('CUSTOMER', 'COMPANY', 'JOB_PROPERTY', 'GENERIC');

-- CreateEnum
CREATE TYPE "MappingSource" AS ENUM ('EXACT_MATCH', 'PAGE_TEMPLATE', 'GLOBAL_ALIAS', 'NORMALIZED_MATCH', 'FUZZY_MATCH', 'NEARBY_TEXT', 'OCR', 'MANUAL');

-- CreateEnum
CREATE TYPE "MappingScope" AS ENUM ('GLOBAL', 'PAGE_TEMPLATE');

-- CreateTable
CREATE TABLE "dictionary_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "category" "FieldCategory" NOT NULL,
    "description" TEXT,
    "website_supported" BOOLEAN,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dictionary_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_aliases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "original_name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dictionary_key_id" UUID NOT NULL,
    CONSTRAINT "field_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_name" TEXT NOT NULL,
    "document_name" TEXT,
    "page_number" INTEGER,
    "fingerprint" TEXT NOT NULL,
    "fingerprint_version" INTEGER NOT NULL DEFAULT 1,
    "page_width" DOUBLE PRECISION NOT NULL,
    "page_height" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "page_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_template_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "original_field_name" TEXT NOT NULL,
    "widget_index" INTEGER NOT NULL DEFAULT 0,
    "field_type" TEXT,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "page_template_id" UUID NOT NULL,
    "dictionary_key_id" UUID NOT NULL,
    CONSTRAINT "page_template_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapping_confirmations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "original_field_name" TEXT NOT NULL,
    "source" "MappingSource" NOT NULL,
    "scope" "MappingScope" NOT NULL,
    "notes" TEXT,
    "saved_output_id" UUID NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dictionary_key_id" UUID NOT NULL,
    "page_template_id" UUID,
    CONSTRAINT "mapping_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- Only the trusted database administrator adds users to this table.
-- We intentionally manage this table through Prisma as well, so
-- later schema changes do not lose track of it.
CREATE TABLE "admin_users" (
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_keys_key_name_key" ON "dictionary_keys"("key_name");
CREATE INDEX "dictionary_keys_category_idx" ON "dictionary_keys"("category");
CREATE INDEX "dictionary_keys_is_active_idx" ON "dictionary_keys"("is_active");
CREATE UNIQUE INDEX "field_aliases_normalized_name_key" ON "field_aliases"("normalized_name");
CREATE INDEX "field_aliases_dictionary_key_id_idx" ON "field_aliases"("dictionary_key_id");
CREATE INDEX "field_aliases_is_active_idx" ON "field_aliases"("is_active");
CREATE INDEX "page_templates_is_active_idx" ON "page_templates"("is_active");
CREATE UNIQUE INDEX "page_templates_fingerprint_fingerprint_version_key" ON "page_templates"("fingerprint", "fingerprint_version");
CREATE INDEX "page_template_fields_dictionary_key_id_idx" ON "page_template_fields"("dictionary_key_id");
CREATE UNIQUE INDEX "page_template_fields_page_template_id_original_field_name_w_key" ON "page_template_fields"("page_template_id", "original_field_name", "widget_index");
CREATE INDEX "mapping_confirmations_dictionary_key_id_idx" ON "mapping_confirmations"("dictionary_key_id");
CREATE INDEX "mapping_confirmations_page_template_id_idx" ON "mapping_confirmations"("page_template_id");
CREATE INDEX "mapping_confirmations_saved_output_id_idx" ON "mapping_confirmations"("saved_output_id");
CREATE INDEX "mapping_confirmations_confirmed_at_idx" ON "mapping_confirmations"("confirmed_at");

-- AddForeignKey
ALTER TABLE "field_aliases" ADD CONSTRAINT "field_aliases_dictionary_key_id_fkey" FOREIGN KEY ("dictionary_key_id") REFERENCES "dictionary_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "page_template_fields" ADD CONSTRAINT "page_template_fields_page_template_id_fkey" FOREIGN KEY ("page_template_id") REFERENCES "page_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "page_template_fields" ADD CONSTRAINT "page_template_fields_dictionary_key_id_fkey" FOREIGN KEY ("dictionary_key_id") REFERENCES "dictionary_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mapping_confirmations" ADD CONSTRAINT "mapping_confirmations_dictionary_key_id_fkey" FOREIGN KEY ("dictionary_key_id") REFERENCES "dictionary_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mapping_confirmations" ADD CONSTRAINT "mapping_confirmations_page_template_id_fkey" FOREIGN KEY ("page_template_id") REFERENCES "page_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Supabase-specific database safeguards
-- ============================================================

-- A template-scoped confirmation must point to a template;
-- a globally scoped confirmation must not point to one.
ALTER TABLE public.mapping_confirmations
  ADD CONSTRAINT mapping_confirmation_scope_context_check
  CHECK (
    (scope = 'GLOBAL' AND page_template_id IS NULL)
    OR (scope = 'PAGE_TEMPLATE' AND page_template_id IS NOT NULL)
  );

-- Maintain updated_at for changes made through Supabase's API.
-- Prisma's @updatedAt alone does not cover non-Prisma updates.
CREATE OR REPLACE FUNCTION public.mapper_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dictionary_keys_set_updated_at
  BEFORE UPDATE ON public.dictionary_keys
  FOR EACH ROW EXECUTE FUNCTION public.mapper_set_updated_at();

CREATE TRIGGER field_aliases_set_updated_at
  BEFORE UPDATE ON public.field_aliases
  FOR EACH ROW EXECUTE FUNCTION public.mapper_set_updated_at();

CREATE TRIGGER page_templates_set_updated_at
  BEFORE UPDATE ON public.page_templates
  FOR EACH ROW EXECUTE FUNCTION public.mapper_set_updated_at();

CREATE TRIGGER page_template_fields_set_updated_at
  BEFORE UPDATE ON public.page_template_fields
  FOR EACH ROW EXECUTE FUNCTION public.mapper_set_updated_at();

-- ============================================================
-- Administrator authorization
-- ============================================================
-- Postgres/Supabase project administrators add the initial
-- Auth user's UUID to public.admin_users using trusted SQL.
-- No client can insert itself into this table.
-- This SECURITY DEFINER function must be created by the trusted
-- migration owner; it reads admin_users despite its RLS policy.
CREATE OR REPLACE FUNCTION public.is_mapper_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users AS a
    WHERE a.user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_mapper_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_mapper_admin() TO authenticated;

-- The timestamp trigger function is not an RPC endpoint.
REVOKE ALL ON FUNCTION public.mapper_set_updated_at() FROM PUBLIC;

-- ============================================================
-- RLS: deny by default, permit only authenticated admins
-- ============================================================
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dictionary_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapping_confirmations ENABLE ROW LEVEL SECURITY;

-- Supabase commonly grants privileges on new public tables
-- through default privileges. Make permissions explicit here.
REVOKE ALL ON TABLE
  public.admin_users,
  public.dictionary_keys,
  public.field_aliases,
  public.page_templates,
  public.page_template_fields,
  public.mapping_confirmations
FROM PUBLIC, anon, authenticated;

-- No grants or client policies on admin_users: only trusted
-- database operations can assign or revoke administrators.

-- Admins can manage approved keys without hard deleting them.
GRANT SELECT, INSERT, UPDATE ON TABLE public.dictionary_keys TO authenticated;

-- Admins can maintain aliases and template metadata.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.field_aliases,
  public.page_templates,
  public.page_template_fields
TO authenticated;

-- Confirmations are append-only from the desktop client.
GRANT SELECT, INSERT ON TABLE public.mapping_confirmations TO authenticated;

CREATE POLICY dictionary_keys_admin_all
ON public.dictionary_keys
FOR ALL TO authenticated
USING ((SELECT public.is_mapper_admin()))
WITH CHECK ((SELECT public.is_mapper_admin()));

CREATE POLICY field_aliases_admin_all
ON public.field_aliases
FOR ALL TO authenticated
USING ((SELECT public.is_mapper_admin()))
WITH CHECK ((SELECT public.is_mapper_admin()));

CREATE POLICY page_templates_admin_all
ON public.page_templates
FOR ALL TO authenticated
USING ((SELECT public.is_mapper_admin()))
WITH CHECK ((SELECT public.is_mapper_admin()));

CREATE POLICY page_template_fields_admin_all
ON public.page_template_fields
FOR ALL TO authenticated
USING ((SELECT public.is_mapper_admin()))
WITH CHECK ((SELECT public.is_mapper_admin()));

CREATE POLICY mapping_confirmations_admin_read
ON public.mapping_confirmations
FOR SELECT TO authenticated
USING ((SELECT public.is_mapper_admin()));

CREATE POLICY mapping_confirmations_admin_insert
ON public.mapping_confirmations
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.is_mapper_admin()));

-- Notes:
-- * Anonymous clients have no table privileges or RLS policies.
-- * Authenticated non-admins fail all data policies.
-- * No client can grant itself administrator privileges.
-- * The publishable key alone grants no data access.
-- * Do not ship the Postgres URL or service-role key in Electron.
