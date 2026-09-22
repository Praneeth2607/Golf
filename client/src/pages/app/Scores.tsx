import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import type { AxiosError } from "axios";
import { useScores, useAddScore, useUpdateScore, useDeleteScore } from "@/hooks/useScores";
import type { Score } from "@/hooks/useScores";

function errorMessage(err: unknown, fallback: string) {
  return (err as AxiosError<{ error?: string }>)?.response?.data?.error ?? fallback;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Scores() {
  const { data: scores, isLoading, isError, error } = useScores();
  const addScore = useAddScore();
  const updateScore = useUpdateScore();
  const deleteScore = useDeleteScore();

  const [strokes, setStrokes] = useState("");
  const [playedOn, setPlayedOn] = useState(todayISO());
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStrokes, setEditStrokes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const needsSubscription = (error as AxiosError)?.response?.status === 403;

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await addScore.mutateAsync({ strokes: Number(strokes), playedOn });
      setStrokes("");
      setPlayedOn(todayISO());
    } catch (err) {
      setFormError(errorMessage(err, "Couldn't add that score."));
    }
  }

  function startEdit(s: Score) {
    setEditingId(s.id);
    setEditStrokes(String(s.strokes));
    setEditDate(s.playedOn.slice(0, 10));
    setEditError(null);
  }

  async function saveEdit(id: string) {
    setEditError(null);
    try {
      await updateScore.mutateAsync({ id, strokes: Number(editStrokes), playedOn: editDate });
      setEditingId(null);
    } catch (err) {
      setEditError(errorMessage(err, "Couldn't save that score."));
    }
  }

  if (needsSubscription) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl">Your scores.</h1>
        <div className="mt-8 rounded-2xl border border-line bg-canvas-soft/50 p-6 text-sm text-body">
          You need an active subscription to log scores.{" "}
          <Link to="/subscribe" className="font-medium text-ink underline underline-offset-4">
            Subscribe
          </Link>
          .
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl">Your scores.</h1>
        <span className="text-sm text-body">{scores?.length ?? 0} / 5</span>
      </div>
      <p className="mt-2 text-body">
        Stableford, 1–45. Only your latest 5 rounds are kept — adding a 6th retires the oldest by
        date automatically.
      </p>

      <form onSubmit={onAdd} className="mt-8 rounded-2xl border border-line p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <label className="block text-sm">
            <span className="text-body">Date played</span>
            <input
              type="date"
              value={playedOn}
              max={todayISO()}
              onChange={(e) => setPlayedOn(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
            />
          </label>
          <label className="block text-sm">
            <span className="text-body">Score</span>
            <input
              type="number"
              min={1}
              max={45}
              value={strokes}
              onChange={(e) => setStrokes(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
            />
          </label>
        </div>

        {formError && <p className="mt-3 text-sm text-negative">{formError}</p>}

        <button
          type="submit"
          disabled={addScore.isPending}
          className="mt-4 rounded-full bg-wise-green px-6 py-2.5 text-sm font-medium text-ink-deep transition hover:bg-green-active disabled:opacity-50"
        >
          {addScore.isPending ? "Adding…" : "Add score"}
        </button>
      </form>

      <div className="mt-8">
        {isLoading && <p className="text-body">Loading…</p>}
        {isError && !needsSubscription && <p className="text-negative">Couldn't load your scores.</p>}
        {scores?.length === 0 && <p className="text-body">No scores yet — log your first round above.</p>}

        <ul className="space-y-2.5">
          {scores?.map((s) => (
            <li key={s.id} className="rounded-2xl border border-line p-4">
              {editingId === s.id ? (
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="date"
                    value={editDate}
                    max={todayISO()}
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
                    disabled={updateScore.isPending}
                    className="rounded-full bg-wise-green px-4 py-2 text-sm font-medium text-ink-deep transition hover:bg-green-active"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-body hover:text-ink">
                    Cancel
                  </button>
                  {editError && <p className="w-full text-sm text-negative">{editError}</p>}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-serif text-xl">{s.strokes}</span>
                    <span className="ml-3 text-sm text-body">
                      {new Date(s.playedOn).toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button onClick={() => startEdit(s)} className="text-ink underline underline-offset-4">
                      Edit
                    </button>
                    <button
                      onClick={() => deleteScore.mutate(s.id)}
                      disabled={deleteScore.isPending}
                      className="text-negative underline underline-offset-4"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
