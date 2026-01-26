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

  const foodId = catMap['Food'];
  const housingId = catMap['Housing'];
  const tamiId = catMap['Tami'];
  const ericId = catMap['Eric'];
  const groomingId = catMap['Grooming'];
  const miscId = catMap['Miscellaneous'];

  console.log('Category IDs:', { foodId, housingId, tamiId, ericId, groomingId, miscId });

  const items = [
    // Single-item orders (price known)
    { order_number: '113-2043313-2349051', order_date: '2026-01-25', order_total: 10.59, item_name: 'Fire & Smoke Society Potato Slayer Seasoning 5oz', quantity: 1, item_price: 10.59, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '113-0630013-6983456', order_date: '2026-01-19', order_total: 161.52, item_name: 'Yale Assure Lock 2 Smart Lock Satin Nickel', quantity: 1, item_price: 161.52, category_id: housingId, subcategory: 'Maintenance' },
    { order_number: '113-8759268-7012238', order_date: '2026-01-19', order_total: 13.77, item_name: 'Shower Steamers Aromatherapy 8-Pack', quantity: 1, item_price: 13.77, category_id: tamiId, subcategory: null },
    { order_number: '113-0482890-2280204', order_date: '2026-01-18', order_total: 16.95, item_name: 'riemot Mens Furry House Slippers', quantity: 1, item_price: 16.95, category_id: ericId, subcategory: null },

    // Order with single item type but qty > 1 (can calculate price)
    { order_number: '113-3155774-0785841', order_date: '2026-01-24', order_total: 115.06, item_name: 'SunButter No Sugar Added 16oz', quantity: 11, item_price: 10.46, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '113-6659122-8261030', order_date: '2026-01-24', order_total: 16.20, item_name: 'Traditional Medicinals Peppermint Tea 16ct', quantity: 3, item_price: 5.40, category_id: foodId, subcategory: 'Groceries' },

    // Multi-item orders (prices TBD)
    // Order 113-8358278-9963455 ($33.91)
    { order_number: '113-8358278-9963455', order_date: '2026-01-24', order_total: 33.91, item_name: 'MK Lighter Extended Flex Neck 4-Pack', quantity: 1, item_price: null, category_id: miscId, subcategory: null },
    { order_number: '113-8358278-9963455', order_date: '2026-01-24', order_total: 33.91, item_name: 'King Arthur Gluten Free Pancake Mix 15oz', quantity: 1, item_price: null, category_id: foodId, subcategory: 'Groceries' },

    // Order 113-7889135-2754625 ($53.76)
    { order_number: '113-7889135-2754625', order_date: '2026-01-19', order_total: 53.76, item_name: 'CYMPHW Back Scrubber for Shower 15.7in', quantity: 1, item_price: null, category_id: groomingId, subcategory: null },
    { order_number: '113-7889135-2754625', order_date: '2026-01-19', order_total: 53.76, item_name: 'CeraVe SA Lotion Rough & Bumpy Skin 8oz', quantity: 1, item_price: null, category_id: groomingId, subcategory: null },
    { order_number: '113-7889135-2754625', order_date: '2026-01-19', order_total: 53.76, item_name: 'CeraVe Acne Foaming Cream Wash 5oz', quantity: 1, item_price: null, category_id: groomingId, subcategory: null },

    // Whole Foods order 114-3650967-9286602 ($257.32)
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'Organic Slicer Tomato', quantity: 1, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'SUNSET Flavor Bombs Tomatoes On-The-Vine 12oz', quantity: 2, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'Applegate Chicken & Maple Breakfast Sausage Patties 16oz', quantity: 2, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'Bobs Red Mill Organic Steel Cut Oats 24oz', quantity: 4, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'Evol Egg and Green Chile Burrito 6oz', quantity: 10, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'Horizon Organic Heavy Whipping Cream 16oz', quantity: 2, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: '365 Organic Black Beans 15oz', quantity: 6, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'Whole Foods Tiramisu Slice 3oz', quantity: 1, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: '4th & Heart Original Grass-Fed Ghee 9oz', quantity: 1, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'Organic Strawberries 1lb', quantity: 1, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'Lemons 2lb Bag', quantity: 1, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'Cucumber', quantity: 3, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'Grape-Nuts Original Cereal 20.5oz', quantity: 1, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'Whole Foods Brioche Hot Dog Buns 9.52oz', quantity: 1, item_price: null, category_id: foodId, subcategory: 'Groceries' },
    { order_number: '114-3650967-9286602', order_date: '2026-01-24', order_total: 257.32, item_name: 'Red Raspberries 6oz', quantity: 2, item_price: null, category_id: foodId, subcategory: 'Groceries' },
  ];

  const { data, error } = await supabase
    .from('amazon_order_items')
    .insert(items)
    .select();

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Inserted', data.length, 'items');

    const withPrice = data.filter(i => i.item_price !== null).length;
    const needsPrice = data.filter(i => i.item_price === null).length;
    console.log('- With price:', withPrice);
    console.log('- Needs price:', needsPrice);
  }
}

main();
