import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import { useProofUrl } from "@/hooks/useWinners";
import { formatPaise } from "@/lib/money";

type VerificationStatus = "AWAITING_PROOF" | "SUBMITTED" | "APPROVED" | "REJECTED";

interface AdminWinner {
  id: string;
  matchTier: "FIVE" | "FOUR" | "THREE";
  prizeAmountPaise: number;
  user: { email: string; fullName: string | null };
  draw: { periodLabel: string };
  verification: { status: VerificationStatus; proofFilePath: string | null; reviewNotes: string | null } | null;
  payout: { status: "PENDING" | "PAID" } | null;
}

function errorMessage(err: unknown, fallback: string) {
  return (err as AxiosError<{ error?: string }>)?.response?.data?.error ?? fallback;
}

const STATUS_STYLE: Record<string, string> = {
  AWAITING_PROOF: "bg-warning/20 text-warning-content",
  SUBMITTED: "bg-accent-cyan/20 text-ink-deep",
  APPROVED: "bg-positive/20 text-positive-deep",
  REJECTED: "bg-negative/10 text-negative",
};

const FILTERS: { label: string; value: VerificationStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Awaiting review", value: "SUBMITTED" },
  { label: "Awaiting proof", value: "AWAITING_PROOF" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

export default function AdminWinners() {
  const [status, setStatus] = useState<VerificationStatus | "">("SUBMITTED");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-winners", status],
    queryFn: async () =>
      (await api.get<{ winners: AdminWinner[] }>("/admin/winners", { params: { status: status || undefined } })).data
        .winners,
  });

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ["admin-winners"] });
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Winners.</h1>
      <p className="mt-2 text-body">Review submitted proof, approve or reject, and track payouts.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              status === f.value ? "border-ink bg-ink text-canvas" : "border-line text-body hover:border-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="mt-8 text-body">Loading…</p>}
      {data?.length === 0 && <p className="mt-8 text-body">Nothing here.</p>}

      <div className="mt-6 space-y-4">
        {data?.map((w) => (
          <WinnerRow key={w.id} winner={w} onChanged={refresh} />
        ))}
      </div>
    </div>
  );
}

function WinnerRow({ winner, onChanged }: { winner: AdminWinner; onChanged: () => Promise<void> }) {
  const [viewingProof, setViewingProof] = useState(false);
  const { data: proofUrl, isLoading: proofLoading } = useProofUrl(viewingProof ? winner.id : null, true);

  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | "payout" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = winner.verification?.status ?? "AWAITING_PROOF";
  const canReview = status === "SUBMITTED";
  const canPayout = status === "APPROVED" && winner.payout?.status === "PENDING";

  async function approve() {
    setBusy("approve");
    setError(null);
    try {
      await api.post(`/admin/winners/${winner.id}/verify`, { notes: notes || undefined });
      await onChanged();
    } catch (err) {
      setError(errorMessage(err, "Couldn't approve."));
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (!notes.trim()) {
      setError("A reason is required to reject.");
      return;
    }
    setBusy("reject");
    setError(null);
    try {
      await api.post(`/admin/winners/${winner.id}/reject`, { notes });
      await onChanged();
    } catch (err) {
      setError(errorMessage(err, "Couldn't reject."));
    } finally {
      setBusy(null);
    }
  }

  async function markPaid() {
    setBusy("payout");
    setError(null);
    try {
      await api.post(`/admin/winners/${winner.id}/payout`, {});
      await onChanged();
    } catch (err) {
      setError(errorMessage(err, "Couldn't mark paid."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium">{winner.user.fullName ?? winner.user.email}</span>
          <span className="ml-2 text-sm text-body">
            {winner.draw.periodLabel} · {winner.matchTier}
          </span>
        </div>
        <span className="font-serif text-lg">{formatPaise(winner.prizeAmountPaise)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}>
          {status.replace("_", " ")}
        </span>
        <span className="text-xs text-mute">Payout: {winner.payout?.status ?? "PENDING"}</span>
      </div>

      {winner.verification?.reviewNotes && (
        <p className="mt-3 text-sm text-body">Note: {winner.verification.reviewNotes}</p>
      )}

      {winner.verification?.proofFilePath && (
        <button onClick={() => setViewingProof((v) => !v)} className="mt-3 text-sm text-ink underline underline-offset-4">
          {viewingProof ? "Hide proof" : "View proof"}
        </button>
      )}
      {viewingProof && (
        <div className="mt-3">
          {proofLoading && <p className="text-sm text-body">Loading…</p>}
          {proofUrl && <img src={proofUrl} alt="Submitted score proof" className="max-h-80 rounded-xl border border-line" />}
        </div>
      )}

      {canReview && (
        <div className="mt-4 border-t border-line pt-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (required to reject, optional to approve)"
            rows={2}
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-wise-green"
          />
          {error && <p className="mt-2 text-sm text-negative">{error}</p>}
          <div className="mt-3 flex gap-3">
            <button
              onClick={approve}
              disabled={busy !== null}
              className="rounded-full bg-wise-green px-5 py-2 text-sm font-medium text-ink-deep transition hover:bg-green-active disabled:opacity-50"
            >
              {busy === "approve" ? "Approving…" : "Approve"}
            </button>
            <button
              onClick={reject}
              disabled={busy !== null}
              className="rounded-full border border-negative px-5 py-2 text-sm text-negative transition hover:bg-negative/10 disabled:opacity-50"
            >
              {busy === "reject" ? "Rejecting…" : "Reject"}
            </button>
          </div>
        </div>
      )}

      {canPayout && (
        <div className="mt-4 border-t border-line pt-4">
          {error && <p className="mb-2 text-sm text-negative">{error}</p>}
          <button
            onClick={markPaid}
            disabled={busy !== null}
            className="rounded-full bg-ink px-5 py-2 text-sm text-canvas transition hover:bg-body disabled:opacity-50"
          >
            {busy === "payout" ? "Marking paid…" : "Mark payout as paid"}
          </button>
        </div>
      )}
    </div>
  );
}
