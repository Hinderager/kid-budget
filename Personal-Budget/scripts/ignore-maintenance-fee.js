const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data: fees, error: fetchError } = await supabase
    .from('budget_transactions')
    .select('id, description, amount, date, ignored')
    .ilike('description', '%monthly maintenance fee%');

  if (fetchError) {
    console.log('Error fetching:', fetchError.message);
    return;
  }

  console.log('Found', fees.length, 'transactions with "monthly maintenance fee"');

  const toIgnore = fees.filter(t => !t.ignored);
  console.log('Already ignored:', fees.length - toIgnore.length);
  console.log('To be ignored:', toIgnore.length);

  if (toIgnore.length === 0) {
    console.log('Nothing to ignore!');
    return;
  }

  console.log('\nTransactions to ignore:');
  toIgnore.forEach(t => {
    console.log(`  ${t.date} | ${t.description.substring(0, 50)} | $${Math.abs(t.amount).toFixed(2)}`);
  });

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
