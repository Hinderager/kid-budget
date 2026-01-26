const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Update INTO THE AM price
  const { data: intoAm } = await supabase
    .from('amazon_order_items')
    .update({ item_price: 52.95 })
    .ilike('item_name', '%INTO THE AM%')
    .select();
  console.log('Updated INTO THE AM:', intoAm?.length || 0, 'items');

  // Update Oakley price
  const { data: oakley } = await supabase
    .from('amazon_order_items')
    .update({ item_price: 15.28 })
    .ilike('item_name', '%Oakley%')
    .select();
  console.log('Updated Oakley:', oakley?.length || 0, 'items');

  // Also update the budget transactions
  const { data: tx1 } = await supabase
    .from('budget_transactions')
    .update({ amount: -52.95 })
    .ilike('description', '%INTO THE AM%')
    .select();
  console.log('Updated INTO THE AM transaction:', tx1?.length || 0);

  const { data: tx2 } = await supabase
    .from('budget_transactions')
    .update({ amount: -15.28 })
    .ilike('description', '%Oakley%')
    .select();
  console.log('Updated Oakley transaction:', tx2?.length || 0);

  console.log('Done! Price difference: $' + (52.95 + 15.28 - 36.17 - 36.16).toFixed(2));
}
main();
