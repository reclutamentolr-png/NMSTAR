-- Migration: switch Spendly income and fixed expenses from a
-- year(+month/start_month) model to real date fields — both tables are
-- still empty in production, so this is a straight column swap, no
-- backfill needed.
--
-- spendly_income: "Mese" + "Giorno di pagamento" replaced by a single
-- income_date (same pattern spendly_variable_expenses already uses for
-- expense_date) — simpler to fill in and to display correctly.
--
-- spendly_fixed_expenses: "year" + "start_month" (a month within a single
-- year) replaced by start_date + optional end_date, so a recurring expense
-- can span multiple years (e.g. a 24-month loan) instead of being
-- re-entered every year.

ALTER TABLE spendly_income
  ADD COLUMN IF NOT EXISTS income_date DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE spendly_income DROP COLUMN IF EXISTS year;
ALTER TABLE spendly_income DROP COLUMN IF EXISTS month;
ALTER TABLE spendly_income DROP COLUMN IF EXISTS payment_day;

DROP INDEX IF EXISTS spendly_income_user_year_idx;
CREATE INDEX IF NOT EXISTS spendly_income_user_date_idx ON spendly_income (user_id, income_date);

ALTER TABLE spendly_fixed_expenses
  ADD COLUMN IF NOT EXISTS start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE spendly_fixed_expenses DROP COLUMN IF EXISTS year;
ALTER TABLE spendly_fixed_expenses DROP COLUMN IF EXISTS start_month;

ALTER TABLE spendly_fixed_expenses
  ADD CONSTRAINT spendly_fixed_expenses_date_range_check CHECK (end_date IS NULL OR end_date >= start_date);

DROP INDEX IF EXISTS spendly_fixed_expenses_user_year_idx;
CREATE INDEX IF NOT EXISTS spendly_fixed_expenses_user_date_idx ON spendly_fixed_expenses (user_id, start_date);
