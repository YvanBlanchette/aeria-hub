-- Add the client role required for client portal accounts.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CLIENT';
