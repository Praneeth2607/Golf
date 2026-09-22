import { describe, expect, it } from "vitest";
import { idsToEvict } from "./scoreWindow";

function row(id: string, daysAgo: number) {
  const d = new Date("2026-06-15T00:00:00Z");
  d.setDate(d.getDate() - daysAgo);
  return { id, playedOn: d };
}

describe("idsToEvict", () => {
  it("evicts nothing when at or under the limit", () => {
    expect(idsToEvict([row("a", 0), row("b", 1)])).toEqual([]);
    expect(idsToEvict([row("a", 0), row("b", 1), row("c", 2), row("d", 3), row("e", 4)])).toEqual([]);
  });

  it("evicts the single oldest score when a 6th (newest) is added", () => {
    // Newest first: f(0), a(1), b(2), c(3), d(4), e(5) -> e is oldest, must go.
    const rows = [row("e", 5), row("d", 4), row("c", 3), row("b", 2), row("a", 1), row("f", 0)];
    expect(idsToEvict(rows)).toEqual(["e"]);
  });

  it("evicts the oldest by date, not the most recently inserted, when backfilling an older round", () => {
    // User already has 5 recent scores (a..e) and backfills a 6th, older than all of them.
    const rows = [row("a", 0), row("b", 1), row("c", 2), row("d", 3), row("e", 4), row("backfill", 30)];
    expect(idsToEvict(rows)).toEqual(["backfill"]);
  });

  it("evicts multiple rows if somehow more than one over the limit", () => {
    const rows = [row("a", 0), row("b", 1), row("c", 2), row("d", 3), row("e", 4), row("f", 5), row("g", 6)];
    expect(idsToEvict(rows).sort()).toEqual(["f", "g"]);
  });

  it("respects a custom limit", () => {
    expect(idsToEvict([row("a", 0), row("b", 1), row("c", 2)], 2)).toEqual(["c"]);
  });
});
