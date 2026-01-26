const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data: cat, error: fetchError } = await supabase
    .from('budget_categories')
    .select('id, name, subcategories')
    .eq('name', 'Insurance & Healthcare')
    .single();

  if (fetchError) {
    console.log('Error fetching:', fetchError.message);
    return;
  }

  console.log('Current subcategories:', cat.subcategories);

  if (cat.subcategories.includes('State Farm')) {
    console.log('State Farm already exists!');
    return;
  }

  const newSubs = [...cat.subcategories, 'State Farm'];

  const { error: updateError } = await supabase
    .from('budget_categories')
    .update({ subcategories: newSubs })
    .eq('id', cat.id);

  if (updateError) {
    console.log('Error updating:', updateError.message);
  } else {
    console.log('Added State Farm subcategory');
    console.log('New subcategories:', newSubs);
  }
}
main();
