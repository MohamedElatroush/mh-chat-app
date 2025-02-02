import { createClient } from "@supabase/supabase-js";

const supbaseURL = import.meta.env.VITE_SUPABASE_URL;
const supbaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supbaseURL, supbaseAnonKey);
