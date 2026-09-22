import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// One-off setup script: creates the PUBLIC Storage bucket used for charity
// logos/cover images. Public, unlike winner-proofs — charity media is shown
// on public directory pages and doesn't need a signed-URL round trip. Safe
// to re-run.

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_CHARITY_MEDIA_BUCKET || "charity-media";

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
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error) throw error;

  console.log(`Created public bucket "${bucket}".`);
}

main().catch((err) => {
  console.error("Failed to create bucket:", err?.message ?? err);
  process.exit(1);
});
