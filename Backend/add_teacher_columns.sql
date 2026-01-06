-- Add gender and address columns to teachers table
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other'));
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS address TEXT;
