const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Get max sort_order
  const { data: categories } = await supabase
    .from('budget_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = (categories?.[0]?.sort_order || 0) + 1;

  // Create Home category
  const { data: newCat, error: catError } = await supabase
    .from('budget_categories')
    .insert({
      name: 'Home',
      subcategories: ['Maintenance', 'Supplies'],
      color: '#8B4513',  // Saddle brown - home-like color
      icon: 'home',
      sort_order: nextSortOrder
    })
    .select()
    .single();

  if (catError) {
    console.log('Error creating category:', catError.message);
    return;
  }

  console.log('Created category:', newCat.name, '(id:', newCat.id + ')');
  console.log('Subcategories:', newCat.subcategories);

  // Add to Expenses group
  const { error: groupError } = await supabase
    .from('budget_category_groups')
    .insert({
      category_id: newCat.id,
      group_name: 'Expenses'
    });

  if (groupError) {
    console.log('Error adding to group:', groupError.message);
    return;
  }

  console.log('Added to group: Expenses');
  console.log('Done!');
}
main();
