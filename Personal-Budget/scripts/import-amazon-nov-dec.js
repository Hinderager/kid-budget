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
  const giftsId = catMap['Gifts'];
  const tamiId = catMap['Tami'];
  const ericId = catMap['Eric'];
  const childFamilyId = catMap['Child & Family'];

  console.log('Category IDs:', { homeId, giftsId, tamiId, ericId, childFamilyId });

  // Prices estimated for partial refund orders (split evenly)
  const items = [
    { order_number: '114-6888952-2261820', order_date: '2025-12-15', order_total: 29.55, item_name: 'Samsung Dryer Heating Element and Thermal Fuses', quantity: 1, item_price: 29.55, category_id: homeId, subcategory: 'Maintenance' },
    { order_number: '113-4723155-4745001', order_date: '2025-12-14', order_total: 36.02, item_name: 'Vopmocld Girls Pajama Sets', quantity: 1, item_price: 18.01, category_id: giftsId, subcategory: null },
    { order_number: '113-2981670-0535429', order_date: '2025-12-14', order_total: 37.85, item_name: 'The Childrens Place Boys Pajamas', quantity: 1, item_price: 18.93, category_id: giftsId, subcategory: null },
    { order_number: '113-4406824-5589839', order_date: '2025-12-09', order_total: 27.27, item_name: 'Project 333 Minimalist Fashion Challenge Book', quantity: 1, item_price: 12.74, category_id: tamiId, subcategory: null },
    { order_number: '113-2019323-8737842', order_date: '2025-12-02', order_total: 72.33, item_name: 'Oakley O Bark Shirt', quantity: 1, item_price: 36.17, category_id: giftsId, subcategory: null },
    { order_number: '113-2019323-8737842', order_date: '2025-12-02', order_total: 72.33, item_name: 'INTO THE AM Mens Basic Tees 3-Pack', quantity: 1, item_price: 36.16, category_id: ericId, subcategory: null },
    { order_number: '113-5433487-5903456', order_date: '2025-11-30', order_total: 9.00, item_name: 'Kurdene Wireless Earbuds', quantity: 1, item_price: 9.00, category_id: giftsId, subcategory: null },
    { order_number: '113-0312664-7495403', order_date: '2025-11-24', order_total: 28.61, item_name: 'Redbarn Beef Cheek Rolls for Dogs 4-Pack', quantity: 1, item_price: 28.61, category_id: childFamilyId, subcategory: 'Pets' },
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
