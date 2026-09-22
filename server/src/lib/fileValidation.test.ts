import { describe, expect, it } from "vitest";
import { MAX_PROOF_FILE_BYTES, validateProofFile } from "./fileValidation";

describe("validateProofFile", () => {
  it("accepts a normal JPEG within the size limit", () => {
    expect(validateProofFile({ mimetype: "image/jpeg", size: 1024 })).toEqual({ ok: true });
  });

  it("accepts PNG and WEBP too", () => {
    expect(validateProofFile({ mimetype: "image/png", size: 1024 }).ok).toBe(true);
    expect(validateProofFile({ mimetype: "image/webp", size: 1024 }).ok).toBe(true);
  });

  it("rejects a non-image file type", () => {
    const result = validateProofFile({ mimetype: "application/pdf", size: 1024 });
    expect(result.ok).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    const result = validateProofFile({ mimetype: "image/jpeg", size: MAX_PROOF_FILE_BYTES + 1 });
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateProofFile({ mimetype: "image/jpeg", size: MAX_PROOF_FILE_BYTES }).ok).toBe(true);
  });

  it("rejects an empty file", () => {
    expect(validateProofFile({ mimetype: "image/jpeg", size: 0 }).ok).toBe(false);
  });
});
