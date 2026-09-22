import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface CharityEvent {
  id: string;
  title: string;
  eventDate: string;
  location: string | null;
}

interface AdminCharity {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  events: CharityEvent[];
  _count: { events: number; contributions: number };
}

const emptyForm = {
  name: "",
  slug: "",
  summary: "",
  description: "",
  websiteUrl: "",
  isFeatured: false,
};

function useAdminCharities() {
  return useQuery({
    queryKey: ["admin-charities"],
    queryFn: async () => (await api.get<{ charities: AdminCharity[] }>("/admin/charities")).data.charities,
  });
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminCharities() {
  const queryClient = useQueryClient();
  const { data: charities, isLoading } = useAdminCharities();

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<string | null>(null);
  const [expandedMedia, setExpandedMedia] = useState<string | null>(null);

  function startEdit(c: AdminCharity) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      summary: c.summary,
      description: c.description,
      websiteUrl: c.websiteUrl ?? "",
      isFeatured: c.isFeatured,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      summary: form.summary,
      description: form.description,
      websiteUrl: form.websiteUrl || null,
      isFeatured: form.isFeatured,
    };
    try {
      if (editingId) {
        await api.put(`/admin/charities/${editingId}`, payload);
      } else {
        await api.post("/admin/charities", payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-charities"] });
      resetForm();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Couldn't save charity."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: AdminCharity) {
    if (c.isActive) {
      await api.delete(`/admin/charities/${c.id}`);
    } else {
      await api.put(`/admin/charities/${c.id}`, { isActive: true });
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-charities"] });
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Charities.</h1>
      <p className="mt-2 text-body">Add, edit, deactivate, and manage events for charities in the directory.</p>

      <form onSubmit={onSubmit} className="mt-8 rounded-2xl border border-line bg-canvas-soft/50 p-6">
        <h2 className="text-sm font-medium text-body">{editingId ? "Edit charity" : "New charity"}</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-body">Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
            />
          </label>
          <label className="block text-sm">
            <span className="text-body">Slug</span>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder={form.name ? slugify(form.name) : "auto-generated"}
              className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
            />
          </label>
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-body">Summary (short, shown in directory cards)</span>
          <input
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            required
            maxLength={300}
            className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
          />
        </label>

        <label className="mt-4 block text-sm">
          <span className="text-body">Full description</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
            rows={4}
            className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-body">Website URL (optional)</span>
            <input
              value={form.websiteUrl}
              onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              placeholder="https://…"
              className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
            />
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
              className="h-4 w-4"
            />
            <span className="text-body">Featured (homepage spotlight)</span>
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-negative">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-wise-green px-6 py-2.5 text-sm font-medium text-ink-deep transition hover:bg-green-active disabled:opacity-50"
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Create charity"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-sm text-body hover:text-ink">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-10">
        {isLoading && <p className="text-body">Loading charities…</p>}
        <div className="space-y-3">
          {charities?.map((c) => (
            <div key={c.id} className={`rounded-2xl border border-line p-5 ${!c.isActive ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{c.name}</h3>
                    {c.isFeatured && (
                      <span className="rounded-full bg-wise-green/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-positive-deep">
                        Featured
                      </span>
                    )}
                    {!c.isActive && (
                      <span className="rounded-full bg-negative/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-negative">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-body">{c.summary}</p>
                  <p className="mt-1 text-xs text-mute">
                    /{c.slug} · {c._count.events} events · {c._count.contributions} contributions on record
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 text-sm">
                  <button onClick={() => startEdit(c)} className="text-ink underline underline-offset-4">
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(c)}
                    className={c.isActive ? "text-negative underline underline-offset-4" : "text-positive-deep underline underline-offset-4"}
                  >
                    {c.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                  <button
                    onClick={() => setExpandedEvents(expandedEvents === c.id ? null : c.id)}
                    className="text-body underline underline-offset-4"
                  >
                    Events
                  </button>
                  <button
                    onClick={() => setExpandedMedia(expandedMedia === c.id ? null : c.id)}
                    className="text-body underline underline-offset-4"
                  >
                    Media
                  </button>
                </div>
              </div>

              {expandedEvents === c.id && <EventManager charityId={c.id} events={c.events} />}
              {expandedMedia === c.id && <MediaManager charity={c} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventManager({ charityId, events }: { charityId: string; events: CharityEvent[] }) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ["admin-charities"] });
  }

  async function addEvent(e: FormEvent) {
    e.preventDefault();
    if (!title || !eventDate) return;
    setBusy(true);
    try {
      await api.post(`/admin/charities/${charityId}/events`, { title, eventDate, location: location || undefined });
      setTitle("");
      setEventDate("");
      setLocation("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent(eventId: string) {
    await api.delete(`/admin/charities/${charityId}/events/${eventId}`);
    await refresh();
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <ul className="space-y-1.5 text-sm">
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between">
            <span>
              {e.title} — {new Date(e.eventDate).toLocaleDateString()} {e.location ? `· ${e.location}` : ""}
            </span>
            <button onClick={() => removeEvent(e.id)} className="text-negative underline underline-offset-4">
              Remove
            </button>
          </li>
        ))}
        {events.length === 0 && <li className="text-mute">No events yet.</li>}
      </ul>

      <form onSubmit={addEvent} className="mt-3 flex flex-wrap items-end gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-wise-green"
        />
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-wise-green"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-wise-green"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-ink px-4 py-2 text-sm text-canvas transition hover:bg-body disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  );
}

function MediaManager({ charity }: { charity: AdminCharity }) {
  const queryClient = useQueryClient();
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"logo" | "cover" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(field: "logo" | "cover", file: File | undefined) {
    if (!file) return;
    setBusy(field);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post(`/admin/charities/${charity.id}/${field}`, form);
      await queryClient.invalidateQueries({ queryKey: ["admin-charities"] });
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? `Couldn't upload ${field}.`
      );
    } finally {
      setBusy(null);
      if (logoInput.current) logoInput.current.value = "";
      if (coverInput.current) coverInput.current.value = "";
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-body">Logo</p>
          {charity.logoUrl ? (
            <img src={charity.logoUrl} alt="" className="mt-2 h-16 w-16 rounded-full border border-line object-cover" />
          ) : (
            <p className="mt-2 text-xs text-mute">No logo uploaded.</p>
          )}
          <input
            ref={logoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => upload("logo", e.target.files?.[0])}
            disabled={busy !== null}
            className="mt-2 block text-xs"
          />
          {busy === "logo" && <p className="mt-1 text-xs text-body">Uploading…</p>}
        </div>

        <div>
          <p className="text-sm text-body">Cover image</p>
          {charity.coverImageUrl ? (
            <img src={charity.coverImageUrl} alt="" className="mt-2 h-16 w-full rounded-lg border border-line object-cover" />
          ) : (
            <p className="mt-2 text-xs text-mute">No cover image uploaded.</p>
          )}
          <input
            ref={coverInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => upload("cover", e.target.files?.[0])}
            disabled={busy !== null}
            className="mt-2 block text-xs"
          />
          {busy === "cover" && <p className="mt-1 text-xs text-body">Uploading…</p>}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-negative">{error}</p>}
    </div>
  );
}
