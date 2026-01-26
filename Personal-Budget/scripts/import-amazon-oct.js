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

  const tamiId = catMap['Tami'];
  const childFamilyId = catMap['Child & Family'];
  const foodId = catMap['Food'];

  console.log('Category IDs:', { tamiId, childFamilyId, foodId });

  const items = [
    // Order 113-7510098-9274645 - Oct 28
    { order_number: '113-7510098-9274645', order_date: '2025-10-28', order_total: 33.92, item_name: 'BEARPAW Womens Boot Socks 4-Pack', quantity: 1, item_price: 33.92, category_id: tamiId, subcategory: null },
    // Order 113-2678679-4692208 - Oct 28
    { order_number: '113-2678679-4692208', order_date: '2025-10-28', order_total: 8.58, item_name: 'Blue Turkey Feather Boa', quantity: 1, item_price: 8.58, category_id: childFamilyId, subcategory: 'Activities' },
    // Order 113-0861357-2521829 - Oct 24 Whole Foods
    { order_number: '113-0861357-2521829', order_date: '2025-10-24', order_total: 165.71, item_name: 'Whole Foods Market Groceries', quantity: 1, item_price: 165.71, category_id: foodId, subcategory: 'Groceries' },
    // Order 113-7433535-5889067 - Oct 22
    { order_number: '113-7433535-5889067', order_date: '2025-10-22', order_total: 37.09, item_name: 'OLAOLA Dinosaur Onesie Costume', quantity: 1, item_price: 37.09, category_id: childFamilyId, subcategory: 'Clothing' },
    // Order 113-2031060-9653068 - Oct 20
    { order_number: '113-2031060-9653068', order_date: '2025-10-20', order_total: 27.55, item_name: 'Steampunk Vintage Tailcoat Jacket Halloween', quantity: 1, item_price: 27.55, category_id: childFamilyId, subcategory: 'Activities' },
    // Order 113-5884380-6717858 - Oct 18
    { order_number: '113-5884380-6717858', order_date: '2025-10-18', order_total: 39.83, item_name: 'Clown Propeller Hat and Suspenders', quantity: 1, item_price: 14.99, category_id: childFamilyId, subcategory: 'Activities' },
    { order_number: '113-5884380-6717858', order_date: '2025-10-18', order_total: 39.83, item_name: 'Cerebro Knee High Socks Kids', quantity: 1, item_price: 8.99, category_id: childFamilyId, subcategory: 'Activities' },
    // Order 113-5985272-6388216 - Oct 18
    { order_number: '113-5985272-6388216', order_date: '2025-10-18', order_total: 207.43, item_name: 'Halloween Costume Accessories White Red', quantity: 1, item_price: 26.99, category_id: childFamilyId, subcategory: 'Activities' },
    { order_number: '113-5985272-6388216', order_date: '2025-10-18', order_total: 207.43, item_name: 'Yellow T-Shirt Size 14', quantity: 1, item_price: 14.99, category_id: childFamilyId, subcategory: 'Activities' },
    { order_number: '113-5985272-6388216', order_date: '2025-10-18', order_total: 207.43, item_name: 'Cat Eye Lashes 5 Pairs', quantity: 1, item_price: 6.74, category_id: childFamilyId, subcategory: 'Activities' },
    { order_number: '113-5985272-6388216', order_date: '2025-10-18', order_total: 207.43, item_name: 'Sheepskin Insoles Women 8', quantity: 1, item_price: 9.99, category_id: childFamilyId, subcategory: 'Activities' },
    { order_number: '113-5985272-6388216', order_date: '2025-10-18', order_total: 207.43, item_name: 'Cotton Gloves 2 Pairs', quantity: 1, item_price: 18.73, category_id: childFamilyId, subcategory: 'Activities' },
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
