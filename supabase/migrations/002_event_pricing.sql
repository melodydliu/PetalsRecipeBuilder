-- ============================================================
-- Move pricing fields from recipes to events
-- Services fees, tax rate, and margin target are now set at
-- the event level rather than per-recipe.
-- ============================================================

-- Add pricing columns to events
ALTER TABLE events
  ADD COLUMN delivery_fee  numeric(8,2),
  ADD COLUMN setup_fee     numeric(8,2),
  ADD COLUMN teardown_fee  numeric(8,2),
  ADD COLUMN tax_rate      numeric(5,2),
  ADD COLUMN margin_target numeric(5,2);

-- Remove pricing columns from recipes
ALTER TABLE recipes
  DROP COLUMN delivery_fee,
  DROP COLUMN setup_fee,
  DROP COLUMN teardown_fee,
  DROP COLUMN tax_rate,
  DROP COLUMN margin_target;
