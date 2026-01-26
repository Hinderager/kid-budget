const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  console.log('Cleaning up income categories...\n');

  // The correct Income category
  const correctIncomeId = 'dcae5db0-877e-48e2-99ac-3b42f0e2f99a';

  // The duplicate Income category to delete
  const duplicateIncomeId = '160535c1-f988-4241-bb1f-8f8bdf883bac';

  // Old separate categories that should be merged
  const oldCategoryIds = [
    '8f85a348-3646-441b-aa45-125e7794801b', // Tami
    '1c5378a8-eafb-4de2-8170-fbca40a5bd80', // Top Shelf
  ];

  // 1. Move transactions from duplicate Income to correct Income
  console.log('Moving transactions from duplicate Income category...');
  const { data: dupeTxs } = await supabase
    .from('budget_transactions')
    .select('id, subcategory')
    .eq('category_id', duplicateIncomeId);

  if (dupeTxs && dupeTxs.length > 0) {
    for (const tx of dupeTxs) {
      // If subcategory is "Income", set it to null
      const newSubcat = tx.subcategory === 'Income' ? null : tx.subcategory;
      await supabase
        .from('budget_transactions')
        .update({ category_id: correctIncomeId, subcategory: newSubcat })
        .eq('id', tx.id);
    }
    console.log(`Moved ${dupeTxs.length} transactions`);
  }

  // 2. Move transactions from old Tami/Top Shelf categories
  for (const oldId of oldCategoryIds) {
    const { data: cat } = await supabase
      .from('budget_categories')
      .select('name')
      .eq('id', oldId)
      .single();

    if (!cat) continue;

    const { data: txs } = await supabase
      .from('budget_transactions')
      .select('id')
      .eq('category_id', oldId);

    if (txs && txs.length > 0) {
      const ids = txs.map(t => t.id);
      await supabase
        .from('budget_transactions')
        .update({ category_id: correctIncomeId, subcategory: cat.name })
        .in('id', ids);
      console.log(`Moved ${txs.length} transactions from "${cat.name}" to Income > ${cat.name}`);
    }
  }

  // 3. Delete category rules referencing old categories
  console.log('\nDeleting category rules for old categories...');
  await supabase
    .from('budget_category_rules')
    .delete()
    .in('category_id', [duplicateIncomeId, ...oldCategoryIds]);

  // 4. Delete budget assignments for old categories
  console.log('Deleting budget assignments for old categories...');
  await supabase
    .from('budget_monthly_budgets')
    .delete()
    .in('category_id', [duplicateIncomeId, ...oldCategoryIds]);

  // 5. Delete group assignments for old categories
  console.log('Deleting group assignments for old categories...');
  await supabase
    .from('budget_category_groups')
    .delete()
    .in('category_id', [duplicateIncomeId, ...oldCategoryIds]);

  // 6. Delete the duplicate and old categories
  console.log('Deleting duplicate/old categories...');
  const { error: deleteError } = await supabase
    .from('budget_categories')
    .delete()
    .in('id', [duplicateIncomeId, ...oldCategoryIds]);

  if (deleteError) {
    console.log('Error deleting categories:', deleteError.message);
  } else {
    console.log('Deleted duplicate and old categories');
  }

  // 7. Make sure Income category is NOT in any group (it will be displayed separately)
  await supabase
    .from('budget_category_groups')
    .delete()
    .eq('category_id', correctIncomeId);

  console.log('\nDone! Income is now a single master category.');

  // Show final state
  const { data: incomeCat } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('id', correctIncomeId)
    .single();

  console.log('\nIncome category:', incomeCat?.name);
  console.log('Subcategories:', incomeCat?.subcategories?.join(', '));
}

main();
