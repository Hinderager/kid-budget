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

  const homeId = catMap['Home'];
  const groomingId = catMap['Grooming'];
  const tamiId = catMap['Tami'];
  const giftsId = catMap['Gifts'];

  console.log('Category IDs:', { homeId, groomingId, tamiId, giftsId });

  const items = [
    { order_number: '112-8808243-2447420', order_date: '2025-12-29', order_total: 45.30, item_name: 'GE RPWFE Refrigerator Water Filter', quantity: 1, item_price: 45.30, category_id: homeId, subcategory: 'Supplies' },
    { order_number: '113-9644151-8429814', order_date: '2025-12-21', order_total: 7.41, item_name: 'Boar Bristle Slick Back Hair Brush', quantity: 1, item_price: 7.41, category_id: groomingId, subcategory: null },
    { order_number: '113-1700506-2974603', order_date: '2025-12-21', order_total: 13.77, item_name: 'Wet Dry Vac Filter VF4000', quantity: 1, item_price: 13.77, category_id: homeId, subcategory: 'Supplies' },
    { order_number: '113-3922674-3598605', order_date: '2025-12-20', order_total: 24.26, item_name: 'Yoga Racerback Tank Top Gray', quantity: 1, item_price: 24.26, category_id: tamiId, subcategory: null },
    { order_number: '113-0313167-9105820', order_date: '2025-12-19', order_total: 48.63, item_name: 'Yoga Racerback Tank Tops Black + White', quantity: 2, item_price: 24.315, category_id: tamiId, subcategory: null },
    { order_number: '113-9985232-4308216', order_date: '2025-12-18', order_total: 6.22, item_name: 'The Goldfish Boy (Book)', quantity: 1, item_price: 6.22, category_id: giftsId, subcategory: null },
    { order_number: '113-3622830-9566648', order_date: '2025-12-15', order_total: 10.59, item_name: 'ANRABESS Womens Turtleneck Shirt Black', quantity: 1, item_price: 10.59, category_id: tamiId, subcategory: null },
    { order_number: '113-4745644-9332251', order_date: '2025-12-15', order_total: 29.12, item_name: 'ANRABESS Long Sleeve Shirts 3-Pack', quantity: 3, item_price: 9.71, category_id: tamiId, subcategory: null },
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
