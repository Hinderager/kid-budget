const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Get Insurance & Healthcare category ID
  const { data: cat } = await supabase
    .from('budget_categories')
    .select('id, name')
    .eq('name', 'Insurance & Healthcare')
    .single();

  if (!cat) {
    console.log('Insurance & Healthcare category not found');
    return;
  }

  // Find all transactions with Vision subcategory
  const { data: transactions, error: fetchError } = await supabase
    .from('budget_transactions')
    .select('id, description, amount, date, subcategory')
    .eq('category_id', cat.id)
    .eq('subcategory', 'Vision');

  if (fetchError) {
    console.log('Error fetching:', fetchError.message);
    return;
  }

  console.log('Found', transactions.length, 'transactions under Vision:');
  transactions.forEach(t => {
    console.log('  ' + t.date + ' | ' + t.description.substring(0, 40) + ' | $' + Math.abs(t.amount).toFixed(2));
  });

  if (transactions.length === 0) {
    console.log('Nothing to recategorize!');
    return;
  }

  // Update all to Medical Bills subcategory
  const ids = transactions.map(t => t.id);
  const { error: updateError } = await supabase
    .from('budget_transactions')
    .update({ subcategory: 'Medical Bills' })
    .in('id', ids);

  if (updateError) {
    console.log('Error updating:', updateError.message);
  } else {
    console.log('\nSuccessfully recategorized', transactions.length, 'transactions to Medical Bills');
  }
}
main();
