const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Category IDs
const CATEGORIES = {
  HOUSING: '8deabdad-1723-467a-b088-41102e329075',
  UTILITIES: '5ea63760-e1c9-4bf1-9639-2fd3402d817e',
  FOOD: '437f49c5-54a0-4c20-adf1-986526c4ffad',
  TRANSPORTATION: 'e8c2e646-c2ed-4a59-bc65-5944bd6ac633',
  INSURANCE_HEALTH: 'edd64b1d-5da3-4c79-8dc0-d7acb69d1203',
  CHILD_FAMILY: 'c07f2ac5-abc4-4063-83c4-9e32deef3b30',
  DEBT: 'bc4de420-6846-4b18-a148-20782d737ed3',
  PERSONAL: '04f7ab2c-f663-4116-b3e3-2aaf993f5205',
  MISC: 'ca873d1a-d4f2-4f2d-8d6f-8f87f707be7d'
};

// Categorization rules (patterns -> category)
const RULES = [
  // FOOD - Groceries
  { pattern: /ALBERTSONS/i, category: CATEGORIES.FOOD },
  { pattern: /COSTCO/i, category: CATEGORIES.FOOD },
  { pattern: /FRED.?MEYER/i, category: CATEGORIES.FOOD },
  { pattern: /SMITHS/i, category: CATEGORIES.FOOD },
  { pattern: /WAL.?MART/i, category: CATEGORIES.FOOD },
  { pattern: /WM SUPERCENTER/i, category: CATEGORIES.FOOD },
  { pattern: /COMMUNITY FOOD CO-OP/i, category: CATEGORIES.FOOD },
  { pattern: /DOLLAR\s?TREE/i, category: CATEGORIES.FOOD },
  { pattern: /WALGREENS/i, category: CATEGORIES.FOOD },
  { pattern: /INSTACART/i, category: CATEGORIES.FOOD },

  // FOOD - Restaurants & Dining
  { pattern: /STARBUCKS/i, category: CATEGORIES.FOOD },
  { pattern: /CHICK-FIL-A/i, category: CATEGORIES.FOOD },
  { pattern: /CHIPOTLE/i, category: CATEGORIES.FOOD },
  { pattern: /OLIVE GARDEN/i, category: CATEGORIES.FOOD },
  { pattern: /JERSEY MIKE/i, category: CATEGORIES.FOOD },
  { pattern: /BLAZE PIZZA/i, category: CATEGORIES.FOOD },
  { pattern: /CHOP SHOP BBQ/i, category: CATEGORIES.FOOD },
  { pattern: /FIRST WATCH/i, category: CATEGORIES.FOOD },
  { pattern: /TROPICAL SMOOTHIE/i, category: CATEGORIES.FOOD },
  { pattern: /TST\*/i, category: CATEGORIES.FOOD },
  { pattern: /LE PEEP/i, category: CATEGORIES.FOOD },
  { pattern: /BASKIN/i, category: CATEGORIES.FOOD },
  { pattern: /BIG ALS/i, category: CATEGORIES.FOOD },
  { pattern: /CAFFE D/i, category: CATEGORIES.FOOD },
  { pattern: /EUROPEAN COFFEE/i, category: CATEGORIES.FOOD },
  { pattern: /EVERBOWL/i, category: CATEGORIES.FOOD },
  { pattern: /TACOS EL REY/i, category: CATEGORIES.FOOD },
  { pattern: /UMI JAPANESE/i, category: CATEGORIES.FOOD },
  { pattern: /FLYING M COFFEE/i, category: CATEGORIES.FOOD },
  { pattern: /ROCKFORD COFFEE/i, category: CATEGORIES.FOOD },
  { pattern: /PERKS OF LIFE/i, category: CATEGORIES.FOOD },
  { pattern: /JAZZ CITY/i, category: CATEGORIES.FOOD },
  { pattern: /FARMER.*DAUGHTER/i, category: CATEGORIES.FOOD },
  { pattern: /REED.*DAIRY/i, category: CATEGORIES.FOOD },
  { pattern: /IDA-GON NUTS/i, category: CATEGORIES.FOOD },
  { pattern: /AKAMAI/i, category: CATEGORIES.FOOD },
  { pattern: /COYNES/i, category: CATEGORIES.FOOD },
  { pattern: /SQ \*CACI/i, category: CATEGORIES.FOOD },
  { pattern: /ROCKY REXS/i, category: CATEGORIES.FOOD },
  { pattern: /THAI BASIL/i, category: CATEGORIES.FOOD },
  { pattern: /TERRAZA/i, category: CATEGORIES.FOOD },
  { pattern: /ROUND HOUSE/i, category: CATEGORIES.FOOD },
  { pattern: /MONTAGE BIG SKY F&B/i, category: CATEGORIES.FOOD },
  { pattern: /BLINDSIDEBURGER/i, category: CATEGORIES.FOOD },
  { pattern: /DOORDASH/i, category: CATEGORIES.FOOD },
  { pattern: /UBER.*EATS/i, category: CATEGORIES.FOOD },
  { pattern: /SPICE.*TEA/i, category: CATEGORIES.FOOD },

  // TRANSPORTATION - Gas
  { pattern: /CHEVRON/i, category: CATEGORIES.TRANSPORTATION },
  { pattern: /SHELL OIL/i, category: CATEGORIES.TRANSPORTATION },
  { pattern: /STINKER/i, category: CATEGORIES.TRANSPORTATION },
  { pattern: /LOVE.*S.*INSIDE/i, category: CATEGORIES.TRANSPORTATION },
  { pattern: /TP GAS/i, category: CATEGORIES.TRANSPORTATION },
  { pattern: /VALLEY WIDE/i, category: CATEGORIES.TRANSPORTATION },

  // TRANSPORTATION - Other
  { pattern: /AIRPORT PARKING/i, category: CATEGORIES.TRANSPORTATION },
  { pattern: /CITY OF.*BOISE PARKING/i, category: CATEGORIES.TRANSPORTATION },
  { pattern: /PARKBOI/i, category: CATEGORIES.TRANSPORTATION },
  { pattern: /AVIS RENT/i, category: CATEGORIES.TRANSPORTATION },
  { pattern: /^UBER\s/i, category: CATEGORIES.TRANSPORTATION },
  { pattern: /BOUNCIE/i, category: CATEGORIES.TRANSPORTATION },
  { pattern: /F150LEDS/i, category: CATEGORIES.TRANSPORTATION },
  { pattern: /TACOMA SCREW/i, category: CATEGORIES.TRANSPORTATION },

  // HOUSING
  { pattern: /DOVENMUEHLE/i, category: CATEGORIES.HOUSING },
  { pattern: /Urban Edge Prope/i, category: CATEGORIES.HOUSING },
  { pattern: /JOHN EMMANUEL/i, category: CATEGORIES.HOUSING },
  { pattern: /LOWES/i, category: CATEGORIES.HOUSING },

  // UTILITIES & COMMUNICATION
  { pattern: /IDAHO POWER/i, category: CATEGORIES.UTILITIES },
  { pattern: /City of Meridian/i, category: CATEGORIES.UTILITIES },
  { pattern: /INTERMOUNTAIN GA/i, category: CATEGORIES.UTILITIES },
  { pattern: /VERIZON/i, category: CATEGORIES.UTILITIES },
  { pattern: /SPARKLIGHT/i, category: CATEGORIES.UTILITIES },
  { pattern: /GOOGLE.*WORKSPACE/i, category: CATEGORIES.UTILITIES },
  { pattern: /GOOGLE.*GSUITE/i, category: CATEGORIES.UTILITIES },
  { pattern: /GOOGLE.*CLOUD/i, category: CATEGORIES.UTILITIES },
  { pattern: /GOOGLE.*One/i, category: CATEGORIES.UTILITIES },
  { pattern: /HOVERCODE/i, category: CATEGORIES.UTILITIES },

  // INSURANCE & HEALTHCARE
  { pattern: /STATE FARM/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /ST LUKES/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /DERMATOLOGY/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /SPINE CARE/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /DENTISTRY/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /ORTHODONTIC/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /INTERPATH LAB/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /NUCARA PHARMACY/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /FUNCTIONAL MEDICINE/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /RESTORATION HEALTHCARE/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /FULL CIRCLE BILLING/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /ARTISAN OPTICS/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /HAWLEY TROXELL/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /ACI\*AVMA/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /Am Bd for Cert/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /CORRECTIVE FITNESS/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /KVELL FITNESS/i, category: CATEGORIES.INSURANCE_HEALTH },
  { pattern: /IDAHO FITNESS/i, category: CATEGORIES.INSURANCE_HEALTH },

  // CHILD & FAMILY
  { pattern: /WEST ADA SCHOOL/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /CHEDDARUP/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /RISE VOLLEYBALL/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /TVAC/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /HIVE VOLLEYBALL/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /PINWHEEL/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /MERIDIAN MIDDLE SCHOOL/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /ALBION SC/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /BRAYGE SPORTS/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /ROCKY MOUNTAIN STO/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /ZURCHERS/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /Oak View Animal/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /Viking Veterinar/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /PAWPOWPET/i, category: CATEGORIES.CHILD_FAMILY },
  { pattern: /CHIRP/i, category: CATEGORIES.CHILD_FAMILY },

  // DEBT PAYMENTS
  { pattern: /NELNET/i, category: CATEGORIES.DEBT },
  { pattern: /SCHWAB BROKERAGE/i, category: CATEGORIES.DEBT },

  // PERSONAL & DISCRETIONARY - Shopping
  { pattern: /AMAZON/i, category: CATEGORIES.PERSONAL },
  { pattern: /EBAY/i, category: CATEGORIES.PERSONAL },
  { pattern: /POSHMARK/i, category: CATEGORIES.PERSONAL },
  { pattern: /THREDUP/i, category: CATEGORIES.PERSONAL },
  { pattern: /CRAIGSLIST/i, category: CATEGORIES.PERSONAL },
  { pattern: /HOBBY LOBBY/i, category: CATEGORIES.PERSONAL },
  { pattern: /IT.SUGAR/i, category: CATEGORIES.PERSONAL },
  { pattern: /GREAT CLIPS/i, category: CATEGORIES.PERSONAL },
  { pattern: /SEES CAND/i, category: CATEGORIES.PERSONAL },
  { pattern: /SAVERS/i, category: CATEGORIES.PERSONAL },
  { pattern: /GOODWILL/i, category: CATEGORIES.PERSONAL },
  { pattern: /HM\.COM/i, category: CATEGORIES.PERSONAL },
  { pattern: /J CREW/i, category: CATEGORIES.PERSONAL },
  { pattern: /BRANDY MELVILLE/i, category: CATEGORIES.PERSONAL },
  { pattern: /WESTONSTORE/i, category: CATEGORIES.PERSONAL },
  { pattern: /PLANT PEOPLE/i, category: CATEGORIES.PERSONAL },

  // PERSONAL - Entertainment/Subscriptions
  { pattern: /NETFLIX/i, category: CATEGORIES.PERSONAL },
  { pattern: /PLAYSTATION/i, category: CATEGORIES.PERSONAL },
  { pattern: /APPLE\.COM/i, category: CATEGORIES.PERSONAL },
  { pattern: /GOOGLE.*TV/i, category: CATEGORIES.PERSONAL },
  { pattern: /GOOGLE.*YouTube/i, category: CATEGORIES.PERSONAL },
  { pattern: /MALWAREBYTES/i, category: CATEGORIES.PERSONAL },
  { pattern: /KNITTING FACTORY/i, category: CATEGORIES.PERSONAL },
  { pattern: /GARMIN/i, category: CATEGORIES.PERSONAL },

  // PERSONAL - Recreation/Travel
  { pattern: /BRIDGER BOWL/i, category: CATEGORIES.PERSONAL },
  { pattern: /SUREFOOT/i, category: CATEGORIES.PERSONAL },
  { pattern: /CHALET SPORTS/i, category: CATEGORIES.PERSONAL },
  { pattern: /EAST SLOPE OUTDOORS/i, category: CATEGORIES.PERSONAL },
  { pattern: /MUSEUM OF THE ROCKIES/i, category: CATEGORIES.PERSONAL },
  { pattern: /HILTON/i, category: CATEGORIES.PERSONAL },
  { pattern: /RESIDENCE INN/i, category: CATEGORIES.PERSONAL },
  { pattern: /SUPER\.COM.*HOTELS/i, category: CATEGORIES.PERSONAL },
  { pattern: /GEAR UP SPORTS/i, category: CATEGORIES.PERSONAL },
  { pattern: /TWIN FALLS MOUNTAI/i, category: CATEGORIES.PERSONAL },
  { pattern: /FSP\*HEYDAY/i, category: CATEGORIES.PERSONAL },
  { pattern: /SNAKE RIVER POOL/i, category: CATEGORIES.PERSONAL },
  { pattern: /INDIAN CREEK PLAZA/i, category: CATEGORIES.PERSONAL },

  // MISC - Banking/Fees/Transfers (ignore these)
  { pattern: /MOBILE BANKING/i, category: null },
  { pattern: /PAYMENT.*THANK YOU/i, category: null },
  { pattern: /WEB AUTHORIZED PMT CARDMEMBER/i, category: null },
  { pattern: /WEB AUTHORIZED PMT PAYPAL/i, category: null },
  { pattern: /WEB AUTHORIZED PMT VENMO/i, category: null },
  { pattern: /WEB AUTHORIZED PMT DEPT OF COMM/i, category: null },
  { pattern: /ELECTRONIC DEPOSIT DEPT/i, category: null },
  { pattern: /ELECTRONIC DEPOSIT ICCU/i, category: null },
  { pattern: /ELECTRONIC DEPOSIT VENMO/i, category: null },
  { pattern: /ZELLE/i, category: null },
  { pattern: /ANNUAL MEMBERSHIP FEE/i, category: CATEGORIES.MISC },
  { pattern: /MONTHLY MAINTENANCE/i, category: CATEGORIES.MISC },
  { pattern: /^CHECK$/i, category: CATEGORIES.MISC },
  { pattern: /ID SEC OF STATE/i, category: CATEGORIES.MISC },
  { pattern: /ID TRANSDEPT/i, category: CATEGORIES.MISC },
];

async function categorizeTransactions() {
  // Get all uncategorized transactions
  const { data: transactions, error } = await supabase
    .from('budget_transactions')
    .select('id, description, category_id')
    .is('category_id', null);

  if (error) {
    console.error('Error fetching transactions:', error);
    return;
  }

  console.log(`Found ${transactions.length} uncategorized transactions\n`);

  let categorized = 0;
  let ignored = 0;
  let uncategorized = [];

  for (const t of transactions) {
    let matched = false;

    for (const rule of RULES) {
      if (rule.pattern.test(t.description)) {
        if (rule.category === null) {
          // Mark as ignored (transfers, deposits, etc.)
          await supabase
            .from('budget_transactions')
            .update({ ignored: true })
            .eq('id', t.id);
          ignored++;
        } else {
          // Assign category
          await supabase
            .from('budget_transactions')
            .update({ category_id: rule.category })
            .eq('id', t.id);
          categorized++;
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      uncategorized.push(t.description);
    }
  }

  console.log(`Categorized: ${categorized}`);
  console.log(`Ignored (transfers/deposits): ${ignored}`);
  console.log(`Still uncategorized: ${uncategorized.length}\n`);

  if (uncategorized.length > 0) {
    console.log('--- STILL UNCATEGORIZED ---');
    [...new Set(uncategorized)].forEach(d => console.log(d));
  }
}

categorizeTransactions();
