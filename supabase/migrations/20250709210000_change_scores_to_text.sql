-- Change score columns from INTEGER to TEXT for flexible score formats
ALTER TABLE matches ALTER COLUMN player1_score TYPE TEXT;
ALTER TABLE matches ALTER COLUMN player2_score TYPE TEXT;
ALTER TABLE matches ALTER COLUMN player1_score_submitted TYPE TEXT;
ALTER TABLE matches ALTER COLUMN player2_score_submitted TYPE TEXT; 