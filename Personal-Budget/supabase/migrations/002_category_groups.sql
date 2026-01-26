-- Create table for category groups
CREATE TABLE IF NOT EXISTS budget_category_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL CHECK (group_name IN ('Bills', 'Needs', 'Wants')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id)
);

-- Insert default group assignments
INSERT INTO budget_category_groups (category_id, group_name)
SELECT id, 'Bills' FROM budget_categories WHERE name = 'Housing'
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO budget_category_groups (category_id, group_name)
SELECT id, 'Bills' FROM budget_categories WHERE name = 'Utilities & Communication'
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO budget_category_groups (category_id, group_name)
SELECT id, 'Bills' FROM budget_categories WHERE name = 'Insurance & Healthcare'
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO budget_category_groups (category_id, group_name)
SELECT id, 'Bills' FROM budget_categories WHERE name = 'Debt Payments'
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO budget_category_groups (category_id, group_name)
SELECT id, 'Needs' FROM budget_categories WHERE name = 'Food'
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO budget_category_groups (category_id, group_name)
SELECT id, 'Needs' FROM budget_categories WHERE name = 'Transportation'
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO budget_category_groups (category_id, group_name)
SELECT id, 'Needs' FROM budget_categories WHERE name = 'Child & Family'
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO budget_category_groups (category_id, group_name)
SELECT id, 'Wants' FROM budget_categories WHERE name = 'Personal & Discretionary'
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO budget_category_groups (category_id, group_name)
SELECT id, 'Wants' FROM budget_categories WHERE name = 'Miscellaneous'
ON CONFLICT (category_id) DO NOTHING;
