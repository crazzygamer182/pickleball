-- Add winning streaks and trends to ladder memberships

-- Add streak and trend columns to ladder_memberships table
ALTER TABLE ladder_memberships 
ADD COLUMN winning_streak integer DEFAULT 0,
ADD COLUMN trend text DEFAULT 'none' CHECK (trend IN ('up', 'down', 'none'));

-- Update existing memberships to have default values
UPDATE ladder_memberships 
SET winning_streak = 0, trend = 'none' 
WHERE winning_streak IS NULL OR trend IS NULL; 