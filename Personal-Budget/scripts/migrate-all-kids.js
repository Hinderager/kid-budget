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

  const childFamilyId = catMap['Child & Family'].id;
  const kidsId = catMap['Kids']?.id;

  if (!kidsId) {
    console.log('Kids category already deleted');
    return;
  }

  // Find all Kids transactions
  const { data: allKidsTx } = await supabase
    .from('budget_transactions')
    .select('id, description, subcategory')
    .eq('category_id', kidsId);

  console.log('Found', allKidsTx?.length || 0, 'Kids transactions:');
  allKidsTx?.forEach(t => {
    console.log('  -', t.description.substring(0, 50), '| sub:', t.subcategory);
  });

  if (allKidsTx && allKidsTx.length > 0) {
    // Migrate all to Child & Family > Misc
    const ids = allKidsTx.map(t => t.id);
    await supabase
      .from('budget_transactions')
      .update({ category_id: childFamilyId, subcategory: 'Misc' })
      .in('id', ids);
    console.log('Migrated', ids.length, 'transactions to Child & Family > Misc');
  }

  // Check for any remaining references
  const { data: remaining } = await supabase
    .from('budget_transactions')
    .select('id')
    .eq('category_id', kidsId);

  console.log('Remaining Kids transactions:', remaining?.length || 0);

  if (!remaining || remaining.length === 0) {
    // Delete Kids category
    const { error: deleteError } = await supabase
      .from('budget_categories')
      .delete()
      .eq('id', kidsId);

    if (deleteError) {
      console.log('Error deleting Kids category:', deleteError.message);
    } else {
      console.log('Successfully deleted Kids category');
    }
  }
}
main();
