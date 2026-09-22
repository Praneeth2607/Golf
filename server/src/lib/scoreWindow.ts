/**
 * PRD §05: "Only the latest 5 scores are retained at any time. A new score
 * replaces the oldest stored score automatically." Taken literally by date,
 * not insertion order — if a user backfills an older round after already
 * having 5 more recent ones, the newly-added (oldest-by-date) entry is the
 * one that gets evicted, not whichever was inserted first.
 *
 * Pure function, no DB — kept separate from the Prisma service so the
 * rolling-window rule itself is unit-testable without a database.
 */
export interface DatedRow {
  id: string;
  playedOn: Date;
}

/** Returns the ids that should be deleted to keep only the `limit` most recent rows. */
export function idsToEvict<T extends DatedRow>(rows: T[], limit = 5): string[] {
  if (rows.length <= limit) return [];

  const sortedNewestFirst = [...rows].sort((a, b) => b.playedOn.getTime() - a.playedOn.getTime());
  return sortedNewestFirst.slice(limit).map((r) => r.id);
}
