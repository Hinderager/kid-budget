const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Get category IDs
  const { data: cats } = await supabase
    .from('budget_categories')
    .select('id, name');

  const catMap = {};
  cats.forEach(c => catMap[c.name] = c.id);

  const childFamilyId = catMap['Child & Family'];
  const groomingId = catMap['Grooming'];
  const foodId = catMap['Food'];

  console.log('Category IDs:', { childFamilyId, groomingId, foodId });

  const items = [
    // Order 113-5472138-5621036 - Oct 9
    { order_number: '113-5472138-5621036', order_date: '2025-10-09', order_total: 59.34, item_name: 'SALIA GIRL Sport Cami Bras', quantity: 2, item_price: 29.67, category_id: childFamilyId, subcategory: 'Clothing' },
    // Order 113-0905006-7113869 - Oct 7
    { order_number: '113-0905006-7113869', order_date: '2025-10-07', order_total: 55.94, item_name: 'Starface Hydro-Star + Salicylic Acid Pimple Patches 32ct', quantity: 1, item_price: 15.29, category_id: groomingId, subcategory: null },
    { order_number: '113-0905006-7113869', order_date: '2025-10-07', order_total: 55.94, item_name: 'Starface Hydro-Star Clear Big Pack 96ct', quantity: 1, item_price: 23.99, category_id: groomingId, subcategory: null },
    { order_number: '113-0905006-7113869', order_date: '2025-10-07', order_total: 55.94, item_name: 'Starface Hydro-Stars Pimple Patches 32ct', quantity: 1, item_price: 16.66, category_id: groomingId, subcategory: null },
    // Order 113-6053024-4049064 - Oct 4
    { order_number: '113-6053024-4049064', order_date: '2025-10-04', order_total: 12.70, item_name: 'Pet Proof Door Lever Lock', quantity: 1, item_price: 12.70, category_id: childFamilyId, subcategory: 'Pets' },
    // Order 114-0383222-2689068 - Sep 28
    { order_number: '114-0383222-2689068', order_date: '2025-09-28', order_total: 33.08, item_name: 'Tasty Bite Jasmine Rice 12-pack', quantity: 1, item_price: 33.08, category_id: foodId, subcategory: 'Groceries' },
  ];

  const { data: inserted, error: insertError } = await supabase
    .from('amazon_order_items')
    .insert(items)
    .select();

  if (insertError) {
    console.log('Error inserting items:', insertError.message);
    return;
  }
  console.log('Inserted', inserted.length, 'Amazon items');

  // Convert to budget transactions
  const transactions = inserted.map(item => ({
    transaction_id: `AMAZON-${item.order_number}-${item.id}`,
    date: item.order_date,
    description: `Amazon: ${item.item_name}`,
    amount: -(item.item_price * item.quantity),
    category_id: item.category_id,
    subcategory: item.subcategory,
    ignored: false
  }));

  const { data: txResult, error: txError } = await supabase
    .from('budget_transactions')
    .insert(transactions)
    .select();

  if (txError) {
    console.log('Error creating transactions:', txError.message);
  } else {
    console.log('Created', txResult.length, 'budget transactions');
    const total = txResult.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    console.log('Total added: $' + total.toFixed(2));
  }
}
main();
