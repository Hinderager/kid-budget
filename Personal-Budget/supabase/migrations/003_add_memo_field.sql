-- Add memo field to transactions table
ALTER TABLE budget_transactions
ADD COLUMN IF NOT EXISTS memo TEXT DEFAULT NULL;
