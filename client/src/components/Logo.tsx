export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`font-serif text-lg tracking-tight ${dark ? "text-canvas" : "text-ink"}`}
    >
      digital<span className={dark ? "text-wise-green" : "text-ink-deep"}>.</span>
      <span className="italic">heroes</span>
    </span>
  );
}
