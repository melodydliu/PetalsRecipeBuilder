-- Add fee type columns to studio_settings (default 'flat' for backwards compat)
ALTER TABLE studio_settings
  ADD COLUMN default_delivery_fee_type text NOT NULL DEFAULT 'flat'
    CHECK (default_delivery_fee_type IN ('flat', 'percentage')),
  ADD COLUMN default_setup_fee_type    text NOT NULL DEFAULT 'flat'
    CHECK (default_setup_fee_type IN ('flat', 'percentage')),
  ADD COLUMN default_teardown_fee_type text NOT NULL DEFAULT 'flat'
    CHECK (default_teardown_fee_type IN ('flat', 'percentage'));

-- Add fee type columns to events (nullable — falls back to studio defaults)
ALTER TABLE events
  ADD COLUMN delivery_fee_type  text CHECK (delivery_fee_type IN ('flat', 'percentage')),
  ADD COLUMN setup_fee_type     text CHECK (setup_fee_type IN ('flat', 'percentage')),
  ADD COLUMN teardown_fee_type  text CHECK (teardown_fee_type IN ('flat', 'percentage'));
