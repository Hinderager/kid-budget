const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Get Gifts category ID
  const { data: cats } = await supabase
    .from('budget_categories')
    .select('id')
    .eq('name', 'Gifts')
    .single();

  const giftsId = cats.id;
  console.log('Gifts ID:', giftsId);

  // Update amazon_order_items
  const { data: item } = await supabase
    .from('amazon_order_items')
    .update({ category_id: giftsId })
    .ilike('item_name', '%INTO THE AM%')
    .select();
  console.log('Updated amazon item:', item?.length || 0);

  // Update budget_transactions
  const { data: tx } = await supabase
    .from('budget_transactions')
    .update({ category_id: giftsId })
    .ilike('description', '%INTO THE AM%')
    .select();
  console.log('Updated transaction:', tx?.length || 0);

  console.log('Done!');
}
main();
