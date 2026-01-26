const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Update Boys Pajamas price
  const { data: pjs } = await supabase
    .from('amazon_order_items')
    .update({ item_price: 16.72 })
    .ilike('item_name', '%Childrens Place Boys%')
    .select();
  console.log('Updated Boys Pajamas:', pjs?.length || 0, 'items');

  const { data: tx1 } = await supabase
    .from('budget_transactions')
    .update({ amount: -16.72 })
    .ilike('description', '%Childrens Place Boys%')
    .select();
  console.log('Updated Boys Pajamas transaction:', tx1?.length || 0);

  // Update Girls Pajamas price
  const { data: gpjs } = await supabase
    .from('amazon_order_items')
    .update({ item_price: 16.99 })
    .ilike('item_name', '%Vopmocld Girls%')
    .select();
  console.log('Updated Girls Pajamas:', gpjs?.length || 0, 'items');

  const { data: tx2 } = await supabase
    .from('budget_transactions')
    .update({ amount: -16.99 })
    .ilike('description', '%Vopmocld Girls%')
    .select();
  console.log('Updated Girls Pajamas transaction:', tx2?.length || 0);

  console.log('Done!');
}
main();
