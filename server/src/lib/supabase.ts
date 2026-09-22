import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Server-side client using the service-role key. Never send this key or this
// client's capabilities to the frontend — it bypasses RLS entirely.
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
