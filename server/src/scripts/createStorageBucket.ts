import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// One-off setup script: creates the private Storage bucket used for winner
// proof uploads (Milestone 7), if it doesn't already exist. Safe to re-run.

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "winner-proofs";

if (!url || !serviceKey || url.includes("your-project")) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env first.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function main() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  if (buckets.some((b) => b.name === bucket)) {
    console.log(`Bucket "${bucket}" already exists — nothing to do.`);
    return;
  }

  const { error } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error) throw error;

  console.log(`Created private bucket "${bucket}".`);
}

main().catch((err) => {
  console.error("Failed to create bucket:", err?.message ?? err);
  process.exit(1);
});
