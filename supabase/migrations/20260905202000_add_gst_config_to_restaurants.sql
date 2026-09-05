-- Add GST configuration columns to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS gst_config JSONB DEFAULT '{"enabled": true, "cgst": 9, "sgst": 9, "igst": 18, "useIGST": false}'::jsonb,
ADD COLUMN IF NOT EXISTS gstin VARCHAR(100) DEFAULT '';
