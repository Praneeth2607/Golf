import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";

interface AdminScore {
  id: string;
  strokes: number;
  playedOn: string;
}

interface LookupResult {
  user: { id: string; email: string; fullName: string | null };
  scores: AdminScore[];
}

function errorMessage(err: unknown, fallback: string) {
  return (err as AxiosError<{ error?: string }>)?.response?.data?.error ?? fallback;
}

export default function AdminScores() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [searchedEmail, setSearchedEmail] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStrokes, setEditStrokes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-scores", searchedEmail],
    queryFn: async () =>
      (await api.get<LookupResult>("/admin/scores", { params: { email: searchedEmail } })).data,
    enabled: !!searchedEmail,
    retry: false,
  });

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setSearchedEmail(email.trim());
  }

  function startEdit(s: AdminScore) {
    setEditingId(s.id);
    setEditStrokes(String(s.strokes));
    setEditDate(s.playedOn.slice(0, 10));
    setRowError(null);
  }

  async function saveEdit(id: string) {
    setRowError(null);
    try {
      await api.put(`/admin/scores/${id}`, { strokes: Number(editStrokes), playedOn: editDate });
      await queryClient.invalidateQueries({ queryKey: ["admin-scores", searchedEmail] });
      setEditingId(null);
    } catch (err) {
      setRowError(errorMessage(err, "Couldn't save that score."));
    }
  }

  async function removeScore(id: string) {
    await api.delete(`/admin/scores/${id}`);
    await queryClient.invalidateQueries({ queryKey: ["admin-scores", searchedEmail] });
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Scores.</h1>
      <p className="mt-2 text-body">Look up a subscriber by email to view or correct their scores.</p>

      <form onSubmit={onSearch} className="mt-6 flex gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="subscriber@example.com"
          required
          className="flex-1 rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-wise-green"
        />
        <button
          type="submit"
          className="rounded-full bg-wise-green px-6 py-2.5 text-sm font-medium text-ink-deep transition hover:bg-green-active"
        >
          Look up
        </button>
      </form>

      {isLoading && <p className="mt-6 text-body">Loading…</p>}
      {isError && <p className="mt-6 text-negative">{errorMessage(error, "Couldn't find that user.")}</p>}

      {data && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-body">
            {data.user.fullName ?? data.user.email} · {data.scores.length}/5 scores
          </h2>

          {data.scores.length === 0 && <p className="mt-3 text-sm text-body">No scores logged yet.</p>}

          <ul className="mt-4 space-y-2.5">
            {data.scores.map((s) => (
              <li key={s.id} className="rounded-2xl border border-line p-4">
                {editingId === s.id ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-wise-green"
                    />
                    <input
                      type="number"
                      min={1}
                      max={45}
                      value={editStrokes}
                      onChange={(e) => setEditStrokes(e.target.value)}
                      className="w-20 rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-wise-green"
                    />
                    <button
                      onClick={() => saveEdit(s.id)}
                      className="rounded-full bg-wise-green px-4 py-2 text-sm font-medium text-ink-deep transition hover:bg-green-active"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-body hover:text-ink">
                      Cancel
                    </button>
                    {rowError && <p className="w-full text-sm text-negative">{rowError}</p>}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-serif text-xl">{s.strokes}</span>
                      <span className="ml-3 text-sm text-body">{new Date(s.playedOn).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <button onClick={() => startEdit(s)} className="text-ink underline underline-offset-4">
                        Edit
                      </button>
                      <button onClick={() => removeScore(s.id)} className="text-negative underline underline-offset-4">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
