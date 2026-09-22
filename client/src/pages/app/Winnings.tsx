import { useRef, useState } from "react";
import type { AxiosError } from "axios";
import { useMyWinnings, useUploadProof, useProofUrl } from "@/hooks/useWinners";
import type { WinnerRecord } from "@/hooks/useWinners";
import { formatPaise } from "@/lib/money";

const TIER_LABEL = { FIVE: "5-number match", FOUR: "4-number match", THREE: "3-number match" } as const;

const STATUS_STYLE: Record<string, string> = {
  AWAITING_PROOF: "bg-warning/20 text-warning-content",
  SUBMITTED: "bg-accent-cyan/20 text-ink-deep",
  APPROVED: "bg-positive/20 text-positive-deep",
  REJECTED: "bg-negative/10 text-negative",
};

function errorMessage(err: unknown, fallback: string) {
  return (err as AxiosError<{ error?: string }>)?.response?.data?.error ?? fallback;
}

function WinnerCard({ winner }: { winner: WinnerRecord }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadProof = useUploadProof();
  const [error, setError] = useState<string | null>(null);
  const [viewingProof, setViewingProof] = useState(false);
  const { data: proofUrl, isLoading: proofLoading } = useProofUrl(viewingProof ? winner.id : null);

  const status = winner.verification?.status ?? "AWAITING_PROOF";
  const canUpload = status === "AWAITING_PROOF" || status === "REJECTED";

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      await uploadProof.mutateAsync({ winnerId: winner.id, file });
    } catch (err) {
      setError(errorMessage(err, "Upload failed."));
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium">{winner.draw.periodLabel}</span>
          <span className="ml-2 text-sm text-body">{TIER_LABEL[winner.matchTier]}</span>
        </div>
        <span className="font-serif text-lg">{formatPaise(winner.prizeAmountPaise)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}>
          {status.replace("_", " ")}
        </span>
        <span className="text-xs text-mute">Payout: {winner.payout?.status ?? "PENDING"}</span>
      </div>

      {winner.verification?.reviewNotes && status === "REJECTED" && (
        <p className="mt-3 text-sm text-negative">Admin note: {winner.verification.reviewNotes}</p>
      )}

      {error && <p className="mt-3 text-sm text-negative">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {canUpload && (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onFileChosen(e.target.files?.[0])}
            />
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploadProof.isPending}
              className="rounded-full bg-wise-green px-5 py-2 text-sm font-medium text-ink-deep transition hover:bg-green-active disabled:opacity-50"
            >
              {uploadProof.isPending ? "Uploading…" : status === "REJECTED" ? "Re-upload proof" : "Upload proof"}
            </button>
            <span className="text-xs text-mute">Screenshot of your scores, JPEG/PNG/WEBP, up to 5MB.</span>
          </>
        )}

        {winner.verification?.proofFilePath && (
          <button
            onClick={() => setViewingProof((v) => !v)}
            className="text-sm text-ink underline underline-offset-4"
          >
            {viewingProof ? "Hide proof" : "View submitted proof"}
          </button>
        )}
      </div>

      {viewingProof && (
        <div className="mt-4">
          {proofLoading && <p className="text-sm text-body">Loading…</p>}
          {proofUrl && (
            <img src={proofUrl} alt="Submitted score proof" className="max-h-80 rounded-xl border border-line" />
          )}
        </div>
      )}
    </div>
  );
}

export default function Winnings() {
  const { data, isLoading, isError } = useMyWinnings();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Your winnings.</h1>
      <p className="mt-2 text-body">Upload proof for any win to move it through verification and payout.</p>

      {data && (
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-line bg-canvas-soft/50 p-5">
            <p className="text-sm text-body">Total won</p>
            <p className="mt-1 font-serif text-2xl">{formatPaise(data.totalWonPaise)}</p>
          </div>
          <div className="rounded-2xl border border-line bg-canvas-soft/50 p-5">
            <p className="text-sm text-body">Total paid out</p>
            <p className="mt-1 font-serif text-2xl">{formatPaise(data.totalPaidPaise)}</p>
          </div>
        </div>
      )}

      {isLoading && <p className="mt-8 text-body">Loading…</p>}
      {isError && <p className="mt-8 text-negative">Couldn't load your winnings.</p>}
      {data?.winners.length === 0 && (
        <p className="mt-8 text-body">No wins yet — keep logging scores and stay in the draw.</p>
      )}

      <div className="mt-6 space-y-4">
        {data?.winners.map((w) => (
          <WinnerCard key={w.id} winner={w} />
        ))}
      </div>
    </div>
  );
}
