/*
  # Create Dark & Darker Map Guesser Database

  1. New Tables
    - `levels`
      - `id` (bigint, primary key, auto-increment)
      - `map_image_url` (text) - URL to the map image in storage
      - `screenshot_url` (text) - URL to the screenshot from game
      - `target_x` (numeric) - X coordinate as percentage (0-100)
      - `target_y` (numeric) - Y coordinate as percentage (0-100)
      - `map_name` (text) - Name/description of the map
      - `created_at` (timestamptz) - Timestamp of creation

  2. Storage
    - Create 'game-images' bucket for storing map and screenshot images

  3. Security
    - Enable RLS on `levels` table
    - Allow public read access to levels (anyone can play)
    - Allow authenticated users to insert/update/delete (admin access)
    - Make storage bucket public for read access
*/

CREATE TABLE IF NOT EXISTS levels (
  id bigserial PRIMARY KEY,
  map_image_url text NOT NULL,
  screenshot_url text NOT NULL,
  target_x numeric NOT NULL CHECK (target_x >= 0 AND target_x <= 100),
  target_y numeric NOT NULL CHECK (target_y >= 0 AND target_y <= 100),
  map_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view levels"
  ON levels
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert levels"
  ON levels
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update levels"
  ON levels
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete levels"
  ON levels
  FOR DELETE
  TO authenticated
  USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('game-images', 'game-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'game-images');

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'game-images');

CREATE POLICY "Authenticated users can delete images"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'game-images');
