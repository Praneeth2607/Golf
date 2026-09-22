import { Link, useParams } from "react-router-dom";
import { useCharity } from "@/hooks/useCharities";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function CharityDetail() {
  const { id: slug } = useParams<{ id: string }>();
  const { data: charity, isLoading, isError } = useCharity(slug);

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-5 py-24 sm:px-8 text-body">Loading…</div>;
  }

  if (isError || !charity) {
    return <PagePlaceholder title="Charity not found" note="This charity may have been removed or renamed." />;
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
      <Link to="/charities" className="text-sm text-body hover:text-ink">
        ← Back to directory
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <h1 className="text-4xl">{charity.name}</h1>
        {charity.isFeatured && (
          <span className="mt-2 shrink-0 rounded-full bg-wise-green/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-positive-deep">
            Featured
          </span>
        )}
      </div>
      <p className="mt-3 text-lg text-body">{charity.summary}</p>

      <p className="mt-8 whitespace-pre-line text-body">{charity.description}</p>

      {charity.websiteUrl && (
        <a
          href={charity.websiteUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-sm font-medium text-ink-deep underline underline-offset-4"
        >
          Visit website ↗
        </a>
      )}

      {charity.events && charity.events.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl">Upcoming events</h2>
          <div className="mt-4 space-y-3">
            {charity.events.map((e) => (
              <div key={e.id} className="rounded-2xl border border-line bg-canvas-soft/40 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium">{e.title}</h3>
                  <span className="text-sm text-body">
                    {new Date(e.eventDate).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {e.location && <p className="mt-1 text-sm text-body">{e.location}</p>}
                {e.description && <p className="mt-2 text-sm text-body">{e.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 rounded-2xl border border-line bg-ink-deep p-6 text-canvas">
        <p className="text-sm text-canvas/80">
          Want to support {charity.name}? Subscribe and choose them as your charity, or sign in
          to send an independent donation any time.
        </p>
        <Link
          to="/subscribe"
          className="mt-4 inline-block rounded-full bg-wise-green px-6 py-2.5 text-sm font-medium text-ink-deep transition hover:bg-green-active"
        >
          Subscribe & choose {charity.name}
        </Link>
      </div>
    </div>
  );
}
