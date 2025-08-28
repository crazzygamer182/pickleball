-- Remove ladder_id from matches table
-- This removes the constraint that matches must belong to a specific ladder

-- Drop the foreign key constraint first
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_ladder_id_fkey;

-- Remove the ladder_id column
ALTER TABLE matches DROP COLUMN IF EXISTS ladder_id; 