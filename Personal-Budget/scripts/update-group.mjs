import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateGroups() {
  // Change "Bills" to "Fixed Bills"
  const { data: data1, error: error1 } = await supabase
    .from("budget_category_groups")
    .update({ group_name: "Fixed Bills" })
    .eq("group_name", "Bills")
    .select();

  if (error1) {
    console.log("Error updating Bills:", error1);
  } else {
    console.log("Updated Bills -> Fixed Bills:", data1?.length, "assignments");
  }

  // Change "Needs" to "Expenses"
  const { data: data2, error: error2 } = await supabase
    .from("budget_category_groups")
    .update({ group_name: "Expenses" })
    .eq("group_name", "Needs")
    .select();

  if (error2) {
    console.log("Error updating Needs:", error2);
  } else {
    console.log("Updated Needs -> Expenses:", data2?.length, "assignments");
  }
}

updateGroups();
