import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Using untyped client until tables are created in Supabase
// TODO: Add Database type back after running migrations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
