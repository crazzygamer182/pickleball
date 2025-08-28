-- Add announcements table for ladder announcements

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    message text NOT NULL,
    ladder_id uuid REFERENCES ladders(id) ON DELETE CASCADE,
    is_template boolean DEFAULT false,
    template_vars jsonb, -- For storing template variables like {"winner": "X", "loser": "Y", "streak": "Z"}
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    is_active boolean DEFAULT true
);

-- Insert some default templates
INSERT INTO announcements (title, message, is_template, template_vars) VALUES
('Match Result', '🎾 {winner} has defeated {loser}! {winner} is now on a {streak} match winning streak! 🔥', true, '{"winner": "", "loser": "", "streak": ""}'),
('New Player', 'Welcome {player} to the {ladder} ladder! Ranked at #{rank}', true, '{"player": "", "ladder": "", "rank": ""}'),
('Streak Milestone', '🔥 {player} has reached a {streak} match winning streak! Incredible performance!', true, '{"player": "", "streak": ""}'),
('Ranking Change', '📈 {player} has moved up to rank #{rank} in the {ladder} ladder!', true, '{"player": "", "rank": "", "ladder": ""}'); 