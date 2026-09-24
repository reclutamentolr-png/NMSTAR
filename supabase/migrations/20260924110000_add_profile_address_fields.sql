-- Adds residential address fields (indirizzo, città, provincia) to the user
-- profile, requested to round out the "dati anagrafici" collected in
-- ProfileCompleter/ProfileModal beyond name/phone/country.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT;
