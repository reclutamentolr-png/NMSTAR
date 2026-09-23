-- Adds City, Postal Code, Province and PEC (certified email) to the quote
-- issuer profile — requested to round out the business letterhead beyond
-- the free-text "address" field already there.
ALTER TABLE quote_issuer_profiles
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS pec TEXT;
