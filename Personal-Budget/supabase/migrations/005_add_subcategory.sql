-- Add subcategory field to transactions table
ALTER TABLE budget_transactions
ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT NULL;
