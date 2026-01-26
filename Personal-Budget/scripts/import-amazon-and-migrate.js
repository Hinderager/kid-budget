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

  const homeId = catMap['Home'].id;
  const ericId = catMap['Eric'].id;
  const childFamilyId = catMap['Child & Family'].id;
  const kidsId = catMap['Kids']?.id;

  console.log('Category IDs:', { homeId, ericId, childFamilyId, kidsId });

  // Step 1: Add "Misc" subcategory to Child & Family
  const childFamily = catMap['Child & Family'];
  if (!childFamily.subcategories.includes('Misc')) {
    const newSubs = [...childFamily.subcategories, 'Misc'];
    await supabase
      .from('budget_categories')
      .update({ subcategories: newSubs })
      .eq('id', childFamilyId);
    console.log('Added Misc subcategory to Child & Family');
  }

  // Step 2: Migrate Kids > Misc transactions to Child & Family > Misc
  if (kidsId) {
    const { data: kidsTransactions } = await supabase
      .from('budget_transactions')
      .select('id')
      .eq('category_id', kidsId)
      .eq('subcategory', 'Misc');

    if (kidsTransactions && kidsTransactions.length > 0) {
      const ids = kidsTransactions.map(t => t.id);
      await supabase
        .from('budget_transactions')
        .update({ category_id: childFamilyId, subcategory: 'Misc' })
        .in('id', ids);
      console.log('Migrated', ids.length, 'transactions from Kids > Misc to Child & Family > Misc');
    }

    // Migrate amazon_order_items too
    const { data: kidsAmazon } = await supabase
      .from('amazon_order_items')
      .select('id')
      .eq('category_id', kidsId);

    if (kidsAmazon && kidsAmazon.length > 0) {
      const ids = kidsAmazon.map(t => t.id);
      await supabase
        .from('amazon_order_items')
        .update({ category_id: childFamilyId, subcategory: 'Misc' })
        .in('id', ids);
      console.log('Migrated', ids.length, 'amazon items from Kids to Child & Family > Misc');
    }

    // Delete Kids category group assignment first
    await supabase
      .from('budget_category_groups')
      .delete()
      .eq('category_id', kidsId);
    console.log('Deleted Kids category group assignment');

    // Delete Kids category
    const { error: deleteError } = await supabase
      .from('budget_categories')
      .delete()
      .eq('id', kidsId);

    if (deleteError) {
      console.log('Error deleting Kids category:', deleteError.message);
    } else {
      console.log('Deleted Kids category');
    }
  }

  // Step 3: Import new Amazon items
  const items = [
    { order_number: '113-8808421-2972250', order_date: '2026-01-02', order_total: 9.00, item_name: 'Syncwire Aux Cable 3.5mm Audio Cable', quantity: 1, item_price: 9.00, category_id: homeId, subcategory: 'Supplies' },
    { order_number: '113-9057133-9761810', order_date: '2026-01-02', order_total: 31.75, item_name: 'Giro Bravo II Gel Men Road Cycling Gloves', quantity: 1, item_price: 31.75, category_id: ericId, subcategory: null },
    { order_number: '113-8426815-0527428', order_date: '2026-01-02', order_total: 23.28, item_name: 'CamelBak Podium 24oz Bike Water Bottle', quantity: 1, item_price: 23.28, category_id: ericId, subcategory: null },
    { order_number: '113-7267833-4959458', order_date: '2026-01-02', order_total: 10.59, item_name: '2026 Planner Weekly and Monthly Calendar', quantity: 1, item_price: 10.59, category_id: childFamilyId, subcategory: 'Misc' },
    { order_number: '113-3019930-7669012', order_date: '2026-01-02', order_total: 26.11, item_name: 'ELEGOO PLA Plus Filament 1.75mm White 2KG', quantity: 1, item_price: 26.11, category_id: childFamilyId, subcategory: 'Misc' },
  ];

  const { data: inserted, error: insertError } = await supabase
    .from('amazon_order_items')
    .insert(items)
    .select();

  if (insertError) {
    console.log('Error inserting items:', insertError.message);
  } else {
    console.log('Inserted', inserted.length, 'Amazon items');
  }

  // Step 4: Convert to budget transactions
  const { data: newItems } = await supabase
    .from('amazon_order_items')
    .select('*')
    .in('order_number', items.map(i => i.order_number));

  const transactions = newItems.map(item => ({
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
