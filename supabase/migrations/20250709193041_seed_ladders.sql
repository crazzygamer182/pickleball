-- Seed data for Tennis Ladder System

-- Insert the two ladders
INSERT INTO ladders (name, type, fee) VALUES
  ('Competitive', 'competitive', 10),
  ('Casual', 'casual', 5)
ON CONFLICT (id) DO NOTHING;
