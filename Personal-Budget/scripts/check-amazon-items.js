const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase
    .from('amazon_order_items')
    .select('*, budget_categories(name)')
    .order('order_date', { ascending: false });

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Amazon Order Items:', data.length);
  let total = 0;
  data.forEach(item => {
    const price = item.item_price || 0;
    total += price * item.quantity;
    const name = item.item_name.substring(0, 40).padEnd(40);
    const cat = item.budget_categories?.name || 'Uncategorized';
    const sub = item.subcategory || '';
    console.log(`  ${item.order_date} | ${name} | qty:${item.quantity} | $${price.toFixed(2).padStart(7)} | ${cat} > ${sub}`);
  });
  console.log('\nTotal value: $' + total.toFixed(2));
}
main();
