-- Add active column to pickleball_ladder_memberships table
-- New rows will default to true, but we'll set existing rows to false

-- Add the column with default true for future inserts
ALTER TABLE pickleball_ladder_memberships
ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

-- Set all existing rows to false
UPDATE pickleball_ladder_memberships
SET active = false;