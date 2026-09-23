-- Free-text payment details (e.g. bank transfer + IBAN + account holder)
-- shown in a dedicated footer section of the quote PDF, next to Notes —
-- kept as a single flexible field rather than separate IBAN/holder columns
-- since payment method varies a lot per business (bank transfer, PayPal,
-- cash on delivery, etc.).
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_info TEXT;
