const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Get Housing category
  const { data: housing, error: fetchError } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('name', 'Housing')
    .single();

  if (fetchError) {
    console.log('Error fetching Housing:', fetchError.message);
    return;
  }

  console.log('Current subcategories:', housing.subcategories);

  // Remove Maintenance from subcategories
  const newSubcategories = housing.subcategories.filter(s => s !== 'Maintenance');

  const { error: updateError } = await supabase
    .from('budget_categories')
    .update({ subcategories: newSubcategories })
    .eq('id', housing.id);

  if (updateError) {
    console.log('Error updating:', updateError.message);
    return;
  }

  console.log('Updated subcategories:', newSubcategories);
  console.log('Done!');
}
main();
