-- Add location fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS preferred_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS travel_radius_km INTEGER DEFAULT 20;

-- Add comments for documentation
COMMENT ON COLUMN users.preferred_latitude IS 'Preferred playing location latitude (optional)';
COMMENT ON COLUMN users.preferred_longitude IS 'Preferred playing location longitude (optional)';
COMMENT ON COLUMN users.travel_radius_km IS 'Maximum travel distance in kilometers (default 20km)'; 