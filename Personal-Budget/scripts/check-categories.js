const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data: cats } = await supabase
    .from('budget_categories')
    .select('id, name, subcategories')
    .order('name');

  console.log('All categories:');
  cats.forEach(c => {
    console.log(`  ${c.name}: ${c.subcategories?.join(', ') || '(none)'}`);
  });

  // Check for Top Shelf and Vision
  const topShelf = cats.find(c => c.name.toLowerCase().includes('top shelf'));
  const vision = cats.find(c => c.name.toLowerCase().includes('vision'));
  const hasVisionSub = cats.find(c => c.subcategories?.some(s => s.toLowerCase().includes('vision')));

  console.log('\nTop Shelf category:', topShelf ? topShelf.name : 'NOT FOUND');
  console.log('Vision category:', vision ? vision.name : 'NOT FOUND');
  console.log('Vision subcategory in:', hasVisionSub ? hasVisionSub.name : 'NOT FOUND');
}
main();
