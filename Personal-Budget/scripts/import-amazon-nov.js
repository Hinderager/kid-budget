const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Get category IDs
  const { data: cats } = await supabase
    .from('budget_categories')
    .select('id, name, subcategories');

  const catMap = {};
  cats.forEach(c => catMap[c.name] = c);

  const foodId = catMap['Food'].id;
  const childFamilyId = catMap['Child & Family'].id;
  const tamiId = catMap['Tami'].id;

  console.log('Category IDs:', { foodId, childFamilyId, tamiId });

  // Check if Activities subcategory exists in Child & Family, add if not
  const childFamily = catMap['Child & Family'];
  if (!childFamily.subcategories.includes('Activities')) {
    const newSubs = [...childFamily.subcategories, 'Activities'];
    await supabase
      .from('budget_categories')
      .update({ subcategories: newSubs })
      .eq('id', childFamilyId);
    console.log('Added Activities subcategory to Child & Family');
  }

  const items = [
    { order_number: '114-6170235-7298653', order_date: '2025-11-19', order_total: 50.01, item_name: 'King Arthur Gluten Free Pancake Mix 15oz (10-pack)', quantity: 10, item_price: 5.00, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '113-8817271-3753020', order_date: '2025-11-19', order_total: 22.14, item_name: 'Wireless Earbuds Bluetooth 5.4', quantity: 1, item_price: 22.14, category_id: childFamilyId, subcategory: 'Misc' },
    { order_number: '113-3247602-3193064', order_date: '2025-11-15', order_total: 74.18, item_name: 'Adidas Samba Indoor Size 6', quantity: 1, item_price: 74.18, category_id: childFamilyId, subcategory: 'Clothing' },
    { order_number: '113-3932764-7187435', order_date: '2025-11-12', order_total: 34.95, item_name: 'Anoumcy Oversized Camo Hoodie Womens', quantity: 1, item_price: 34.95, category_id: tamiId, subcategory: null },
    { order_number: '113-7705688-0431444', order_date: '2025-11-08', order_total: 28.61, item_name: 'KONG Maxx Ballistic Dog Toy Rhino Large', quantity: 1, item_price: 28.61, category_id: childFamilyId, subcategory: 'Pets' },
    { order_number: '113-2427013-1619458', order_date: '2025-11-03', order_total: 19.05, item_name: 'Teenitor Makeup Sponges 48pc', quantity: 1, item_price: 6.99, category_id: childFamilyId, subcategory: 'Activities' },
    { order_number: '113-2427013-1619458', order_date: '2025-11-03', order_total: 19.05, item_name: 'Cuttte Eyeshadow Applicators 60pc', quantity: 1, item_price: 5.07, category_id: childFamilyId, subcategory: 'Activities' },
    { order_number: '113-6914663-0841014', order_date: '2025-11-03', order_total: 23.92, item_name: 'e.l.f. No Budge Retractable Eyeliner Black', quantity: 2, item_price: 6.00, category_id: childFamilyId, subcategory: 'Activities' },
    { order_number: '113-6914663-0841014', order_date: '2025-11-03', order_total: 23.92, item_name: 'wet n wild Mega Last Eyeliner Black', quantity: 2, item_price: 2.96, category_id: childFamilyId, subcategory: 'Activities' },
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
