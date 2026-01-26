const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  console.log('Consolidating income into a single master category...\n');

  // Get all categories in the Income group
  const { data: incomeGroupAssignments } = await supabase
    .from('budget_category_groups')
    .select('category_id')
    .eq('group_name', 'Income');

  const incomeCategoryIds = incomeGroupAssignments?.map(g => g.category_id) || [];
  console.log('Found', incomeCategoryIds.length, 'income categories');

  // Get the income category details
  const { data: incomeCategories } = await supabase
    .from('budget_categories')
    .select('*')
    .in('id', incomeCategoryIds);

  console.log('Income categories:', incomeCategories?.map(c => c.name).join(', '));

  // Create the new master Income category with subcategories
  const subcategoryNames = incomeCategories?.map(c => c.name) || [];

  const { data: newIncomeCat, error: createError } = await supabase
    .from('budget_categories')
    .insert({
      name: 'Income',
      subcategories: subcategoryNames,
      color: '#22c55e', // green
      icon: 'dollar-sign',
      sort_order: 0 // Put at top
    })
    .select()
    .single();

  if (createError) {
    console.log('Error creating Income category:', createError.message);
    return;
  }

  console.log('\nCreated master Income category with ID:', newIncomeCat.id);
  console.log('Subcategories:', subcategoryNames.join(', '));

  // Move transactions from old income categories to new Income category
  for (const oldCat of incomeCategories || []) {
    const { data: transactions } = await supabase
      .from('budget_transactions')
      .select('id')
      .eq('category_id', oldCat.id);

    if (transactions && transactions.length > 0) {
      const ids = transactions.map(t => t.id);
      const { error: updateError } = await supabase
        .from('budget_transactions')
        .update({
          category_id: newIncomeCat.id,
          subcategory: oldCat.name // Use old category name as subcategory
        })
        .in('id', ids);

      if (updateError) {
        console.log(`Error moving transactions for ${oldCat.name}:`, updateError.message);
      } else {
        console.log(`Moved ${transactions.length} transactions from "${oldCat.name}" to Income > ${oldCat.name}`);
      }
    }
  }

  // Delete old income category group assignments
  const { error: deleteGroupError } = await supabase
    .from('budget_category_groups')
    .delete()
    .in('category_id', incomeCategoryIds);

  if (deleteGroupError) {
    console.log('Error deleting group assignments:', deleteGroupError.message);
  } else {
    console.log('\nDeleted old income group assignments');
  }

  // Delete old income categories
  const { error: deleteCatError } = await supabase
    .from('budget_categories')
    .delete()
    .in('id', incomeCategoryIds);

  if (deleteCatError) {
    console.log('Error deleting old categories:', deleteCatError.message);
  } else {
    console.log('Deleted old income categories');
  }

  // Note: We're NOT adding Income to any group - it will be displayed specially
  console.log('\nDone! Income is now a single master category with subcategories.');
  console.log('The Dashboard will need to display it specially (not in any group).');
}

main();
