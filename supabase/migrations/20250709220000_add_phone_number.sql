-- Add phone number field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT; 