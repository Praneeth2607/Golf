import { supabaseAdmin } from "./supabase";
import { env } from "./env";

/**
 * Winner proof lives in a private Supabase Storage bucket
 * (SUPABASE_STORAGE_BUCKET, default "winner-proofs") — never public. Every
 * read goes through a short-lived signed URL generated server-side after an
 * ownership/role check, never a direct public path (PRD §13: "Do not make
 * winner proof publicly accessible").
 */

export async function uploadProofFile(path: string, buffer: Buffer, contentType: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw error;
}

export async function getSignedProofUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw error ?? new Error("Failed to create signed URL");
  return data.signedUrl;
}

/**
 * Charity logos/covers, by contrast, are public — shown on the public
 * directory and profile pages, so a plain public URL is correct here (no
 * signed-URL round trip needed, and none of the ownership rules that apply
 * to winner proof apply to charity media).
 */
export async function uploadCharityMedia(path: string, buffer: Buffer, contentType: string): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(env.SUPABASE_CHARITY_MEDIA_BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(env.SUPABASE_CHARITY_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
