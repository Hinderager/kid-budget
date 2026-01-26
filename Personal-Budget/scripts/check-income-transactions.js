const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  // Get Income category IDs
  const { data: incomeCategories } = await supabase
    .from('budget_category_groups')
    .select('category_id')
    .eq('group_name', 'Income');

  if (!incomeCategories || incomeCategories.length === 0) {
    console.log('No Income categories found');
    return;
  }

  const incomeCategoryIds = incomeCategories.map(c => c.category_id);
  console.log('Income category IDs:', incomeCategoryIds);

  // Get transactions for income categories
  const { data: transactions } = await supabase
    .from('budget_transactions')
    .select('id, date, description, amount, category_id')
    .in('category_id', incomeCategoryIds)
    .order('date', { ascending: false })
    .limit(50);

  console.log('\nIncome transactions:');
  transactions?.forEach(t => {
    const sign = t.amount < 0 ? 'NEGATIVE' : 'POSITIVE';
    const desc = t.description.substring(0, 40);
    console.log(t.date + ' | ' + sign + ' | $' + t.amount.toFixed(2) + ' | ' + desc);
  });

  const negativeCount = transactions?.filter(t => t.amount < 0).length || 0;
  const positiveCount = transactions?.filter(t => t.amount > 0).length || 0;

  console.log('\nSummary: ' + positiveCount + ' positive, ' + negativeCount + ' negative');
}

main();
