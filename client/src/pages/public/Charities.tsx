import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCharities } from "@/hooks/useCharities";

export default function Charities() {
  const [q, setQ] = useState("");
  const { data: charities, isLoading, isError } = useCharities({ q });

  return (
    <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
      <div className="max-w-xl">
        <h1 className="text-4xl sm:text-5xl">Charity directory.</h1>
        <p className="mt-4 text-body">
          Every charity here receives a direct, automatic share of subscriber fees. Browse and
          pick the one you want to back.
        </p>
      </div>

      <div className="mt-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search charities…"
          className="w-full max-w-sm rounded-full border border-line bg-canvas px-5 py-2.5 text-sm outline-none focus:border-wise-green sm:w-80"
        />
      </div>

      {isLoading && <p className="mt-10 text-body">Loading charities…</p>}
      {isError && <p className="mt-10 text-negative">Couldn't load the charity directory.</p>}
      {charities && charities.length === 0 && (
        <p className="mt-10 text-body">No charities match "{q}".</p>
      )}

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {charities?.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              to={`/charities/${c.slug}`}
              className="block h-full overflow-hidden rounded-2xl border border-line bg-canvas-soft/40 transition hover:border-wise-green"
            >
              {c.coverImageUrl && (
                <img src={c.coverImageUrl} alt="" className="h-32 w-full object-cover" />
              )}
              <div className="p-6">
                <div className="flex items-center gap-3">
                  {c.logoUrl && (
                    <img
                      src={c.logoUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full border border-line object-cover"
                    />
                  )}
                  <div className="flex flex-1 items-start justify-between gap-3">
                    <h3 className="text-lg">{c.name}</h3>
                    {c.isFeatured && (
                      <span className="shrink-0 rounded-full bg-wise-green/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-positive-deep">
                        Featured
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-body">{c.summary}</p>
                <span className="mt-4 inline-block text-sm font-medium text-ink-deep">
                  View profile →
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
