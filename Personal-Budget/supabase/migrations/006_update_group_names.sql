-- Update the check constraint to allow new group names
ALTER TABLE budget_category_groups
DROP CONSTRAINT IF EXISTS budget_category_groups_group_name_check;

ALTER TABLE budget_category_groups
ADD CONSTRAINT budget_category_groups_group_name_check
CHECK (group_name IN ('Fixed Bills', 'Expenses', 'Wants'));

-- Update existing group names
UPDATE budget_category_groups SET group_name = 'Fixed Bills' WHERE group_name = 'Bills';
UPDATE budget_category_groups SET group_name = 'Expenses' WHERE group_name = 'Needs';
