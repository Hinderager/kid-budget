const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Find all transactions with "AMAZON" (uppercase) in description
  const { data: amazonTx, error: fetchError } = await supabase
    .from('budget_transactions')
    .select('id, description, amount, date, ignored')
    .like('description', '%AMAZON%');

  if (fetchError) {
    console.log('Error fetching:', fetchError.message);
    return;
  }

  console.log('Found', amazonTx.length, 'transactions with "AMAZON" (uppercase)');

  // Filter to only non-ignored ones
  const toIgnore = amazonTx.filter(t => !t.ignored);
  console.log('Already ignored:', amazonTx.length - toIgnore.length);
  console.log('To be ignored:', toIgnore.length);

  if (toIgnore.length === 0) {
    console.log('Nothing to ignore!');
    return;
  }

  // Show sample
  console.log('\nSample transactions to ignore:');
  toIgnore.slice(0, 10).forEach(t => {
    console.log(`  ${t.date} | ${t.description.substring(0, 50)} | $${Math.abs(t.amount).toFixed(2)}`);
  });

  // Calculate totals
  const expenses = toIgnore.filter(t => t.amount < 0);
  const inflows = toIgnore.filter(t => t.amount > 0);
  const expenseTotal = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const inflowTotal = inflows.reduce((sum, t) => sum + t.amount, 0);

  console.log('\nExpenses:', expenses.length, 'transactions, $' + expenseTotal.toFixed(2));
  console.log('Inflows:', inflows.length, 'transactions, $' + inflowTotal.toFixed(2));

  // Update to ignored
  const ids = toIgnore.map(t => t.id);
  const { error: updateError } = await supabase
    .from('budget_transactions')
    .update({ ignored: true })
    .in('id', ids);

  if (updateError) {
    console.log('Error updating:', updateError.message);
  } else {
    console.log('\nSuccessfully ignored', toIgnore.length, 'transactions!');
  }
}
main();
