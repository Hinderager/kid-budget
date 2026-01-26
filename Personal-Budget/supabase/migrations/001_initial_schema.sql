-- Personal Budget App Database Schema
-- Run this in Supabase SQL Editor

-- Categories table
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subcategories TEXT[] DEFAULT '{}',
  color TEXT NOT NULL,
  icon TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

-- Transactions table
CREATE TABLE IF NOT EXISTS budget_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category_id UUID REFERENCES budget_categories(id),
  ignored BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Category rules for auto-categorization
CREATE TABLE IF NOT EXISTS budget_category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_pattern TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES budget_categories(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Import history
CREATE TABLE IF NOT EXISTS budget_import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  transactions_imported INTEGER DEFAULT 0,
  duplicates_skipped INTEGER DEFAULT 0,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly budgets
CREATE TABLE IF NOT EXISTS budget_monthly_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  category_id UUID REFERENCES budget_categories(id) NOT NULL,
  budget_amount DECIMAL(12, 2) NOT NULL,
  UNIQUE(month, category_id)
);

-- Settings
CREATE TABLE IF NOT EXISTS budget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON budget_transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON budget_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ignored ON budget_transactions(ignored);
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_month ON budget_monthly_budgets(month);
CREATE INDEX IF NOT EXISTS idx_category_rules_pattern ON budget_category_rules(match_pattern);

-- Seed categories
INSERT INTO budget_categories (name, subcategories, color, icon, sort_order) VALUES
  ('Housing', ARRAY['Rent/Mortgage', 'Insurance', 'Property Tax', 'Maintenance', 'HOA'], '#3B82F6', 'home', 1),
  ('Utilities & Communication', ARRAY['Electric', 'Gas', 'Water', 'Trash', 'Internet', 'Cell Phones', 'Streaming'], '#06B6D4', 'zap', 2),
  ('Food', ARRAY['Groceries', 'Dining Out', 'Coffee', 'School Lunches'], '#22C55E', 'utensils', 3),
  ('Transportation', ARRAY['Car Payments', 'Fuel', 'Insurance', 'Maintenance', 'Parking'], '#F97316', 'car', 4),
  ('Insurance & Healthcare', ARRAY['Health', 'Dental', 'Vision', 'Prescriptions', 'Medical Bills'], '#EF4444', 'heart', 5),
  ('Child & Family', ARRAY['Childcare', 'School', 'Activities', 'Sports', 'Babysitting'], '#EC4899', 'users', 6),
  ('Debt Payments', ARRAY['Credit Cards', 'Student Loans', 'Personal Loans'], '#8B5CF6', 'credit-card', 7),
  ('Personal & Discretionary', ARRAY['Clothing', 'Grooming', 'Hobbies', 'Entertainment', 'Gifts'], '#EAB308', 'shopping-bag', 8),
  ('Miscellaneous', ARRAY['Irregular Expenses', 'Surprises', 'One-offs'], '#6B7280', 'more-horizontal', 9)
ON CONFLICT DO NOTHING;

-- Initialize default settings
INSERT INTO budget_settings (key, value) VALUES
  ('monthly_pool', '{"amount": 0}')
ON CONFLICT (key) DO NOTHING;
