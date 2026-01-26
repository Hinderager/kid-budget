const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Get Child & Family category ID
  const { data: cat } = await supabase
    .from('budget_categories')
    .select('id')
    .eq('name', 'Child & Family')
    .single();

  const childFamilyId = cat.id;

  // Update amazon_order_items
  const { data: item } = await supabase
    .from('amazon_order_items')
    .update({ category_id: childFamilyId, subcategory: 'Clothing' })
    .ilike('item_name', '%Camo Hoodie%')
    .select();
  console.log('Updated amazon item:', item?.length || 0);

  // Update budget_transactions
  const { data: tx } = await supabase
    .from('budget_transactions')
    .update({ category_id: childFamilyId, subcategory: 'Clothing' })
    .ilike('description', '%Camo Hoodie%')
    .select();
  console.log('Updated transaction:', tx?.length || 0);

  console.log('Done!');
}
main();
