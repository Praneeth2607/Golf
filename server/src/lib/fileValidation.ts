const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PROOF_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export type FileValidationResult = { ok: true } | { ok: false; error: string };

/** Winner proof is a screenshot (PRD §13) — image types only, size-capped. */
export function validateProofFile(file: { mimetype: string; size: number }): FileValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { ok: false, error: `Unsupported file type "${file.mimetype}" — upload a JPEG, PNG, or WEBP image.` };
  }
  if (file.size > MAX_PROOF_FILE_BYTES) {
    return { ok: false, error: `File is too large — maximum ${MAX_PROOF_FILE_BYTES / (1024 * 1024)}MB.` };
  }
  if (file.size === 0) {
    return { ok: false, error: "File is empty." };
  }
  return { ok: true };
}
