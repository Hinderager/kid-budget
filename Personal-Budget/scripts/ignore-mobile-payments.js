const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Find all transactions with "mobile payment" or "mobile banking payment" (case insensitive)
  const { data: mobileTx, error: fetchError } = await supabase
    .from('budget_transactions')
    .select('id, description, amount, date, ignored')
    .or('description.ilike.%mobile payment%,description.ilike.%mobile banking payment%');

  if (fetchError) {
    console.log('Error fetching:', fetchError.message);
    return;
  }

  console.log('Found', mobileTx.length, 'transactions with "mobile payment"');

  // Filter to only non-ignored ones
  const toIgnore = mobileTx.filter(t => !t.ignored);
  console.log('Already ignored:', mobileTx.length - toIgnore.length);
  console.log('To be ignored:', toIgnore.length);

  if (toIgnore.length === 0) {
    console.log('Nothing to ignore!');
    return;
  }

  // Show all
  console.log('\nTransactions to ignore:');
  toIgnore.forEach(t => {
    console.log(`  ${t.date} | ${t.description.substring(0, 50)} | $${Math.abs(t.amount).toFixed(2)}`);
  });

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
