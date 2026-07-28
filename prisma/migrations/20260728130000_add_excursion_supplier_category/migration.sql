-- Add missing enum value used by the app for supplier category.
ALTER TYPE "SupplierCategory" ADD VALUE IF NOT EXISTS 'EXCURSION';