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
  const topShelfId = catMap['Top Shelf'];
  const insuranceId = catMap['Insurance & Healthcare'];

  console.log('Category IDs:', { childFamilyId, topShelfId, insuranceId });

  const items = [
    // Order 113-2124853-8586656 - Nov 1
    { order_number: '113-2124853-8586656', order_date: '2025-11-01', order_total: 35.52, item_name: 'evpct Eyebrow Stencils Kit', quantity: 1, item_price: 8.99, category_id: childFamilyId, subcategory: 'Activities' },
    { order_number: '113-2124853-8586656', order_date: '2025-11-01', order_total: 35.52, item_name: 'wet n wild Liquid Eyeliner Black', quantity: 1, item_price: 5.47, category_id: childFamilyId, subcategory: 'Activities' },
    { order_number: '113-2124853-8586656', order_date: '2025-11-01', order_total: 35.52, item_name: 'Garnier Micellar Cleansing Water 3.4oz', quantity: 1, item_price: 4.06, category_id: childFamilyId, subcategory: 'Activities' },
    // Order 113-1072144-3490667 - Oct 30
    { order_number: '113-1072144-3490667', order_date: '2025-10-30', order_total: 7.77, item_name: 'NYX Makeup Setting Spray Matte', quantity: 1, item_price: 7.77, category_id: childFamilyId, subcategory: 'Activities' },
    // Order 113-8574434-4501844 - Oct 29
    { order_number: '113-8574434-4501844', order_date: '2025-10-29', order_total: 4.21, item_name: 'Kiss Strip Eyelash Adhesive Clear', quantity: 1, item_price: 4.21, category_id: childFamilyId, subcategory: 'Activities' },
    // Order 113-4314046-3374653 - Oct 29
    { order_number: '113-4314046-3374653', order_date: '2025-10-29', order_total: 84.07, item_name: 'wet n wild Color Icon Cream Eyeliner Blue Lah Lah', quantity: 1, item_price: 1.94, category_id: childFamilyId, subcategory: 'Activities' },
    { order_number: '113-4314046-3374653', order_date: '2025-10-29', order_total: 84.07, item_name: 'Buyers Products 1306600 Solenoid Switch', quantity: 1, item_price: 45.61, category_id: topShelfId, subcategory: null },
    // Order 113-7319809-8437055 - Oct 28
    { order_number: '113-7319809-8437055', order_date: '2025-10-28', order_total: 8.47, item_name: 'Nerdwax Glasses Wax', quantity: 1, item_price: 8.47, category_id: insuranceId, subcategory: 'Vision' },
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
