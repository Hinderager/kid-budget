const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Get all amazon items
  const { data: amazonItems } = await supabase
    .from('amazon_order_items')
    .select('*');

  // Get all budget transactions that look like amazon items
  const { data: transactions } = await supabase
    .from('budget_transactions')
    .select('*')
    .ilike('description', 'Amazon:%');

  console.log('Amazon order items:', amazonItems?.length || 0);
  console.log('Budget transactions with "Amazon:" prefix:', transactions?.length || 0);

  if (transactions && transactions.length > 0) {
    console.log('\nExisting Amazon transactions:');
    transactions.forEach(t => {
      console.log(`  ${t.date} | ${t.description.substring(0, 50)} | $${Math.abs(t.amount).toFixed(2)}`);
    });
  }

  // Check which amazon items are NOT yet converted
  const convertedNames = new Set((transactions || []).map(t => t.description.replace('Amazon: ', '')));
  const notConverted = (amazonItems || []).filter(item => !convertedNames.has(item.item_name));

  console.log('\nItems NOT yet converted:', notConverted.length);
  if (notConverted.length > 0) {
    notConverted.forEach(item => {
      console.log(`  ${item.order_date} | ${item.item_name.substring(0, 40)} | $${(item.item_price || 0).toFixed(2)}`);
    });
  }
}
main();
