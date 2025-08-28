-- Add score submission tracking to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player1_score_submitted_by UUID REFERENCES users(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player2_score_submitted_by UUID REFERENCES users(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player1_score_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player2_score_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player1_score_submitted INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player2_score_submitted INTEGER; 