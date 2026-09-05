-- Migration: Add receipt_preference to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS receipt_preference VARCHAR(50) DEFAULT 'whatsapp';
