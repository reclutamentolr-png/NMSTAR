-- Migration: replace the 4 ad-hoc listing categories with subito.it's
-- top-level taxonomy (12 categories), per explicit request.
--
-- Drop the old constraint FIRST — remapping to new category values below
-- would otherwise violate it (it only allows the 4 old values) before the
-- new one is in place.
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_category_check;

-- Remap existing data (old value 'prodotti' has no direct equivalent — the
-- one existing 'prodotti' listing is a PC, so it maps to 'elettronica';
-- 'servizi' is unchanged, already a category in the new taxonomy too;
-- 'collaborazioni'/'eventi' have no existing rows at migration time but are
-- mapped to their closest new equivalents in case that changes before this
-- runs).
UPDATE listings SET category = 'elettronica' WHERE category = 'prodotti';
UPDATE listings SET category = 'impresa' WHERE category = 'collaborazioni';
UPDATE listings SET category = 'tempo_libero' WHERE category = 'eventi';

ALTER TABLE listings ADD CONSTRAINT listings_category_check
  CHECK (category = ANY (ARRAY[
    'veicoli', 'immobili', 'elettronica', 'moda', 'casa_persona', 'tempo_libero',
    'colf_badanti', 'agricoltura', 'animali', 'lavoro', 'impresa', 'servizi'
  ]::text[]));
