import { Client } from 'pg';

function normalizeBaseUrl(value: string | undefined): string {
  const raw = value?.trim() || 'http://localhost:3000';

  try {
    return new URL(raw).toString().replace(/\/+$/, '');
  } catch {
    return 'http://localhost:3000';
  }
}

export async function ensureQrCodeSchema(databaseUrl: string): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  const baseUrl = normalizeBaseUrl(
    process.env.QR_PUBLIC_BASE_URL ?? process.env.FRONTEND_URL,
  );

  await client.connect();

  try {
    const tableResult = await client.query<{
      qr_codes_table: string | null;
      plants_table: string | null;
    }>(
      `SELECT to_regclass('public.qr_codes') AS qr_codes_table,
              to_regclass('public.plants') AS plants_table`,
    );

    const tables = tableResult.rows[0];
    if (!tables?.qr_codes_table || !tables?.plants_table) {
      return;
    }

    const columnResult = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'qr_codes'
           AND column_name = 'code'
       ) AS "exists"`,
    );

    if (!columnResult.rows[0]?.exists) {
      await client.query(
        `ALTER TABLE public.qr_codes ADD COLUMN code character varying(500)`,
      );
    }

    const variantIdColumnResult = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'qr_codes'
           AND column_name = 'variant_id'
       ) AS "exists"`,
    );

    if (!variantIdColumnResult.rows[0]?.exists) {
      await client.query(
        `ALTER TABLE public.qr_codes ADD COLUMN variant_id integer`,
      );
    }

    await client.query(
      `UPDATE public.qr_codes AS q
       SET code = COALESCE(
         NULLIF(BTRIM(q.code), ''),
         NULLIF(BTRIM(p.qr_code_url), ''),
         $1 || '/plant/' || q.plant_id::text ||
           CASE
             WHEN q.variant_id IS NOT NULL THEN '?variantId=' || q.variant_id::text
             ELSE ''
           END,
         'legacy://qr-codes/' || q.id::text
       )
       FROM public.plants AS p
       WHERE p.id = q.plant_id
         AND (q.code IS NULL OR BTRIM(q.code) = '')`,
      [baseUrl],
    );

    await client.query(
      `UPDATE public.qr_codes AS q
       SET code = COALESCE(
         NULLIF(BTRIM(q.code), ''),
         $1 || '/plant/' || q.plant_id::text ||
           CASE
             WHEN q.variant_id IS NOT NULL THEN '?variantId=' || q.variant_id::text
             ELSE ''
           END,
         'legacy://qr-codes/' || q.id::text
       )
       WHERE (q.code IS NULL OR BTRIM(q.code) = '')`,
      [baseUrl],
    );

    // Safety net: ensure absolutely no null or empty codes remain
    await client.query(
      `UPDATE public.qr_codes
       SET code = 'legacy://qr-codes/' || id::text
       WHERE code IS NULL OR BTRIM(code) = ''`,
    );

    // Verify no nulls remain before setting NOT NULL
    const nullCheck = await client.query<{ null_count: string }>(
      `SELECT COUNT(*) as null_count FROM public.qr_codes WHERE code IS NULL`,
    );
    const remainingNulls = parseInt(nullCheck.rows[0]?.null_count ?? '0', 10);
    console.log(`[ensureQrCodeSchema] Remaining null codes: ${remainingNulls}`);

    if (remainingNulls > 0) {
      console.warn(
        `[ensureQrCodeSchema] WARNING: ${remainingNulls} rows still have null QR code values`,
      );
    }

    // Prevent TypeORM sync error: explicitly set NOT NULL
    await client.query(
      `ALTER TABLE public.qr_codes ALTER COLUMN code SET NOT NULL`,
    );
  } finally {
    await client.end();
  }
}
