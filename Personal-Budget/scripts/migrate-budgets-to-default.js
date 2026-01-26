const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  console.log('Migrating budgets to fixed "default" system...\n');

  // Get all categories
  const { data: categories } = await supabase
    .from('budget_categories')
    .select('id, name');

  // Get all transactions from Oct 2025 through Jan 2026
  const { data: transactions } = await supabase
    .from('budget_transactions')
    .select('category_id, amount, date')
    .gte('date', '2025-10-01')
    .lte('date', '2026-01-31')
    .eq('ignored', false);

  // Calculate total activity per category
  const activityByCategory = {};
  transactions?.forEach(t => {
    if (!activityByCategory[t.category_id]) {
      activityByCategory[t.category_id] = 0;
    }
    activityByCategory[t.category_id] += Math.abs(t.amount);
  });

  // Delete all existing monthly budgets
  console.log('Deleting existing monthly budgets...');
  const { data: existingBudgets } = await supabase
    .from('budget_monthly_budgets')
    .select('id');

  if (existingBudgets && existingBudgets.length > 0) {
    const ids = existingBudgets.map(b => b.id);
    const { error: deleteError } = await supabase
      .from('budget_monthly_budgets')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.log('Error deleting:', deleteError.message);
    } else {
      console.log(`Deleted ${ids.length} existing budget records`);
    }
  }

  // Create new default budgets with assigned = total activity / 4 (average monthly)
  // Use fixed date '2000-01-01' to indicate "applies to all months"
  console.log('\nCreating new default budgets:\n');

  for (const cat of categories || []) {
    const totalActivity = activityByCategory[cat.id] || 0;
    const monthlyAverage = Math.round(totalActivity / 4 * 100) / 100; // 4 months, round to 2 decimals

    if (totalActivity > 0) {
      const { error } = await supabase
        .from('budget_monthly_budgets')
        .insert({
          month: '2000-01-01',
          category_id: cat.id,
          budget_amount: monthlyAverage
        });

      if (error) {
        console.log(`Error for ${cat.name}: ${error.message}`);
      } else {
        console.log(`${cat.name}: Assigned = $${monthlyAverage.toFixed(2)} (total activity: $${totalActivity.toFixed(2)})`);
      }
    }
  }

  console.log('\nDone! Budgets are now fixed across all months.');
}

main();
