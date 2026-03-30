ALTER TABLE events ADD COLUMN is_template BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX events_is_template_idx ON events(studio_id, is_template) WHERE is_template = true;
