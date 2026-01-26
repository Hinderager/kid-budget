-- Create table for split transactions
CREATE TABLE IF NOT EXISTS budget_transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES budget_transactions(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  memo TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction_id ON budget_transaction_splits(transaction_id);

-- Add is_split column to transactions to mark if a transaction has splits
ALTER TABLE budget_transactions
ADD COLUMN IF NOT EXISTS is_split BOOLEAN DEFAULT false;
