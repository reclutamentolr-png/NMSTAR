-- Migration: Add "Preventivi" (quotes) tool — reusable business/issuer
-- profile (logo + company data, filled once and reused on every quote) and
-- the quotes themselves (client data, line items, total). Owner-only RLS
-- throughout, same pattern as digital_receipts — no public sharing table is
-- needed here since quotes are only downloaded/shared as a PDF by the owner,
-- never viewed by an anonymous link.

CREATE TABLE IF NOT EXISTS quote_issuer_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  vat_number TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  logo_path TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quote_issuer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own issuer profile"
  ON quote_issuer_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_number INTEGER NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_vat TEXT,
  issue_date DATE NOT NULL DEFAULT current_date,
  valid_until DATE,
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, quote_number)
);

CREATE INDEX IF NOT EXISTS quotes_user_id_idx ON quotes (user_id);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own quotes"
  ON quotes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public bucket (logos aren't sensitive) so the PDF generator can `fetch()`
-- the logo client-side by its public URL, same reasoning as receipt-photos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-logos', 'quote-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Quote owner can upload own logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quote-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Quote owner can update own logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'quote-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Quote owner can delete own logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'quote-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
