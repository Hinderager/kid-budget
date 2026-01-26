const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Step 1: Create the Medical category
  const { data: newCat, error: createError } = await supabase
    .from('budget_categories')
    .insert({
      name: 'Medical',
      subcategories: ['Medical Bills', 'Prescriptions'],
      color: '#EF4444',
      icon: 'heart-pulse',
      sort_order: 22
    })
    .select()
    .single();

  if (createError) {
    console.log('Error creating Medical category:', createError.message);
    return;
  }

  console.log('Created Medical category with ID:', newCat.id);

  // Step 2: Add to Expenses group
  const { error: groupError } = await supabase
    .from('budget_category_groups')
    .insert({
      category_id: newCat.id,
      group_name: 'Expenses'
    });

  if (groupError) {
    console.log('Error adding to Expenses group:', groupError.message);
  } else {
    console.log('Added Medical to Expenses group');
  }

  // Step 3: Get Insurance & Healthcare category ID
  const { data: insuranceCat } = await supabase
    .from('budget_categories')
    .select('id, name')
    .eq('name', 'Insurance & Healthcare')
    .single();

  if (!insuranceCat) {
    console.log('Insurance & Healthcare category not found');
    return;
  }

  // Step 4: Move Medical Bills transactions
  const { data: medicalBillsTx, error: fetchMedical } = await supabase
    .from('budget_transactions')
    .select('id, description, amount, date')
    .eq('category_id', insuranceCat.id)
    .eq('subcategory', 'Medical Bills');

  if (fetchMedical) {
    console.log('Error fetching Medical Bills:', fetchMedical.message);
  } else {
    console.log('\nFound', medicalBillsTx.length, 'Medical Bills transactions to move');

    if (medicalBillsTx.length > 0) {
      const ids = medicalBillsTx.map(t => t.id);
      const { error: updateError } = await supabase
        .from('budget_transactions')
        .update({ category_id: newCat.id, subcategory: 'Medical Bills' })
        .in('id', ids);

      if (updateError) {
        console.log('Error moving Medical Bills:', updateError.message);
      } else {
        console.log('Moved', medicalBillsTx.length, 'Medical Bills transactions to new Medical category');
      }
    }
  }

  // Step 5: Move Prescriptions transactions
  const { data: prescriptionsTx, error: fetchPrescriptions } = await supabase
    .from('budget_transactions')
    .select('id, description, amount, date')
    .eq('category_id', insuranceCat.id)
    .eq('subcategory', 'Prescriptions');

  if (fetchPrescriptions) {
    console.log('Error fetching Prescriptions:', fetchPrescriptions.message);
  } else {
    console.log('\nFound', prescriptionsTx.length, 'Prescriptions transactions to move');

    if (prescriptionsTx.length > 0) {
      const ids = prescriptionsTx.map(t => t.id);
      const { error: updateError } = await supabase
        .from('budget_transactions')
        .update({ category_id: newCat.id, subcategory: 'Prescriptions' })
        .in('id', ids);

      if (updateError) {
        console.log('Error moving Prescriptions:', updateError.message);
      } else {
        console.log('Moved', prescriptionsTx.length, 'Prescriptions transactions to new Medical category');
      }
    }
  }

  // Step 6: Remove Medical Bills, Prescriptions, Health, Dental, Vision from Insurance & Healthcare subcategories
  const { data: insuranceCatFull } = await supabase
    .from('budget_categories')
    .select('id, subcategories')
    .eq('id', insuranceCat.id)
    .single();

  const subsToRemove = ['Medical Bills', 'Prescriptions', 'Health', 'Dental', 'Vision'];
  const newSubs = insuranceCatFull.subcategories.filter(s => !subsToRemove.includes(s));

  const { error: updateSubsError } = await supabase
    .from('budget_categories')
    .update({ subcategories: newSubs })
    .eq('id', insuranceCat.id);

  if (updateSubsError) {
    console.log('Error updating Insurance & Healthcare subcategories:', updateSubsError.message);
  } else {
    console.log('\nUpdated Insurance & Healthcare subcategories:', newSubs);
  }

  console.log('\nDone!');
}
main();
