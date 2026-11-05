-- Add INSTRUKTUR and ASISTEN_DOSEN to Role enum
ALTER TYPE "Role" ADD VALUE 'INSTRUKTUR';
ALTER TYPE "Role" ADD VALUE 'ASISTEN_DOSEN';

-- Remove INSTRUKTUR and ASISTEN_DOSEN from SubRole enum (no longer used as subroles)
-- Note: PostgreSQL doesn't support removing enum values.
-- We keep them in SubRole but they won't be used for new users.
