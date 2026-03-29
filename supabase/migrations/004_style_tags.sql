-- Add style_tags to recipes for template categorisation
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS style_tags text[] NOT NULL DEFAULT '{}';
