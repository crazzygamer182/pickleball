-- Add Women's Ladder
INSERT INTO ladders (name, type, fee) VALUES
  ('Women''s Ladder', 'women', 10)
ON CONFLICT (id) DO NOTHING; 