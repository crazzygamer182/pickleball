-- Improve score tracking to store actual submitted scores and winners

-- Add fields to store the actual score strings and winners that each player submitted
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player1_score_string TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player2_score_string TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player1_winner_submitted TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player2_winner_submitted TEXT;

-- Update existing records to have empty strings instead of null for the new text fields
UPDATE matches SET 
    player1_score_string = '',
    player2_score_string = '',
    player1_winner_submitted = '',
    player2_winner_submitted = ''
WHERE player1_score_string IS NULL OR player2_score_string IS NULL OR player1_winner_submitted IS NULL OR player2_winner_submitted IS NULL; 