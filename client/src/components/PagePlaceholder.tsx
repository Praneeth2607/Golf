export function PagePlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 sm:px-8">
      <h1 className="text-3xl">{title}</h1>
      <p className="mt-3 text-body">
        {note ?? "This section is being built in an upcoming milestone."}
      </p>
    </div>
  );
}
