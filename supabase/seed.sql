-- Seed data for Tennis Ladder System

-- Insert the three ladders
INSERT INTO ladders (name, type, fee) VALUES
  ('Men''s Competitive', 'men_competitive', 10),
  ('Men''s Casual', 'men_casual', 5),
  ('Women''s Ladder', 'women', 10)
ON CONFLICT (id) DO NOTHING; 